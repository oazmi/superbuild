import { array_isEmpty, isNull, object_assign, type MaybePromise } from "./deps.ts"
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

	/** contains a list of transformation handlers that will be used for matching contents returned by the plugins' `onLoad` hooks,
	 * in order to transfer them to the registered {@link SuperPluginBuild.onTransform} hooks.
	 *
	 * > [!note]
	 * > for internal use only!
	*/
	public onTransformHandlers: OnTransformHandler[] = []

	constructor(base_esbuild: Esbuild) {
		this.#esbuild = base_esbuild
		const { build, buildSync, ...rest_props } = base_esbuild
		object_assign(this, rest_props)
	}

	public async build<T extends EsbuildBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof EsbuildBuildOptions>]: never
	}): Promise<EsbuildBuildResult<T>> {
		options.plugins = options.plugins?.map((plugin) => (new SuperPlugin(this, plugin)))
		return this.#esbuild.build(options)
	}

	public buildSync<T extends EsbuildBuildOptions>(options: T & {
		[Key in Exclude<keyof T, keyof EsbuildBuildOptions>]: never
	}): EsbuildBuildResult<T> {
		options.plugins = options.plugins?.map((plugin) => (new SuperPlugin(this, plugin)))
		return this.#esbuild.buildSync(options)
	}
}

export class SuperPlugin implements EsbuildPlugin {
	protected basePlugin: EsbuildPlugin
	protected ctx: SuperBuild
	public name: string

	constructor(ctx: SuperBuild, base_plugin: EsbuildPlugin) {
		this.basePlugin = base_plugin
		this.ctx = ctx
		this.name = base_plugin.name
	}

	public setup(build: EsbuildPluginBuild): MaybePromise<void> {
		return this.basePlugin.setup(new SuperPluginBuild(this.ctx, build, this.name))
	}
}

export class SuperPluginBuild implements EsbuildPluginBuild {
	protected ctx: SuperBuild
	protected basePluginBuild: EsbuildPluginBuild
	protected readonly pluginName: string
	public initialOptions: EsbuildBuildOptions
	public readonly esbuild: SuperBuild

	constructor(ctx: SuperBuild, base_plugin_build: EsbuildPluginBuild, plugin_name: string) {
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
		return this.basePluginBuild.resolve(path, options)
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
		const onTransformHandlers = this.ctx.onTransformHandlers
		const new_callback: OnLoadCallback = async (args) => {
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
						contents: contents as (string | Uint8Array<ArrayBuffer>), loader, namespace, path, pluginData, resolveDir, suffix, with: withAttrs
					}) ?? {}
					// if the transformation did not generate any result (i.e. void) or generated no `content`, then we shall move to testing the next transformation handler.
					if (isNull(transform_result.contents)) { continue }
					// there is no possibility of an error from the `onLoad` hook to be introduced, since we've already ruled it out before the loop.
					// transform_result.errors = concatArrays(transform_result.errors, onload_result.errors)
					transform_result.warnings = concatArrays(transform_result.warnings, onload_result.warnings)
					transform_result.watchDirs = concatArrays(transform_result.watchDirs, onload_result.watchDirs)
					transform_result.watchFiles = concatArrays(transform_result.watchDirs, onload_result.watchFiles)
					transform_result.pluginName ??= transformerPluginName
					// TODO: handle `imports` via the recursive "longbuild.js" + sub-builds technique.
					return transform_result satisfies OnLoadResult
				}
			}

			// at this point, we've already tried all available transformation handlers, but none produced a viable result,
			// hence we shall return the original result directly to esbuild.
			return onload_result as any
		}
		return this.basePluginBuild.onLoad(options, new_callback)
	}

	public onDispose(callback: () => void): void {
		return this.basePluginBuild.onDispose(callback)
	}

	public onTransform(options: OnTransformOptions, callback: OnTransformCallback): void {
		const { filter, namespace, loader } = options
		this.ctx.onTransformHandlers.push({ pluginName: this.pluginName, filter, namespace, loader, callback })
	}
}
