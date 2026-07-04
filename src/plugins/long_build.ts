/** an internal super-build plugin that enables the inclusion of additional imports dynamically,
 * as esbuild is transforming the loaded content.
 *
 * the reason why this plugin is called "long build" is because it hangs up at its loader stage and waits for the import requests to come in,
 * until all known entities that had entered the `onResolve` stage have exited through at least one `onLoad` hook.
 *
 * @module
*/

import { array_isEmpty, escapeLiteralStringForRegex, json_stringify, parseFilepathInfo, pathToPosixPath, promiseOutside } from "../deps.ts"
import type { EsbuildPartialMessage, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnLoadArgs, OnResolveArgs, OnResolveResult } from "../esbuild/strongtypes.ts"
import { cancelableDelayedPromiseResolver, generateUuid } from "../funcdefs.ts"
import type { SuperPluginBuild } from "../super/plugin_build.ts"
import type { ImportEntity } from "../super/typedefs.ts"
import { INNER_PLUGIN_BUILD } from "../super/typedefs.ts"


const enum LONGBUILD {
	/** the minimum amount of time (in ms) that the long build will wait before concluding its `contents`,
	 * after it has determined that no active files remain in circulation.
	 * if a new file is suddenly introduced while the longbuild is waiting for this delay to complete, it will halt the timer,
	 * and wait for all new files in the circulation to complete before beginning this countdown again.
	 *
	 * ideally, this should be set to a safe high value,
	 * where you can be certain that esbuild's go-side transpiler/transformer won't take any longer than that to transform a single file in your bundle.
	 * i.e. the lower bound of this enum value = `max(...all_bundled_files.map((file) => get_transpilation_time(file))`
	*/
	ONLOAD_MIN_DELAY = 500,

	/** the name of the resource-imports storage variable used across the "long build step" js files. */
	RESOURCE_VAR_NAME = "resourceImports",

	/** this will be common dependency file of each "long build step" js file, so that they all share the same `resourceImports` storage variable.
	 *
	 * the name of this file will be `deps.(${uuid}).js`, defined in the {@link LongBuildController}.
	*/
	DEPS_FILE = `
export interface ImportEntity<K = any> {
	key: K
	path: string
	with: Record<string, string>
}

export const ${LONGBUILD.RESOURCE_VAR_NAME}: Map<
	string,        // the importer's key.
	ImportEntity[] // all of the entities imported by the importer.
> = new Map()

// esbuild likes to add a "@__PURE__" annotation to the variable above.
// hence, to ensure that it never gets stripped away (because we want to dynamically import it later),
// we perform an action that has a potential for side-effect, preventing esbuild from ever dropping this variable in the bundle.
${LONGBUILD.RESOURCE_VAR_NAME}.size

export const console_log = (...args: any[]) => {
	// console.log(...args) // for debugging purposes.
}
`,
}

const import_statement_regex = new RegExp("await\\s+import\\s*\\(\\s*(?<quote>[\"'`])(?<importPath>.*?)\\k<quote>\\s*\\)", "g")

/** the controller used for commanding the state of the "long build" plugin. */
export class LongBuildController {
	/** the unique base filename that will be used by the {@link longBuildPluginSetup} plugin to insert its "long build" js file as an entry-point.
	 * the full filename format it will use will be: `${recursion_number}.(${uuid}).js`.
	*/
	public readonly uuid: string

	/** the unique filename(s) that will be used for the "long build" js files.
	 * it is a computed value that evaluates to `.(${uuid}).js`,
	 * and the actual filename that gets inserted/injected will also have a leading number, signifying the "build/recursion number".
	 *
	 * for instance, the entry-point long build js file will be named: `0.(${uuid}).js`,
	 * while the next recursive "long build" import within the `0.(${uuid}).js` file will be named `1.(${uuid}).js`,
	 * and so on (until a "long build" js file with zero external imports/includes is discovered, at which point we shall halt).
	*/
	public readonly baseFilename: string

	/** the name of the "long build dependency" file, as defined in {@link LONGBUILD.DEPS_FILE}.
	 *
	 * its value evaluates to `deps.(${uuid}).js`, and it is imported by each "long build step" js file as a dependency,
	 * in order to have a shared resource variable where all imports will get registered.
	*/
	public readonly depsFilename: string

	/** the current build/recursion number. it starts with zero, and it is used for indicating the filename of the current "long build" file. */
	public readonly buildNumber: number

