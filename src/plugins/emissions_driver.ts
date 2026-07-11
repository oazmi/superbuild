/** an internal super-build plugin that drives and governs the {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling)
 * before they get emitted into the file system.
 *
 * this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * @module
*/

import { array_isEmpty, ensureEndSlash, fileUrlToLocalPath, getRuntimeCwd, identifyCurrentRuntime, isArray, isNull, type MaybePromiseLike, pathToPosixPath, promise_all, promiseOutside, resolveAsUrl, resolvePathFactory, textDecoder } from "../deps.js"
import type { Metafile } from "../esbuild/metafile.js"
import type { ImportedEntityNode, OutputFileEntity } from "../esbuild/outputfile.js"
import type { EsbuildMetafile, EsbuildOnEndCallback, EsbuildOnEndResult, EsbuildPartialMessage, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup } from "../esbuild/strongtypes.js"
import { concatArrays } from "../funcdefs.js"
import type { SuperBuildContext } from "../super/build_context.js"
import type { SuperPluginBuild } from "../super/plugin_build.js"
import type { OnEmitResult } from "../super/typedefs.js"
import { INNER_PLUGIN_BUILD } from "../super/typedefs.js"
import type { LongBuildController, longBuildPlugin } from "./long_build.js"


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
			onEndHandlers = ctx.onEndHandlers

		// handles all registered `onEmit` hooks.
		const performOnEmit = async (metafile: Metafile): Promise<EsbuildOnEndResult> => {
			const ctx: EmissionDriverContext = {
				longBuildController,
				metafile,
				resolvePath: resolve_path,
				warnings: metafile.warnings,
				errors: [],
			}

			const longbuild_file = findLongBuildFile(ctx)
			if (isNull(longbuild_file)) { return { warnings: ctx.warnings, errors: ctx.errors } }
			await incorporateLongBuildImportedEntities(ctx, longbuild_file)

			// below, we create a parallel/branching chain of promises that is guaranteeded to resolve in topological ordering (import dependency wise),
			// and then we fire the `onEmit` action on each source node (zero dependency output files) to ignite the reaction.
			type NullableOnEmitResult = OnEmitResult | undefined | null | void
			const
				files_dependency_graph = metafile.createFileDependencyGraph(),
				dependency_graph = DependencyGraphNode.fromGraph(files_dependency_graph),
				source_resource_nodes = DependencyGraphNode.chainNodePromises<OutputFileEntity, NullableOnEmitResult>(dependency_graph),
				all_node_promises = Promise.all([...dependency_graph.values()].map((node) => (node.promise))),
				on_emit_callback: DependencyGraphNode<OutputFileEntity, OutputFileEntity, NullableOnEmitResult>["callback"] = async (node, dependency_results) => {
					const
						entity = node.key,
						on_emit_result = await entity.performOnEmit(onEmitHandlers)
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
			const on_end_promises = onEndHandlers.map(async (handler) => {
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
				metafile = ctx.createMetafile(result, { resolvePath: resolve_path }),
				on_emit_results = await performOnEmit(metafile),
				on_end_results = await performOnEnd(result),
				warnings = concatArrays(on_emit_results?.warnings, on_end_results?.warnings),
				errors = concatArrays(on_emit_results?.errors, on_end_results?.errors)
			// end this build by informing the build context via its `endBuild` method.
			await ctx.endBuild(metafile)
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

interface EmissionDriverContext {
	/** the long-build controller associated with the {@link SuperBuildContext}. */
	longBuildController: LongBuildController

	/** the {@link Metafile} associated with the esbuild build-result's {@link EsbuildMetafile | metafile} object. */
	metafile: Metafile

	/** a path resolver function that joins `path_segments` wherever they're relative. */
	resolvePath: (...path_segments: string[]) => string

	/** a shared warnings array. */
	warnings: EsbuildPartialMessage[]

	/** a shared errors array. */
	errors: EsbuildPartialMessage[]
}

/** searches for the long-build file (that originates from the {@link longBuildPlugin}) in the list of bundled output files generated by esbuild. */
const findLongBuildFile = (ctx: EmissionDriverContext): OutputFileEntity | undefined => {
	const { longBuildController, metafile, errors } = ctx
	const
		longbuild_plugin_namespace = longBuildController.pluginNamespace,
		longbuild_files = metafile.findFileFromSources((input_sources) => {
			const does_include_longbuild_source_file = input_sources.some(({ path: _source_resolved_path, namespace }) => {
				return namespace === longbuild_plugin_namespace
			})
			return does_include_longbuild_source_file
		})
	if (longbuild_files.length !== 1) {
		errors.push({ text: `[findLongBuildFile]: expected there to be only a single long-build file after bundling, instead found: ${longbuild_files.length} files.` })
		return
	}
	const longbuild_file = longbuild_files[0]
	return longbuild_file
}

/** parses the long-build plugin's output js file to discover additional user-made imports (specified during the transformation stage),
 * and then adds them to their respective importer's {@link OutputFileEntity}.
*/
const incorporateLongBuildImportedEntities = async (
	ctx: EmissionDriverContext,
	longbuild_file: OutputFileEntity,
): Promise<void> => {
	const {
		longBuildController,
		metafile,
		resolvePath,
		warnings,
	} = ctx

	const
		longbuild_path = longbuild_file.initialPath ?? longbuild_file.outputPath,
		longbuild_contents = textDecoder.decode(longbuild_file.contents),
		import_entities = await longBuildController.parseLongBuildFileContent(longbuild_contents)
	for (let [importer_resolved_path, entities_to_import] of import_entities) {
		// `entities_to_import` are the runtime-based imports in the output file made by the user (i.e. plugins) during the transformation stage.
		// our goal below is to first identify which output file entity(ies) originate from the `importer_resolved_path` source file,
		// and then we shall inject the new (user made) imports into it/them (if there were multiple files using the same importer as their source file).
		importer_resolved_path = importer_resolved_path.toLowerCase()
		const entities_using_importer_as_input_source = metafile.findFileFromSources((input_sources) => {
			const entity_uses_importer_as_source = input_sources.some(({ path, namespace }) => {
				return (namespace + ":" + path).toLowerCase() === importer_resolved_path
			})
			return entity_uses_importer_as_source
		})

		if (array_isEmpty(entities_using_importer_as_input_source)) {
			warnings.push({ text: `[incorporateLongBuildImportedEntities]: failed to find an output file that uses the following source as its input: "${importer_resolved_path}".` })
			continue
		}
		// TODO: re-consider what scenarios can lead to the warnable situation below. is it even a problem if it occurs?
		if (entities_using_importer_as_input_source.length > 1) {
			warnings.push({ text: `[incorporateLongBuildImportedEntities]: we usually expect only a single output file to be made out of the given input source: "${importer_resolved_path}".` })
		}

		// collect all import entity nodes that is to be incorporated into each entity using these imports.
		const imported_entity_nodes: Array<ImportedEntityNode> = entities_to_import.map((import_entity) => {
			// note: remember, `import_entity.path` is relative to the longbuild file, and not the importer's `initial_output_path`.
			// moreover, only non-external entities must go through the local-file output path resolution.
			const
				{ key, path, with: with_attr = {}, external = false } = import_entity,
				kind = "user-import", // this is our standard `kind` label for user imports that originate from the transformation stage.
				entity: ImportedEntityNode["entity"] = external
					? { externalPath: path }
					: metafile.getFile(resolvePath(longbuild_path, path))!
			return { key, kind, with: with_attr, external, entity }
		})

		// finally, we add append copies of the `imported_entity_nodes` to each file entity that uses the `importer` file as an input source.
		for (const file_entity of entities_using_importer_as_input_source) {
			const
				initial_output_path = file_entity.initialPath ?? file_entity.outputPath,
				number_of_sources = file_entity.inputs.length
			// TODO: I'm not sure why I considered the situation below to be harmful. re-consider if there even is an issue with this scenario.
			if (number_of_sources > 1) {
				const input_sources = file_entity.inputs.map((input_source) => (input_source.namespace + ":" + input_source.path))
				warnings.push({
					text: `[incorporateLongBuildImportedEntities]: expected the output file "${initial_output_path}" to be composed of just a single file, `
						+ `but instead found it to be comprised of ${number_of_sources} source: [${input_sources.join(",\n")}]`
				})
			}
			// appending copies of the `imported_entity_nodes` into this file entity's `imports`.
			file_entity.imports.push(...imported_entity_nodes.map((node) => { return { ...node } }))
		}
	}
}

type DependencyGraph<K, V, R = any> = Map<K, DependencyGraphNode<K, V, R>>

class DependencyGraphNode<K, V, R = any> {
	public readonly key: K
	public readonly dependencies: Set<K>
	public readonly promise: Promise<R>
	public readonly resolve: (result: MaybePromiseLike<R>) => void
	public readonly reject: (reason?: any) => void
	protected callback?: (self: this, dependency_results: Array<R>) => Promise<R>

	constructor(key: K, dependencies: Iterable<K>) {
		this.key = key
		this.dependencies = new Set(dependencies)
		const [promise, resolve, reject] = promiseOutside<R>()
		this.promise = promise
		this.resolve = resolve
		this.reject = reject
	}

	/** set the callback function to run once the {@link promise | promises} of _this_ node's {@link dependencies} get resolved.
	 * once your callback has been executed and waited for, the {@link promise} of _this_ node will also get resolved.
	*/
	public setCallback(callback: (self: this, dependency_results: Array<R>) => Promise<R>): void {
		this.callback = callback
	}

	/** manually fire the {@link callback} function of this node, and have its {@Link promise} get resolved.
	 * this is only intended to be used for source nodes (which carry no dependencies), although it is not enforced.
	*/
	public async fire(): Promise<R> {
		if (this.callback) { this.callback(this, []).then(this.resolve, this.reject) }
		else { this.reject([{ text: `[DependencyGraphNode.fire]: no callback was set for node id: "${this.key}".` } satisfies EsbuildPartialMessage]) }
		return this.promise
	}

	/** create a dependency graph from an existing graph `Map`. */
	static fromGraph<T, R = any>(dependency_graph: Map<T, Set<T>>): DependencyGraph<T, T, R> {
		const graph = [...dependency_graph].map(([key, dependencies]) => {
			const node = new this<T, T>(key, dependencies)
			return [key, node] satisfies [graph_key: T, graph_node: InstanceType<typeof this<T, T>>]
		})
		return new Map(graph)
	}

	/** chains the promises of a dependency graph, so that each node's {@link callback} is fired after all of it dependencies have been fired,
	 * while maintaining asynchronocity among all branches.
	 * the returned value contains an array of all nodes that are source nodes (carry no dependency).
	*/
	static chainNodePromises<T, R = any>(dependency_graph: DependencyGraph<T, T, R>): Array<InstanceType<typeof this<T, T, R>>> {
		const source_nodes: Array<InstanceType<typeof this<T, T>>> = []
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
							text: `[DependencyGraphNode::chainNodePromises]: no callback was set for node id: "${node.key}".`
						} satisfies EsbuildPartialMessage])
					} else { node.resolve(callback(node, dependency_results)) }
				})
				.catch((reason) => node.reject(reason))
		}
		return source_nodes
	}
}
