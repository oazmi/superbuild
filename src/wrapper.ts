import { object_assign, type MaybePromise } from "./deps.ts"
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
	OnResolveCallback,
	OnResolveOptions,
} from "./esbuild/strongtypes.ts"
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
		return this.basePlugin.setup(new SuperPluginBuild(this.ctx, build))
	}
}

export class SuperPluginBuild implements EsbuildPluginBuild {
	protected ctx: SuperBuild
	protected basePluginBuild: EsbuildPluginBuild
	public initialOptions: EsbuildBuildOptions
	public readonly esbuild: SuperBuild

	constructor(ctx: SuperBuild, base_plugin_build: EsbuildPluginBuild) {
		this.ctx = ctx
		this.basePluginBuild = base_plugin_build
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
		return this.basePluginBuild.onLoad(options, callback)
	}

	public onDispose(callback: () => void): void {
		return this.basePluginBuild.onDispose(callback)
	}

	public onTransform(options: OnTransformOptions, callback: OnTransformCallback): void {
		const { filter, namespace, loader } = options
		this.ctx.onTransformHandlers.push({ filter, namespace, loader, callback })
	}
}
