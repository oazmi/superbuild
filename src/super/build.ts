/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import { object_assign } from "../deps.ts"
import type {
	Esbuild,
	EsbuildBuildOptions,
	EsbuildBuildResult,
} from "../esbuild/strongtypes.ts"
import { SuperBuildContext } from "./build_context.ts"


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

	public async build<T extends EsbuildBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof EsbuildBuildOptions>]: never
	}): Promise<EsbuildBuildResult<T>> {
		const new_ctx = new SuperBuildContext()
		return this.#esbuild.build(new_ctx.processPlugins(options))
	}

	public buildSync<T extends EsbuildBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof EsbuildBuildOptions>]: never
	}): EsbuildBuildResult<T> {
		const new_ctx = new SuperBuildContext()
		return this.#esbuild.buildSync(new_ctx.processPlugins(options))
	}
}
