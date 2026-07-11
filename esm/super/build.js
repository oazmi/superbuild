/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/
import { object_assign } from "../deps.js";
import { SuperBuildContext } from "./build_context.js";
/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * this class creates a mere wrapper over a base `esbuild` object (acquired from `import esbuild from "npm:esbuild"`).
 * this class itself does not do anything interesting aside from overloading the `esbuild.build` and `esbuild.buildSync` methods,
 * to pass a modified version of your `esbuild.BuildOptions` that alters the plugin api (which is performed by {@link SuperBuildContext}).
*/
export class SuperBuild {
    #esbuild;
    constructor(base_esbuild) {
        this.#esbuild = base_esbuild;
        const { build, buildSync, ...rest_props } = base_esbuild;
        object_assign(this, rest_props);
    }
    splitOptions(options) {
        const { debuggingLogs, ...esbuild_options } = options;
        const super_options = {
            debuggingLogs
        };
        return [super_options, esbuild_options];
    }
    createContext(options) {
        const [super_options, esbuild_options] = this.splitOptions(options), new_ctx = new SuperBuildContext(super_options);
        return [new_ctx, esbuild_options];
    }
    async build(options) {
        const [new_ctx, esbuild_options] = this.createContext(options);
        return this.#esbuild.build(new_ctx.processPlugins(esbuild_options));
    }
    buildSync(options) {
        const [new_ctx, esbuild_options] = this.createContext(options);
        return this.#esbuild.buildSync(new_ctx.processPlugins(esbuild_options));
    }
}
