/** a utility submodule that works alongside {@link Metafile} to aid in holding onto a given file's contents, path, inputs, and imports,
 * in addition to providing useful file-related methods, such as {@link OnEmitOptions} filter matching, and etc...
 *
 * @module
*/
import { type Require } from "../deps.js";
import type { OnEmitHandler } from "../super/build_context.js";
import type { BundledInputFile, ImportedEntity, OnEmitArgs, OnEmitOptions, OnEmitResult } from "../super/typedefs.js";
import type { AbsolutePath, Path } from "../typedefs.js";
import { type Metafile } from "./metafile.js";
import type { EsbuildOutputFile } from "./typedefs.js";
/** an imported entity node, similar to {@link ImportedEntity}, but with a shared {@link entity} object field. */
export interface ImportedEntityNode<K = any> extends Pick<ImportedEntity<K>, "key" | "with" | "kind" | "external"> {
    /** the output file entity being referenced by this import.
     * this is present even when resource being referenced is an external resource.
    */
    entity: OutputFileEntity | ExternalFileEntity;
}
export interface ExternalFileEntity {
    /** the **absolute** external path of this external resource entity. */
    externalPath: AbsolutePath;
}
/** this dictionary maps an output file's **original** absolute output path to its {@link OutputFileEntity} object.
 *
 * the keys of this map are always in **lower casing**, and never change, even after an output file has been renamed via {@link OnEmitResult.path}.
 * the way to acquire a given {@link OutputFileEntity}'s original output path key is by simply performing:
 * `original_path_key = (file_entity.initialPath ?? file_entity.outputPath).toLowerCase()`.
*/
export type OutputFileEntityMap = Map<AbsolutePath, OutputFileEntity>;
export type WriteFileFn = (file_path: string | URL, data: ArrayBufferView) => Promise<void>;
export declare class OutputFileEntity implements Require<Pick<EsbuildOutputFile, "contents" | "hash">, "contents"> {
    /** the **absolute** output path of this resource entity. */
    outputPath: AbsolutePath;
    /** if this resource entity was renamed during the {@link SuperPluginBuild.onEmit, emission stage},
     * then its original (absolute) {@link outputPath} will get saved here.
    */
    initialPath?: AbsolutePath;
    hash?: string;
    contents: Uint8Array<ArrayBuffer>;
    /** specify if this file entry should be written.
     *
     * @defaultValue `true` (i.e. it'll be written if `EsbuildBuildOption.write` is enabled, otherwise it won't be.)
    */
    write: boolean;
    /** an array of metadata on the loaded input files that were bundled into _this_ physical output file entity. */
    inputs: Readonly<BundledInputFile>[];
    /** an array of metadata on the output files that are imported by _this_ file entity during runtime.
     *
     * each of these is basically associated with a js (`import { x, y, z } from "abc"`), css (`@import url("./blahblah.css")`),
     * or user-import (i.e. {@link OnTransformResult.imports}) statement.
    */
    imports: Readonly<ImportedEntityNode<any>>[];
    /** a set of emitted output entities that import _this_ file entity during runtime. */
    importedBy: Set<OutputFileEntity>;
    protected metafile: Metafile;
    constructor(metafile: Metafile, esbuild_file: EsbuildOutputFile);
    /** scans esbuild's metafile outputs to find the input sources bundled into this output file.
     * the input sources are presented with resolved path information, namespace, `onEmit` information,
     * and other additional information acquired from the resource's resolver, loader, and transformer results.
     * (the collection of this information is stored in {@link metafile.resolvedResourceRegistry},
     * which is inherited from the {@link SuperBuildContext}.)
    */
    scanEsbuildInputs(): typeof this.inputs;
    /** scans esbuild's metafile outputs to find all file imports performed by this output file.
     * these only include entity imports found by esbuild natively (js imports, css imports, etc...), and not long-build plugin based imports.
     *
     * > [!important]
     * > this function should be run _after_ all files have been added to your {@link metafile} via {@link metafile.addFile},
     * > because the imports need to reference the {@link OutputFileEntity} associated with the imported file.
    */
    scanEsbuildImports(): typeof this.imports;
    /** broadcast _this_ entity to its {@link imports}, so that it (_this_ object) gets registered to their (the import's) {@link importedBy} list. */
    broadcastImporter(): void;
    /** test if an `onEmit` handler's filters apply to _this_ output file entity. */
    protected matchOnEmitFilter(options: OnEmitOptions): boolean;
    /** perform `onEmit` action on _this_ output file entity, based on the provided `onEmit` handlers. */
    performOnEmit(on_emit_handlers: Array<OnEmitHandler>): Promise<OnEmitResult | undefined>;
    /** performs a single `onEmit` action on _this_ output file entity, without performing any kind of re-emission. */
    private performOnEmitOnce;
    /** convert this file entity into an {@link OnEmitArgs} to be either passed to
     * {@link SuperPluginBuild.onEmit}'s callback function, or {@link SuperPluginBuild.rerouteImports}.
     *
     * this method is not very efficient, so it is not intended for continuous conversion of the same file entity
     * (i.e. prefer caching over re-creation for the same file entity).
     *
     * if you pass an optional `reEmitData` record, it will get included in the returned object.
    */
    toOnEmitArgs(reEmitData?: OnEmitArgs["reEmitData"]): OnEmitArgs;
    /** rename this file. you can either provide an absolute path, or a relative path.
     * relative paths will be resolved with respect to the `cwd` or esbuild's `absWorkingDir`.
    */
    rename(new_output_path: Path): void;
    /** convert an output file entity to an esbuild-compatible {@link EsbuildOutputFile | output file description}.
     *
     * (honestly, I don't see myself using it, and if we're overloading esbuild anyway, why don't we overload the `OutputFile`
     * interface to include new fields, such as `write` and `external`, etc...?)
    */
    toEsbuildOutputFile(outdir?: Path): Require<EsbuildOutputFile, "path" | "contents"> | undefined;
    writeFile(write_file_fn: WriteFileFn): Promise<void>;
}
//# sourceMappingURL=outputfile.d.ts.map