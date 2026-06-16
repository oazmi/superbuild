/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import { array_isEmpty, isArray, isNull, object_assign, parseFilepathInfo, type MaybePromise } from "./deps.ts"
import type {
	Esbuild,
	EsbuildBuildOptions,
	EsbuildBuildResult,
	EsbuildOnEndResult,
	EsbuildOnStartResult,
	EsbuildPlugin,
	EsbuildPluginBuild,
	EsbuildResolveOptions,
	EsbuildResolveResult,
	OnLoadCallback,
	OnLoadOptions,
	OnLoadResult,
	OnResolveCallback,
	OnResolveOptions,
} from "./esbuild/strongtypes.ts"
import { concatArrays } from "./funcdefs.ts"
import { longBuildPlugin, LongBuildPluginController } from "./plugin/long_build.ts"
import { nativeLoaderPlugin } from "./plugin/native_loader.ts"
import type { OnTransformCallback, OnTransformHandler, OnTransformOptions } from "./typedefs.ts"


export class SuperBuild implements Esbuild {
	declare public version: Esbuild["version"]
	declare public analyzeMetafile: Esbuild["analyzeMetafile"]
	declare public analyzeMetafileSync: Esbuild["analyzeMetafileSync"]
	// declare public build: Esbuild["build"]
	// declare public buildSync: Esbuild["buildSync"] // yucky, who uses sync nowdays?
	declare public context: Esbuild["context"]
	declare public formatMessages: Esbuild["formatMessages"]
	declare public formatMessagesSync: Esbuild["formatMessagesSync"]
	declare public initialize: Esbuild["initialize"]
	declare public transform: Esbuild["transform"]
	declare public transformSync: Esbuild["transformSync"]
	declare public stop: Esbuild["stop"]
	#esbuild: Esbuild

	constructor(base_esbuild: Esbuild) {
		this.#esbuild = base_esbuild
		const { build, buildSync, ...rest_props } = base_esbuild
		object_assign(this, rest_props)
	}

	public async build<T extends EsbuildBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof EsbuildBuildOptions>]: never
	}): Promise<EsbuildBuildResult<T>> {
		const new_ctx = new SuperBuildContext()
		return this.#esbuild.build(new_ctx.processPlugins(options))
	}

	public buildSync<T extends EsbuildBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof EsbuildBuildOptions>]: never
	}): EsbuildBuildResult<T> {
		const new_ctx = new SuperBuildContext()
		return this.#esbuild.buildSync(new_ctx.processPlugins(options))
	}
}

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
		options.plugins.push(nativeLoaderPlugin())
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

export type SuperPluginSetup = (build: SuperPluginBuild) => MaybePromise<void>

export class SuperPlugin implements EsbuildPlugin {
	// unfortunately, esbuild disallows any enumerable custom property to be set on the plugin `Object`.
	// hence, we declare all custom properties as private, so that esbuild does not discover them.
	// in the future, I may consider turning it into non-enumerable properties rather than private ones, if class extensions are desired.
	#basePlugin: EsbuildPlugin
	#ctx: SuperBuildContext

	public name: string
	public setup: (build: EsbuildPluginBuild) => MaybePromise<void>

	constructor(ctx: SuperBuildContext, base_plugin: EsbuildPlugin) {
		this.#basePlugin = base_plugin
		this.#ctx = ctx
		this.name = base_plugin.name
		// esbuild strips away the setup function from its host object, effectively removing the `this` context.
		// thus, we define the setup function as a closure rather than a method.
		const self = this
		this.setup = (build: EsbuildPluginBuild): MaybePromise<void> => {
			return self.#basePlugin.setup(new SuperPluginBuild(self.#ctx, build, self.name))
		}
	}
}

export class SuperPluginBuild implements EsbuildPluginBuild {
	protected ctx: SuperBuildContext
	protected basePluginBuild: EsbuildPluginBuild
	protected readonly pluginName: string
	public initialOptions: EsbuildBuildOptions
	public readonly esbuild: SuperBuild

	constructor(ctx: SuperBuildContext, base_plugin_build: EsbuildPluginBuild, plugin_name: string) {
		this.ctx = ctx
		this.basePluginBuild = base_plugin_build
		this.pluginName = plugin_name
		this.initialOptions = base_plugin_build.initialOptions
		// the inner `PluginBuild["esbuild"]` gets replaced by a new `SuperBuild` wrapper.
		// TODO: we might want to add a "parent" field to `SuperBuild`, so that it can communicate with the parent super-build,
		// and also `resolve()` with respect to the parent's plugins and `pluginData` context.
		this.esbuild = new SuperBuild(base_plugin_build.esbuild)
	}