	/** the number of files in the esbuild build process that are currently in circulation.
	 *
	 * - everytime a new file hits the "long build" plugin's `onResolve` hook, this value gets incremented by one,
	 *   since a "new file is currently in circulation".
	 * - whenever a file gets successfully loaded via some plugin's `onLoad` hook,
	 *   the {@link SuperPluginBuild.onLoad} overload decrements this shared-state counter,
	 *   since a "file that was in circulation has exited".
	 * - a caveat to look out for is the fact that if any plugin calls {@link SuperPluginBuild.resolve},
	 *   this counter will get incremented again (double count),
	 *   since the resolve request will go through our "long build" plugin's `onResolve` hook once again.
	 *   to combat this double count, the {@link SuperPluginBuild.resolve} function decrements this counter whenever it gets called.
	*/
	public remainingFilesCounter: number

	/** esbuild caches the loaded result of an `onLoad` hook, based on the result of the `onResolve` hook's `result.path` and `result.namespace`
	 * (I don't know if esbuild also caches with respect to the `with` import attribute).
	 * but we don't want to count any cached paths towards {@link remainingFilesCounter}, since they won't be loaded again;
	 * which is why we need this hash-set to keep track of what has already been seen once.
	*/
	protected encounteredPaths: Set<string> = new Set()

	public steps: Array<LongBuildStep> = []

	constructor() {
		const uuid = generateUuid(2)
		this.uuid = uuid
		this.baseFilename = `.(${uuid}).js`
		this.depsFilename = `deps.(${uuid}).js`
		this.remainingFilesCounter = 0
		this.buildNumber = -1
		this.incrementBuild()
	}

	public incrementBuild(): EsbuildPartialMessage[] {
		const warnings: EsbuildPartialMessage[] = []
		if (this.remainingFilesCounter !== 0) {
			warnings.push({
				text: `[LongBuildController.incrementBuild]: the number of remaining files (${this.remainingFilesCounter}) in circulation during th current long-build (${this.buildNumber}) did not reach zero before the build was incremented!`
			})
		}
		// TODO: should I force reset the remaining files counter to zero for the next build even when the assertion above fails?
		// this.remainingFilesCounter = 0
		type CitizenshipTest = number

		// hey! incrementing a readonly number is illegal, IN AMERICA! - bandit keith. (unless they pass the citizenship test)
		this.steps.push(new LongBuildStep(this, ++(this.buildNumber satisfies CitizenshipTest)))
		return warnings
	}

	public incrementFilesCounter(pathname?: string): void {
		// cancel any prior resolve that may have been triggered.
		this.steps[this.buildNumber].cancelResolve()
		++this.remainingFilesCounter
		console.log("increment for:", pathname, this.remainingFilesCounter)
	}

	public decrementFilesCounter(pathname?: string): void {
		// cancel any prior resolve that may have been triggered,
		// so that we always ensure that the desired amount of time has been waited with absolutely no resource processing in between.
		this.steps[this.buildNumber].cancelResolve()
		if ((--this.remainingFilesCounter) <= 0) {
			this.steps[this.buildNumber].signalresolve()
		}
		console.log("decrement for:", pathname, this.remainingFilesCounter)
	}

	public cacheResolvedResult(args: OnResolveResult) {
		// TODO: ISSUE: I just realized that `external` resources do not go through the loading stage,
		// hence they cause the files counter to be permanently incremented, causing the build to stagger/wait forever.
		const
			path = pathToPosixPath(args.path!),
			namespace = args.namespace ?? "file",
			key = namespace + ":" + path
		// if the resolved path has already been encountered once, then esbuild will have it cached, and so, no loader hooks will be called,
		// therefore we must immediately decrement the files counter, since the loader can't do it any longer.
		if (this.encounteredPaths.has(key)) {
			console.log("already encountered:", key)
			this.decrementFilesCounter(args.path)
		}
		else {
			console.log("did not encounter:", key)
			this.encounteredPaths.add(key)
		}
	}

