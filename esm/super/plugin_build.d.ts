/** the {@link SuperPluginBuild} class extends `esbuild.PluginBuild` to introduce additional functionality to esbuild's plugin api.
 *
 * TODO: I think I should begin adding new utility features to the superbuild plugin build, such as "resolvePath" and "resolveOutdirPath", etc...
 *
 * @module
*/
import { Require } from "../deps.js";
import type { EsbuildBuildOptions, EsbuildLoaderType, EsbuildOnEndCallback, EsbuildOnStartCallback, EsbuildPluginBuild, EsbuildResolveOptions, EsbuildResolveResult, OnResolveCallback, OnResolveOptions } from "../esbuild/strongtypes.js";
import { SuperBuild } from "./build.js";
import type { SuperBuildContext } from "./build_context.js";
import type { OnEmitArgs, OnEmitCallback, OnEmitOptions, OnEmitResult, OnLoadCallback, OnLoadOptions, OnTransformCallback, OnTransformOptions } from "./typedefs.js";
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
    /** a path resolver function that joins `path_segments` wherever they're relative,
     * and resolves with respect to the current working directory (`cwd`) or the esbuild-provided `absWorkingDir`.
     *
     * unlike the {@link resolve} method, this method does not involve any `onResolve` handlers assigned to esbuild,
     * and it only uses basic relative path and absolute path resolution for the computation, and nothing more.
    */
    resolvePath(...path_segments: string[]): string;
    /** re-route the statically analyzable relative imports of an emitted js or css file's contents.
     * this process is akin to either moving/renaming the base emitted file to a different directory,
     * and/or individually renaming the import paths of a select number of dependency files.
     *
     * @param on_emit_args the same `OnEmitArgs` that you receive in your {@link onEmit} hook's callback function.
     *   this will describe your emitted output file's contents and its original output path,
     *   in addition to all of the imports that it performs (and any imported entities that may need to have their paths updated).
     * @param loader specify the kind of content that's in your emitted file.
     *   only `js` and `css` files are currently supported,
     *   as only these two can have their import statements natively parse by esbuild
     *   (which is what we use for modifying the relative import paths).
     * @param updated_output_path the new path where your emitted output file is to be migrated to.
     *   you should ideally provide an absolute path here; but if you don't,
     *   it will be assumed that the path is relative to `on_emit_args.outputPath`.
     * @returns the new updated contents of the migrated file, any errors, and the migrated path
     *   (which is the same as the input {@link updated_output_path}, but resolved to become an absolute path),
     * 	 using the same interface of an {@link onEmit} hook's callback function's return value.
     *
     * > [!note]
     * > remember, the returned value is merely the transformed input content.
     * > it does **not** implicitly apply the new contents onto the underlying virtual output file.
     * > for that, you will have to use the returned value of this method as the returned value for your resource's
     * > {@link onEmit} hook's callback function.
    */
    rerouteImports(on_emit_args: Require<Partial<OnEmitArgs>, "contents" | "outputPath">, loader: EsbuildLoaderType & ("js" | "css"), updated_output_path?: string): Promise<Pick<OnEmitResult, "contents" | "path" | "warnings" | "errors"> & {
        contents: Uint8Array<ArrayBuffer>;
    }>;
}
//# sourceMappingURL=plugin_build.d.ts.map