	public resolve(path: string, options?: EsbuildResolveOptions): Promise<EsbuildResolveResult> {
		const result = this.basePluginBuild.resolve(path, options)
		// we must decrement the `remainingFilesCounter` of the long-build plugin,
		// because the `resolve` function will trigger its `onResolve` hook,
		// leading to a double count (which we compensate for by decrementing).
		this.ctx.longBuildController.remainingFilesCounter--
		return result
	}

	public onStart(callback: () => MaybePromise<EsbuildOnStartResult | null | void>): void {
		return this.basePluginBuild.onStart(callback)
	}

	public onEnd(callback: (result: EsbuildBuildResult) => MaybePromise<EsbuildOnEndResult | null | void>): void {
		return this.basePluginBuild.onEnd(callback)
	}

	public onResolve(options: OnResolveOptions, callback: OnResolveCallback): void {
		return this.basePluginBuild.onResolve(options, callback)
	}

	public onLoad(options: OnLoadOptions, callback: OnLoadCallback): void {
		const
			onTransformHandlers = this.ctx.onTransformHandlers,
			long_build_controller = this.ctx.longBuildController
		const transform_interceptor_callback: OnLoadCallback = async (args) => {
			const
				{ namespace, path, suffix, with: withAttrs } = args,
				onload_result = await callback(args)
			if (isNull(onload_result?.contents)) { return }
			// if any error occurs during the plugin's `onLoad` callback, we shall halt the build altogether by passing esbuild the error early.
			// also, since generic `loader`s are not permitted by esbuild, so we'll use `as any` to bypass the type error, since the build has failed anyway.
			if (!array_isEmpty(onload_result.errors ?? [])) { return onload_result as any }
			// TODO: inform the user that when `loader` is set to `undefined`, it will get set to an empty string before being transferred to their `onTransform` hook,
			// instead of being converted into "js" (which is esbuild's default interpretation).
			// this is to allow for more flexibility when a user explicitly decides to return a `"js"` loader content vs a more ambiguous empty `""` loader content.
			const { contents, loader = "", resolveDir = "", pluginData } = onload_result

			for (const handler of onTransformHandlers) {
				const { pluginName: transformerPluginName, filter, namespace: handler_ns, loader: handler_loader } = handler
				if (
					filter.test(path)
					&& (handler_ns ? (handler_ns === namespace) : true)
					&& (handler_loader ? handler_loader === loader : true)
				) {
					const { imports = [], ...transform_result } = await handler.callback({
						contents: contents as (string | Uint8Array<ArrayBuffer>),
						loader, namespace, path, pluginData, resolveDir, suffix, with: withAttrs,
					}) ?? {}
					// if the transformation did not generate any result (i.e. void) or generated no `content`, then we shall move to testing the next transformation handler.
					if (isNull(transform_result.contents)) { continue }
					// there is no possibility of an error from the `onLoad` hook to be introduced, since we've already ruled it out before the loop.
					// transform_result.errors = concatArrays(transform_result.errors, onload_result.errors)
					transform_result.warnings = concatArrays(transform_result.warnings, onload_result.warnings)
					transform_result.watchDirs = concatArrays(transform_result.watchDirs, onload_result.watchDirs)
					transform_result.watchFiles = concatArrays(transform_result.watchDirs, onload_result.watchFiles)
					transform_result.pluginName ??= transformerPluginName
					// TODO: we must resolve all `imports` with respect to the current importer's `path`, and the currently available `pluginData` (from the `onLoad`).
					// OR: maybe we should look at `args.importer` during the long build's `onResolve` stage, and then take action from there?
					if (imports.length > 0) { long_build_controller.pushImports(path, imports) }
					return transform_result satisfies OnLoadResult
				}
			}

			// at this point, we've already tried all available transformation handlers, but none produced a viable result,
			// hence we shall return the original result directly to esbuild.
			return onload_result as any
		}
		const long_build_interceptor_callback: OnLoadCallback = (args) => {
			const result = transform_interceptor_callback(args)
			// every loaded result indicates that a file has gone out of circulation,
			// and hence we must decrement the `remainingFilesCounter` of the long-build plugin.
			long_build_controller.remainingFilesCounter--
			if (long_build_controller.remainingFilesCounter <= 0) {
				long_build_controller.buildResolves[long_build_controller.buildNumber]()
			}
			return result
		}

		return this.basePluginBuild.onLoad(options, long_build_interceptor_callback)
	}

	public onDispose(callback: () => void): void {
		return this.basePluginBuild.onDispose(callback)
	}

	public onTransform(options: OnTransformOptions, callback: OnTransformCallback): void {
		const { filter, namespace, loader } = options
		this.ctx.onTransformHandlers.push({ pluginName: this.pluginName, filter, namespace, loader, callback })
	}
}
