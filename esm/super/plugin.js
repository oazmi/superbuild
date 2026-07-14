/** the {@link SuperPlugin} class wraps over your regular esbuild plugins to swap the `build: esbuild.PluginBuild` object that esbuild passes,
 * with a {@link SuperPluginBuild}, super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/
import { SuperPluginBuild } from "./plugin_build.js";
/** this class wraps over a base `esbuild.Plugin` to swap out the `build: esbuild.PluginBuild` that gets passed to its `setup` function with a {@link SuperPluginBuild},
 * so that the plugin get access to all the exclusive features.
 *
 * expand your horizons by enrolling into jujutsu-highschool this summer and learning a new domain expansion technique; only for $15,000!
*/
export class SuperPlugin {
    // unfortunately, esbuild disallows any enumerable custom property to be set on the plugin `Object`.
    // hence, we declare all custom properties as private, so that esbuild does not discover them.
    // in the future, I may consider turning it into non-enumerable properties rather than private ones, if class extensions are desired.
    #basePlugin;
    #ctx;
    name;
    setup;
    constructor(ctx, base_plugin) {
        this.#basePlugin = base_plugin;
        this.#ctx = ctx;
        this.name = base_plugin.name;
        // esbuild strips away the setup function from its host object, effectively removing the `this` context.
        // thus, we define the setup function as a closure rather than a method.
        const self = this;
        this.setup = (build) => {
            return self.#basePlugin.setup(new SuperPluginBuild(self.#ctx, build, self.name).castToEsbuildPluginBuild());
        };
    }
}