	/** this function does the inverse of {@link prepareLongBuildFileContent};
	 * it parses the js-transpiled contents of the "long build" file and extracts/reconstructs the resource import `Map` from it.
	 *
	 * since I plan on using a dynamic script `import()` to execute the contents of a modified version of the "long build" file content,
	 * this method has to be made asynchronous.
	 * I'm certainly not going to be using `eval` or the `Function` constructor, because they are often restricted in some js-environments.
	*/
	public async parseLongBuildFileContent(longbuild_file_contents: string): Promise<Map<string, ImportEntity[]>> {
		const
			// we first strip away all dynamic import statements and replace them with just the import string.
			// for instance: `await import("./hello-world.xyz")` will transform to just "String.raw`./hello-world.xyz`".
			js_content_without_imports = longbuild_file_contents.replaceAll(import_statement_regex, "String.raw`$<importPath>`"),
			js_blob = new Blob([js_content_without_imports], { type: "text/javascript" }),
			js_blob_url = URL.createObjectURL(js_blob),
			// now we dynamically load our bundled long-build js file that contains import statements, and then return them.
			{ [LONGBUILD.RESOURCE_VAR_NAME]: resourceImports } = await import(js_blob_url)
		return resourceImports
	}
}

export class LongBuildStep {
	/** the build number of this build step, starting with zero. */
	public readonly buildNumber: number

	/** the unique filename of this "long build step" js file.
	 * it is a computed value that evaluates to `${buildNumber}.(${uuid}).js`.
	*/
	public readonly filename: string

	public readonly promise: Promise<void>

	public readonly signalresolve: (() => void)

	public readonly cancelResolve: (() => void)

	public readonly resourceImports: Map<string, ImportEntity[]> = new Map()

	protected readonly controller: LongBuildController

	constructor(parent_controller: LongBuildController, build_number: number) {
		this.controller = parent_controller
		this.buildNumber = build_number
		this.filename = `${build_number}${parent_controller.baseFilename}`
		const [promise, resolve, reject] = promiseOutside<void>();
		[this.signalresolve, this.cancelResolve] = cancelableDelayedPromiseResolver(resolve, LONGBUILD.ONLOAD_MIN_DELAY)
		this.promise = promise
	}

	/** register imports performed by some resource `importer_key`.
	 * the `importer_key` should be formatted as `${namespace}:${resolved_path}` of the resource performing the `imports`.
	*/
	public pushImports(importer_key: string, imports: ImportEntity[]) {
		this.resourceImports.set(importer_key, imports)
	}

	/** prepares the file contents of the "long build" of this "long build step".
	 *
	 * you would use this once you have deduced that all files that were in circulation during this build step have exited,
	 * and therefore your long build plugin must also halt by loading the contents prepared here by this method.
	 *
	 * > [!caution]
	 * > the file's contents are in typescript rather than javascript.
	 * > so make sure to use the `"ts"` esbuild loader for it.
	*/
	public prepareLongBuildFileContent(): string {
		const all_imports_this_build = [...this.resourceImports.entries()]
		const all_imports_js_str = all_imports_this_build.map(([importer_key, imports_arr]) => {
			const imports_str_arr = imports_arr.map((import_entity) => {
				const
					{ key, path, with: with_attr = {} } = import_entity,
					key_str = json_stringify(key),
					path_str = json_stringify(path),
					with_str = json_stringify(with_attr)
				// return `import(${path_str}, { with: { importer: "" } })`
				return `{ key: ${key_str}, path: await import(${path_str}), with: ${with_str} }`
			})
			const imports_str = imports_str_arr.join(",\n\t")
			const importer_key_str = json_stringify(importer_key)
			return `resourceImports.set(${importer_key_str}, [\n\t${imports_str}\n])`
		})

		const
			deps_filename = this.controller.depsFilename,
			next_filename = `${this.buildNumber + 1}${this.controller.baseFilename}`,
			recursion_import_statement = !array_isEmpty(all_imports_this_build)
				? `import "${next_filename}" // recursion to the next long-build.`
				: "// no imports were pushed this build-number. hence, this is the final long-build file."

		return `
import { ${LONGBUILD.RESOURCE_VAR_NAME}, console_log } from "${deps_filename}"
export { ${LONGBUILD.RESOURCE_VAR_NAME} } // export the "resourceImports" so that it can be imported by the parser.
${recursion_import_statement}

console_log("long build: ${this.buildNumber}")
${all_imports_js_str}
		`.trim()
	}
}

export interface LongBuildPluginSetupConfig {
	controller: LongBuildController
}

