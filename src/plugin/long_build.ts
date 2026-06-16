/** an internal super-build plugin that enables the inclusion of additional imports dynamically,
 * as esbuild is transforming the loaded content.
 *
 * the reason why this plugin is called "long build" is because it hangs up at its loader stage and waits for the import requests to come in,
 * until all known entities that had entered the `onResolve` stage have exited through at least one `onLoad` hook.
 *
 * @module
*/

import { array_isEmpty, escapeLiteralStringForRegex, json_stringify, parseFilepathInfo, promiseOutside } from "../deps.ts"
import type { EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnLoadArgs, OnResolveArgs } from "../esbuild/strongtypes.ts"
import type { ImportEntity } from "../typedefs.ts"
import type { SuperPluginBuild } from "../wrapper.ts"


export class LongBuildPluginController {
	/** the unique base filename that will be used by the {@link longBuildPluginSetup} plugin to insert its "long build" js file as an entry-point.
	 * the full filename format it will use will be: `${recursion_number}.js.<${uuid}>`.
	*/
	public readonly uuid: string

	/** the unique filename(s) that will be used for the "long build" js files.
	 * it is a computed value that evaluates to `.js.<${uuid}>`,
	 * and the actual filename that gets inserted/injected will also have a leading number, signifying the "build/recursion number".
	 *
	 * for instance, the entry-point long build js file will be named: `0.js.<${uuid}>`,
	 * while the next recursive "long build" import within the `0.js.<${uuid}>` file will be named `1.js.<${uuid}>`,
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

	public readonly buildPromises: Array<Promise<void>> = []

	public readonly buildResolves: Array<() => void> = []

	public readonly resourceImports: Array<Map<string, ImportEntity[]>> = []

	constructor() {
		// TODO: `crypto.randomUUID` is not available in `http` connections. so I might want to polyfill it in the future.
		const uuid = crypto.randomUUID()
		this.uuid = uuid
		this.baseFilename = `.js.<${uuid}>`
		this.remainingFilesCounter = 0
		this.buildNumber = -1
		this.incrementBuild()
	}

	incrementBuild() {
		const [promise, resolve, reject] = promiseOutside<void>()
		this.buildPromises.push(promise)
		this.buildResolves.push(resolve)
		this.resourceImports.push(new Map<string, ImportEntity[]>())
		// @ts-ignore: hey! that's illegal, IN AMERICA! - bandit kieth
		this.buildNumber++
	}

	pushImports(importer_key: string, imports: ImportEntity[]) {
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
	prepareLongBuildFileContent(build_number: number): string {
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
	async parseLongBuildFileContent(): Promise<Map<string, ImportEntity[]>> {
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
		build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
			if (!args.path.endsWith(longbuild_base_filename)) {
				// increment the `remainingFilesCounter` for each file that enters, in order to known when to halt.
				controller.remainingFilesCounter++
				return undefined
			}
			// the "long build" js files themselves do not get included in the `remainingFilesCounter`.
			const filename = parseFilepathInfo(args.path).filename // this is to strip away any directory prefixes.
			return { path: filename, namespace: plugin_namespace }
		})

		build.onLoad({
			filter: RegExp(escapeLiteralStringForRegex(longbuild_base_filename) + "$"),
			namespace: plugin_namespace,
		}, async (args: OnLoadArgs) => {
			const
				filename = args.path,
				build_number = Number(filename.slice(0, -longbuild_base_filename.length))
			// wait for super-build to externally resolve the promise below to signal that the `remainingFilesCounter` has dropped to zero.
			await controller.buildPromises[build_number]
			const contents = controller.prepareLongBuildFileContent(build_number)
			controller.incrementBuild()
			return { contents, loader: "ts" }
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
