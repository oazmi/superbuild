/** an internal super-build plugin that enables the inclusion of additional imports dynamically,
 * as esbuild is transforming the loaded content.
 *
 * the reason why this plugin is called "long build" is because it hangs up at its loader stage and waits for the import requests to come in,
 * until all known entities that had entered the `onResolve` stage have exited through at least one `onLoad` hook.
 *
 * @module
*/

import { array_isEmpty, escapeLiteralStringForRegex, json_stringify, parseFilepathInfo, pathToPosixPath, promiseOutside } from "../deps.ts"
import type { EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnLoadArgs, OnResolveArgs, OnResolveResult } from "../esbuild/strongtypes.ts"
import { cancelableDelayedPromiseResolver } from "../funcdefs.ts"
import type { ImportEntity } from "../typedefs.ts"
import type { SuperPluginBuild } from "../wrapper.ts"


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
	ONLOAD_MIN_DELAY = 500
}

export class LongBuildPluginController {
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

	public readonly buildPromises: Array<Promise<void>> = []

	public readonly buildResolves: Array<() => void> = []

	public readonly buildResolveCancels: Array<() => void> = []

	public readonly resourceImports: Array<Map<string, ImportEntity[]>> = []

	constructor() {
		// TODO: `crypto.randomUUID` is not available in `http` connections. so I might want to polyfill it in the future.
		const uuid = crypto.randomUUID()
		this.uuid = uuid
		this.baseFilename = `.(${uuid}).js`
		this.remainingFilesCounter = 0
		this.buildNumber = -1
		this.incrementBuild()
	}

	public incrementBuild() {
		const
			[promise, resolve, reject] = promiseOutside<void>(),
			[cancelable_resolver, cancel_resolver] = cancelableDelayedPromiseResolver(resolve, LONGBUILD.ONLOAD_MIN_DELAY)
		this.remainingFilesCounter = 0
		this.buildResolveCancels.push(cancel_resolver)
		this.buildResolves.push(cancelable_resolver)
		this.buildPromises.push(promise)
		this.resourceImports.push(new Map<string, ImportEntity[]>())
		// @ts-ignore: hey! that's illegal, IN AMERICA! - bandit kieth
		this.buildNumber++
	}

	public incrementFilesCounter(pathname?: string): void {
		// cancel any prior resolve that may have been triggered.
		this.buildResolveCancels[this.buildNumber]()
		// this.buildResolveCancels.at(-1)!() // TODO: using `at(-1)` is not very nice. you should abstract away a given "build".
		++this.remainingFilesCounter
		console.log("increment for:", pathname, this.remainingFilesCounter)
	}

	public decrementFilesCounter(pathname?: string): void {
		// cancel any prior resolve that may have been triggered.
		this.buildResolveCancels[this.buildNumber]()
		// this.buildResolveCancels.at(-1)!() // TODO: using `at(-1)` is not very nice. you should abstract away a given "build".
		--this.remainingFilesCounter
		console.log("decrement for:", pathname, this.remainingFilesCounter)
	}

	public cacheResolvedResult(args?: OnResolveResult | undefined | null) {
		if (!args?.path) { return }
		const
			path = pathToPosixPath(args.path!),
			namespace = args.namespace ?? "file",
			key = namespace + ":" + path
		// if the resolved path has already been encountered once, then esbuild will have it cached, and so, no loader hooks will be called,
		// therefore we must immediately decrement the files counter, since the loader can't do it any longer.
		if (this.encounteredPaths.has(key)) {
			this.decrementFilesCounter(args.path)
			console.log("already encountered:", key)
		}
		else {
			this.encounteredPaths.add(key)
			console.log("did not encounter:", key)
		}
	}

	public pushImports(importer_key: string, imports: ImportEntity[]) {
		this.resourceImports[this.buildNumber].set(importer_key, imports)
	}

