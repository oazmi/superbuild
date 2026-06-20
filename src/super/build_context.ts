/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import { isArray, parseFilepathInfo } from "../deps.ts"
import type { EsbuildBuildOptions } from "../esbuild/strongtypes.ts"
import { longBuildPlugin, LongBuildPluginController } from "../plugins/long_build.ts"
import { nativeReplicaPlugin } from "../plugin/native_replica.ts"
import type { OnTransformHandler } from "./typedefs.ts"
import { SuperPlugin } from "./plugin.ts"


/** a centralized context is created for each individual {@link SuperBuild.build} call. */
export class SuperBuildContext {
	/** contains a list of transformation handlers that will be used for matching contents returned by the plugins' `onLoad` hooks,
	 * in order to transfer them to the registered {@link SuperPluginBuild.onTransform} hooks.
	 *
	 * > [!note]
	 * > for internal use only!
	*/
	public onTransformHandlers: OnTransformHandler[] = []

	public longBuildController: LongBuildPluginController

	constructor() {
		this.longBuildController = new LongBuildPluginController()
	}

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
		const long_build_filename = `${controller.buildNumber}${controller.baseFilename}`
		const entryPoints = (options.entryPoints ??= [])
		if (isArray(entryPoints)) {
			entryPoints.push(long_build_filename)
		} else {
			// stripping away the ".js" extension from the filename.
			entryPoints[long_build_filename] = parseFilepathInfo(long_build_filename).basename
		}
		return options
	}
}
