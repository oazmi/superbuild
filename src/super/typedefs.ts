/** this module contains type definitions for super-build's extended plugin api.
 *
 * @module
*/

import type { AutoSuggestOrString, MaybePromiseOrNull, Optional } from "../deps.ts"
import type { EsbuildLoaderType, EsbuildPartialMessage, OnLoadResult } from "../esbuild/strongtypes.ts"
import type { EsbuildNativeResolver, nativeReplicaPluginSetup } from "../plugins/native_replica.ts"
import type { SuperPluginBuild } from "./plugin_build.ts"


/** this symbol gives you access to the **true** internal `PluginBuild` object that was used for constructing a {@link SuperPluginBuild}.
 * it can be used as a means to check whether you're inside super-build or not,
 * or if you have a situation where it is necessary for super-build to be bypassed,
 * such as in the case of {@link EsbuildNativeResolver}, which is spawned by {@link nativeReplicaPluginSetup}.
*/
export const INNER_PLUGIN_BUILD = Symbol()

/** a return value of the {@link OnEmitResult.contents} that indicates that no file should be emitted for this resource. */
export const EMIT_EMPTY = Symbol()

export interface OnTransformOptions {
	filter: RegExp
	namespace?: string
	loader?: AutoSuggestOrString<EsbuildLoaderType>
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
	loader: AutoSuggestOrString<EsbuildLoaderType>

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

	/** pass some arbitrary data from the transformation stage to the emit stage.
	 * TODO: implement. I'll also need to strip away this field before passing the result to esbuild, otherwise it'll go maj fr fr.
	*/
	// emitData?: any

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
export type OnTransformCallback = (args: OnTransformArgs) => MaybePromiseOrNull<OnTransformResult>

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

/** a single input file filteration rule used in {@link OnEmitOptions}. */
export interface OnEmitOptions_InputFilter {
	/** a resolved path name filter of the input resource that is to be matched by at least one of the emitted file's {@link OnEmitArgs.inputs | inputs}. */
	filter: RegExp

	/** specify an optional namespace in which the loaded input file must be part of. */
	namespace?: string

	/** specify an optional loader which should have been used to load this input file by the {@link SuperPluginBuild.onLoad} hook. */
	loader?: AutoSuggestOrString<EsbuildLoaderType>

	/** specify an optional transform-loader which should have been used to load this input file during the transformation hook ({@link SuperPluginBuild.onTransform}).
	 * if no {@link SuperPluginBuild.onTransform} hook captured this input resource,
	 * then the `loader` value from the prior {@link SuperPluginBuild.onLoad} stage will be used to match against this option.
	*/
	transformLoader?: EsbuildLoaderType
}

export interface OnEmitOptions {
	/** a filter for the {@link OnEmitArgs.outputPath | output filename} of a file that is to be emitted. */
	filter: RegExp

	/** a filter for specifying which input resources should be part of what constitutes this output file.
	 *
	 * for instance, if one were to bundle entrypoints `A` and `B`, and `A` depended on `X` and `Y`, while `B` depended on `Y` and `Z`,
	 * then the emitted bundled file corresponding to entrypoint `A` will have all three `A`, `X`, and `Y` show up in its `inputs` array.
	 * similarly, the emitted bundled file corresponding to entrypoint `B` will have all three `B`, `Y`, and `Z` show up in its `inputs` array.
	 *
	 * when multiple input filters are specified, they (the filters) will all need to be satisfied simultaneously (logical AND)
	 * by the list of available {@link OnEmitArgs.inputs} of the emitted resource. for instance, for the scenario mentioned prior:
	 * - if `inputs = [{ filter: /A/ }, { filter: /Y/ }]`,
	 *   then the emitted file corresponding to entrypoint `A` will be matched, but not `B` (since it has no input with the name `A`).
	 * - if `inputs = [{ filter: /Y/ }]`,
	 *   then the emitted files corresponding to both entrypoints `A` and `B` will be matched (since they both incorporate the dependency file `Y`).
	 * - if `inputs = [{ filter: /Y/ }, { filter: /Z/ }]`,
	 *   then only the emitted file corresponding to entrypoint `B` will be matched, and not `A` (since `A` does not incorporate the dependency file `Z`).
	*/
	inputs?: Array<OnEmitOptions_InputFilter>
}

// TODO: it'll be cool if the return value of the `onEmit` callback can declare a different output directory path,
// and then also specify if the paths of the resources linked to this file, and the files this file imports should be updated as well.
// although, for such a feature, we will need to first produce a dependency graph, which will require the use of esbuild's `metafile` option.

/** a description of an input file that was bundled into a physical output file ({@link OnEmitArgs}). */
export interface BundledInputFile {
	/** the original (absolute) resolved path (return value of the `onResolve` hook) of this bundled resource. */
	path: string

