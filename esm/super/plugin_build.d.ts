/** the {@link SuperPluginBuild} class extends `esbuild.PluginBuild` to introduce additional functionality to esbuild's plugin api.
 *
 * TODO: I think I should begin adding new utility features to the superbuild plugin build, such as "resolvePath" and "resolveOutdirPath", etc...
 *
 * @module
*/
import type { EsbuildBuildOptions, EsbuildOnEndCallback, EsbuildOnStartCallback, EsbuildPluginBuild, EsbuildResolveOptions, EsbuildResolveResult, OnResolveCallback, OnResolveOptions } from "../esbuild/strongtypes.js";
import { SuperBuild } from "./build.js";
import type { SuperBuildContext } from "./build_context.js";
import type { OnEmitCallback, OnEmitOptions, OnLoadCallback, OnLoadOptions, OnTransformCallback, OnTransformOptions } from "./typedefs.js";
import { INNER_PLUGIN_BUILD } from "./typedefs.js";
/** this is the extension of `esbuild.PluginBuild` that introduces additional functionality to esbuild's plugin api. */
export declare class SuperPluginBuild implements Omit<EsbuildPluginBuild, "esbuild"> {
    protected ctx: SuperBuildContext;
    protected basePluginBuild: EsbuildPluginBuild;
    protected readonly pluginName: string;
    initialOptions: EsbuildBuildOptions;
    readonly esbuild: SuperBuild;
    /** a reference to the original {@link EsbuildPluginBuild} that was used to construct this class.
     *
     * its presence can be used to check whether or not your plugin is running inside a super-build.
     * gaining access to esbuild's original `PluginBuild` can be useful in certain situations where bypassing super-build is necessary,
     * such as in the case of the {@link nativeReplicaPlugin}, and the underlying {@link EsbuildNativeResolver} that it uses.
    */
    readonly [INNER_PLUGIN_BUILD]: EsbuildPluginBuild;
    constructor(ctx: SuperBuildContext, base_plugin_build: EsbuildPluginBuild | SuperPluginBuild, plugin_name: string);
    /** type cast this {@link SuperPluginBuild} as an esbuild-compatible {@link EsbuildPluginBuild}.
     * there's no logic that gets executed. this function merely performs a type casting for the sake of esbuild-compatibility.
    */
    castToEsbuildPluginBuild(): EsbuildPluginBuild;
    resolve(path: string, options?: EsbuildResolveOptions): Promise<EsbuildResolveResult>;
    onStart(callback: EsbuildOnStartCallback): void;
    onEnd(callback: EsbuildOnEndCallback): void;
    onResolve(options: OnResolveOptions, callback: OnResolveCallback): void;
    onLoad(options: OnLoadOptions, callback: OnLoadCallback): void;
    onDispose(callback: () => void): void;
    /** TODO: add documentation and usage examples. */
    onTransform(options: OnTransformOptions, callback: OnTransformCallback): void;
    /** TODO: add documentation and usage examples. */
    onEmit(options: OnEmitOptions, callback: OnEmitCallback): void;
}
//# sourceMappingURL=plugin_build.d.ts.map