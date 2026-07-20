/** this module contains type definitions for super-build's extended plugin api.
 *
 * @module
*/
import type { AutoSuggestOrString, MaybePromiseOrNull } from "../deps.js";
import type { ReducedMetafile } from "../esbuild/metafile.js";
import type { EsbuildLoaderType, EsbuildOnEndResult, OnLoadResult as EsbuildOnLoadResult, EsbuildOutputsImportKind, EsbuildPartialMessage, OnLoadArgs } from "../esbuild/strongtypes.js";
import type { AbsolutePath, Path, RelativePath, ResolvedPath } from "../typedefs.js";
export type { OnLoadArgs, OnLoadOptions, OnResolveArgs, OnResolveCallback, OnResolveOptions, OnResolveResult } from "../esbuild/strongtypes.js";
/** this symbol gives you access to the **true** internal `PluginBuild` object that was used for constructing a {@link SuperPluginBuild}.
 * it can be used as a means to check whether you're inside super-build or not,
 * or if you have a situation where it is necessary for super-build to be bypassed,
 * such as in the case of {@link EsbuildNativeResolver}, which is spawned by {@link nativeReplicaPluginSetup}.
*/
export declare const INNER_PLUGIN_BUILD: unique symbol;
/** type alias for `esbuild.OnLoadResult`, except that the `loader` can be set to anything arbitrary. */
export type OnLoadResult = Omit<EsbuildOnLoadResult, "loader"> & {
    loader?: AutoSuggestOrString<EsbuildLoaderType>;
};
/** type alias for the callback function provided to the `OnLoad` function (aka `esbuild.PluginBuild["OnLoad"]`). */
export type OnLoadCallback = (args: OnLoadArgs) => MaybePromiseOrNull<OnLoadResult>;
export interface OnTransformOptions {
    filter: RegExp;
    namespace?: string;
    loader?: AutoSuggestOrString<EsbuildLoaderType>;
}
export interface OnTransformArgs {
    /** the resolved path of the {@link contents}. */
    path: ResolvedPath;
    /** the namespace inherited from the `onLoad` hook (which gets inherited from the `onResolve` hook). */
    namespace: string;
    /** the loader that is supposed to be used for this {@link contents} for the transformation. */
    loader: AutoSuggestOrString<EsbuildLoaderType>;
    /** any url-suffix string that is present in the {@link path}. */
    suffix: string;
    /** the loaded content that is to be transformed. */
    contents: string | Uint8Array<ArrayBuffer>;
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
    pluginData: any;
    /** the `resolveDir` (used for node-resolution) returned by the loader.
     *
     * > [!note]
     * > when the `onLoad` hook function returns an empty/undefined `resolveDir`, this value turns into an empty string.
    */
    resolveDir: string;
    /** the `with` attribute argument passed to the `onLoad` hook. */
    with: Record<string, string>;
}
export interface OnTransformResult {
    /** insert your plugin's name to override the current plugin name that will be used for error printing. */
    pluginName?: string;
    /** the transformed/transpiled contents that will be returned to esbuild. */
    contents?: string | Uint8Array<ArrayBuffer>;
    /** if the {@link contents} needs to be transformed/minified natively by esbuild again
     * (in addition to discovering additional imports), use one of the native loaders provided by esbuild.
    */
    loader?: EsbuildLoaderType;
    /** insert plugin-data to be passed onto the dependencies' `onResolve` hook's `arg.pluginData`.
     *
     * if you wish to pass on the incoming {@link OnTransformArgs.pluginData} from the prior `onLoad` hook,
     * you will need to explicitly pass it over as a return argument, otherwise the plugin-data will get lost.
     * so, keep this in mind when designing transformation hooks, because you wouldn't want to ruin any plugin-data that some plugin was anticipating.
    */
    pluginData?: any;
    /** pass some arbitrary data from the transformation stage to the emit stage.
     *
     * this feature is handled by {@link SuperBuildContext.resolvedResourceRegistry}.
    */
    emitData?: any;
    /** specify arbitrary resource imports that must be performed for this resource.
     *
     * while these resources will get bundled (via dynamic imports performed by {@link longBuildPluginSetup}, so long as they are not marked with `external: true`),
     * they (i.e. their output paths) won't get automatically incorporated into your {@link contents};
     * for that, you will have to use an {@link SuperPluginBuild.onEmit} hook to re-capture the output paths of the bundled imports specified here,
     * and then re-incorporate those output paths into your {@link OnEmitArgs.contents},
     * using the non-mutating {@link ImportEntity.key} trace which resource is being referenced by the {@link ImportedEntity.outputPath}.
     *
     * to skip an import from being bundled, you can either stay silent about it (i.e. not include it here),
     * or mark that import with `external: true`, so that it still gets passed to {@link OnEmitArgs.imports},
     * but will appear to esbuild as an external reference (and hence not resolved, nor bundled as an emitted output file).
    */
    imports?: ImportEntity[];
    /** if any fatal error(s) occur during the transformation, pass it as a return value so that the build gets immediately halted. */
    errors?: EsbuildPartialMessage[];
    /** if any warning(s) occur during the transformation, pass it as a return value so that esbuild prints out a warning immediately. */
    warnings?: EsbuildPartialMessage[];
    /** add a list of local files to watch for mutation in order to trigger a reload of the original loader hook.
     * (I think the paths need to be an absolute path.)
     *
     * any files added to this array will be combined with the {@link OnLoadResult.watchFiles} list of the prior `onLoad` hook function.
    */
    watchFiles?: string[];
    /** add a list of directories to watch for mutation in order to trigger a reload.
     * (I think the paths need to be an absolute path.)
     *
     * any directories added to this array will be combined with the {@link OnLoadResult.watchDirs} list of the prior `onLoad` hook function.
    */
    watchDirs?: string[];
}
/** this is your `onTransform` hook function that gets called,
 * if the handler associated with it allows a certain result from an `onLoad` hook to pass through its filter ({@link OnTransformOptions}).
 *
 * if your return value is nullable (`null` or `undefined`), then the next matching `onTransform` hook function will try to transform the incoming loaded contents.
 * if no transformation hook returns a non-nullable after all matches have been made,
 * then the loaded contents from the `onLoad` hook will be passed to esbuild as is.
*/
export type OnTransformCallback = (args: OnTransformArgs) => MaybePromiseOrNull<OnTransformResult>;
/** specify an entity/file that should be imported for a given loaded entity (during the transformation stage). */
export interface ImportEntity<K = any> {
    /** include a unique key that you can use to trace back the imported entity,
     * because the `path` of the import in the bundled output will differ, whereas this key will remain the same.
     *
     * > [!caution]
     * > the key **must be** json serializable!
     * > because we internally perform a dynamic import of the javascript file that bundles all external resources;
     * > and for us to generate this javascript file, we must be able to represent it as a string.
     * >
     * > if you wish to use arbitrary data (such as class instances) as the key,
     * > you will need to create a global reference hash-map to store the arbitrary data,
     * > and use its keys as the keys you would provide here.
    */
    key: K;
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
    path: AbsolutePath | ResolvedPath;
    /** associate a `with` import attribute to the import. */
    with?: Record<string, string>;
    /** specify if this import should be marked as an external resource, so that it neither gets resolved, nor loaded/bundled as an output file.
     *
     * if you wish for your import's path to get resolved, but not loaded/bundled as a file, then you should either:
     * 1. set `external: false` and then capture {@link path} during the `onResolve` stage,
     *    followed by setting `external` to `true` in the returned `OnResolveResult`.
     * 2. set `external: true` and make sure that your {@link path} is pre-resolved within the transformation stage,
     *    by simply using {@link SuperPluginBuild.resolve | `build.resolve(...)`} to resolve its path in your plugin.
    */
    external?: boolean;
}
export type ImportedEntityKind = EsbuildOutputsImportKind | "user-import";
/** a description of an entity that is imported by an output file (post-build, during the emission stage).
 *
 * - for user-specified `imports` performed in the transformation stage ({@link OnTransformResult}), the {@link key} will be supplied by the user,
 *   and it will be up to the user to trace back the original linked resource that was being referenced.
 * - for imports performed by esbuild (such as js and css imports), the {@link key} will be an array of namespaced resolved paths
 *   (of the form `${namespace}:${resolved_path}`) that contributed to the creation of the imported (and possibly bundled) resource.
 *
 * TODO: the currently include `with` import attribute is defunct. should it have any built-in purpose,
 * or should it be just left up to the user to decide what to do with that information?
*/
export interface ImportedEntity<K = any> extends Pick<NonNullable<ImportEntity<K>>, "key" | "with"> {
    /** the **absolute** output path of the resource/entity that is being imported.
     *
     * to convert it to a relative path with respect to the entity that imports this resource,
     * use the `relativePath` function from my `jsr:@oazmi/kitchensink/pathman` or `npm:@oazmi/kitchensink/pathman` libraries.
    */
    outputPath: AbsolutePath;
    /** if the imported entity was renamed during the {@link SuperPluginBuild.onEmit, emission stage},
     * then its original (absolute) {@link outputPath} will get saved here.
     *
     * this is to aid you with modifying/renaming import paths within your dependent entity's {@link OnEmitArgs.contents},
     * when you cannot reliably use your {@link key} to identify the import statement corresponding to an imported entity.
     *
     * for instance, suppose your build emits a `./main.js` file that imports `./meow.worker.js`,
     * and then during the emission stage, suppose you renamed the `./meow.worker.js` output file to `./workers/meow.js`.
     * then, when `./main.js` enters the {@link SuperPluginBuild.onEmit | emission phase},
     * the {@link OnEmitArgs.imports | import field} corresponding to the `./workers/meow.js` file (formerly `./meow.worker.js`)
     * will have its {@link outputPath} set to `./workers/meow.js` (but as an absolute path),
     * while its {@link initialPath} will get assigned `./meow.worker.js` (again, as an absolute path),
     * so that you can scan the {@link OnEmitArgs.contents} of your `./main.js` file to find all references to `./meow.worker.js`,
     * and then replace those statements with the updated `./workers/meow.js` path.
     *
     * > [!note]
     * > this field is only assigned when the {@link OnEmitResult | emission stage result} of the dependency import changes the
     * > {@link OnEmitResult.path} to something different from the original (case sensitive).
    */
    initialPath?: AbsolutePath;
    /** indicates the kind of import that is being performed. all of these are inherited from esbuild metafile's
     * {@link EsbuildMetafileImportProps.kind | `kind` field}, with the exception of `"user-import"`,
     * which is assigned when the user specifies an import during the transformation stage ({@link OnTransformResult}).
    */
    kind: ImportedEntityKind;
    /** indicates if this imported entity is an external resource (and hence not bundled). */
    external: boolean;
    /** this flag indicates if the imported file entity is being written at all into the filesystem (supposing that the `EsbuildBuildOptions.write` was not disabled).
     *
     * in general, this flag is set to `false` for entities with {@link external} set to `true`.
     * but for non-external imported entities, when this flag is set to `false`,
     * it can hint to the importer entity that they should probably remove the import statement associated with this import,
     * in order not to get any runtime-import exceptions. or perhaps,
     * it can hint that the imported entity should have its contents inlined into the importer, such as in the case of html's inline js and css.
     * (TODO: currently, importers cannot read the `contents` of the imported entity, so this feature needs to be implemented).
    */
    write: boolean;
}
/** a single input file filteration rule used in {@link OnEmitOptions}. */
export interface OnEmitOptions_InputFilter {
    /** a resolved path name filter of the input resource that is to be matched by at least one of the emitted file's {@link OnEmitArgs.inputs | inputs}. */
    filter: RegExp;
    /** specify an optional namespace in which the loaded input file must be part of. */
    namespace?: string;
    /** specify an optional loader which should have been used to load this input file by the {@link SuperPluginBuild.onLoad} hook. */
    loader?: AutoSuggestOrString<EsbuildLoaderType>;
    /** specify an optional transform-loader which should have been used to load this input file during the transformation hook ({@link SuperPluginBuild.onTransform}).
     * if no {@link SuperPluginBuild.onTransform} hook captured this input resource,
     * then the `loader` value from the prior {@link SuperPluginBuild.onLoad} stage will be used to match against this option.
    */
    transformLoader?: EsbuildLoaderType;
}
export interface OnEmitOptions {
    /** a filter for the {@link OnEmitArgs.outputPath | output filename} of a file that is to be emitted.
     *
     * > [!note]
     * > when a resource is {@link OnEmitResult.reEmit | re-emitted} with an updated {@link OnEmitResult.path},
     * > this filter will test against the updated {@link OnEmitResult.path}, rather than the original/initial output path.
    */
    filter: RegExp;
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
    inputs?: Array<OnEmitOptions_InputFilter>;
    /** a filter to recursively describe _what_ your emitted resource is getting imported _by_.
     * in essence, this filter lets you perform a look ahead, before you miss intercepting an emitted output,
     * and only realize after the fact, once you reach a certain dependent file
     * (and consequently being prohibited from modifying the contents or output path of the dependency file).
     *
     * if you provide multiple filters inside, then it will act as an **AND** clause; meaning that:
     * - at least one of the importers of this entity should satisfy the `importedBy[0]` filter,
     * - **AND** at least one of the importers of this entity should satisfy the `importedBy[1]` filter,
     * - **AND** at least one of the importers of this entity should satisfy the `importedBy[2]` filter,
     * - **AND** so on and so forth.
     *
     * @example
     *
     * if you want to intercept all emitted js-files that _are being_
     * dynamically imported _by_ files that originated from an input that used an `"html"` loader,
     * then you would declare your filter as such:
     *
     * ```ts
     * my_js_filter: OnEmitOptions = {
     * 	filter: new RegExp("\\.js$"),
     * 	importedBy: [{
     * 		filter: new RegExp(".*"),
     * 		inputs: [{ filter: new RegExp(".*"), loader: "html" }],
     * 	}],
     * }
     * ```
    */
    importedBy?: Array<OnEmitOptions>;
}
/** a description of an input file that was bundled into a physical output file ({@link OnEmitArgs}). */
export interface BundledInputFile {
    /** the original (absolute) resolved path (return value of the `onResolve` hook) of this bundled resource. */
    path: ResolvedPath;
    /** the namespace inherited from the `onTransform` hook
     * (which gets inherited from the `onLoad` hook, and the `onResolve` hook prior to it).
    */
    namespace: string;
    /** the `onLoad` loader that was used for this resource. equivalent to {@link OnEmitOptions.loader}. */
    loader: string;
    /** the `onTransform` loader that was used for this resource during its transformation stage.
     * if the resource did not go through a transformation stage, then this value will be the same as {@link loader}.
     * moreover, this value is equivalent to the {@link OnEmitOptions.transformLoader} provided in the filteration options.
    */
    transformLoader: NonNullable<OnTransformResult["loader"]> | "";
    /** any url-suffix string that might present in the {@link path | resolved path}. */
    suffix: string;
    /** arbitrary data passed from the {@link OnTransformResult.emitData | transformation stage} to the emit stage. */
    emitData: NonNullable<OnTransformResult["emitData"]>;
}
export interface OnEmitArgs {
    /** the output path of this bundled resource, relative to the `cwd` or `absWorkingDir`
     * (not the `outdir` directory!), and always in posix format.
     *
     * TODO: I actually don't provide a relative path right now. but should I even?
    */
    outputPath: RelativePath;
    /** a list of input resources that were bundled into this resource (by esbuild), or were chunked by esbuild for this resource. */
    inputs: Array<BundledInputFile>;
    /** a list of resource imports that were included in the build for this resource.
     * these, however, are not currently _bundled_ into the contents of your resource;
     * they're still external resources that your transformed file will need to reference (re-incorporate) in order to import during runtime.
    */
    imports: Array<ImportedEntity>;
    /** a list of output files paths that import this resource entity. these reflect the importer resource's {@link outputPath}. */
    importedBy: Array<AbsolutePath>;
    /** the transformed and/or bundled content that may need to have the linked {@link imports} re-incorporated into it. */
    contents: Uint8Array<ArrayBuffer>;
    /** specifies if this output entity is marked to be written.
     * this value is initially `true` by default, but if this entity had been previously re-emitted by an `onEmit` hook,
     * then the value here will reflect the `write` state specified in the prior `onEmit` hook's result (i.e. {@link OnEmitResult.write}).
     *
     * @defaultValue `true`.
    */
    write: boolean;
    /** if this resource has been re-emitted by a prior `onEmit` handler,
     * then it is possible for that handler to have inserted some kind of additional contextual information into this record field.
     *
     * read more about it in {@link OnEmitResult.reEmitData}.
    */
    reEmitData?: OnEmitResult["reEmitData"];
}
export interface OnEmitResult extends EsbuildOnEndResult {
    /** provide an alternate path to place this resource.
     *
     * if a relative path is provided (which is what is recommended),
     * then this file will be placed relative to the `cwd` or `absWorkingDir` specified in the initial build options,
     * which is different from the `outdir`. for providing paths relative to `outdir`, use an absolute path.
     *
     * TODO: in the future, consider adding a `pathRelativeTo` option, with the symbols `OUTDIR`, `CWD`, and `ABS_WORKING_DIR`,
     * for specifying what is the `path` relative to.
    */
    path?: Path;
    /** the contents of the file after you've re-incorporated the imported/dependency links into it.
     * if left `undefined`, then the original {@link OnEmitArgs.contents} will be used as its value.
    */
    contents?: string | Uint8Array<ArrayBuffer>;
    /** specify if the file should be written (i.e. emitted) at all.
     *
     * > [!note]
     * > note that it is totally possible to delete an entity, but still have some {@link contents} assigned to it.
     * > this way, you should be able to read the contents of the "deleted" file later on inside on of the dependent entities.
     * >
     * > this can be useful when you would like to code a plugin that takes in inlined code (such as inlined js or css inside an html),
     * > then includes it in the bundle (by faking it as virtual files during resolutions/loading),
     * > and then deletes the emitted files corresponding to the inlined code blocks, while retaining the minified/bundled {@link contents},
     * > so that the original dependent entity (html file in this case) can read the minified/bundled {@link contents} and then re-incorporate them as inlined code.
     * >
     * > (TODO: though, right now, I don't currently give a global readonly access to the output files registry inside the {@link OnEmitCallback} function.
     * > I should probably add the registry as a second argument to the callback function.)
     *
     * @defaultValue `true` (i.e. it'll be written if `EsbuildBuildOption.write` is enabled, otherwise it won't be.)
    */
    write?: boolean;
    /** declare if this resource is supposed to be re-emitted and passed through all registered `onEmit` handlers again from the beginning.
     * this effectively lets you process a single emitted output entity through multiple `onEmit` handlers.
     *
     * > [!note]
     * > in order to stop the current handler from intercepting and processing your re-emitted entity again,
     * > you should insert some kind of identifiable mark/symbol into the returned {@link reEmitData} field.
     * >
     * > it is similar to how I often insert a known unique symbol into `build.resolve`'s `pluginData`,
     * > in order to identify if I've already encountered and processed a resource,
     * > so that I can skip it and let other `onResolve` hooks to handle it.
     *
     * @defaultValue `false`.
    */
    reEmit?: boolean;
    /** If you are {@link reEmit | re-emitting} an output entity (so that it gets processed by other registered `onEmit` hooks after being mutated),
     * then the next `onEmit` interceptor of this entity will receive this arbitrary record/dictionary in its {@link OnEmitArgs.reEmitData} field.
     *
     * this provides an effective means for inter-on-emit hook communication, akin to `pluginData` used in `onResolve` and `onLoad`.
     * it also provides a way for you to stop the current output entity from being processed by your current `onEmit` hook again,
     * by inserting a unique symbol into the `reEmitData` record, which, if discovered, will indicated that a given resource has already gone through the current handler.
     *
     * when this field is set to `undefined`, it will adopt/inherit its prior `reEmitData` declared under {@link OnEmitArgs.reEmitData}.
     * in order to clear out this field properly, one must assign a new empty object to it.
     *
     * @defaultValue `undefined`, which in turn signals that it should inherit/propagate its prior `reEmitData` (i.e. {@link OnEmitArgs.reEmitData}).
    */
    reEmitData?: Record<PropertyKey, any>;
}
/** this is your `onEmit` hook function that gets called,
 * if the handler associated with it allows a certain result from an `onLoad` hook to pass through its filter ({@link OnEmitOptions}).
 *
 * if your return value is nullable (`null` or `undefined`), then the next matching `onEmit` hook function will try to mutate the finalized loaded/transformed contents.
 * if no emit hook returns a non-nullable after all matches have been made,
 * then the transformed contents from the `onTransform` hook will be passed to esbuild as is.
 *
 * moreover, if the returned value declares {@link OnEmitResult.reEmit} as `true`,
 * then the mutated emitted resource will once again pass through **all** registered `onEmit` handlers.
 *
 * @param args the description of the emitted file that is currently being processed/mutated by your callback function.
 * @param output_file_registry this is a class instance of {@link ReducedMetafile} that lets you search for any output {@link OutputFileEntity | file entity},
 *   either by their output _path-key_, or by their input sources' _resolved-paths_.
 *   - the output _path-key_ is the entity's initial output path. it can be simply computed as `initialPath ?? outputPath` for a given resource.
 *   - as for the sources' _resolved-paths_, they are defined as the `{ namespace: string, path: string }` returned by the source's `onResolve` stage.
 *   - note that the {@link OutputFileEntity | file entities} are strictly for read only purposes. do not even think of modifying them, otherwise bad things will happen.
 *     (i.e. sanata clause will die out of a heart attack, and L will get obliterated by truck-kun on the very first day he meats yagami.)
*/
export type OnEmitCallback = (args: OnEmitArgs, output_file_registry: ReducedMetafile) => MaybePromiseOrNull<OnEmitResult>;
//# sourceMappingURL=typedefs.d.ts.map