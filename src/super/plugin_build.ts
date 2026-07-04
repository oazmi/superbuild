/** the {@link SuperPluginBuild} class extends `esbuild.PluginBuild` to introduce additional functionality to esbuild's plugin api.
 *
 * @module
*/

import { array_isEmpty, isNull, isRecord, pathToPosixPath } from "../deps.ts"
import type {
	EsbuildBuildOptions,
	EsbuildOnEndCallback,
	EsbuildOnStartCallback,
	EsbuildPluginBuild,
	EsbuildResolveOptions,
	EsbuildResolveResult,
	OnLoadArgs,
	OnLoadCallback,
	OnLoadOptions,
	OnLoadResult,
	OnResolveArgs,
	OnResolveCallback,
	OnResolveOptions,
} from "../esbuild/strongtypes.ts"
import { concatArrays } from "../funcdefs.ts"
import type { emissionsDriverPlugin } from "../plugins/emissions_driver.ts"
import type { EsbuildNativeResolver, nativeReplicaPlugin } from "../plugins/native_replica.ts"
import { SuperBuild } from "./build.ts"
import type { SuperBuildContext } from "./build_context.ts"
import type { BundledInputFile, OnEmitCallback, OnEmitOptions, OnTransformCallback, OnTransformOptions } from "./typedefs.ts"
import { INNER_PLUGIN_BUILD } from "./typedefs.ts"


/** holds the original user/plugin-provided `OnResolveArgs.pluginData` when the {@link SuperPluginBuild.resolve} method is invoked by some plugin.
 *
 * its presence signifies if the caller of the `onResolve` methods is actually `build.resolve(...)`,
 * in order to hint that the resolved path should neither be cached, nor should the file counter be incremented,
 * as there is no direct "resource loading" that will occur as a consequence of this path resolution.
*/
const ORIGINAL_PLUGINDATA = Symbol()

/** in the context of {@link ORIGINAL_PLUGINDATA}, this symbol indicates that a plugin data does not exist inside the `options` passed to {@link SuperPluginBuild.resolve}. */
const ORIGINAL_PLUGINDATA_DNE = Symbol()

const wrap_resolve_call_options = (options: EsbuildResolveOptions = {}): EsbuildResolveOptions => {
	const
		original_plugindata = ("pluginData" in options) ? options.pluginData : ORIGINAL_PLUGINDATA_DNE,
		wrapped_options: EsbuildResolveOptions = { ...options, pluginData: { [ORIGINAL_PLUGINDATA]: original_plugindata } }
	return wrapped_options
}

const unwrap_resolve_call_options = (
	args: OnResolveArgs & { pluginData: { [ORIGINAL_PLUGINDATA]: any } }
): OnResolveArgs => {
	const
		original_plugindata = args.pluginData[ORIGINAL_PLUGINDATA],
		unwrapped_args = { ...args, pluginData: original_plugindata }
	if (original_plugindata === ORIGINAL_PLUGINDATA_DNE) { delete unwrapped_args["pluginData"] }
	return unwrapped_args
}

const is_wrapped_resolve_call = (args: OnResolveArgs): args is (
	OnResolveArgs & { pluginData: { [ORIGINAL_PLUGINDATA]: any } }
) => { return isRecord(args.pluginData) ? (ORIGINAL_PLUGINDATA in args.pluginData) : false }

/** this is the extension of `esbuild.PluginBuild` that introduces additional functionality to esbuild's plugin api. */
export class SuperPluginBuild implements EsbuildPluginBuild {
	protected ctx: SuperBuildContext
	protected basePluginBuild: EsbuildPluginBuild
	protected readonly pluginName: string
	public initialOptions: EsbuildBuildOptions
	public readonly esbuild: SuperBuild

	/** a reference to the original {@link EsbuildPluginBuild} that was used to construct this class.
	 *
	 * its presence can be used to check whether or not your plugin is running inside a super-build.
	 * gaining access to esbuild's original `PluginBuild` can be useful in certain situations where bypassing super-build is necessary,
	 * such as in the case of the {@link nativeReplicaPlugin}, and the underlying {@link EsbuildNativeResolver} that it uses.
	*/
	public readonly [INNER_PLUGIN_BUILD]: EsbuildPluginBuild

