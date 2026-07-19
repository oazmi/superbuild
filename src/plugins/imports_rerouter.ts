/** the plugin in this module re-routes relative imports inside either a `js` or `css` entry-point file to an alternate directory.
 *
 * @module
*/

import { isNull, isRelativePath, joinPaths, pathToPosixPath, relativePath, type Require } from "../deps.js"
import type { EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnResolveArgs } from "../esbuild/strongtypes.js"
import type { SuperPluginBuild } from "../super/plugin_build.js"
import type { ImportedEntity } from "../super/typedefs.js"
import type { AbsolutePath } from "../typedefs.js"


/** configuration options for {@link importsRerouterPluginSetup}. */
export interface ImportsRerouterPluginSetupConfig {
	/** the absolute path where the entry-point currently resides in. */
	initialPath: NonNullable<ImportedEntity["initialPath"]>

	/** the updated absolute path where the entry-point is to be migrated to.
	 * if the entry-point is not to be moved, then do not declare this field.
	*/
	outputPath?: ImportedEntity["outputPath"]

	/** declare all known imports of this js or css module. inside each element of the array:
	 * - the `outputPath` required field should declare the current absolute path of the resource.
	 * - the `initialPath` optional field should declare the _original_ absolute path of the resource,
	 *   where _your entry-point_ is currently coded to load this resource from.
	 *   when the `initialPath` is declared, it indicates that the referenced imported resource's path _inside_
	 *   your entry-point file needs to be updated to match the resource's current `outputPath`.
	 * - the `external` optional field specifies if the imported resource's absolute `outputPath` is _external_,
	 *   and hence not influenced by the location/migration of the entry-point to an alternate directory ({@link outputPath}).
	 *   however, any `initialPath` field that might be present on the imported entity will still indicate that it needs to be updated,
	 *   just not with respect to any new {@link outputPath}, but rather with respect to the old {@link initialPath}.
	 *   (moreover, the resource's import path string will an absolute path rather than a relative path).
	*/
	imports: Require<Partial<ImportedEntity>, "outputPath">[]
}

const normalize_abs_path = (abs_path: AbsolutePath): AbsolutePath => {
	return pathToPosixPath(abs_path).toLowerCase()
}

const create_import_path_key = (imported_entity: ImportsRerouterPluginSetupConfig["imports"][number]): AbsolutePath => {
	const
		abs_import_path = imported_entity.initialPath ?? imported_entity.outputPath,
		path_key = normalize_abs_path(abs_import_path)
	return path_key
}

/** this plugin is intended to be executed with just a single entry-point.
 * it re-routes the entry-point's relative import paths,
 * such that they would remain valid if the entry-point had been moved to the {@link ImportsRerouterPluginSetupConfig.outputPath}.
*/
export const importsRerouterPluginSetup = (config: ImportsRerouterPluginSetupConfig): EsbuildPluginSetup => {
	const
		{ initialPath, outputPath, imports } = config,
		imports_map = new Map(imports.map((imported_entity): [key: AbsolutePath, typeof imported_entity] => {
			// in order to identify which import resources correspond to which `onResolve` argument,
			// we prepare a case-insensitive `Map` that uses absolute paths of the import resources as keys.
			return [create_import_path_key(imported_entity), imported_entity]
		}))

	return async (build: EsbuildPluginBuild | SuperPluginBuild) => {
		build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
			// obviously, we do not intercept nor process the entry-point entity. only imported entities get their paths processed.
			if (args.kind === "entry-point") { return }
			// first, we try to find which entity from the `imports_map` does the current `args` entity correspond to.
			const
				{ path } = args,
				is_relative = isRelativePath(path),
				abs_path = is_relative ? joinPaths(initialPath, path) : path,
				path_key = normalize_abs_path(abs_path),
				imported_entity = imports_map.get(path_key)
			if (isNull(imported_entity)) {
				// we expect all imported entities to get reported by `imports_map`.
				// if we see some resource that is not registered in there, then we better throw a warning.
				// TODO: suppose that the resource was not reported by `imports_map`, but it is however a relative link.
				// shouldn't I at least re-route the returned path with respect to any updated new `outputPath` of the entry-point?
				// currently I'm not doing so, but I'll consider doing it if I begin encountering errors/warnings in the future spawning from this inconsideration.
				const warning_text = `[importsRerouterPlugin]: expected the following import entity to be part of the provided list of imports: "${path_key}".`
				return { path, external: true, warnings: [{ location: { file: initialPath }, text: warning_text }] }
			}

			// if the imported entity itself was migrated, then we'll need to update the import path associated with it.
			const new_path = isNull(imported_entity.initialPath)
				? abs_path
				: imported_entity.outputPath

			// if the imported entity was declared to be an external resource,
			// then any path migration of the entry-point source file should not influence its import path.
			// hence, we return early in such instances.
			if (imported_entity.external) { return { path: new_path, external: true } }

			// now, we compute the the imported entity's relative path with respect to the entry-point's current location,
			// which depends on whether or not it (the entry-point) was migrated.
			const rel_path = relativePath(outputPath ?? initialPath, abs_path)
			// and once again, `external` is set to `true` because we do not want esbuild tampering with our intricately computed relative path.
			return { path: rel_path, external: true }
		})
	}
}

/** {@inheritDoc importsRerouterPluginSetup} */
export const importsRerouterPlugin = (config: ImportsRerouterPluginSetupConfig): EsbuildPlugin => {
	return {
		name: "oazmi-superbuild-imports_rerouter-plugin",
		setup: importsRerouterPluginSetup(config),
	}
}
