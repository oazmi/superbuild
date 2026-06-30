/** an internal super-build plugin that drives and governs the {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling)
 * before they get emitted into the file system.
 *
 * this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * @module
*/

import { ensureEndSlash, fileUrlToLocalPath, getRuntimeCwd, identifyCurrentRuntime, isNull, isString, object_entries, pathToPosixPath, promise_all, type Require, resolveAsUrl, resolvePathFactory, textEncoder } from "../deps.ts"
import type { EsbuildMetafile, EsbuildOnEndCallback, EsbuildPartialMessage, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup } from "../esbuild/strongtypes.ts"
import type { EsbuildOutputFile } from "../esbuild/typedefs.ts"
import { concatArrays, normalizeMetafile } from "../funcdefs.ts"
import type { OnEmitHandler, SuperBuildContext } from "../super/build_context.ts"
import type { SuperPluginBuild } from "../super/plugin_build.ts"
import type { BundledInputFile, ImportedEntity } from "../super/typedefs.ts"
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
			onEmitHandlers = ctx.onEmitHandlers,
			resolvedResourceRegistry = ctx.resolvedResourceRegistry

		// try to match an `onEmit` hook's filters on a single output file resource (`abs_output_entry`).
		const matchOnEmitFilter = (
			handler: OnEmitHandler,
			metafile_abs_outputs: Map<string, FormattedMetafileOutputProps>,
			output_files: Array<FormattedOutputFile>,
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
				const bundled_file = resolvedResourceRegistry.get(input_file)
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
				matched_output_file = output_files.find((file) => { return file.path.toLowerCase() === lower_output_path })
			if (!matched_output_file) {
				warnings.push({ text: `[emissionsDriverPlugin-onEmitHandler]: could not find resource "${output_path}" in output files.` })
				return { warnings }
			}

			const imports: ImportedEntity[] = props.imports.map((outputPath): ImportedEntity => {
				// finding the original namespaced resolved path of the file that resulted in the `outputPath` file.
				// since there could be multiple `inputs` that resulted in the creation of the file at `outputPath`,
				// we set the `key` to be an array of all `inputs`, while leaving out the `path` to be `undefined`
				// (even though it would make sense to set `path = inputs[0]` if there was only a single contributing input,
				// but for consistency of the format, I'll be using array `key`s exclusively.)
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

			return {
				match: matched_output_file,
				inputs: bundled_files,
				imports: imports, // TODO: add imports that were traced back from the long build.
				warnings,
			}
		}

		// handles all registered `onEmit` hooks.
		const performOnEmit: EsbuildOnEndCallback = async (result) => {
			const
				output_files = format_output_files(resolve_path, result.outputFiles!),
				metafile = normalizeMetafile(result.metafile!),
				abs_outputs = format_metafile_outputs(resolve_path, metafile.outputs),
				metafile_abs_outputs = new Map(abs_outputs)

			// TODO: in the future, the output files must be ordered with respect to their topological dependencies.
			// and then, to make it faster, we should also allow parallel output file handling when two or more output files are independent of one another.
			// I think this can be achieved by creating a chain of promises in groups of topological output file ordering, and then letting it run wild.
			const on_emit_promises = abs_outputs.map(async (abs_output_entry) => {
				// attempt at matching the output file with all available `onEmit` hooks' filters,
				// and stopping at the first match that yields a viable result.
				for (const handler of onEmitHandlers) {
					const match_result = matchOnEmitFilter(handler, metafile_abs_outputs, output_files, abs_output_entry)
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

			const warnings: Array<EsbuildPartialMessage> = []
			for (const value of await promise_all(on_emit_promises)) {
				if (value?.warnings) { warnings.push(...value.warnings) }
			}
			return { warnings }
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
			entryPoint: abs_entrypoint,
			inputs: abs_input_paths,
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
