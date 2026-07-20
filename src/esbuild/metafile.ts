/** utility submodule for converting esbuild's metafile and output file interfaces into more convenient and manageable format.
 *
 * @module
*/

import { ensureFile, ensureRelativeDotSlash, identifyCurrentRuntime, isAbsolutePath, object_entries, object_fromEntries, object_keys, pathToPosixPath, statEntry, writeFile } from "../deps.ts"
import { splitNamespacedPath } from "../funcdefs.ts"
import type { SuperBuildContext } from "../super/build_context.ts"
import type { AbsolutePath, NamespacedPath, Path, ResolvedPath } from "../typedefs.ts"
import { OutputFileEntity, type OutputFileEntityMap, type WriteFileFn } from "./outputfile.ts"
import type { EsbuildMetafile, EsbuildMetafileImportProps, EsbuildPartialMessage } from "./strongtypes.ts"
import type { EsbuildOutputFile } from "./typedefs.ts"


// regex for detecting if a path is an absolute windows path. copied from `@oazmi/kitchensink/pathman`.
const windows_absolute_path_regex = /^[a-z]\:[\/\\]/i

/** normalize an esbuild resolved file path so that it:
 * - uses posix `"/"` directory separators.
 * - always has a leading `"./"` for relative paths.
 * - is always in the `${namespace}:${path}` format, even when `namespace === "file".`
*/
const normalize_esbuild_filepath = (path: ResolvedPath | NamespacedPath): NamespacedPath => {
	const is_local_path = !path.includes(":") || windows_absolute_path_regex.test(path)
	return is_local_path
		? "file:" + normalize_local_filepath(path)
		: path
}

const normalize_local_filepath = (path: Path): Path => {
	const is_abs_path = isAbsolutePath(path)
	return pathToPosixPath(is_abs_path ? path : ensureRelativeDotSlash(path))
}

const
	file_namespace = "file:",
	file_namespace_length = file_namespace.length

const namespaced_path_to_abs_namespaced_path_factory = (
	resolve_path_fn: (path: NamespacedPath) => NamespacedPath
) => {
	return (namespaced_path: string): string => {
		if (!namespaced_path.startsWith(file_namespace)) { return namespaced_path }
		const abs_path = resolve_path_fn(namespaced_path.slice(file_namespace_length))
		return file_namespace + abs_path
	}
}

interface FormattedMetafileOutputProps {
	/** namespaced and absolute resolved file path of entry-point that is directly the result of this output file. */
	entryPoint?: NamespacedPath

	/** namespaced and absolute resolved file paths of input resources that contributed (i.e. were bundled) into this output file. */
	inputs: NamespacedPath[]

	/** the `path` field inside specifies the absolute file paths to other output files that need to be imported by this output file,
	 * unless the `external` flag is set to `true`, in which case the import `path` does not correspond to a local output file.
	*/
	imports: Array<EsbuildMetafileImportProps>
}

export interface MetafileConfig {
	/** a reference to the {@link SuperBuildContext.resolvedResourceRegistry} dictionary,
	 * used for recalling the arguments returned by the resolver, loader, and transformer phases.
	*/
	resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"]

	/** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
	resolvePath: (path: Path) => AbsolutePath
}

export class Metafile implements MetafileConfig {
	protected readonly value: EsbuildMetafile
	public readonly inputs: Map<NamespacedPath, EsbuildMetafile["inputs"][string]>
	public readonly outputs: Map<AbsolutePath, FormattedMetafileOutputProps>
	public outputFileEntities: OutputFileEntityMap = new Map()

	/** a copy of the {@link SuperBuildContext.resolvedResourceRegistry}, where all keys use lower case characters.
	 * this is extremely important, as we've internally standardized to using only lower casing for namespaced resolved paths,
	 * in order to evade the filesystem case-insesnsitivity problem when matching strings.
	*/
	resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"]

	/** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
	public resolvePath: (path: Path) => AbsolutePath

	/** holds all warnings that have occurred during method calls. */
	public warnings: EsbuildPartialMessage[] = []

