/** this module contains type definitions for super-build's extended plugin api.
 *
 * @module
*/

import type { MaybePromise } from "../deps.ts"
import type { EsbuildLoaderType, EsbuildPartialMessage, OnLoadResult } from "../esbuild/strongtypes.ts"


export interface OnTransformOptions {
	filter: RegExp
	namespace?: string
	loader?: string
}

export interface OnTransformArgs {
	// TODO: will these fields be useful?
	// importer: string
	// kind: ImportKind

	/** the resolved path of the {@link contents}. */
	path: string

	/** the namespace inherited from the `onLoad` hook (which gets inherited from the `onResolve` hook). */
	namespace: string

	/** the loader that is supposed to be used for this {@link contents} for the transformation. */
	loader: string

	/** any url-suffix string that is present in the {@link path}. */
	suffix: string

	/** the loaded content that is to be transformed. */
	contents: string | Uint8Array<ArrayBuffer>

	/** the plugin data returned by the `onLoad` hook.
	 *
	 * > [!important]
	 * > esbuild strips away any plugin-data when it resolves/loads natively.
	 * > hence, in order to preserve it during native loading,
	 * > we might have to instill a `"file"` namespace loader that will capture all native loading cases,
	 * > and then perform the loading ourselves, followed by preserving the plugin-data.
	 * >
	 * > TODO: actually, right now, I'm intentionally stripping away the `pluginData` in my "native loader".
	 * > I'll have to see how much of an inconvenience it becomes before I give in to preserving the plugin-data.
	 * > otherwise, if I can manage to write plugins without needing this feature, then there's no reason to add it.
	*/
	pluginData: any

	/** the `resolveDir` (used for node-resolution) returned by the loader.
	 *
	 * > [!note]
	 * > when the `onLoad` hook function returns an empty/undefined `resolveDir`, this value turns into an empty string.
	*/
	resolveDir: string

	/** the `with` attribute argument passed to the `onLoad` hook. */
	with: Record<string, string>
}

export interface OnTransformResult {
	/** insert your plugin's name to override the current plugin name that will be used for error printing. */
	pluginName?: string

	/** the transformed/transpiled contents that will be returned to esbuild. */
	contents?: string | Uint8Array<ArrayBuffer>

	/** if the {@link contents} needs to be transformed/minified natively by esbuild again
	 * (in addition to discovering additional imports), use one of the native loaders provided by esbuild.
	*/
	loader?: EsbuildLoaderType

	/** insert plugin-data to be passed onto the dependencies' `onResolve` hook's `arg.pluginData`.
	 *
	 * if you wish to pass on the incoming {@link OnTransformArgs.pluginData} from the prior `onLoad` hook,
	 * you will need to explicitly pass it over as a return argument, otherwise the plugin-data will get lost.
	 * so, keep this in mind when designing transformation hooks, because you wouldn't want to ruin any plugin-data that some plugin was anticipating.
	*/
	pluginData?: any

	// TODO: I'll add this later. also, will `key` be necessary? sure the `key` will be convenient, but the position within the array will also indicate the location of the import.
	imports?: ImportEntity[]

	/** if any fatal error(s) occur during the transformation, pass it as a return value so that the build gets immediately halted. */
	errors?: EsbuildPartialMessage[]

	/** if any warning(s) occur during the transformation, pass it as a return value so that esbuild prints out a warning immediately. */
	warnings?: EsbuildPartialMessage[]

	/** add a list of local files to watch for mutation in order to trigger a reload of the original loader hook.
	 * (I think the paths need to be an absolute path.)
	 *
	 * any files added to this array will be combined with the {@link OnLoadResult.watchFiles} list of the prior `onLoad` hook function.
	*/
	watchFiles?: string[]

	/** add a list of directories to watch for mutation in order to trigger a reload.
	 * (I think the paths need to be an absolute path.)
	 *
	 * any directories added to this array will be combined with the {@link OnLoadResult.watchDirs} list of the prior `onLoad` hook function.
	*/
	watchDirs?: string[]
}

/** this is your `onTransform` hook function that gets called,
 * if the handler associated with it allows a certain result from an `onLoad` hook to pass through its filter ({@link OnTransformOptions}).
 *
 * if your return value is nullable (`null` or `undefined`), then the next matching `onTransform` hook function will try to transform the incoming loaded contents.
 * if no transformation hook returns a non-nullable after all matches have been made,
 * then the loaded contents from the `onLoad` hook will be passed to esbuild as is.
*/
export type OnTransformCallback = (args: OnTransformArgs) => MaybePromise<OnTransformResult | null | undefined>

export interface OnTransformHandler {
	pluginName: string
	filter: RegExp
	namespace?: string
	loader?: string
	callback: OnTransformCallback
}

export interface ImportEntity<K = any> {
	/** include a unique key that you can use to trace back the imported entity,
	 * because the `path` of the import in the bundled output will differ, whereas this key will remain the same.
	*/
	key: K

	/** the **absolute/resolved** path of the resource.
	 *
	 * do not insert unresolved or relative paths!
	 * this is a strict design choice because you should ideally run a sub-build to acquire the resolved paths of your dependencies.
	 * of course, nothing is stopping your `onTransform` hook from either:
	 * - using the `build.resolve` of the sub-build's parent `PluginBuild` (thereby not requiring re-instantiation of the plugins).
	 * - re-instantiating the plugins in the sub-build, so that the path-resolution logic remains similar. although, this can have drawbacks;
	 *   for instance, my `esbuild-plugin-deno`'s `setup` method is _generated_ based on the user's initial config
	 *   (containing contextual information, such as the location of `deno.json`), which may not be desired in the sub-build
	 *   (if for instance, the thing being resolved for the sub-build is actually inside a different package/scope than the primary package).
	 *
	 * because there is a variablility in how you can potentially approach path resolution,
	 * we leave it up to the plugin designer to decide how they would want to resolve the paths in their `onTransform` hook's returned imports,
	 * rather than performing a default action ourselves.
	*/
	path: string

	/** associate a `with` import attribute to the import. */
	with?: Record<string, string>

	// will I need the information below?
	// namespace?: string // specify a namespace for the loader to be used.
	// pluginData?: any // specify any custom plugin data that should be used.
	// kind: EsbuildOutputsImportKind // for now, it can only be a regular js dynamic import, since that is what the long-build performs.
	// external?: boolean
}
