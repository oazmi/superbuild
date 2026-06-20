/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/

import { array_isEmpty, isNull, type MaybePromise } from "../deps.ts"
import type {
	EsbuildBuildOptions,
	EsbuildBuildResult,
	EsbuildOnEndResult,
	EsbuildOnStartResult,
	EsbuildPluginBuild,
	EsbuildResolveOptions,
	EsbuildResolveResult,
	OnLoadCallback,
	OnLoadOptions,
	OnLoadResult,
	OnResolveCallback,
	OnResolveOptions,
} from "../esbuild/strongtypes.ts"
import { concatArrays } from "../funcdefs.ts"
import type { OnTransformCallback, OnTransformOptions } from "../typedefs.ts"
import { SuperBuild } from "./build.ts"
import type { SuperBuildContext } from "./build_context.ts"


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
		this.ctx.longBuildController.decrementFilesCounter(path)
		return result
	}

	public onStart(callback: () => MaybePromise<EsbuildOnStartResult | null | void>): void {
		return this.basePluginBuild.onStart(callback)
	}

	public onEnd(callback: (result: EsbuildBuildResult) => MaybePromise<EsbuildOnEndResult | null | void>): void {
		return this.basePluginBuild.onEnd(callback)
	}

	public onResolve(options: OnResolveOptions, callback: OnResolveCallback): void {
		// TODO-ISSUE: esbuild's own native resolver never makes it to here because it gets resolved internally, bypassing the plugin api.
		// hence, our cached resolved check is rendered useless because of it.
		// in order to fix that, we will unfortunately have to mimic esbuild's native node resolver.
		// luckily for me, I had already done something similar in my `esbuild-plugin-deno` library, without adding dependencies. so it is achievable.
		const long_build_controller = this.ctx.longBuildController
		const new_callback: OnResolveCallback = async (args) => {
			const result = await callback(args)
			long_build_controller.cacheResolvedResult(result)
			return result
		}
		return this.basePluginBuild.onResolve(options, new_callback)
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
					// NOTE: the plugin writer must ensure that their import paths are pre-resolved (not relative, nor contextually dependent).
					if (imports.length > 0) { long_build_controller.pushImports(path, imports) }
					return transform_result satisfies OnLoadResult
				}
			}

			// at this point, we've already tried all available transformation handlers, but none produced a viable result,
			// hence we shall return the original result directly to esbuild.
			return onload_result as any
		}
		const long_build_interceptor_callback: OnLoadCallback = async (args) => {
			const result = await transform_interceptor_callback(args)
			// every loaded result indicates that a file has gone out of circulation,
			// and hence we must decrement the `remainingFilesCounter` of the long-build plugin.
			long_build_controller.decrementFilesCounter(args.path)
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
