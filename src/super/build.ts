/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import { type AutoSuggestOrString, type DEBUG, object_assign } from "../deps.js"
import type {
	Esbuild,
	EsbuildBuildOptions,
	EsbuildBuildResult,
	EsbuildLoaderType,
	SameShape,
} from "../esbuild/strongtypes.js"
import type { LoggerFunction } from "../typedefs.js"
import { SuperBuildContext } from "./build_context.js"
import type { SuperPluginType } from "./plugin.js"


export interface SuperBuildOptions extends
	Omit<EsbuildBuildOptions, keyof SuperBuildExclusiveOptions>,
	SuperBuildExclusiveOptions { }

export interface SuperBuildExclusiveOptions {
	/** enable internal logging of super-build for debugging, when {@link DEBUG.LOG} is enabled.
	 *
	 * when set to `true`, the logs will show up in your console via `console.log()`.
	 * you may also provide your own custom logger function if you wish.
	 *
	 * @defaultValue `false`
	*/
	debuggingLogs?: boolean | LoggerFunction

	/** specify what loader (generic or built-in) to use for various file extensions. */
	loader?: { [ext: string]: AutoSuggestOrString<EsbuildLoaderType> }

	/** the superbuild-compatible plugins. */
	plugins?: Array<SuperPluginType>
}

/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * this class creates a mere wrapper over a base `esbuild` object (acquired from `import esbuild from "npm:esbuild"`).
 * this class itself does not do anything interesting aside from overloading the `esbuild.build` and `esbuild.buildSync` methods,
 * to pass a modified version of your `esbuild.BuildOptions` that alters the plugin api (which is performed by {@link SuperBuildContext}).
*/
export class SuperBuild implements Omit<Esbuild, "build" | "buildSync"> {
	declare public version: Esbuild["version"]
	declare public analyzeMetafile: Esbuild["analyzeMetafile"]
	declare public analyzeMetafileSync: Esbuild["analyzeMetafileSync"]
	// declare public build: Esbuild["build"]
	// declare public buildSync: Esbuild["buildSync"] // yucky, who uses sync nowdays?
	declare public context: Esbuild["context"]
	declare public formatMessages: Esbuild["formatMessages"]
	declare public formatMessagesSync: Esbuild["formatMessagesSync"]
	declare public initialize: Esbuild["initialize"]
	declare public transform: Esbuild["transform"]
	declare public transformSync: Esbuild["transformSync"]
	declare public stop: Esbuild["stop"]
	#esbuild: Esbuild

	constructor(base_esbuild: Esbuild) {
		this.#esbuild = base_esbuild
		const { build, buildSync, ...rest_props } = base_esbuild
		object_assign(this, rest_props)
	}

	public async build<T extends SuperBuildOptions>(options: T): Promise<
		EsbuildBuildResult<SameShape<
			EsbuildBuildOptions,
			Omit<T, keyof SuperBuildExclusiveOptions>
		>>
	> {
		const
			new_ctx = new SuperBuildContext(options),
			esbuild_options = new_ctx.getBuildOptions()
		return this.#esbuild.build(esbuild_options)
	}

	public buildSync<T extends SuperBuildOptions>(options: T): EsbuildBuildResult<SameShape<
		EsbuildBuildOptions,
		Omit<T, keyof SuperBuildExclusiveOptions>
	>> {
		const
			new_ctx = new SuperBuildContext(options),
			esbuild_options = new_ctx.getBuildOptions()
		return this.#esbuild.buildSync(esbuild_options)
	}
}
