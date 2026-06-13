/** this module contains base type definitions.
 *
 * @module
*/

import type { MaybePromise } from "./deps.ts"
import type { EsbuildLoaderType, EsbuildPartialMessage, OnLoadResult } from "./esbuild/strongtypes.ts"


/** type annotation for a relative path. */
export type RelativePath = string

/** type annotation for an absolute path. */
export type AbsolutePath = string

/** type annotation for any kind path. */
export type Path = RelativePath | AbsolutePath

/** an import map is just a key-value dictionary, where the value is an absolute path to a package's resource,
 * and the key associated with it is an alias used by your code to reference the resource's path.
 *
 * > [!note]
 * > the all keys that are provided are normalized first, so that a key like "hello/earth/../world" would transform to "hello/world".
 * > further reading on [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).
*/
export type ImportMap = Record<string, string>

/** a logging function that can be used as an alternative to the default `console.log` logger function. */
export type LoggerFunction = (...data: any[]) => void

/** these are the various formats of input and output specification accepted by esbuild for a single entity. */
export type EsbuildEntryPointType =
	| string // here, output name = input name.
	| { in: string, out: string } // the `in` field specifies the input-file/pacakge's name, and `out` specifies the output's name.
	| [input: string, output: string] // the first element specifies the input-file/pacakge's name, and second element specifies the output's name.

/** these are the various formats of entry points accepted by esbuild. */
export type EsbuildEntryPointsType = ImportMap | Array<EsbuildEntryPointType>

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
	key: K
	path: string
	with: Record<string, string>
}
