/** the {@link SuperBuildContext} is a centralized context that is created for each individual {@link SuperBuild.build} call.
 *
 * its main purpose is to inject some required plugins at their correct position, hold a few stateful objects,
 * and create a wrapper on top of the user's provided plugins so that the extended plugin api becomes available to them.
 *
 * @module
*/
import { Metafile, type MetafileConfig } from "../esbuild/metafile.js";
import type { EsbuildBuildOptions, EsbuildBuildResult, EsbuildOnEndCallback } from "../esbuild/strongtypes.js";
import { LongBuildController } from "../plugins/long_build.js";
import type { LoggerFunction, NamespacedPath } from "../typedefs.js";
import type { SuperBuildExclusiveOptions, SuperBuildOptions } from "./build.js";
import { SuperPlugin, type SuperPluginType } from "./plugin.js";
import type { BundledInputFile, OnEmitCallback, OnEmitOptions, OnTransformCallback, OnTransformOptions } from "./typedefs.js";
export interface OnTransformHandler extends OnTransformOptions {
    pluginName: string;
    callback: OnTransformCallback;
}
export interface OnEmitHandler extends OnEmitOptions {
    pluginName: string;
    callback: OnEmitCallback;
}
export interface OnEndHandler {
    pluginName: string;
    callback: EsbuildOnEndCallback;
}
/** a centralized context is created for each individual {@link SuperBuild.build} call. */
export declare class SuperBuildContext {
    /** a backup of the options assigned to this build-context. */
    protected esbuildOptions: EsbuildBuildOptions;
    /** contains a list of transformation handlers that will be used for matching contents returned by the plugins' `onLoad` hooks,
     * in order to transfer them to the registered {@link SuperPluginBuild.onTransform} hooks.
    */
    onTransformHandlers: OnTransformHandler[];
    /** contains a list of `onEmit` handlers that will be called once the file contents of the bundle has been finalized by esbuild,
     * but additional actions (such as linking, and re-incorporating imports for generic loaders) still need to be taken care of by the user's plugins.
     * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEmit}.
    */
    onEmitHandlers: OnEmitHandler[];
    /** contains a list of `onEnd` handlers that will be called at the end of the build,
     * after we have modified the contents of the resulting in-memory files.
     * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEnd}.
    */
    onEndHandlers: OnEndHandler[];
    /** holds all loaded resources, using `${namespace}:${resolved_path}` for the key.
     * this registry is needed in order to trace back the loaded input file(s) from which an emitted file originates from,
     * in order to make the functionality of {@link SuperPluginBuild.onEmit} possible.
    */
    resolvedResourceRegistry: Map<NamespacedPath, BundledInputFile>;
    /** the controller used for commanding the state of the "long build" plugin. */
    longBuildController: LongBuildController;
    /** contains all of the generic loaders specified in the initial build options.
     * they don't get passed over to esbuild directly because it gets really mad about it.
    */
    genericLoader: NonNullable<SuperBuildExclusiveOptions["loader"]>;
    /** indicates the original `write` option specified by the user when instantiating the build. */
    shouldWrite: boolean;
    /** indicates if the original `allowOverwrite` option was enabled when the build was started. */
    shouldOverwrite: boolean;
    /** a logging function for internal debugging. it gets called only when {@link DEBUG.LOG} is enabled. */
    log: LoggerFunction;
    constructor(options: SuperBuildOptions);
    getBuildOptions(): EsbuildBuildOptions;
    protected initFields(options: SuperBuildOptions): SuperBuildOptions;
    protected processOptions(options: SuperBuildOptions): EsbuildBuildOptions;
    /** this method wraps a {@link SuperPlugin} on top of each of the user's base plugin,
     * in addition to injecting two essential plugins at their correct position to make the new plugin apis work.
     *
     * the two internal plugins that get injected are:
     * - {@link nativeReplicaPlugin}: this plugin mimics esbuild's native resource path resolution and loading,
     *   and it gets injected at the last, since esbuild only performs its native actions when other plugins don't return a viable result.
     * - {@link longBuildPlugin}: this plugin gets injected at the beginning,
     *   and it book-keeps the number of resources/paths that have entered, the number of resources that have exited (i.e. loaded),
     *   and the number of resources that have been cached, in order to determine when esbuild has concluded processing all inputs,
     *   before esbuild exists out of the build and begins calling the `build.onEnd` callbacks.
     *   once this plugin has determined that all files in the current scope have been processed, it gathers all `imports` from the {@link OnTransformResult}s,
     *   and compiles/bundles them in a new recursive scope (hence the name "long-build").
    */
    protected processPlugins(pseudo_super_plugins: SuperPluginType[]): SuperPlugin[];
    protected processEntryPoints(entry_points: NonNullable<EsbuildBuildOptions["entryPoints"]>): NonNullable<EsbuildBuildOptions["entryPoints"]>;
    /** creates the the metafile object from esbuild's {@link EsbuildBuildResult},
     * and registers all output files onto it for the {@link emissionsDriverPlugin} to initiate the next step (`onEmit` stage).
    */
    createMetafile(result: EsbuildBuildResult, config: Pick<MetafileConfig, "resolvePath">): Metafile;
    /** concludes the build after the all registered {@link onEmitHandlers} and {@link onEndHandlers}
     * have been executed by the {@link emissionsDriverPlugin} when it enters its `onEnd` stage (registered to the "true" `build` object).
     *
     * you must pass the mutated {@link Metafile} that you receive from calling the {@link createMetafile}
     * method at the beginning of the {@link emissionsDriverPlugin}'s `onEnd` stage,
     * so that if there's anything that should get written onto your filesystem, it will take place before the build concludes.
    */
    endBuild(metafile: Metafile): Promise<void>;
}
//# sourceMappingURL=build_context.d.ts.map