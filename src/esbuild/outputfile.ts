import { array_isEmpty, type Require } from "../deps.ts"
import type { SuperBuildContext } from "../super/build_context.ts"
import type { SuperPluginBuild } from "../super/plugin_build.ts"
import type { BundledInputFile, ImportedEntity, OnEmitOptions, OnEmitResult, OnTransformResult } from "../super/typedefs.ts"
import type { Metafile } from "./metafile.ts"
import type { EsbuildOutputFile } from "./typedefs.ts"


/** an imported entity node, similar to {@link ImportedEntity}, but with a shared {@link entity} object field. */
export interface ImportedEntityNode<K = any> extends Pick<ImportedEntity<K>, "key" | "with" | "kind" | "external"> {
	/** the output file entity being referenced by this import.
	 * this is present even when resource being referenced is an external resource.
	*/
	entity: OutputFileEntity | ExternalFileEntity
}

export interface ExternalFileEntity {
	/** the **absolute** external path of this external resource entity. */
	externalPath: string
}

/** this dictionary maps an output file's **original** absolute output path to its {@link OutputFileEntity} object.
 *
 * the keys of this map are always in **lower casing**, and never change, even after an output file has been renamed via {@link OnEmitResult.path}.
 * the way to acquire a given {@link OutputFileEntity}'s original output path key is by simply performing:
 * `original_path_key = (file_entity.initialPath ?? file_entity.outputPath).toLowerCase()`.
*/
export type OutputFileEntityMap = Map<string, OutputFileEntity>

export class OutputFileEntity implements Require<Pick<EsbuildOutputFile, "contents" | "hash">, "contents"> {
	/** the **absolute** output path of this resource entity. */
	public outputPath: string

	/** if this resource entity was renamed during the {@link SuperPluginBuild.onEmit, emission stage},
	 * then its original (absolute) {@link outputPath} will get saved here.
	*/
	public initialPath?: string

	public hash?: string

	public contents: Uint8Array<ArrayBufferLike>

	/** specify if this file entry should be written.
	 *
	 * @defaultValue `true` (i.e. it'll be written if `BuildOption.write` is enabled, otherwise it won't be.)
	*/
	public write: boolean = true

	/** an array of metadata on the loaded input files that were bundled into _this_ physical output file entity. */
	public inputs: Readonly<BundledInputFile>[] = []

	/** an array of metadata on the output files that are imported by _this_ file entity during runtime.
	 *
	 * each of these is basically associated with a js (`import { x, y, z } from "abc"`), css (`@import url("./blahblah.css")`),
	 * or user-import (i.e. {@link OnTransformResult.imports}) statement.
	*/
	public imports: Readonly<ImportedEntityNode<any>>[] = []

	protected metafile: Metafile

	constructor(metafile: Metafile, esbuild_file: EsbuildOutputFile) {
		this.metafile = metafile
		const
			output_path = metafile.resolvePath(esbuild_file.path),
			output_path_lowercase = output_path.toLowerCase(),
			metadata = metafile.outputs.get(output_path_lowercase)
		if (!metadata) { throw Error(`[OutputFileEntity.constructor]: no matching metadata for the file with the path "${output_path_lowercase}" could be found.`) }
		this.outputPath = output_path
		this.initialPath = undefined
		this.hash = esbuild_file.hash
		this.contents = esbuild_file.contents as Uint8Array<ArrayBuffer>
		this.scanEsbuildInputs()
	}

	/** scans esbuild's metafile outputs to find the input sources bundled into this output file.
	 * the input sources are presented with resolved path information, namespace, `onEmit` information,
	 * and other additional information acquired from the resource's resolver, loader, and transformer results.
	 * (the collection of this information is stored in {@link metafile.resolvedResourceRegistry},
	 * which is inherited from the {@link SuperBuildContext}.)
	*/
	public scanEsbuildInputs(): typeof this.inputs {
		const bundled_files = this.inputs
		if (!array_isEmpty(bundled_files)) { return bundled_files } // if `inputs` were already added, then there's no scanning left to do.
		const
			metafile = this.metafile,
			warnings = metafile.warnings,
			resolvedResourceRegistry = metafile.resolvedResourceRegistry,
			output_path_key = (this.initialPath ?? this.outputPath).toLowerCase(),
			metadata = metafile.outputs.get(output_path_key)
		if (!metadata) { throw Error(`[OutputFileEntity.scanEsbuildInputs]: no matching metadata for the file with the path "${output_path_key}" could be found.`) }
		// acquire the list of all bundled files which were included in the current output resource, that can be traced back from the resource registry.
		for (const input_source_resolved_path of metadata.inputs) {
			const bundled_file = resolvedResourceRegistry.get(input_source_resolved_path)
			if (bundled_file) { bundled_files.push(bundled_file) }
			else { warnings.push({ text: `[OutputFileEntity.scanEsbuildInputs]: resource registry never encountered the resource: "${input_source_resolved_path}".` }) }
		}
		return bundled_files
	}

