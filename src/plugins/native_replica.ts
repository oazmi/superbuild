/** a plugin that captures all file-namespace paths during the loading operation,
 * mimicking esbuild's native loading behavior, without invoking esbuild in the process.
 *
 * @module
*/

import { fileUrlToLocalPath, json_stringify, resolveAsUrl } from "../deps.ts"
import { guessExtensionLoader_Factory } from "../esbuild/native.ts"
import type { EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnLoadArgs } from "../esbuild/strongtypes.ts"


/** this plugin captures **all** file-namespace imports, and mimics esbuild's native file-loading by using `fetch`,
 * and also guessing the `loader` type based on the file's extension name (in a way similar to how esbuild does it).
 *
 * > [!note]
 * > you will probably want to place this as the last plugin, if you don't want it interfering with your other plugins' loading mechanism.
*/
export const nativeReplicaPluginSetup = (): EsbuildPluginSetup => {
	return (build: EsbuildPluginBuild) => {
		const
			user_ext_to_loader_map = build.initialOptions.loader ?? {},
			guess_extension_loader = guessExtensionLoader_Factory(user_ext_to_loader_map)

		build.onLoad({ filter: /.*/, namespace: "file" }, async (args: OnLoadArgs) => {
			const
				path_url = resolveAsUrl(args.path),
				with_attr = args.with,
				loader = guess_extension_loader(path_url, with_attr),
				resolveDir = fileUrlToLocalPath(new URL("./", path_url))!,
				path = fileUrlToLocalPath(path_url)!

			const response = await fetch(path_url, { method: "GET" })
			if (!response.ok) {
				const message = `ERROR: network fetch response for url "${path_url.href}" was not ok (${response.status}). response header:\n${json_stringify(response.headers)}`
				return { errors: [{ detail: message },] }
			}
			const contents = await response.bytes()
			// to mimic esbuild's native loader behavior, we don't pass the `args.pluginData` (even though, I'd like pass it).
			// TODO: though, what if I were to pass it over? how bad would it be? will it realistically affect any existing popular plugin?
			return { contents, loader, resolveDir, watchFiles: [path] }
		})
	}
}

/** {@inheritDoc nativeReplicaPluginSetup} */
export const nativeReplicaPlugin = (): EsbuildPlugin => {
	return {
		name: "oazmi-superbuild-native_loader-plugin",
		setup: nativeReplicaPluginSetup(),
	}
}
