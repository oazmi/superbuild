/** the {@link SuperBuildContext} is a centralized context that is created for each individual {@link SuperBuild.build} call.
 *
 * its main purpose is to inject some required plugins at their correct position, hold a few stateful objects,
 * and create a wrapper on top of the user's provided plugins so that the extended plugin api becomes available to them.
 *
 * @module
*/

import { type DEBUG, isArray, parseFilepathInfo } from "../deps.js"
import { Metafile, type MetafileConfig } from "../esbuild/metafile.js"
import type { EsbuildBuildOptions, EsbuildBuildResult, EsbuildOnEndCallback } from "../esbuild/strongtypes.js"
import { logLogger, noopLogger } from "../funcdefs.js"
import { emissionsDriverPlugin } from "../plugins/emissions_driver.js"
import { LongBuildController, longBuildPlugin } from "../plugins/long_build.js"
import { nativeReplicaPlugin } from "../plugins/native_replica.js"
import type { LoggerFunction, NamespacedPath } from "../typedefs.js"
import type { SuperBuildExclusiveOptions } from "./build.js"
import { SuperPlugin } from "./plugin.js"
import type { SuperPluginBuild } from "./plugin_build.js"
import type { BundledInputFile, OnEmitCallback, OnEmitOptions, OnTransformCallback, OnTransformOptions, OnTransformResult } from "./typedefs.js"


export interface OnTransformHandler extends OnTransformOptions {
	pluginName: string
	callback: OnTransformCallback
}

export interface OnEmitHandler extends OnEmitOptions {
	pluginName: string
	callback: OnEmitCallback
}

export interface OnEndHandler {
	pluginName: string
	callback: EsbuildOnEndCallback
}

/** a centralized context is created for each individual {@link SuperBuild.build} call. */
export class SuperBuildContext {
	/** contains a list of transformation handlers that will be used for matching contents returned by the plugins' `onLoad` hooks,
	 * in order to transfer them to the registered {@link SuperPluginBuild.onTransform} hooks.
	*/
	public onTransformHandlers: OnTransformHandler[] = []

	/** contains a list of `onEmit` handlers that will be called once the file contents of the bundle has been finalized by esbuild,
	 * but additional actions (such as linking, and re-incorporating imports for generic loaders) still need to be taken care of by the user's plugins.
	 * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEmit}.
	*/
	public onEmitHandlers: OnEmitHandler[] = []

	/** contains a list of `onEnd` handlers that will be called at the end of the build,
	 * after we have modified the contents of the resulting in-memory files.
	 * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEnd}.
	*/
	public onEndHandlers: OnEndHandler[] = []

	/** holds all loaded resources, using `${namespace}:${resolved_path}` for the key.
	 * this registry is needed in order to trace back the loaded input file(s) from which an emitted file originates from,
	 * in order to make the functionality of {@link SuperPluginBuild.onEmit} possible.
	*/
	public resolvedResourceRegistry: Map<NamespacedPath, BundledInputFile> = new Map()

	/** the controller used for commanding the state of the "long build" plugin. */
	public longBuildController: LongBuildController

	/** indicates the original `write` option specified by the user when instantiating the build. */
	public shouldWrite: boolean = true

	/** indicates if the original `allowOverwrite` option was enabled when the build was started. */
	public shouldOverwrite: boolean = false

	/** a logging function for internal debugging. it gets called only when {@link DEBUG.LOG} is enabled. */
	public log: LoggerFunction

	constructor(super_options: SuperBuildExclusiveOptions) {
		const
			{ debuggingLogs = false } = super_options,
			log = debuggingLogs === false ? noopLogger
				: debuggingLogs === true ? logLogger
					: debuggingLogs
		this.log = log
		this.longBuildController = new LongBuildController({ debuggingLogs: log })
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
	public processPlugins(options: EsbuildBuildOptions): EsbuildBuildOptions {
		options.plugins ??= []
		// insert the "native loader" at the last, so that esbuild never gets to load natively
		// (which would bypass our `onLoad` overload, making all `onTransform` hooks unreachable).
		options.plugins.push(nativeReplicaPlugin())
		// insert the "emissions driver" as the second plugin,
		// so that it can drive all `onEmit` and `onEnd` callback hooks after the build has concluded.
		options.plugins.unshift(emissionsDriverPlugin({ ctx: this }))
		// insert a longbuild plugin at the very beginning so that it can intercept all incoming files.
		const controller = this.longBuildController
		options.plugins.unshift(longBuildPlugin({ controller }))
		options.plugins = options.plugins.map((plugin) => (new SuperPlugin(this, plugin)))
		// we also insert the unique long build entry point to the options.
		const
			long_build_filename = controller.steps.at(-1)!.filename,
			entryPoints = (options.entryPoints ??= [])
		if (isArray(entryPoints)) {
			entryPoints.push(long_build_filename)
		} else {
			// stripping away the ".js" extension from the filename.
			entryPoints[long_build_filename] = parseFilepathInfo(long_build_filename).basename
		}
		this.shouldWrite = options.write ?? true
		this.shouldOverwrite = options.allowOverwrite ?? false
		// we are forced to enable `metafile` and disable `write` because our emissions driver plugin depends on these crucial options.
		// once the build has concluded, the emissions driver plugin will call the `endBuild`
		// method to take care of emitting the files to the filesystem if `this.shouldWrite` is set to `true`.
		options.metafile = true
		options.write = false
		return options
	}

	/** creates the the metafile object from esbuild's {@link EsbuildBuildResult},
	 * and registers all output files onto it for the {@link emissionsDriverPlugin} to initiate the next step (`onEmit` stage).
	*/
	public createMetafile(
		result: EsbuildBuildResult,
		config: Pick<MetafileConfig, "resolvePath">,
	): Metafile {
		const metafile = new Metafile(result.metafile!, {
			resolvePath: config.resolvePath,
			resolvedResourceRegistry: this.resolvedResourceRegistry,
		})
		for (const esbuild_file of result.outputFiles!) { metafile.addFile(esbuild_file) }
		// in order for all imports to get discovered and linked to each other's output file objects,
		// we must run the method below after all output files have been added.
		metafile.scanEsbuildImports()
		return metafile
	}

	/** concludes the build after the all registered {@link onEmitHandlers} and {@link onEndHandlers}
	 * have been executed by the {@link emissionsDriverPlugin} when it enters its `onEnd` stage (registered to the "true" `build` object).
	 *
	 * you must pass the mutated {@link Metafile} that you receive from calling the {@link createMetafile}
	 * method at the beginning of the {@link emissionsDriverPlugin}'s `onEnd` stage,
	 * so that if there's anything that should get written onto your filesystem, it will take place before the build concludes.
	*/
	public async endBuild(metafile: Metafile): Promise<void> {
		// if the user had originally set the `EsbuildBuildOption.write` to `true | undefined`,
		// then we shall emit the files onto the filesystem, now that the build has concluded.
		if (this.shouldWrite) { await metafile.writeFiles(this.shouldOverwrite) }
	}
}
