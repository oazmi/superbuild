/** utility submodule for converting esbuild's metafile and output file interfaces into more convenient and manageable format.
 *
 * @module
*/

import { ensureRelativeDotSlash, isAbsolutePath, object_entries, object_fromEntries, object_keys, pathToPosixPath } from "../deps.ts"
import { splitNamespacedPath } from "../funcdefs.ts"
import type { SuperBuildContext } from "../super/build_context.ts"
import type { BundledInputFile, ImportedEntity, OutputFileEntity, OutputFileEntityMap } from "../super/typedefs.ts"
import type { EsbuildMetafile, EsbuildMetafileImportProps, EsbuildPartialMessage } from "./strongtypes.ts"
import type { EsbuildOutputFile } from "./typedefs.ts"


// regex for detecting if a path is an absolute windows path. copied from `@oazmi/kitchensink/pathman`.
const windows_absolute_path_regex = /^[a-z]\:[\/\\]/i

/** normalize an esbuild resolved file path so that it:
 * - uses posix `"/"` directory separators.
 * - always has a leading `"./"` for relative paths.
 * - is always in the `${namespace}:${path}` format, even when `namespace === "file".`
*/
const normalize_esbuild_filepath = (path: string): string => {
	const is_local_path = !path.includes(":") || windows_absolute_path_regex.test(path)
	return is_local_path
		? "file:" + normalize_local_filepath(path)
		: path
}

const normalize_local_filepath = (path: string): string => {
	const is_abs_path = isAbsolutePath(path)
	return pathToPosixPath(is_abs_path ? path : ensureRelativeDotSlash(path))
}

const
	file_namespace = "file:",
	file_namespace_length = file_namespace.length

const namespaced_path_to_abs_namespaced_path_factory = (
	resolve_path_fn: (path: string) => string
) => {
	return (namespaced_path: string): string => {
		if (!namespaced_path.startsWith(file_namespace)) { return namespaced_path }
		const abs_path = resolve_path_fn(namespaced_path.slice(file_namespace_length))
		return file_namespace + abs_path
	}
}

interface FormattedMetafileOutputProps {
	/** namespaced and absolute resolved file path of entry-point that is directly the result of this output file. */
	entryPoint?: string

	/** namespaced and absolute resolved file paths of input resources that contributed (i.e. were bundled) into this output file. */
	inputs: string[]

	/** the `path` field inside specifies the absolute file paths to other output files that need to be imported by this output file,
	 * unless the `external` flag is set to `true`, in which case the import `path` does not correspond to a local output file.
	*/
	imports: Array<EsbuildMetafileImportProps>
}

interface MetafileConfig {
	/** a reference to the {@link SuperBuildContext.resolvedResourceRegistry} dictionary,
	 * used for recalling the arguments returned by the resolver, loader, and transformer phases.
	*/
	resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"]

	/** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
	resolvePath: (path: string) => string
}

export class Metafile implements MetafileConfig {
	protected readonly value: EsbuildMetafile
	protected readonly inputs: Map<string, EsbuildMetafile["inputs"][string]>
	protected readonly outputs: Map<string, FormattedMetafileOutputProps>
	protected outputFileEntities: OutputFileEntityMap = new Map()

	/** a copy of the {@link SuperBuildContext.resolvedResourceRegistry}, where all keys use lower case characters.
	 * this is extremely important, as we've internally standardized to using only lower casing for namespaced resolved paths,
	 * in order to evade the filesystem case-insesnsitivity problem when matching strings.
	*/
	resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"]

