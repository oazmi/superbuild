/** the {@link SuperPlugin} class wraps over your regular esbuild plugins to swap the `build: esbuild.PluginBuild` object that esbuild passes,
 * with a {@link SuperPluginBuild}, super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/
import type { MaybePromise } from "../deps.js";
import type { EsbuildPlugin, EsbuildPluginBuild } from "../esbuild/strongtypes.js";
import type { SuperBuildContext } from "./build_context.js";
import { SuperPluginBuild } from "./plugin_build.js";
/** convenient type for annotating your plugin setup functions that use super-build's extended plugin api. */
export type SuperPluginSetup = (build: SuperPluginBuild) => MaybePromise<void>;
/** this class wraps over a base `esbuild.Plugin` to swap out the `build: esbuild.PluginBuild` that gets passed to its `setup` function with a {@link SuperPluginBuild},
 * so that the plugin get access to all the exclusive features.
 *
 * expand your horizons by enrolling into jujutsu-highschool this summer and learning a new domain expansion technique; only for $15,000!
*/
export declare class SuperPlugin implements EsbuildPlugin {
    #private;
    name: string;
    setup: (build: EsbuildPluginBuild | SuperPluginBuild) => MaybePromise<void>;
    constructor(ctx: SuperBuildContext, base_plugin: EsbuildPlugin);
}
//# sourceMappingURL=plugin.d.ts.map