	constructor(esbuild_metafile: EsbuildMetafile, config: MetafileConfig) {
		const { resolvedResourceRegistry, resolvePath } = config
		esbuild_metafile = Metafile.asNormalized(esbuild_metafile)
		esbuild_metafile = Metafile.asAbsolute(esbuild_metafile, { resolvePath: resolvePath })
		esbuild_metafile = Metafile.asLowercased(esbuild_metafile, {
			namespacedPaths: true,
			outputPaths: true,
			externalPaths: false,
		})
		const { result: registry_lowercase, warnings } = format_resolved_resource_registry(resolvedResourceRegistry)
		this.value = esbuild_metafile
		this.resolvedResourceRegistry = registry_lowercase
		this.resolvePath = resolvePath
		this.inputs = new Map(object_entries(this.value.inputs))
		this.outputs = new Map(object_entries(this.value.outputs).map(([output_path_lowercase, props]): [string, FormattedMetafileOutputProps] => {
			return [output_path_lowercase, {
				entryPoint: props.entryPoint,
				inputs: object_keys(props.inputs),
				imports: props.imports.map(({ path, kind, external = false }) => ({ path, kind, external })),
			}]
		}))
		this.warnings.push(...warnings)
	}

	public addFile(esbuild_file: EsbuildOutputFile): OutputFileEntity {
		const
			file_entity = new OutputFileEntity(this, esbuild_file),
			output_path_lowercase = (file_entity.initialPath ?? file_entity.outputPath).toLowerCase()
		this.outputFileEntities.set(output_path_lowercase, file_entity)
		return file_entity
	}

	/** this function is intended to run _after_ you have added **all** of your {@link EsbuildOutputFile | esbuild output files} via {@link addFile}.
	 * what it does is that it simply calls the {@link OutputFileEntity.scanEsbuildImports} method of each {@link outputFileEntities | registered file},
	 * so that they can discover the file entity associated which each of their esbuild-based imports.
	*/
	public scanEsbuildImports(): void {
		this.outputFileEntities.forEach((file_entity) => {
			file_entity.scanEsbuildImports()
		})
	}

	/** broadcast each importer entity to its import entity's {@link OutputFileEntity.importedBy} set.
	 * this action should be performed _after_ **all** imports have been added to each output file entity.
	 * i.e. it should be called after `incorporateLongBuildImportedEntities` is called inside the emissions driver plugin.
	*/
	public scanImporters(): void {
		this.outputFileEntities.forEach((file_entity) => {
			file_entity.broadcastImporter()
		})
	}

	/** find the file entity corresponding to the given absolute output path. you won't receive entities associated with external paths/references. */
	public getFile(output_path_key: string): OutputFileEntity | undefined {
		output_path_key = output_path_key.toLowerCase()
		const file_entity = this.outputFileEntities.get(output_path_key)
		if (file_entity) { return file_entity }
		this.warnings.push({ text: `[Metafile.getFile]: no file entity with the following path key was ever added: "${output_path_key}".` })
	}

	/** find all file entities that incorporate (i.e. originate from) certain namespaced source files/resources into their bundled form. */
	public findFilesFromSources(
		predicate_fn: (file_sources: Array<{ namespace: string, path: string }>) => boolean,
	): Array<OutputFileEntity> {
		const file_entity_matches: Array<OutputFileEntity> = []
		this.outputFileEntities.forEach((file_entity) => {
			const file_sources = file_entity.inputs.map(({ namespace, path }) => ({ namespace, path }))
			if (predicate_fn(file_sources)) { file_entity_matches.push(file_entity) }
		})
		return file_entity_matches
	}

	/** prepares a dependency graph from the current list of {@link outputFileEntities}. */
	public createFileDependencyGraph(): Map<OutputFileEntity, Set<OutputFileEntity>> {
		const graph: Map<OutputFileEntity, Set<OutputFileEntity>> = new Map()
		for (const [output_path_key, entity] of this.outputFileEntities) {
			const dependencies: OutputFileEntity[] = entity.imports
				// external resources do not contribute to dependency graph, as they themselves (the external resources) do not get emitted, nor do they go through the emission stage.
				.filter((dep_node) => { return !("externalPath" in dep_node.entity) })
				.map((dep_node) => { return dep_node.entity as OutputFileEntity })
			graph.set(entity, new Set(dependencies))
		}
		return graph
	}