	/** scans esbuild's metafile outputs to find all file imports performed by this output file.
	 * these only include entity imports found by esbuild natively (js imports, css imports, etc...), and not long-build plugin based imports.
	 *
	 * > [!important]
	 * > this function should be run _after_ all files have been added to your {@link metafile} via {@link metafile.addFile},
	 * > because the imports need to reference the {@link OutputFileEntity} associated with the imported file.
	*/
	public scanEsbuildImports(): typeof this.imports {
		const imported_entities = this.imports
		if (!array_isEmpty(imported_entities)) { return imported_entities } // if `imports` were already added, then there's no scanning left to do.
		const
			metafile = this.metafile,
			warnings = metafile.warnings,
			outputs = metafile.outputs,
			output_path_key = (this.initialPath ?? this.outputPath).toLowerCase(),
			metadata = outputs.get(output_path_key)
		if (!metadata) { throw Error(`[OutputFileEntity.scanEsbuildImports]: no matching metadata for the file with the path "${output_path_key}" could be found.`) }
		for (const import_props of metadata.imports) {
			// here, we find the original namespaced resolved path of the file that resulted in the `import_output_path` file.
			// since there could be multiple `inputs` that resulted in the creation of the file at `import_output_path`,
			// we set the `key` to be an array of all `inputs`.
			const { path: import_output_path, kind, external } = import_props
			// firstly though, esbuild based external imports have no output file associated with them, so they must not under go this process.
			// for their keys, we simply set it to the their reference path/link.
			if (external) {
				const external_entity: ExternalFileEntity = { externalPath: import_output_path }
				imported_entities.push({ key: [import_output_path], kind, external, entity: external_entity })
				continue
			}

			const
				import_output_path_key = import_output_path.toLowerCase(),
				entity = metafile.outputFileEntities.get(import_output_path_key)
			if (!entity) { throw Error(`[OutputFileEntity.scanEsbuildImports]: no matching output file entity for the path "${import_output_path_key}" could be found.`) }
			const import_sources = entity.inputs.map((props) => { return (props.namespace + ":" + props.path).toLowerCase() })
			if (array_isEmpty(import_sources)) {
				// TODO: under this scenario, I can technically still construct a `key` if I were to inspect the `imports` of the `outputPath`,
				// and then trace which of _its_ inputs correspond to this `import_output_path`,
				// but that's just too convoluted and it'll still require a bunch of guessing, at which point it will not be worth the effort.
				warnings.push({
					text: `[OutputFileEntity.scanEsbuildImports]: expected import file to be made out of at least one input resource. `
						+ `but worry not, as this could happen when the emitted file is just a re-exporting chunk file.`,
					location: { file: import_output_path },
				})
			}

			imported_entities.push({ key: import_sources, kind, external, entity })
		}

		return imported_entities
	}

	public matchOnEmitFilter(options: OnEmitOptions): boolean {
		const
			{ filter, inputs: input_filters } = options,
			output_path = this.outputPath
		// test the output file name filter first.
		// the reason why `this.initialPath` is not used is because it is impossible for a file entity to be renamed before it goes through the `onEmit` stage.
		// hence, `this.initialPath` is guaranteed to be `undefined`.
		if (!filter.test(output_path)) { return false }

		// next we test if each input filter has been satisfied by at least one element in `this.inputs`
		// (which is the list of all bundled source files which were included in the current file).
		const bundled_files = this.inputs
		for (const input_filter of (input_filters ?? [])) {
			const { filter, namespace, loader, transformLoader } = input_filter
			const at_least_one_file_satisfies_conditions = bundled_files.some((bundled_file) => {
				return filter.test(bundled_file.path)
					&& (namespace ? namespace === bundled_file.namespace : true)
					&& (loader ? loader === bundled_file.loader : true)
					&& (transformLoader ? transformLoader === bundled_file.transformLoader : true)
			})
			if (!at_least_one_file_satisfies_conditions) { return false }
		}

		// if we've made it to here, then this entity has passed the filter test, and may proceed to the `onEmit` callback hook.
		return true
	}

	/** rename this file. you can either provide an absolute path, or a relative path.
	 * relative paths will be resolved with respect to the `cwd` or esbuild's `absWorkingDir`.
	*/
	public rename(new_output_path: string) {
		// save the original output path into `initialPath` if it has never been assigned before.
		this.initialPath ??= this.outputPath
		this.outputPath = this.metafile.resolvePath(new_output_path)
	}

	public writeToFs() {
		// TODO: should I abstract away the write function and have it passed as an arg? or should I just use my use crossenv's write function?
	}
}