	constructor(ctx: SuperBuildContext, base_plugin_build: EsbuildPluginBuild, plugin_name: string) {
		this.ctx = ctx
		this.basePluginBuild = base_plugin_build
		this.pluginName = plugin_name
		this.initialOptions = base_plugin_build.initialOptions
		// the inner `PluginBuild["esbuild"]` gets replaced by a new `SuperBuild` wrapper.
		// TODO: we might want to add a "parent" field to `SuperBuild`, so that it can communicate with the parent super-build,
		// and also `resolve()` with respect to the parent's plugins and `pluginData` context.
		this.esbuild = new SuperBuild(base_plugin_build.esbuild)
		this[INNER_PLUGIN_BUILD] = base_plugin_build
	}

	public resolve(path: string, options: EsbuildResolveOptions = {}): Promise<EsbuildResolveResult> {
		// `SuperPluginBuild.resolve` calls should not influence the long-build plugin's `remainingFilesCounter` at all
		// (nor should its result get cached by `LongBuildController.cacheResolvedResult(...)`).
		// however, the `onResolve` hooks have no knowledge of where the path-resolution request comes from;
		// it could either come directly from esbuild (after traversing the parent resource's imports),
		// or it could come from a plugin utilizing `build.resolve(...)`.
		// thus, in order to make `SuperPluginBuild.resolve` calls discoverable, we hijack the `options.pluginData` here,
		// and keep a copy of the original `pluginData` by using the `wrap_resolve_call_options` function.
		// then, the overloaded `onResolve` hook will first check to see if the special `options.pluginData[ORIGINAL_PLUGINDATA]` symbol is present:
		// - if it is, then that will be an indication of `SuperPluginBuild.resolve` being used, in which case we skip caching altogether,
		//   and also decrement the file counter once to compensate for the default increment performed by the long-build plugin's `onResolve` hook.
		// - if the symbol is not present, then it will indicate that it is a natural path-resolution request coming from esbuild (i.e. imports traversal).
		//   in such cases, we carry out our resolved-path cache registration like normal.
		return this.basePluginBuild.resolve(path, wrap_resolve_call_options(options))
	}

	public onStart(callback: EsbuildOnStartCallback): void {
		return this.basePluginBuild.onStart(callback)
	}

	public onEnd(callback: EsbuildOnEndCallback): void {
		/** the {@link emissionsDriverPlugin | "emissions driver" plugin's} `onEnd` stage performs calling each of the registered callbacks. */
		this.ctx.onEndHandlers.push({ pluginName: this.pluginName, callback })
	}

	public onResolve(options: OnResolveOptions, callback: OnResolveCallback): void {
		// NOTE: esbuild's own native resolver never makes it to here because it gets resolved internally, bypassing the plugin api.
		// hence, our cached resolved check is rendered useless because of it.
		// however, this is where our `nativeReplicaPlugin` comes in; it mimics esbuild's native node-resolution through the api layer,
		// and hence all path resolutions get intercepted here by super-build.
		const long_build_controller = this.ctx.longBuildController
		const new_callback: OnResolveCallback = async (args) => {
			// see the long comment under `SuperPluginBuild.resolve` to understand why we try to detect if the caller of this `onResolve`
			// hook comes naturally from esbuild, or if it is a plugin that is performing a `build.resolve` call.
			const
				is_resolve_call = is_wrapped_resolve_call(args),
				result = await callback(is_resolve_call ? unwrap_resolve_call_options(args) : args),
				is_valid_result = !isNull(result?.path) || (result?.external === true)
			if (is_valid_result) {
				// if the caller was not esbuild (i.e. a `buildresolve(...)` was performed by a plugin),
				// then we need only to decrement the file counter to compensate for the initial increment by the long-build plugin's `onResolve` hook.
				// this is because the result of this path resolution will not directly result in the creation of a new file (i.e. an `onLoad` operation),
				// nor will this resolved path contribute to any future path resolution in terms of path caching by esbuild.
				if (is_resolve_call) { long_build_controller.decrementFilesCounter(result.path) }
				// but if the caller was esbuild, then the resolved path will get cached and esbuild will entirely skip loading (i.e. `onLoad` operation)
				// the same file again if the resolved `namespace:path` pair had been encountered before (i.e. resource caching).
				// thus, the file counter must be decremented immediately if the resolved path had been previously cached (since no loading will occur for it anymore),
				// or if the resolved path points towards a new file, then the file counter's decrement will occur later after it has passed through its `onLoad` or `onTransform` stage.
				else { long_build_controller.cacheResolvedResult(result) }
			}
			return result
		}
		return this.basePluginBuild.onResolve(options, new_callback)
	}