	/** write all output file entities (those with `entity.write !== false`) to the filesystem. */
	public async writeFiles(allow_overwrite: boolean = false): Promise<void> {
		const
			current_runtime = identifyCurrentRuntime(),
			write_file_fn: WriteFileFn = async (file_path, data) => {
				// if overwriting is not permitted and an entry already exists at the given `file_path`, then skip writing.
				if (!allow_overwrite && await statEntry(current_runtime, file_path)) { return }
				await ensureFile(current_runtime, file_path)
				await writeFile(current_runtime, file_path, data)
			}
		const promises = [...this.outputFileEntities].map(async ([output_path_key, entity]): Promise<void> => {
			const is_external_entity = "externalPath" in entity
			if (is_external_entity) { return }
			return entity.writeFile(write_file_fn)
		})
		await Promise.all(promises)
	}

	/** normalizes an esbuild metafile to use namespaced paths (`${namespace}:${resolved_path}`) for resolved paths,
	 * and absolute paths for output file paths.
	 *
	 * this function mutates the original metafile object passed to it.
	*/
	static asNormalized(esbuild_metafile: EsbuildMetafile): EsbuildMetafile {
		const { inputs, outputs } = esbuild_metafile

		esbuild_metafile.inputs = object_fromEntries(object_entries(inputs).map(([resolved_path, props]) => {
			// resolved path name of this input file.
			resolved_path = normalize_esbuild_filepath(resolved_path)
			// direct dependencies of this input file as resolved paths.
			props.imports = props.imports.map((props) => {
				props.path = normalize_esbuild_filepath(props.path)
				return props
			})
			return [resolved_path, props]
		}))

		esbuild_metafile.outputs = object_fromEntries(object_entries(outputs).map(([output_path, props]) => {
			// path name of the output file (including the path to the `outdir` relative to the `cwd` or `absWorkingDir`).
			output_path = normalize_local_filepath(output_path)
			// list of linked output files that are referenced by this resource (but not bundled into it).
			// even though the import paths are relative, they are relative to the `cwd` or `absWorkingDir`,
			// and not relative to the `pathname`.
			props.imports = props.imports.map((props) => {
				props.path = normalize_local_filepath(props.path)
				return props
			})
			// list of files (as resolved paths) that were bundled into this resource.
			props.inputs = object_fromEntries(object_entries(props.inputs).map(([resolved_path, props]) => {
				return [normalize_esbuild_filepath(resolved_path), props]
			}))
			// entrypoint's resolved path corresponding to this output resource.
			if (props.entryPoint) { props.entryPoint = normalize_esbuild_filepath(props.entryPoint) }
			return [output_path, props]
		}))

		return esbuild_metafile
	}

	/** lower the casing of an esbuild metafile's namespaced resolved paths,
	 * output file paths, and external paths, based on your `config` configuration.
	 *
	 * lower casing helps in ensuring that there won't be any casing conflicts when searching for a particular resource.
	 *
	 * this function mutates the original metafile object passed to it.
	*/
	static asLowercased(esbuild_metafile: EsbuildMetafile, config: {
		/** specify if namespaced resolved paths should be lower cased. */
		namespacedPaths: boolean,
		/** specify if output file paths should be lower cased. */
		outputPaths: boolean,
		/** specify if external import paths should be lower cased. */
		externalPaths: boolean,
	}): EsbuildMetafile {
		const
			{ namespacedPaths, outputPaths, externalPaths } = config,
			{ inputs, outputs } = esbuild_metafile

		esbuild_metafile.inputs = object_fromEntries(object_entries(inputs).map(([resolved_path, props]) => {
			if (namespacedPaths) {
				resolved_path = resolved_path.toLowerCase()
				props.imports = props.imports.map((props) => {
					props.path = props.path.toLowerCase()
					return props
				})
			}
			return [resolved_path, props]
		}))

		esbuild_metafile.outputs = object_fromEntries(object_entries(outputs).map(([output_path, props]) => {
			if (namespacedPaths) {
				props.inputs = object_fromEntries(object_entries(props.inputs).map(([resolved_path, props]) => {
					return [resolved_path.toLowerCase(), props]
				}))
				if (props.entryPoint) { props.entryPoint = props.entryPoint.toLowerCase() }
			}

			if (outputPaths) {
				output_path = output_path.toLowerCase()
				props.imports = props.imports.map((props) => {
					// only lower the casing of non-external paths if `externalPaths` is disabled.
					if (externalPaths || !(props.external ?? false)) {
						props.path = props.path.toLowerCase()
					}
					return props
				})
			}

			return [output_path, props]
		}))

		return esbuild_metafile
	}