/** this plugin that enables the inclusion of additional imports dynamically, as esbuild is transforming the loaded content.
 *
 * the reason why this plugin is called "long build" is because it hangs up at its loader stage and waits for the import requests to come in,
 * until all known entities that had entered the `onResolve` stage have exited through at least one `onLoad` hook.
 *
 * > [!note]
 * > this plugin should be placed at the very beginning, as it needs to inspect all incoming path-resolution requests,
 * > in order to track if any unprocessed files still remain while bundling.
 *
 * > _Mr. Feast_: Hello everyone, it's your host jimmy neutrino,
 * > and today we'll be trafficking 100 foreign slaves to compete against one another in building the longest pyramid.
 * > whichever slave manages to build the tallest pyramid at the 100 hour mark will earn his freedom and a also a free bugatti**!
 * >
 * > _Lapdog #1_: the rules are simple: if a slave falls asleeps, or moves out of the red circle,
 * > they'll get disqualified immediately and be deported back to their original owner.
 * >
 * > _Lapdog #2_: look at this wonderful art piece that I commissioned from epstien himself!
 * > hey! stop criticizing me! I'm doing this for my son! also, I identify as they/them, so you can't criticize me now.
 * >
 * > **no auto insurance will be supplied, and state sales tax will be the responsibility of the winner.
 * > failing to register your prize within 6 hours of winning will indicate that you wish to forfeit from owning it.
*/
export const longBuildPluginSetup = (config: LongBuildPluginSetupConfig): EsbuildPluginSetup => {
	const
		controller = config.controller,
		longbuild_base_filename = controller.baseFilename,
		longbuild_deps_filename = controller.depsFilename,
		plugin_namespace = `oazmi-superbuild-long_build-plugin-${controller.uuid}`

	return (build: EsbuildPluginBuild | SuperPluginBuild) => {
		const
			filter = RegExp(escapeLiteralStringForRegex(longbuild_base_filename) + "$"),
			deps_file_filter = RegExp(escapeLiteralStringForRegex(longbuild_deps_filename) + "$"),
			base_plugin_build = INNER_PLUGIN_BUILD in build
				? build[INNER_PLUGIN_BUILD]
				: build

		build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
			// TODO: I believe `<stdin>` does not go through any `onResolve`, and jumps straight to `onLoad`. so, we must account for not decrementing the counter when it is `<stdin>`.
			controller.incrementFilesCounter(args.path)
			if (!args.path.endsWith(longbuild_base_filename)) { return undefined }
			const filename = parseFilepathInfo(args.path).filename // this is to strip away any directory prefixes.
			return { path: filename, namespace: plugin_namespace } // TODO: should we set `sideEffects` to true?
		})

		build.onLoad({ filter: deps_file_filter, namespace: plugin_namespace }, (args: OnLoadArgs) => {
			return { contents: LONGBUILD.DEPS_FILE as string, loader: "ts" }
		})

		build.onLoad({ filter, namespace: plugin_namespace }, async (args: OnLoadArgs) => {
			// the "long build" js files need to temporarily remove themselves from the `remainingFilesCounter` circulation, otherwise it will never drop to zero
			controller.decrementFilesCounter(args.path)
			const
				filename = args.path,
				build_number = Number(filename.slice(0, -longbuild_base_filename.length)),
				build_step = controller.steps[build_number]
			// wait for super-build to externally resolve the promise below to signal that the `remainingFilesCounter` has dropped to zero.
			await build_step.promise
			const
				contents = build_step.prepareLongBuildFileContent(),
				warnings = controller.incrementBuild()
			// we increment the `remainingFilesCounter` because returning from this function will cause it to drop to `-1` if we don't increment.
			++controller.remainingFilesCounter
			return { contents, loader: "ts", resolveDir: "./", warnings }
		})

		// TODO: the very first action that needs to take place even before the `emissionsDriverPlugin` starts performing `onEmit` callbacks,
		// is to parse the long-build's file contents and then store it to the `SuperBuildContext`.
		// either that, or we can also modify the `result.outputFiles` over here to push the parsed `imports` into them.
		// (although esbuild's `imports` format differs from mine, so it will cause issues, so it might be best to leave it up to the emissions driver to take care of it.)
		base_plugin_build.onEnd(async (result) => {
			// const longbuild_files = result.outputFiles?.filter((file) => { return file.path.endsWith(longbuild_base_filename) }) ?? []
			// console.assert(longbuild_files.length === 1)
			// for (const longbuild_file of longbuild_files) {
			// 	console.log(await controller.parseLongBuildFileContent(longbuild_file.text))
			// }
		})
	}
}

/** {@inheritDoc longBuildPluginSetup} */
export const longBuildPlugin = (config: LongBuildPluginSetupConfig): EsbuildPlugin => {
	return {
		name: "oazmi-superbuild-long_build-plugin",
		setup: longBuildPluginSetup(config),
	}
}
