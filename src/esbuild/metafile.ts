/** utility submodule for converting esbuild's metafile and output file interfaces into more convenient and manageable format.
 *
 * @module
*/

import { ensureRelativeDotSlash, isAbsolutePath, object_entries, object_fromEntries, pathToPosixPath } from "../deps.ts"
import type { EsbuildMetafile } from "./strongtypes.ts"


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

interface MetafileConfig {
	resolvePath: (path: string) => string
}

export class Metafile implements MetafileConfig {
	protected readonly value: EsbuildMetafile

	public resolvePath: (path: string) => string

	constructor(esbuild_metafile: EsbuildMetafile, config: MetafileConfig) {
		const resolvePath = config.resolvePath
		esbuild_metafile = Metafile.asNormalized(esbuild_metafile)
		esbuild_metafile = Metafile.asAbsolute(esbuild_metafile, { resolvePath: resolvePath })
		esbuild_metafile = Metafile.asLowercased(esbuild_metafile, {
			namespacedPaths: true,
			outputPaths: true,
			externalPaths: false,
		})
		this.value = esbuild_metafile
		this.resolvePath = resolvePath
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
