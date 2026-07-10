/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import { type DEBUG, object_assign } from "../deps.ts"
import type {
	Esbuild,
	EsbuildBuildOptions,
	EsbuildBuildResult,
} from "../esbuild/strongtypes.ts"
import type { LoggerFunction } from "../typedefs.ts"
import { SuperBuildContext } from "./build_context.ts"


export interface SuperBuildOptions extends EsbuildBuildOptions {
	/** enable internal logging of super-build for debugging, when {@link DEBUG.LOG} is enabled.
	 *
	 * when set to `true`, the logs will show up in your console via `console.log()`.
	 * you may also provide your own custom logger function if you wish.
	 *
	 * @defaultValue `false`
	*/
	debuggingLogs?: boolean | LoggerFunction
}

export type SuperBuildExclusiveOptions = Omit<SuperBuildOptions, keyof EsbuildBuildOptions>

/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * this class creates a mere wrapper over a base `esbuild` object (acquired from `import esbuild from "npm:esbuild"`).
 * this class itself does not do anything interesting aside from overloading the `esbuild.build` and `esbuild.buildSync` methods,
 * to pass a modified version of your `esbuild.BuildOptions` that alters the plugin api (which is performed by {@link SuperBuildContext}).
*/
export class SuperBuild implements Esbuild {
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

	protected splitOptions(options: SuperBuildOptions): [
		super_options: SuperBuildExclusiveOptions,
		esbuild_options: EsbuildBuildOptions,
	] {
		const { debuggingLogs, ...esbuild_options } = options
		const super_options: SuperBuildExclusiveOptions = {
			debuggingLogs
		}
		return [super_options, esbuild_options]
	}

	protected createContext(options: SuperBuildOptions): [
		ctx: SuperBuildContext,
		esbuild_options: EsbuildBuildOptions,
	] {
		const
			[super_options, esbuild_options] = this.splitOptions(options),
			new_ctx = new SuperBuildContext(super_options)
		return [new_ctx, esbuild_options]
	}

	public async build<T extends SuperBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof SuperBuildOptions>]: never
	}): Promise<EsbuildBuildResult<T>> {
		const [new_ctx, esbuild_options] = this.createContext(options)
		return this.#esbuild.build(new_ctx.processPlugins(esbuild_options))
	}

	public buildSync<T extends SuperBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof SuperBuildOptions>]: never
	}): EsbuildBuildResult<T> {
		const [new_ctx, esbuild_options] = this.createContext(options)
		return this.#esbuild.buildSync(new_ctx.processPlugins(esbuild_options))
	}
}