	/** prepares the file contents of the "long build" of the given `build_number`.
	 *
	 * you would use this once you have deduced that all files that were in circulation in the current build have exited,
	 * and therefore your long build plugin must also halt by loading the contents prepared here by this method.
	 *
	 * > [!caution]
	 * > the file's contents are in typescript rather than javascript.
	 * > so make sure to use the `"ts"` esbuild loader for it.
	*/
	public prepareLongBuildFileContent(build_number: number): string {
		const all_imports_this_build = [...this.resourceImports[build_number].entries()]
		const all_imports_js_str = all_imports_this_build.map(([importer_key, imports_arr]) => {
			const imports_str_arr = imports_arr.map((import_entity) => {
				const
					{ key, path, with: with_attr } = import_entity,
					key_str = json_stringify(key),
					path_str = json_stringify(path),
					with_str = json_stringify(with_attr)
				// TODO: add with attribute support.
				// return `import(${path_str}, { with: { importer: "" } })`
				return `{ key: ${key_str}, path: await import(${path_str}), with: ${with_str} }`
			})
			const imports_str = imports_str_arr.join(",\n\t")
			const importer_key_str = json_stringify(importer_key)
			return `
resourceImports.set(${importer_key_str}, [\n\t${imports_str}\n])
			`.trim()
		})

		const recursion_import_statement = !array_isEmpty(all_imports_this_build)
			? `import "${build_number}${this.baseFilename}" // recursion to the next long-build.`
			: "// no imports were pushed this build-number. hence, this is the final long-build file."
		return `
console.log("long build: ${build_number}")

interface ImportEntity<K = any> {
	key: K
	path: any
	with: Record<string, string>
}

export const resourceImports: Map<
	string,        // the importer's key.
	ImportEntity[] // all of the entities imported by the importer.
> = new Map()

${all_imports_js_str}
${recursion_import_statement}
		`.trim()
	}

	/** this function does the inverse of {@link prepareLongBuildFileContent};
	 * it parses the js-transpiled contents of the "long build" file and extracts/reconstructs the resource import `Map` from it.
	 *
	 * since I plan on using a dynamic script `import()` to execute the contents of a modified version of the "long build" file content,
	 * this method has to be made asynchronous.
	 * I'm certainly not going to be using `eval` or the `Function` constructor, because they are often restricted in some js-environments.
	*/
	public async parseLongBuildFileContent(): Promise<Map<string, ImportEntity[]>> {
		// TODO: implement.
		return new Map()
	}
}

export interface LongBuildPluginSetupConfig {
	controller: LongBuildPluginController
}

/** this plugin captures **all** file-namespace imports, and mimics esbuild's native file-loading by using `fetch`,
 * and also guessing the `loader` type based on the file's extension name (in a way similar to how esbuild does it).
 *
 * > [!note]
 * > you will probably want to place this as the last plugin, if you don't want it interfering with your other plugins' loading mechanism.
*/
export const longBuildPluginSetup = (config: LongBuildPluginSetupConfig): EsbuildPluginSetup => {
	const
		controller = config.controller,
		longbuild_base_filename = controller.baseFilename,
		plugin_namespace = `oazmi-superbuild-long_build-plugin-${controller.uuid}`

	return (build: EsbuildPluginBuild) => {
		const filter = RegExp(escapeLiteralStringForRegex(longbuild_base_filename) + "$")

		build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
			// TODO: I believe `<stdin>` does not go through any `onResolve`, and jumps straight to `onLoad`. so, we must account for not decrementing the counter when it is `<stdin>`.
			controller.incrementFilesCounter(args.path)
			if (!args.path.endsWith(longbuild_base_filename)) { return undefined }
			const filename = parseFilepathInfo(args.path).filename // this is to strip away any directory prefixes.
			return { path: filename, namespace: plugin_namespace }
		})

		build.onLoad({ filter, namespace: plugin_namespace }, async (args: OnLoadArgs) => {
			// the "long build" js files need to temporarily remove themselves from the `remainingFilesCounter` circulation, otherwise it will never drop to zero
			controller.decrementFilesCounter(args.path)
			const
				filename = args.path,
				build_number = Number(filename.slice(0, -longbuild_base_filename.length))
			// wait for super-build to externally resolve the promise below to signal that the `remainingFilesCounter` has dropped to zero.
			await controller.buildPromises[build_number]
			const contents = controller.prepareLongBuildFileContent(build_number)
			controller.incrementBuild()
			// we increment the `remainingFilesCounter` because returning from this function will cause it to drop to `-1` if we don't increment.
			++controller.remainingFilesCounter
			return { contents, loader: "ts", resolveDir: "./" }
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
