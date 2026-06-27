/** the {@link SuperBuildContext} is a centralized context that is created for each individual {@link SuperBuild.build} call.
 *
 * its main purpose is to inject some required plugins at their correct position, hold a few stateful objects,
 * and create a wrapper on top of the user's provided plugins so that the extended plugin api becomes available to them.
 *
 * @module
*/

import { isArray, parseFilepathInfo } from "../deps.ts"
import type { EsbuildBuildOptions, EsbuildOnEndCallback } from "../esbuild/strongtypes.ts"
import { LongBuildController, longBuildPlugin } from "../plugins/long_build.ts"
import { nativeReplicaPlugin } from "../plugins/native_replica.ts"
import { SuperPlugin } from "./plugin.ts"
import type { SuperPluginBuild } from "./plugin_build.ts"
import type { OnEmitCallback, OnEmitOptions, OnTransformCallback, OnTransformOptions, OnTransformResult } from "./typedefs.ts"


export interface OnTransformHandler extends OnTransformOptions {
	pluginName: string
	callback: OnTransformCallback
}

export interface OnEmitHandler extends OnEmitOptions {
	pluginName: string
	callback: OnEmitCallback
}

export interface OnEndHandler {
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

	/** the controller used for commanding the state of the "long build" plugin. */
	public longBuildController: LongBuildController

	constructor() {
		this.longBuildController = new LongBuildController()
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
		return options
	}
}
