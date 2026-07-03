/** an internal super-build plugin that drives and governs the {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling)
 * before they get emitted into the file system.
 *
 * this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * @module
*/

import { ensureEndSlash, fileUrlToLocalPath, getRuntimeCwd, identifyCurrentRuntime, isNull, isString, object_entries, pathToPosixPath, promise_all, type Require, resolveAsUrl, resolvePathFactory, textDecoder, textEncoder } from "../deps.ts"
import type { EsbuildMetafile, EsbuildOnEndCallback, EsbuildPartialMessage, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup } from "../esbuild/strongtypes.ts"
import type { EsbuildOutputFile } from "../esbuild/typedefs.ts"
import { concatArrays, lowercaseMetafile, mergeMapArrays, normalizeMetafile } from "../funcdefs.ts"
import type { OnEmitHandler, SuperBuildContext } from "../super/build_context.ts"
import type { SuperPluginBuild } from "../super/plugin_build.ts"
import type { BundledInputFile, ErrableResult, ImportedEntity } from "../super/typedefs.ts"
import { EMIT_EMPTY, INNER_PLUGIN_BUILD } from "../super/typedefs.ts"


export interface EmissionsDriverPluginSetupConfig {
	ctx: SuperBuildContext
}

/** this plugin drives all {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling).
 *
 * > [!note]
 * > this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * > Hello Maddam Siiir, you're vehicle has failed its emissions inspection.
 * > you must subscribe to UK's £19/day _unclean vehicle_ program in order to use your vehicle,
 * > so that we can offset your unclean carbon emissions and keep our planet clean. thank you for understanding.
 * >
 * > _meanwhile, at the hall of jeffery, circa 2013_
 * >
 * > _Larry McOracle_: jeffery, my second best friend, how many data centers did our supreme minister say he would like on 300 acre patches of american soil?
 * >
 * > _Jeffy McEpstien_: he says yes. and also get peter griffin, I mean thiel, onboard for a new mass surveillance initiative.
*/
export const emissionsDriverPluginSetup = (config: EmissionsDriverPluginSetupConfig): EsbuildPluginSetup => {
	const ctx = config.ctx
	return (build: EsbuildPluginBuild | SuperPluginBuild) => {
		const
			abs_working_dir = pathToPosixPath(build.initialOptions.absWorkingDir ?? "./"),
			runtime_cwd = ensureEndSlash(getRuntimeCwd(identifyCurrentRuntime())),
			cwd = fileUrlToLocalPath(resolveAsUrl(abs_working_dir, runtime_cwd))!,
			resolve_path = resolvePathFactory(cwd),
			base_plugin_build = INNER_PLUGIN_BUILD in build
				? build[INNER_PLUGIN_BUILD]
				: build

		const
			longBuildController = ctx.longBuildController,
			onEmitHandlers = ctx.onEmitHandlers,
			resolvedResourceRegistry = ctx.resolvedResourceRegistry

		const findLongBuildFile = (
			metafile_abs_outputs: Map<string, FormattedMetafileOutputProps>,
			output_files: Array<FormattedOutputFile>,
		): ErrableResult<FormattedOutputFile | undefined> => {
			const
				warnings: EsbuildPartialMessage[] = [],
				errors: EsbuildPartialMessage[] = [],
				longbuild_base_filename = longBuildController.baseFilename.toLowerCase(),
				// below, we could have simply done `longbuild_files = output_files.filter((file) => { return file.path.endsWith(longbuild_base_filename) })`,
				// however, it will only work when the user does not specify `BuildOptions["entryNames"]`.
				// but if they do, then `file.path` will be unlikely to end with `longbuild_base_filename`,
				// rendering the method above useless, and hence is why we use the surefire `inputs` tracing method below.
				longbuild_files = [...metafile_abs_outputs].filter(([output_path, props]) => {
					// filter out all output files that have a "long build js file" as one of its input source files.
					return props.inputs.some((source_resolved_path) => source_resolved_path.endsWith(longbuild_base_filename))
				}).map(([output_path, props]) => {
					// find the output file entity corresponding to the output file paths that comprise of at least one "long build js file".
					return output_files.find((output_file) => output_file.path === output_path)
				}).filter((file) => {
					return !isNull(file)
				})
			if (longbuild_files.length !== 1) {
				errors.push({ text: `[parseLongBuildImportedEntities]: expected there to be only a single long-build file after bundling, instead found: ${longbuild_files.length} files.` })
				return { result: undefined, warnings, errors }
			}
			const longbuild_file = longbuild_files[0]
			return {
				result: longbuild_file,
				warnings,
				errors,
			}
		}

		type ParseImportedEntitiesResult = ErrableResult<Map<string, ImportedEntity[]>>

		const parseLongBuildImportedEntities = async (
			metafile_abs_outputs: Map<string, FormattedMetafileOutputProps>,
			longbuild_file: FormattedOutputFile,
		): Promise<ParseImportedEntitiesResult> => {
			const
				warnings: EsbuildPartialMessage[] = [],
				errors: EsbuildPartialMessage[] = [],
				metafile_abs_outputs_entries = [...metafile_abs_outputs],
				longbuild_path = resolve_path(longbuild_file.path),
				longbuild_contents = textDecoder.decode(longbuild_file.contents),
				import_entities = await longBuildController.parseLongBuildFileContent(longbuild_contents),
				// these are the runtime-based imports in the output file made by the user (i.e. plugins) during the transformation stage.
				// these imports are parsed from the long-build js file, and then mapped back to their `input` namespaced source paths.
				imported_entities = [...import_entities].map((
					[importer_resolved_path, entities_to_import]
				): ([importer_output_path: string, file_imports: Array<ImportedEntity>] | undefined) => {
					// "best effort" attempt to match importer's resolved path to an output file's input source, while keeping it case-insensitive
					// (which could lead to issue if multiple resources with the same name but different casing exist, but that's codebase issue, not mine).
					importer_resolved_path = importer_resolved_path.toLowerCase()
					const matching_output_file_entry = metafile_abs_outputs_entries.find(([output_path, props]) => {
						return props.inputs.includes(importer_resolved_path)
					})
					if (!matching_output_file_entry) {
						warnings.push({ text: `[parseLongBuildImportedEntities]: failed to find an output file that uses the input file: "${importer_resolved_path}".` })
						return
					}

					const
						[importer_output_path, importer_output_props] = matching_output_file_entry,
						number_of_sources = importer_output_props.inputs.length
					if (number_of_sources > 1) {
						warnings.push({
							text: `[parseLongBuildImportedEntities]: expected the output file "${importer_output_path}" to be composed of just a single file, `
								+ `but instead found it to be comprised of ${number_of_sources} source: [${importer_output_props.inputs.join(",\n")}]`
						})
					}

					const file_imports: ImportedEntity[] = entities_to_import.map((entity) => {
						// note: remember, `entity.path` is relative to the longbuild file, and not the `importer_output_path`.
						return {
							outputPath: resolve_path(longbuild_path, entity.path),
							key: entity.key,
							with: entity.with,
						}
					})

					return [importer_output_path, file_imports]
				}).filter((imported_entity) => !isNull(imported_entity))

			return {
				result: new Map(imported_entities),
				warnings,
				errors,
			}
		}

		const parseEsbuildImportedEntities = (
			metafile_abs_outputs: Map<string, FormattedMetafileOutputProps>,
		): ParseImportedEntitiesResult => {
			const
				warnings: EsbuildPartialMessage[] = [],
				errors: EsbuildPartialMessage[] = [],
				metafile_abs_outputs_entries = [...metafile_abs_outputs]

			// the runtime-based imports in the output file that esbuild itself generated during bundling.
			const imported_entities = metafile_abs_outputs_entries.map((
				[importer_output_path, props]
			): [importer_output_path: string, file_imports: Array<ImportedEntity>] => {
				const esbuild_imports: ImportedEntity[] = props.imports.map((outputPath): ImportedEntity => {
					// finding the original namespaced resolved path of the file that resulted in the `outputPath` file.
					// since there could be multiple `inputs` that resulted in the creation of the file at `outputPath`,
					// we set the `key` to be an array of all `inputs`.
					const output_path_inputs = metafile_abs_outputs.get(outputPath)?.inputs
					if (!output_path_inputs || output_path_inputs.length <= 0) {
						// TODO: under this scenario, I can technically still construct a `key` if I were to inspect the `imports` of the `outputPath`,
						// and then trace which of _its_ inputs correspond to this `outputPath`,
						// but that's just too convoluted and it'll still require a bunch of guessing, at which point it will not be worth the effort.
						warnings.push({
							text: `[emissionsDriverPlugin-onEmitHandler-imports_tracing]: `
								+ `expected import file "${outputPath}" to be made out of at least one input resource. `
								+ `but worry not, as this could happen when the emitted file is just a re-exporting chunk file.`
						})
					}
					return { outputPath, key: output_path_inputs }
				})
				return [importer_output_path, esbuild_imports]
			})

			return {
				result: new Map(imported_entities),
				warnings,
				errors,
			}
		}

		// try to match an `onEmit` hook's filters on a single output file resource (`abs_output_entry`).
		const matchOnEmitFilter = (
			handler: OnEmitHandler,
			output_files: Array<FormattedOutputFile>,
			all_imported_entities_map: ParseImportedEntitiesResult["result"],
			abs_output_entry: FormattedMetafileOutputEntry,
		): MatchOnEmitFilterResult | Require<Partial<MatchOnEmitFilterResult>, "warnings"> | undefined => {
			const
				warnings: EsbuildPartialMessage[] = [],
				[output_path, props] = abs_output_entry
			const { pluginName, filter, inputs: input_filters } = handler
			// test the output file name filter first.
			if (!filter.test(output_path)) { return }

			// acquire the list of all bundled files which were included in the current output resource, that can be traced back from the resource registry.
			const bundled_files: BundledInputFile[] = []
			for (const input_file of props.inputs) {
				const bundled_file = resolvedResourceRegistry.get(input_file)!
				if (bundled_file) { bundled_files.push(bundled_file) }
				else { warnings.push({ text: `[emissionsDriverPlugin-onEmitHandler]: resource registry never encountered the resource: "${input_file}"` }) }
			}

			// now we check if all input filters are satisfied by at least one input file each time.
			for (const input_filter of (input_filters ?? [])) {
				const { filter, namespace, loader, transformLoader } = input_filter
				const at_least_one_file_satisfies_conditions = bundled_files.map((bundled_file) => {
					return filter.test(bundled_file.path)
						&& (namespace ? namespace === bundled_file.namespace : true)
						&& (loader ? loader === bundled_file.loader : true)
						&& (transformLoader ? transformLoader === bundled_file.transformLoader : true)
				}).includes(true)
				if (!at_least_one_file_satisfies_conditions) { return { warnings } }
			}

			// if we've made it to here, then we may pass this output resource to the callback hook.
			const
				// unfortunately, I don't know a better way to handle letter-case inconsistency, other than making it entirely case-insensitive.
				lower_output_path = output_path.toLowerCase(),
				matched_output_file =
					// first search for an exact match. if none is found, then we move to case-insensitive output pathname matching.
					output_files.find((file) => { return file.path === output_path }) ??
					output_files.find((file) => { return file.path.toLowerCase() === lower_output_path })
			if (!matched_output_file) {
				warnings.push({ text: `[emissionsDriverPlugin-onEmitHandler]: could not find resource "${output_path}" in output files.` })
				return { warnings }
			}
			// these are all the runtime-based imports performed by `output_path`, consisting the ones defined by the user, and those generated by esbuild.
			const all_imports: ImportedEntity[] = all_imported_entities_map.get(output_path) ?? []

			return {
				match: matched_output_file,
				inputs: bundled_files,
				imports: all_imports,
				warnings,
			}
		}

		// handles all registered `onEmit` hooks.
		const performOnEmit: EsbuildOnEndCallback = async (result) => {
			const
				warnings: EsbuildPartialMessage[] = [],
				errors: EsbuildPartialMessage[] = [],
				output_files = format_output_files(resolve_path, result.outputFiles!),
				metafile = lowercaseMetafile(normalizeMetafile(result.metafile!)),
				abs_outputs = format_metafile_outputs(resolve_path, metafile.outputs, true),
				metafile_abs_outputs = new Map(abs_outputs),
				longbuild_file = findLongBuildFile(metafile_abs_outputs, output_files)
			warnings.push(...longbuild_file.warnings)
			errors.push(...longbuild_file.errors)
			if (isNull(longbuild_file.result)) { return { warnings, errors } }

			const
				parsed_esbuild_imports = parseEsbuildImportedEntities(metafile_abs_outputs),
				parsed_user_imports = await parseLongBuildImportedEntities(metafile_abs_outputs, longbuild_file.result),
				all_parsed_imports = mergeMapArrays(parsed_esbuild_imports.result, parsed_user_imports.result)
			warnings.push(...parsed_esbuild_imports.warnings, ...parsed_esbuild_imports.warnings)
			errors.push(...parsed_esbuild_imports.errors, ...parsed_esbuild_imports.errors)
			// TODO: in the future, the output files must be ordered with respect to their topological dependencies.
			// and then, to make it faster, we should also allow parallel output file handling when two or more output files are independent of one another.
			// I think this can be achieved by creating a chain of promises in groups of topological output file ordering, and then letting it run wild.
			const on_emit_promises = abs_outputs.map(async (abs_output_entry) => {
				// attempt at matching the output file with all available `onEmit` hooks' filters,
				// and stopping at the first match that yields a viable result.
				for (const handler of onEmitHandlers) {
					const match_result = matchOnEmitFilter(handler, output_files, all_parsed_imports, abs_output_entry)
					if (isNull(match_result?.match)) { continue }
					const { match: matched_file, inputs, imports, warnings } = match_result
					const on_emit_result = await handler.callback({
						outputPath: matched_file.path,
						contents: matched_file.contents,
						inputs: inputs!,
						imports: imports!,
					})

					// updating the emitted file `path` and `contents` from the `result`.
					if (isNull(on_emit_result)) { continue }
					if (on_emit_result.contents) {
						if (on_emit_result.contents === EMIT_EMPTY) { }// TODO: implement output file deletion.
						else {
							matched_file.contents = isString(on_emit_result.contents)
								? textEncoder.encode(on_emit_result.contents)
								: on_emit_result.contents
						}
					}
					if (on_emit_result.path) { matched_file.path = on_emit_result.path }
					if (on_emit_result.updateDependents) {
						// TODO: handle this option after grouped topological dependency traversal has been implemented.
					}

					// inserting the original plugin names of the plugins where the errors and warnings originated from.
					const pluginName = handler.pluginName
					on_emit_result.warnings?.forEach((warning) => { if (!warning.pluginName) { warning.pluginName = pluginName } })
					on_emit_result.errors?.forEach((error) => { if (!error.pluginName) { error.pluginName = pluginName } })
					on_emit_result.warnings = concatArrays(warnings, on_emit_result.warnings) // also add warnings from this plugin (the emissions driver) itself.
					return on_emit_result
				}
			})

			for (const value of await promise_all(on_emit_promises)) {
				if (value?.warnings) { warnings.push(...value.warnings) }
			}
			return { warnings, errors }
		}

		// handle all registered `onEnd` hooks.
		const performOnEnd: EsbuildOnEndCallback = async (result) => {
			const on_end_promises = ctx.onEndHandlers.map(async (handler) => {
				const
					{ pluginName, callback } = handler,
					on_end_result = await callback(result)
				// inserting the original plugin names of the plugins where the errors and warnings originated from.
				on_end_result?.warnings?.forEach((warning) => { if (!warning.pluginName) { warning.pluginName = pluginName } })
				on_end_result?.errors?.forEach((error) => { if (!error.pluginName) { error.pluginName = pluginName } })
				return on_end_result
			})
			const
				warnings: Array<EsbuildPartialMessage> = [],
				errors: Array<EsbuildPartialMessage> = []
			for (const value of await promise_all(on_end_promises)) {
				if (value?.warnings) { warnings.push(...value.warnings) }
				if (value?.errors) { errors.push(...value.errors) }
			}
			return { warnings, errors }
		}

		base_plugin_build.onEnd(async (result) => {
			const
				on_emit_results = await performOnEmit(result),
				on_end_results = await performOnEnd(result),
				warnings = concatArrays(on_emit_results?.warnings, on_end_results?.warnings),
				errors = concatArrays(on_emit_results?.errors, on_end_results?.errors)
			return { warnings, errors }
		})
	}
}