	/** resolve all relative file paths in a {@link asNormalized | **normalized**} esbuild metafile to absolute file paths.
	 *
	 * this function mutates the original metafile object passed to it.
	*/
	static asAbsolute(esbuild_metafile: EsbuildMetafile, config: {
		resolvePath: (path: string) => string,
	}): EsbuildMetafile {
		const
			{ resolvePath } = config,
			namespaced_path_to_abs_namespaced_path = namespaced_path_to_abs_namespaced_path_factory(resolvePath),
			output_entries = object_entries(esbuild_metafile.outputs)

		esbuild_metafile.outputs = object_fromEntries(output_entries.map(([output_path, props]) => {
			output_path = resolvePath(output_path)
			props.entryPoint = props.entryPoint ? namespaced_path_to_abs_namespaced_path(props.entryPoint) : undefined

			props.inputs = object_fromEntries(object_entries(props.inputs).map(([input_path, props]) => {
				input_path = namespaced_path_to_abs_namespaced_path(input_path)
				return [input_path, props]
			}))

			props.imports = props.imports.map((props) => {
				// only non-external paths must be resolved to an absolute output local file path.
				props.path = props.external
					? props.path
					: resolvePath(props.path)
				return props
			})

			return [output_path, props]
		}))

		return esbuild_metafile
	}
}

/** turns all keys of {@link SuperBuildContext.resolvedResourceRegistry} to lower case, while documenting any key conflicts that occur as a result. */
const format_resolved_resource_registry = (registry: SuperBuildContext["resolvedResourceRegistry"]): ({
	result: typeof registry,
	warnings: EsbuildPartialMessage[],
}) => {
	const
		warnings: EsbuildPartialMessage[] = [],
		registry_lowercase = new Map([...registry].map(([resolved_path, props]) => {
			return [resolved_path.toLowerCase() satisfies NamespacedPath, props]
		}))

	if (registry_lowercase.size < registry.size) {
		const
			size_difference = registry.size - registry_lowercase.size,
			conflicting_keys: Set<string> = new Set(),
			encountered_lowercase_keys: Map<NamespacedPath, string> = new Map([...registry].map(([key, props]) => {
				const key_lowercase = key.toLowerCase()
				return [key_lowercase, key]
			}))
		for (const [key, props] of registry) {
			const
				key_lowercase = key.toLowerCase(),
				key_original = encountered_lowercase_keys.get(key_lowercase)!
			if (key_original !== key) {
				conflicting_keys.add(key)
				conflicting_keys.add(key_original)
			}
		}
		warnings.push({
			text: `[format_resolved_resource_registry]: ${size_difference} resolved resources use the same name, but only differ in letter casing. `
				+ `right now, super-build is not able to distinguish between the two (in order to achieve path name casing insensitivity), `
				+ `so this problem will likely mess up your build. `
				+ `if it's possible, you should change the name of the duplicate resources. see the notes for the conflicting resource names:`,
			notes: [...conflicting_keys].map((resolved_path) => {
				const { path, namespace } = splitNamespacedPath(resolved_path)
				return {
					text: `conflicting key: "${resolved_path.toLowerCase()}"`,
					location: { file: path, namespace: namespace },
				}
			}),
		})
	}

	return { result: registry_lowercase, warnings }
}

/** a reduced implementation of {@link Metafile} that is safer for consumer-use. */
export class ReducedMetafile implements Pick<Metafile, "getFile" | "findFilesFromSources"> {
	private metafile: Metafile

	constructor(metafile: Metafile) {
		this.metafile = metafile
	}

	public getFile(output_path_key: string): OutputFileEntity | undefined {
		return this.metafile.getFile(output_path_key)
	}

	public findFilesFromSources(
		predicate_fn: (file_sources: Array<{ namespace: string; path: string }>) => boolean
	): Array<OutputFileEntity> {
		return this.metafile.findFilesFromSources(predicate_fn)
	}
}