	/** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
	public resolvePath: (path: string) => string

	/** holds all warnings that have occurred during method calls. */
	protected warnings: EsbuildPartialMessage[] = []

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
			output_path = this.resolvePath(esbuild_file.path),
			output_path_lowercase = output_path.toLowerCase(),
			metadata = this.outputs.get(output_path_lowercase)
		if (!metadata) { throw Error(`[Metafile.addFile]: no matching metadata for the file with the path "${output_path_lowercase}" could be found.`) }
		const file_entity: OutputFileEntity = {
			outputPath: output_path,
			initialPath: undefined,
			hash: esbuild_file.hash,
			contents: esbuild_file.contents as Uint8Array<ArrayBuffer>,
			inputs: this.getEsbuildInputs(output_path_lowercase),
			// initially, the `imports` assigned have dirty lower cased `outputPath`s.
			// the user must run the TODO: function that repairs the casing of these paths once they've added all output files.
			imports: this.getEsbuildImports(output_path_lowercase),
		}
		this.outputFileEntities.set(output_path_lowercase, file_entity)
		return file_entity
	}

	// public getFile(output_path_key: string): OutputFileEntity {

	// }

	/** scans esbuild's metafile outputs to find the input sources bundled into a certain output file (`output_path_key`).
	 * the input sources are presented with resolved path information, namespace, `onEmit` information,
	 * and other additional information acquired from the resource's resolver, loader, and transformer results.
	 * (the collection of this information is stored in {@link resolvedResourceRegistry}, acquired from the {@link SuperBuildContext}.)
	*/
	protected getEsbuildInputs(output_path_key: string): Array<BundledInputFile> {
		output_path_key = output_path_key.toLowerCase()
		const
			warnings = this.warnings,
			resolvedResourceRegistry = this.resolvedResourceRegistry,
			metadata = this.outputs.get(output_path_key)
		if (!metadata) { throw Error(`[Metafile.getEsbuildInputs]: no matching metadata for the file with the path "${output_path_key}" could be found.`) }
		// acquire the list of all bundled files which were included in the current output resource, that can be traced back from the resource registry.
		const bundled_files: BundledInputFile[] = []
		for (const input_source_resolved_path of metadata.inputs) {
			const bundled_file = resolvedResourceRegistry.get(input_source_resolved_path)
			if (bundled_file) { bundled_files.push(bundled_file) }
			else { warnings.push({ text: `[Metafile.getEsbuildInputs]: resource registry never encountered the resource: "${input_source_resolved_path}"` }) }
		}
		return bundled_files
	}

	/** scans esbuild's metafile outputs to find all file imports performed by a certain output file (`output_path_key`).
	 * these only include entity imports found by esbuild natively (js imports, css imports, etc...), and not long-build plugin based imports.
	 *
	 * > [!important]
	 * > this function performs a "dirty" scan of the imports which does not preserve the letter casing of the imports' {@link ImportedEntity.outputPath}.
	 * > once all files have been added via {@link addFile}, you must run TODO: the function that repairs the casing on each import path.
	*/
	protected getEsbuildImports(output_path_key: string): Array<ImportedEntity<string[]>> {
		output_path_key = output_path_key.toLowerCase()
		const
			warnings = this.warnings,
			metadata = this.outputs.get(output_path_key)
		if (!metadata) { throw Error(`[Metafile.getImports]: no matching metadata for the file with the path "${output_path_key}" could be found.`) }
		return metadata.imports.map((import_props) => {
			// here, we find the original namespaced resolved path of the file that resulted in the `import_output_path` file.
			// since there could be multiple `inputs` that resulted in the creation of the file at `import_output_path`,
			// we set the `key` to be an array of all `inputs`.
			const
				{ path: import_output_path, kind, external } = import_props,
				import_sources = this.outputs.get(import_output_path)?.inputs
			if (!external && (!import_sources || import_sources.length <= 0)) {
				// TODO: under this scenario, I can technically still construct a `key` if I were to inspect the `imports` of the `outputPath`,
				// and then trace which of _its_ inputs correspond to this `import_output_path`,
				// but that's just too convoluted and it'll still require a bunch of guessing, at which point it will not be worth the effort.
				warnings.push({
					text: `[Metafile.getImports]: expected import file to be made out of at least one input resource. `
						+ `but worry not, as this could happen when the emitted file is just a re-exporting chunk file.`,
					location: { file: import_output_path },
				})
			}
			return {
				// IMPORTANT: the outputPath assigned below is the lower cased output file path.
				// it'll need to be updated into the correct casing later on.
				outputPath: import_output_path,
				key: [...(import_sources ?? [])],
				kind,
				external,
			}
		})
	}

	// public renameFile() {

	// }

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
			return [resolved_path.toLowerCase(), props]
		}))

	if (registry_lowercase.size < registry.size) {
		const
			size_difference = registry.size - registry_lowercase.size,
			conflicting_keys: Set<string> = new Set(),
			encountered_lowercase_keys: Map<string, string> = new Map([...registry].map(([key, props]) => {
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
