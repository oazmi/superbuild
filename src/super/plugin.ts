/** the {@link SuperPlugin} class wraps over your regular esbuild plugins to swap the `build: esbuild.PluginBuild` object that esbuild passes,
 * with a {@link SuperPluginBuild}, super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import type { MaybePromise } from "../deps.ts"
import type { EsbuildPlugin, EsbuildPluginBuild } from "../esbuild/strongtypes.ts"
import type { SuperBuildContext } from "./build_context.ts"
import { SuperPluginBuild } from "./plugin_build.ts"


/** convenient type for annotating your plugin setup functions that use super-build's extended plugin api. */
export type SuperPluginSetup = (build: SuperPluginBuild) => MaybePromise<void>

/** this class wraps over a base `esbuild.Plugin` to swap out the `build: esbuild.PluginBuild` that gets passed to its `setup` function with a {@link SuperPluginBuild},
 * so that the plugin get access to all the exclusive features.
 *
 * expand your horizons by enrolling into jujutsu-highschool this summer and learning a new domain expansion technique; only for $15,000!
*/
export class SuperPlugin implements EsbuildPlugin {
	// unfortunately, esbuild disallows any enumerable custom property to be set on the plugin `Object`.
	// hence, we declare all custom properties as private, so that esbuild does not discover them.
	// in the future, I may consider turning it into non-enumerable properties rather than private ones, if class extensions are desired.
	#basePlugin: EsbuildPlugin
	#ctx: SuperBuildContext

	public name: string
	public setup: (build: EsbuildPluginBuild | SuperPluginBuild) => MaybePromise<void>

	constructor(ctx: SuperBuildContext, base_plugin: EsbuildPlugin) {
		this.#basePlugin = base_plugin
		this.#ctx = ctx
		this.name = base_plugin.name
		// esbuild strips away the setup function from its host object, effectively removing the `this` context.
		// thus, we define the setup function as a closure rather than a method.
		const self = this
		this.setup = (build: EsbuildPluginBuild | SuperPluginBuild): MaybePromise<void> => {
			return self.#basePlugin.setup(
				new SuperPluginBuild(self.#ctx, build, self.name).castToEsbuildPluginBuild()
			)
		}
	}
}