/** {@inheritDoc emissionsDriverPluginSetup} */
export const emissionsDriverPlugin = (config: EmissionsDriverPluginSetupConfig): EsbuildPlugin => {
	return {
		name: "oazmi-superbuild-emissions_driver-plugin",
		setup: emissionsDriverPluginSetup(config),
	}
}

interface MatchOnEmitFilterResult {
	match: FormattedOutputFile
	inputs: BundledInputFile[]
	imports: ImportedEntity[]
	warnings: EsbuildPartialMessage[]
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

	/** absolute file paths to other output files that need to be imported by this output file. */
	imports: string[]
}

type FormattedMetafileOutputEntry = [
	/** not namespaced, but an absolute file path. */
	output_path: string,
	properties: FormattedMetafileOutputProps,
]

/** formats a normalized metafile's outputs (from {@link normalizeMetafile}) to a more convenient format,
 * that exclusively uses absolute posix paths for all filesystem paths.
*/
const format_metafile_outputs = (
	resolve_path_fn: (path: string) => string,
	normalized_metafile_outputs: EsbuildMetafile["outputs"],
	force_lowercase: boolean = true,
): Array<FormattedMetafileOutputEntry> => {
	const
		namespaced_path_to_abs_namespaced_path = namespaced_path_to_abs_namespaced_path_factory(resolve_path_fn),
		output_entries = object_entries(normalized_metafile_outputs)
	return output_entries.map(([output_path, props]): FormattedMetafileOutputEntry => {
		const
			abs_output_path = resolve_path_fn(output_path),
			abs_entrypoint = props.entryPoint ? namespaced_path_to_abs_namespaced_path(props.entryPoint) : undefined,
			abs_input_paths = object_entries(props.inputs).map(([input_path, _props]) => namespaced_path_to_abs_namespaced_path(input_path)),
			// the import paths here are relative to cwd, and not relative to `abs_output_path`.
			abs_imports = props.imports.map(({ path, kind }) => resolve_path_fn(path))
		return [abs_output_path, {
			entryPoint: force_lowercase
				? abs_entrypoint?.toLowerCase()
				: abs_entrypoint,
			inputs: force_lowercase
				? abs_input_paths.map((resolved_input_path) => resolved_input_path.toLowerCase())
				: abs_input_paths,
			imports: abs_imports,
		}]
	})
}

interface FormattedOutputFile {
	index: number
	path: string
	hash?: string
	contents: Uint8Array<ArrayBuffer>
}

const format_output_files = (
	resolve_path_fn: (path: string) => string,
	output_files: EsbuildOutputFile[],
): Array<FormattedOutputFile> => {
	return output_files.map((file, index) => {
		return {
			index,
			path: resolve_path_fn(file.path),
			hash: file.hash,
			contents: file.contents as Uint8Array<ArrayBuffer>,
		}
	})
}