	/** the namespace inherited from the `onTransform` hook
	 * (which gets inherited from the `onLoad` hook, and the `onResolve` hook prior to it).
	*/
	namespace: string

	/** the `onLoad` loader that was used for this resource. equivalent to {@link OnEmitOptions.loader}. */
	loader: string

	/** the `onTransform` loader that was used for this resource during its transformation stage.
	 * if the resource did not go through a transformation stage, then this value will be the same as {@link loader}.
	 * moreover, this value is equivalent to the {@link OnEmitOptions.transformLoader} provided in the filteration options.
	*/
	transformLoader: string

	/** any url-suffix string that might present in the {@link path | resolved path}. */
	suffix: string

	/** arbitrary data passed from the {@link OnTransformResult.emitData | transformation stage} to the emit stage. */
	emitData: any
}

export interface OnEmitArgs {
	/** the output path of this bundled resource, relative to the `outdir` directory, always in posix format. */
	outputPath: string

	/** a list of input resources that were bundled into this resource (by esbuild), or were chunked by esbuild for this resource. */
	inputs: Array<BundledInputFile>

	/** a list of resource imports that were included in the build for this resource.
	 * these, however, are not currently _bundled_ into the contents of your resource;
	 * they're still external resources that your transformed file will need to reference (re-incorporate) in order to import during runtime.
	*/
	imports: Array<Optional<ImportEntity, "key">>

	/** the transformed and/or bundled content that may need to have the linked {@link imports} re-incorporated into it. */
	contents: Uint8Array<ArrayBuffer>
}

export interface OnEmitResult {
	/** provide an alternate path to place this resource. if a relative path is provided (which is what is recommended),
	 * then this file will be placed relative to the output directory specified in the initial build options.
	*/
	path?: string

	/** if an alternate {@link path} is to be used, then should the dependents of this resource have their
	 * {@link OnEmitArgs.imports} updated to reflect the new path of this resource?
	*/
	updateDependents?: boolean

	/** the contents of the file after you've re-incorporated the imported/dependency links into it.
	 *
	 * if left `undefined`, then the original {@link OnEmitArgs.contents} will be used as its value.
	 * and if {@link EMIT_EMPTY} was used, then it would indicate that this resource file should not be emitted
	 * (i.e. it should be deleted, and never written onto your disk).
	*/
	contents?: typeof EMIT_EMPTY | string | Uint8Array<ArrayBuffer>
}

/** this is your `onEmit` hook function that gets called,
 * if the handler associated with it allows a certain result from an `onLoad` hook to pass through its filter ({@link OnEmitOptions}).
 *
 * if your return value is nullable (`null` or `undefined`), then the next matching `onEmit` hook function will try to mutate the finalized loaded/transformed contents.
 * if no emit hook returns a non-nullable after all matches have been made,
 * then the transformed contents from the `onTransform` hook will be passed to esbuild as is.
*/
export type OnEmitCallback = (args: OnEmitArgs) => MaybePromiseOrNull<OnEmitResult>
