/** utility submodule for converting esbuild's metafile and output file interfaces into more convenient and manageable format.
 *
 * @module
*/
import type { SuperBuildContext } from "../super/build_context.js";
import type { AbsolutePath, NamespacedPath, Path } from "../typedefs.js";
import { OutputFileEntity, type OutputFileEntityMap } from "./outputfile.js";
import type { EsbuildMetafile, EsbuildMetafileImportProps, EsbuildPartialMessage } from "./strongtypes.js";
import type { EsbuildOutputFile } from "./typedefs.js";
interface FormattedMetafileOutputProps {
    /** namespaced and absolute resolved file path of entry-point that is directly the result of this output file. */
    entryPoint?: NamespacedPath;
    /** namespaced and absolute resolved file paths of input resources that contributed (i.e. were bundled) into this output file. */
    inputs: NamespacedPath[];
    /** the `path` field inside specifies the absolute file paths to other output files that need to be imported by this output file,
     * unless the `external` flag is set to `true`, in which case the import `path` does not correspond to a local output file.
    */
    imports: Array<EsbuildMetafileImportProps>;
}
export interface MetafileConfig {
    /** a reference to the {@link SuperBuildContext.resolvedResourceRegistry} dictionary,
     * used for recalling the arguments returned by the resolver, loader, and transformer phases.
    */
    resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"];
    /** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
    resolvePath: (path: Path) => AbsolutePath;
}
export declare class Metafile implements MetafileConfig {
    protected readonly value: EsbuildMetafile;
    readonly inputs: Map<NamespacedPath, EsbuildMetafile["inputs"][string]>;
    readonly outputs: Map<AbsolutePath, FormattedMetafileOutputProps>;
    outputFileEntities: OutputFileEntityMap;
    /** a copy of the {@link SuperBuildContext.resolvedResourceRegistry}, where all keys use lower case characters.
     * this is extremely important, as we've internally standardized to using only lower casing for namespaced resolved paths,
     * in order to evade the filesystem case-insesnsitivity problem when matching strings.
    */
    resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"];
    /** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
    resolvePath: (path: Path) => AbsolutePath;
    /** holds all warnings that have occurred during method calls. */
    warnings: EsbuildPartialMessage[];
    constructor(esbuild_metafile: EsbuildMetafile, config: MetafileConfig);
    addFile(esbuild_file: EsbuildOutputFile): OutputFileEntity;
    /** this function is intended to run _after_ you have added **all** of your {@link EsbuildOutputFile | esbuild output files} via {@link addFile}.
     * what it does is that it simply calls the {@link OutputFileEntity.scanEsbuildImports} method of each {@link outputFileEntities | registered file},
     * so that they can discover the file entity associated which each of their esbuild-based imports.
    */
    scanEsbuildImports(): void;
    /** broadcast each importer entity to its import entity's {@link OutputFileEntity.importedBy} set.
     * this action should be performed _after_ **all** imports have been added to each output file entity.
     * i.e. it should be called after `incorporateLongBuildImportedEntities` is called inside the emissions driver plugin.
    */
    scanImporters(): void;
    /** find the file entity corresponding to the given absolute output path. you won't receive entities associated with external paths/references. */
    getFile(output_path_key: string): OutputFileEntity | undefined;
    /** find all file entities that incorporate (i.e. originate from) certain namespaced source files/resources into their bundled form. */
    findFileFromSources(predicate_fn: (file_sources: Array<{
        namespace: string;
        path: string;
    }>) => boolean): Array<OutputFileEntity>;
    /** prepares a dependency graph from the current list of {@link outputFileEntities}. */
    createFileDependencyGraph(): Map<OutputFileEntity, Set<OutputFileEntity>>;
    /** write all output file entities (those with `entity.write !== false`) to the filesystem. */
    writeFiles(allow_overwrite?: boolean): Promise<void>;
    /** normalizes an esbuild metafile to use namespaced paths (`${namespace}:${resolved_path}`) for resolved paths,
     * and absolute paths for output file paths.
     *
     * this function mutates the original metafile object passed to it.
    */
    static asNormalized(esbuild_metafile: EsbuildMetafile): EsbuildMetafile;
    /** lower the casing of an esbuild metafile's namespaced resolved paths,
     * output file paths, and external paths, based on your `config` configuration.
     *
     * lower casing helps in ensuring that there won't be any casing conflicts when searching for a particular resource.
     *
     * this function mutates the original metafile object passed to it.
    */
    static asLowercased(esbuild_metafile: EsbuildMetafile, config: {
        /** specify if namespaced resolved paths should be lower cased. */
        namespacedPaths: boolean;
        /** specify if output file paths should be lower cased. */
        outputPaths: boolean;
        /** specify if external import paths should be lower cased. */
        externalPaths: boolean;
    }): EsbuildMetafile;
    /** resolve all relative file paths in a {@link asNormalized | **normalized**} esbuild metafile to absolute file paths.
     *
     * this function mutates the original metafile object passed to it.
    */
    static asAbsolute(esbuild_metafile: EsbuildMetafile, config: {
        resolvePath: (path: string) => string;
    }): EsbuildMetafile;
}
export {};
//# sourceMappingURL=metafile.d.ts.map