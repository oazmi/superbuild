/** the {@link SuperBuildContext} is a centralized context that is created for each individual {@link SuperBuild.build} call.
 *
 * its main purpose is to inject some required plugins at their correct position, hold a few stateful objects,
 * and create a wrapper on top of the user's provided plugins so that the extended plugin api becomes available to them.
 *
 * @module
*/
import { isArray, object_entries, object_fromEntries, parseFilepathInfo } from "../deps.js";
import { Metafile } from "../esbuild/metafile.js";
import { allEsbuildLoaders } from "../esbuild/typedefs.js";
import { logLogger, noopLogger } from "../funcdefs.js";
import { emissionsDriverPlugin } from "../plugins/emissions_driver.js";
import { LongBuildController, longBuildPlugin } from "../plugins/long_build.js";
import { nativeReplicaPlugin } from "../plugins/native_replica.js";
import { SuperPlugin } from "./plugin.js";
/** a centralized context is created for each individual {@link SuperBuild.build} call. */
export class SuperBuildContext {
    /** a backup of the options assigned to this build-context. */
    esbuildOptions;
    /** contains a list of transformation handlers that will be used for matching contents returned by the plugins' `onLoad` hooks,
     * in order to transfer them to the registered {@link SuperPluginBuild.onTransform} hooks.
    */
    onTransformHandlers = [];
    /** contains a list of `onEmit` handlers that will be called once the file contents of the bundle has been finalized by esbuild,
     * but additional actions (such as linking, and re-incorporating imports for generic loaders) still need to be taken care of by the user's plugins.
     * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEmit}.
    */
    onEmitHandlers = [];
    /** contains a list of `onEnd` handlers that will be called at the end of the build,
     * after we have modified the contents of the resulting in-memory files.
     * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEnd}.
    */
    onEndHandlers = [];
    /** holds all loaded resources, using `${namespace}:${resolved_path}` for the key.
     * this registry is needed in order to trace back the loaded input file(s) from which an emitted file originates from,
     * in order to make the functionality of {@link SuperPluginBuild.onEmit} possible.
    */
    resolvedResourceRegistry = new Map();
    /** the controller used for commanding the state of the "long build" plugin. */
    longBuildController;
    /** contains all of the generic loaders specified in the initial build options.
     * they don't get passed over to esbuild directly because it gets really mad about it.
    */
    genericLoader;
    /** indicates the original `write` option specified by the user when instantiating the build. */
    shouldWrite = true;
    /** indicates if the original `allowOverwrite` option was enabled when the build was started. */
    shouldOverwrite = false;
    /** a logging function for internal debugging. it gets called only when {@link DEBUG.LOG} is enabled. */
    log;
    constructor(options) {
        options = this.initFields(options);
        const format = options.format;
        this.longBuildController = new LongBuildController({
            debuggingLogs: this.log,
            format: format ? format : "iife" // assigning esbuild's default `format` when this option is not provided.
        });
        this.esbuildOptions = this.processOptions(options);
    }
    getBuildOptions() {
        return this.esbuildOptions;
    }
    initFields(options) {
        const { debuggingLogs = false, loader = {}, write = true, allowOverwrite = false, ...esbuild_options } = options;
        this.log = debuggingLogs === false ? noopLogger
            : debuggingLogs === true ? logLogger
                : debuggingLogs;
        this.shouldWrite = write;
        this.shouldOverwrite = allowOverwrite;
        this.genericLoader = object_fromEntries(object_entries(loader).filter(([ext, loader_type]) => {
            return !allEsbuildLoaders.includes(loader_type);
        }));
        return { loader, ...esbuild_options };
    }
    processOptions(options) {
        const { debuggingLogs, loader = {}, entryPoints: original_entry_points = [], plugins: pseudo_super_plugins = [], ...esbuild_options } = options;
        const esbuild_approved_loaders = object_fromEntries(object_entries(loader).filter(([ext, loader_type]) => {
            return allEsbuildLoaders.includes(loader_type);
        }));
        const plugins = this.processPlugins(pseudo_super_plugins);
        const entryPoints = this.processEntryPoints(original_entry_points);
        return {
            ...esbuild_options,
            entryPoints,
            plugins,
            // esbuild rejects execution if it finds any non-standard loader being user. hence is why we've split apart all generic loaders.
            loader: esbuild_approved_loaders,
            // we are forced to enable `metafile` and disable `write` because our emissions driver plugin depends on these crucial options.
            // once the build has concluded, the emissions driver plugin will call the `endBuild`
            // method to take care of emitting the files to the filesystem if `this.shouldWrite` is set to `true`.
            metafile: true,
            write: false,
        };
    }
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
    processPlugins(pseudo_super_plugins) {
        // insert the "native loader" at the last, so that esbuild never gets to load natively
        // (which would bypass our `onLoad` overload, making all `onTransform` hooks unreachable).
        pseudo_super_plugins.push(nativeReplicaPlugin({ genericLoader: this.genericLoader }));
        // insert the "emissions driver" as the second plugin,
        // so that it can drive all `onEmit` and `onEnd` callback hooks after the build has concluded.
        pseudo_super_plugins.unshift(emissionsDriverPlugin({ ctx: this }));
        // insert a longbuild plugin at the very beginning so that it can intercept all incoming files.
        const controller = this.longBuildController;
        pseudo_super_plugins.unshift(longBuildPlugin({ controller }));
        // TODO: is using `plugin as any` below really the best option? I can't think of any better way unfortunately.
        const super_plugins = pseudo_super_plugins.map((plugin) => (new SuperPlugin(this, plugin)));
        return super_plugins;
    }
    processEntryPoints(entry_points) {
        // here, we insert the unique long-build js entry file as to the user's entry points.
        const long_build_filename = this.longBuildController.steps.at(-1).filename;
        if (isArray(entry_points)) {
            return [...entry_points, long_build_filename];
        }
        else {
            // stripping away the ".js" extension from the filename.
            const output_filename = parseFilepathInfo(long_build_filename).basename;
            return { ...entry_points, long_build_filename: output_filename };
        }
    }
    /** creates the the metafile object from esbuild's {@link EsbuildBuildResult},
     * and registers all output files onto it for the {@link emissionsDriverPlugin} to initiate the next step (`onEmit` stage).
    */
    createMetafile(result, config) {
        const metafile = new Metafile(result.metafile, {
            resolvePath: config.resolvePath,
            resolvedResourceRegistry: this.resolvedResourceRegistry,
        });
        for (const esbuild_file of result.outputFiles) {
            metafile.addFile(esbuild_file);
        }
        // in order for all imports to get discovered and linked to each other's output file objects,
        // we must run the method below after all output files have been added.
        metafile.scanEsbuildImports();
        return metafile;
    }
    /** concludes the build after the all registered {@link onEmitHandlers} and {@link onEndHandlers}
     * have been executed by the {@link emissionsDriverPlugin} when it enters its `onEnd` stage (registered to the "true" `build` object).
     *
     * you must pass the mutated {@link Metafile} that you receive from calling the {@link createMetafile}
     * method at the beginning of the {@link emissionsDriverPlugin}'s `onEnd` stage,
     * so that if there's anything that should get written onto your filesystem, it will take place before the build concludes.
    */
    async endBuild(metafile) {
        // if the user had originally set the `EsbuildBuildOption.write` to `true | undefined`,
        // then we shall emit the files onto the filesystem, now that the build has concluded.
        if (this.shouldWrite) {
            await metafile.writeFiles(this.shouldOverwrite);
        }
    }
}
