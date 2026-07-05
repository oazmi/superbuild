/** an internal super-build plugin that drives and governs the {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling)
 * before they get emitted into the file system.
 *
 * this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * @module
*/

import { ensureEndSlash, fileUrlToLocalPath, getRuntimeCwd, identifyCurrentRuntime, isArray, isNull, isString, type MaybePromiseLike, object_entries, pathToPosixPath, promise_all, promiseOutside, resolveAsUrl, resolvePathFactory, textDecoder, textEncoder } from "../deps.ts"
import type { EsbuildMetafile, EsbuildMetafileImportProps, EsbuildOnEndCallback, EsbuildPartialMessage, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup } from "../esbuild/strongtypes.ts"
import type { EsbuildOutputFile } from "../esbuild/typedefs.ts"
import { concatArrays, lowercaseMetafile, mergeMapArrays, normalizeMetafile, splitNamespacedPath } from "../funcdefs.ts"
import type { OnEmitHandler, SuperBuildContext } from "../super/build_context.ts"
import type { SuperPluginBuild } from "../super/plugin_build.ts"
import type { BundledInputFile, ImportedEntity, OnEmitResult } from "../super/typedefs.ts"
import { DELETE_ENTITY, INNER_PLUGIN_BUILD } from "../super/typedefs.ts"
import type { LongBuildController, longBuildPlugin } from "./long_build.ts"


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

		// handles all registered `onEmit` hooks.
		const performOnEmit: EsbuildOnEndCallback = async (result) => {
			const
				outputFiles = format_output_files(resolve_path, result.outputFiles!),
				metafile = lowercaseMetafile(normalizeMetafile(result.metafile!)),
				metafileOutputs = format_metafile_outputs(resolve_path, metafile.outputs, true),
				registry_lowercase = format_resolved_resource_registry(resolvedResourceRegistry)

			const ctx: EmissionDriverContext = {
				resolvedResourceRegistry: registry_lowercase.result,
				longBuildController,
				metafileOutputs,
				outputFiles,
				resolvePath: resolve_path,
				warnings: registry_lowercase.warnings,
				errors: [],
			}

			const longbuild_file = findLongBuildFile(ctx)
			if (isNull(longbuild_file)) { return { warnings: ctx.warnings, errors: ctx.errors } }

			const
				parsed_esbuild_imports = parseEsbuildImportedEntities(ctx),
				parsed_user_imports = await parseLongBuildImportedEntities(ctx, longbuild_file),
				all_parsed_imports = mergeMapArrays(parsed_esbuild_imports, parsed_user_imports)

			// below, we create a parallel/branching chain of promises that is guaranteeded to resolve in topological ordering (import dependency wise),
			// and then we fire the `onEmit` action on each source node (zero dependency output files) to ignite the reaction.
			type NullableOnEmitResult = OnEmitResult | undefined | null | void
			const
				dependency_graph = DependencyGraphNode.createDependencyGraph<NullableOnEmitResult>(all_parsed_imports),
				source_resource_nodes = DependencyGraphNode.chainNodePromises<NullableOnEmitResult>(dependency_graph),
				all_node_promises = Promise.all([...dependency_graph.values()].map((node) => (node.promise))),
				on_emit_callback: DependencyGraphNode<string, NullableOnEmitResult>["callback"] = async (node, dependency_results) => {
					const
						output_path = node.id,
						on_emit_result = await performOnEmitOnOutputFile(ctx, onEmitHandlers, all_parsed_imports, output_path)
					// if any error is encountered in the user's `onEmit` hook function's return value,
					// exit the build early by rejecting the promise, and cancelling everything downstream.
					if ((on_emit_result?.errors?.length ?? 0) > 0) { node.reject(on_emit_result!.errors!) }
					return on_emit_result
				}
			dependency_graph.forEach((node) => { node.setCallback(on_emit_callback) })
			source_resource_nodes.forEach((node) => { node.fire() })

			// waiting for all of the `onEmit` hooks to take action, and then accumulate all warnings and errors.
			await all_node_promises
				.then((all_on_emit_results) => {
					for (const on_emit_result of all_on_emit_results) {
						if (on_emit_result?.warnings) { ctx.warnings.push(...on_emit_result.warnings) }
						// there shouldn't be any errors by this point. but I'll just put this case, just in case.
						if (on_emit_result?.errors) { ctx.errors.push(...on_emit_result.errors) }
					}
				}).catch((errors) => {
					if (isArray(errors)) { ctx.errors.push(...errors) }
					else { ctx.errors.push(errors) }
				})

			return { warnings: ctx.warnings, errors: ctx.errors }
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

/** formats a normalized metafile's outputs (from {@link normalizeMetafile}) to a more convenient format,
 * that exclusively uses absolute posix paths for all filesystem paths.
 *
 * the returned `Map`'s keys are the absolute output paths of the emitted files, and the values specify their metadata properties.
*/
const format_metafile_outputs = (
	resolve_path_fn: (path: string) => string,
	normalized_metafile_outputs: EsbuildMetafile["outputs"],
	force_lowercase: boolean = true,
): Map<string, FormattedMetafileOutputProps> => {
	const
		namespaced_path_to_abs_namespaced_path = namespaced_path_to_abs_namespaced_path_factory(resolve_path_fn),
		output_entries = object_entries(normalized_metafile_outputs)

	const result_entries = output_entries.map(([output_path, props]): [string, FormattedMetafileOutputProps] => {
		const
			abs_output_path = resolve_path_fn(output_path),
			abs_entrypoint = props.entryPoint ? namespaced_path_to_abs_namespaced_path(props.entryPoint) : undefined,
			abs_input_paths = object_entries(props.inputs).map(([input_path, _props]) => namespaced_path_to_abs_namespaced_path(input_path)),
			abs_imports: Array<EsbuildMetafileImportProps> = props.imports.map(({ path, kind, external = false }) => {
				// only non-external paths must be resolved to an absolute output local file path.
				const abs_output_path = external ? path : resolve_path_fn(path)
				return { path: abs_output_path, kind, external }
			})
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

	return new Map(result_entries)
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

interface EmissionDriverContext {
	/** a copy of the {@link SuperBuildContext.resolvedResourceRegistry}, where all keys use lower case characters.
	 * this is extremely important, as we've internally standardized to using only lower casing for namespaced resolved paths,
	 * in order to evade the filesystem case-insesnsitivity problem when matching strings.
	*/
	resolvedResourceRegistry: SuperBuildContext["resolvedResourceRegistry"]

	/** the long-build controller associated with the {@link SuperBuildContext}. */
	longBuildController: LongBuildController

	/** the formatted metafile outputs returned by {@link format_metafile_outputs}. */
	metafileOutputs: Map<string, FormattedMetafileOutputProps>

	/** an array of formatted output files returned by {@link format_output_files}. */
	outputFiles: Array<FormattedOutputFile>

	/** a path resolver function that joins `path_segments` wherever they're relative. */
	resolvePath: (...path_segments: string[]) => string

	/** a shared warnings array. */
	warnings: EsbuildPartialMessage[]

	/** a shared errors array. */
	errors: EsbuildPartialMessage[]
}

/** searches for the long-build file (that originates from the {@link longBuildPlugin}) in the list of bundled output files generated by esbuild. */
const findLongBuildFile = (ctx: EmissionDriverContext): FormattedOutputFile | undefined => {
	const {
		longBuildController,
		metafileOutputs,
		outputFiles,
		errors,
	} = ctx

	const
		longbuild_base_filename = longBuildController.baseFilename.toLowerCase(),
		// below, we could have simply done `longbuild_files = output_files.filter((file) => { return file.path.endsWith(longbuild_base_filename) })`,
		// however, it will only work when the user does not specify `BuildOptions["entryNames"]`.
		// but if they do, then `file.path` will be unlikely to end with `longbuild_base_filename`,
		// rendering the method above useless, and hence is why we use the surefire `inputs` tracing method below.
		longbuild_files = [...metafileOutputs].filter(([output_path, props]) => {
			// filter out all output files that have a "long build js file" as one of its input source files.
			return props.inputs.some((source_resolved_path) => source_resolved_path.endsWith(longbuild_base_filename))
		}).map(([output_path, props]) => {
			// find the output file entity corresponding to the output file paths that comprise of at least one "long build js file".
			return outputFiles.find((output_file) => output_file.path === output_path)
		}).filter((file) => {
			return !isNull(file)
		})
	if (longbuild_files.length !== 1) {
		errors.push({ text: `[findLongBuildFile]: expected there to be only a single long-build file after bundling, instead found: ${longbuild_files.length} files.` })
		return
	}
	const longbuild_file = longbuild_files[0]
	return longbuild_file
}

type ParseImportedEntities = Map<string, ImportedEntity[]>

/** parses the long-build plugin's output js file to generate a mapping between an output file's path,
 * and the user-based imported entities specified during the transformation stage.
*/
const parseLongBuildImportedEntities = async (
	ctx: EmissionDriverContext,
	longbuild_file: FormattedOutputFile,
): Promise<ParseImportedEntities> => {
	const {
		longBuildController,
		metafileOutputs,
		resolvePath,
		warnings,
	} = ctx

	const
		longbuild_path = resolvePath(longbuild_file.path),
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
			const matching_output_file_entry = [...metafileOutputs].find(([output_path, props]) => {
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
				// moreover, only non-external entities must go through the local-file output path resolution.
				const
					{ key, path, with: with_attr = {}, external = false } = entity,
					abs_output_path = external ? path : resolvePath(longbuild_path, path),
					kind = "user-import" // this is our standard `kind` label for user imports that originate from the transformation stage.
				return { key, outputPath: abs_output_path, kind, with: with_attr, external }
			})

			return [importer_output_path, file_imports]
		}).filter((imported_entity) => !isNull(imported_entity))

	return new Map(imported_entities)
}

/** parses esbuild's metafile output to generate a mapping between an output file's path,
 * and the imported entities found by esbuild natively (js imports, css imports, etc...).
*/
const parseEsbuildImportedEntities = (ctx: EmissionDriverContext): ParseImportedEntities => {
	const {
		metafileOutputs,
		warnings,
	} = ctx

	// the runtime-based imports in the output file that esbuild itself generated during bundling.
	const imported_entities = [...metafileOutputs].map((
		[importer_output_path, props]
	): [importer_output_path: string, file_imports: Array<ImportedEntity>] => {
		const esbuild_imports: ImportedEntity[] = props.imports.map((import_props): ImportedEntity => {
			// finding the original namespaced resolved path of the file that resulted in the `outputPath` file.
			// since there could be multiple `inputs` that resulted in the creation of the file at `outputPath`,
			// we set the `key` to be an array of all `inputs`.
			const
				{ path: outputPath, kind, external } = import_props,
				output_path_inputs = metafileOutputs.get(outputPath)?.inputs
			if (!external && (!output_path_inputs || output_path_inputs.length <= 0)) {
				// TODO: under this scenario, I can technically still construct a `key` if I were to inspect the `imports` of the `outputPath`,
				// and then trace which of _its_ inputs correspond to this `outputPath`,
				// but that's just too convoluted and it'll still require a bunch of guessing, at which point it will not be worth the effort.
				warnings.push({
					text: `[parseEsbuildImportedEntities]: `
						+ `expected import file "${outputPath}" to be made out of at least one input resource. `
						+ `but worry not, as this could happen when the emitted file is just a re-exporting chunk file.`
				})
			}
			return { outputPath, key: output_path_inputs, kind, external }
		})
		return [importer_output_path, esbuild_imports]
	})

	return new Map(imported_entities)
}

interface MatchOnEmitFilterResult {
	match: FormattedOutputFile
	inputs: BundledInputFile[]
	imports: ImportedEntity[]
	warnings: EsbuildPartialMessage[]
}

/** tries to match an `onEmit` hook's filters on a single output file resource (`abs_output_entry`). */
const matchOnEmitFilter = (
	ctx: EmissionDriverContext,
	handler: OnEmitHandler,
	all_imported_entities_map: ParseImportedEntities,
	output_path: string,
): (MatchOnEmitFilterResult | undefined) => {
	const {
		resolvedResourceRegistry,
		metafileOutputs,
		outputFiles,
		warnings,
	} = ctx

	const
		props = metafileOutputs.get(output_path)!,
		{ pluginName, filter, inputs: input_filters } = handler,
		local_warnings: EsbuildPartialMessage[] = []
	// test the output file name filter first.
	if (!filter.test(output_path)) { return }

	// acquire the list of all bundled files which were included in the current output resource, that can be traced back from the resource registry.
	const bundled_files: BundledInputFile[] = []
	for (const input_file of props.inputs) {
		const bundled_file = resolvedResourceRegistry.get(input_file)!
		if (bundled_file) { bundled_files.push(bundled_file) }
		else {
			const warning = { text: `[matchOnEmitFilter]: resource registry never encountered the resource: "${input_file}"` }
			warnings.push(warning)
			local_warnings.push(warning)
		}
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
		if (!at_least_one_file_satisfies_conditions) { return }
	}

	// if we've made it to here, then we may pass this output resource to the callback hook.
	const
		// unfortunately, I don't know a better way to handle letter-case inconsistency, other than making it entirely case-insensitive.
		lower_output_path = output_path.toLowerCase(),
		matched_output_file =
			// first search for an exact match. if none is found, then we move to case-insensitive output pathname matching.
			outputFiles.find((file) => { return file.path === output_path }) ??
			outputFiles.find((file) => { return file.path.toLowerCase() === lower_output_path })
	if (!matched_output_file) {
		warnings.push({ text: `[matchOnEmitFilter]: could not find resource "${output_path}" in output files.` })
		return
	}
	// these are all the runtime-based imports performed by `output_path`, consisting the ones defined by the user, and those generated by esbuild.
	const all_imports: ImportedEntity[] = all_imported_entities_map.get(output_path) ?? []

	return {
		match: matched_output_file,
		inputs: bundled_files,
		imports: all_imports,
		warnings: local_warnings,
	}
}

const performOnEmitOnOutputFile = async (
	ctx: EmissionDriverContext,
	on_emit_handlers: OnEmitHandler[],
	all_imported_entities_map: ParseImportedEntities,
	output_path: string,
): Promise<OnEmitResult | undefined> => {
	// attempt at matching the output file with all available `onEmit` hooks' filters,
	// and stopping at the first match that yields a viable result.
	for (const handler of on_emit_handlers) {
		const match_result = matchOnEmitFilter(ctx, handler, all_imported_entities_map, output_path)
		if (isNull(match_result)) { continue }
		const { match: matched_file, inputs, imports, warnings: local_warnings } = match_result
		const on_emit_result = await handler.callback({
			outputPath: matched_file.path,
			contents: matched_file.contents,
			inputs: inputs!,
			imports: imports!,
		})

		// updating the emitted file `path` and `contents` from the `result`.
		if (isNull(on_emit_result)) { continue }
		if (on_emit_result.contents) {
			matched_file.contents = isString(on_emit_result.contents)
				? textEncoder.encode(on_emit_result.contents)
				: on_emit_result.contents
		}
		if (on_emit_result.path) {
			// TODO: implement output file deletion.
			// though, what will happen to the files that depend on the deleted files?
			// should I simply delete this resource from the dependency graph and call it a day?
			if (on_emit_result.path === DELETE_ENTITY) { }
			else {
				matched_file.path = on_emit_result.path
			}
		}
		if (on_emit_result.updateDependents) {
			// TODO: handle this option after grouped topological dependency traversal has been implemented.
		}

		// inserting the original plugin names of the plugins where the errors and warnings originated from.
		const pluginName = handler.pluginName
		on_emit_result.warnings?.forEach((warning) => { if (!warning.pluginName) { warning.pluginName = pluginName } })
		on_emit_result.errors?.forEach((error) => { if (!error.pluginName) { error.pluginName = pluginName } })
		on_emit_result.warnings = concatArrays(local_warnings, on_emit_result.warnings) // also add warnings from this plugin (the emissions driver) itself.
		return on_emit_result
	}
}

type DependencyGraph<ID = string, T = any> = Map<ID, DependencyGraphNode<ID, T>>

class DependencyGraphNode<ID = string, T = any> {
	public readonly id: ID
	public readonly dependencies: Set<ID>
	public readonly promise: Promise<T>
	public readonly resolve: (result: MaybePromiseLike<T>) => void
	public readonly reject: (reason?: any) => void
	protected callback?: (self: this, dependency_results: Array<T>) => Promise<T>

	constructor(id: ID, dependencies: Iterable<ID>) {
		this.id = id
		this.dependencies = new Set(dependencies)
		const [promise, resolve, reject] = promiseOutside<T>()
		this.promise = promise
		this.resolve = resolve
		this.reject = reject
	}

	/** set the callback function to run once the {@link promise | promises} of _this_ node's {@link dependencies} get resolved.
	 * once your callback has been executed and waited for, the {@link promise} of _this_ node will also get resolved.
	*/
	public setCallback(callback: (self: this, dependency_results: Array<T>) => Promise<T>): void {
		this.callback = callback
	}

	/** manually fire the {@link callback} function of this node, and have its {@Link promise} get resolved.
	 * this is only intended to be used for source nodes (which carry no dependencies), although it is not enforced.
	*/
	public async fire(): Promise<T> {
		if (this.callback) { this.callback(this, []).then(this.resolve, this.reject) }
		else { this.reject([{ text: `[DependencyGraphNode.fire]: no callback was set for node id: "${this.id}".` } satisfies EsbuildPartialMessage]) }
		return this.promise
	}

	/** prepare a dependency graph from a `Map` of entity imports information. */
	static createDependencyGraph<T>(all_imported_entities_map: ParseImportedEntities): DependencyGraph<string, T> {
		const graph = [...all_imported_entities_map].map(([output_path, imported_entities]) => {
			const
				dependency_paths = imported_entities
					// external resources do not contribute to dependency graph, as they themselves (the external resources) do not get emitted, nor do they go through the emission stage.
					// also, while `props.outputPath` is guaranteed to be a `string` at this point (and cannot be the `DELETED_ENTITY` symbol), we still filter out that case just in case.
					.filter((props) => { return !props.external && isString(props.outputPath) })
					.map((props) => { return props.outputPath as string }),
				node = new this<string>(output_path, dependency_paths)
			return [output_path, node] satisfies [graph_id: string, graph_node: InstanceType<typeof this<string, T>>]
		})
		return new Map(graph)
	}

	/** chains the promises of a dependency graph, so that each node's {@link callback} is fired after all of it dependencies have been fired,
	 * while maintaining asynchronocity among all branches.
	 * the returned value contains an array of all nodes that are source nodes (carry no dependency).
	*/
	static chainNodePromises<T>(dependency_graph: DependencyGraph<string, T>): Array<InstanceType<typeof this<string, T>>> {
		const source_nodes: Array<InstanceType<typeof this<string, T>>> = []
		for (const [id, node] of dependency_graph) {
			if (node.dependencies.size <= 0) {
				source_nodes.push(node)
				continue
			}
			const dependency_promises = [...node.dependencies].map((dep_id) => {
				const dep_node = dependency_graph.get(dep_id)!
				return dep_node.promise
			})
			Promise.all(dependency_promises)
				.then((dependency_results) => {
					const callback = node.callback
					if (!callback) {
						node.reject([{
							text: `[DependencyGraphNode::chainNodePromises]: no callback was set for node id: "${node.id}".`
						} satisfies EsbuildPartialMessage])
					} else { node.resolve(callback(node, dependency_results)) }
				})
				.catch((reason) => node.reject(reason))
		}
		return source_nodes
	}
}