	public onLoad(options: OnLoadOptions, callback: OnLoadCallback): void {
		const
			resolvedResourceRegistry = this.ctx.resolvedResourceRegistry,
			onTransformHandlers = this.ctx.onTransformHandlers,
			long_build_controller = this.ctx.longBuildController

		const transform_interceptor_callback = async (args: OnLoadArgs): Promise<void | [
			onload_results: OnLoadResult | null | undefined,
			additional_info: Pick<BundledInputFile, "loader" | "transformLoader" | "emitData">
		]> => {
			const
				{ namespace, path, suffix, with: with_attrs } = args,
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
					const { imports = [], emitData, ...transform_result } = await handler.callback({
						contents: contents as (string | Uint8Array<ArrayBuffer>),
						loader, namespace, path, pluginData, resolveDir, suffix, with: with_attrs,
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
					if (imports.length > 0) {
						const
							importer_path = namespace === "file" ? pathToPosixPath(path) : path,
							importer_key = namespace + ":" + importer_path
						long_build_controller.steps.at(-1)!.pushImports(importer_key, imports)
					}
					return [
						transform_result satisfies OnLoadResult,
						{ loader, transformLoader: transform_result.loader ?? "", emitData }
					]
				}
			}

			// at this point, we've already tried all available transformation handlers, but none produced a viable result,
			// hence we shall return the original result directly to esbuild.
			return [onload_result, { emitData: undefined, loader: loader, transformLoader: loader }]
		}

		const resource_registry_interceptor_callback: OnLoadCallback = async (args) => {
			const [result, additional_info] = await transform_interceptor_callback(args) ?? []
			if (!isNull(result)) {
				const
					{ path: _path, namespace: _namespace, suffix, with: with_attrs } = args,
					{ emitData, loader, transformLoader } = additional_info!,
					path = pathToPosixPath(_path),
					namespace = _namespace ? _namespace : "file",
					key = namespace + ":" + path,
					contributing_emit_file: BundledInputFile = { path, namespace, suffix, loader, transformLoader, emitData }
				resolvedResourceRegistry.set(key, contributing_emit_file)
			}
			return result
		}

		const long_build_interceptor_callback: OnLoadCallback = async (args) => {
			const result = await resource_registry_interceptor_callback(args)
			// every loaded result indicates that a file has gone out of circulation,
			// and hence we must decrement the `remainingFilesCounter` of the long-build plugin.
			if (!isNull(result)) { long_build_controller.decrementFilesCounter(args.path) }
			// TODO: our `nativeReplicaPlugin` is expected to load everything that is left uncaptured/unloaded.
			// yet, if something comes its way (i.e. the final loader) but fails to get loaded with a valid `result`,
			// then our plugin should throw a warning to indicate that either something is wrong with our
			// `nativeReplicaPlugin` itself, or if the input resolved path may be incorrect.
			return result
		}

		return this.basePluginBuild.onLoad(options, long_build_interceptor_callback)
	}

	public onDispose(callback: () => void): void {
		return this.basePluginBuild.onDispose(callback)
	}

	/** TODO: add documentation and usage examples. */
	public onTransform(options: OnTransformOptions, callback: OnTransformCallback): void {
		const { filter, namespace, loader } = options
		this.ctx.onTransformHandlers.push({ pluginName: this.pluginName, filter, namespace, loader, callback })
	}

	/** TODO: implement the mechanism inside `onEnd`, and then add documentation and usage examples. */
	public onEmit(options: OnEmitOptions, callback: OnEmitCallback): void {
		const { filter, inputs } = options
		this.ctx.onEmitHandlers.push({ pluginName: this.pluginName, filter, inputs, callback })
	}
}
