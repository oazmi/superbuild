/** the plugin in this module re-routes relative imports inside either a `js` or `css` entry-point file to an alternate directory.
 *
 * @module
*/

import { isRelativePath, joinPaths, pathToPosixPath, relativePath } from "../deps.ts"
import type { EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnResolveArgs } from "../esbuild/strongtypes.ts"
import type { SuperPluginBuild } from "../super/plugin_build.ts"


/** configuration options for {@link importsRerouterPluginSetup}. */
export interface ImportsRerouterPluginSetupConfig {
	/** the updated path where the entry-point is to be migrated to. */
	updatedOutputPath: string
}

/** this plugin is intended to be executed with just a single entry-point.
 * it re-routes the entry-point's relative import paths,
 * such that they would remain valid if the entry-point had been moved to the {@link ImportsRerouterPluginSetupConfig.updatedOutputPath}.
*/
export const importsRerouterPluginSetup = (config: ImportsRerouterPluginSetupConfig): EsbuildPluginSetup => {
	return async (build: EsbuildPluginBuild | SuperPluginBuild) => {
		const updatedOutputPath = pathToPosixPath(config.updatedOutputPath)
		build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
			// we only process non-entry-points that are relative paths, and then declare them as external paths,
			// but with a new relative path that corresponds to the new directory of the importer.
			if (args.kind === "entry-point") { return }
			if (!isRelativePath(args.path)) { return { external: true } }
			const
				importer_path = args.importer, // we expect this to be an absolute path.
				current_resource_path = joinPaths(importer_path, args.path),
				updated_resource_relative_path = relativePath(updatedOutputPath, current_resource_path)
			return {
				path: updated_resource_relative_path,
				external: true,
			}
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
