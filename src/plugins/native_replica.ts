/** a plugin that replicates esbuild's native resource/path resolution and loading behavior through the plugin api layer.
 *
 * - for resolving paths, the plugin creates a sub-build that is free of any contaminating plugins to get esbuild to resolve the input resource naturally.
 * - for loading content, the plugin places an `onLoad` hook to capture all file-namespace paths,
 *   and then mimics esbuild's native loading behavior by guessing the loader it would use,
 *   and then `fetch`es the content (without invoking esbuild's native loading in the process).
 *
 * @module
*/

import { escapeLiteralStringForRegex, fileUrlToLocalPath, json_stringify, promiseOutside, resolveAsUrl } from "../deps.ts"
import { guessExtensionLoader_Factory } from "../esbuild/native.ts"
import type { EsbuildBuildOptions, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, OnLoadArgs, OnResolveArgs } from "../esbuild/strongtypes.ts"


/** this plugin replicates esbuild's native path resolution and loading behavior through the plugin api layer.
 *
 * > [!note]
 * > you will probably want to place this as the last plugin, if you don't want it interfering with your other plugins' resolving and loading mechanisms.
 *
 * - for resolving paths, the plugin creates a sub-build that is free of any contaminating plugins to get esbuild to resolve the input resource naturally.
 * - for loading content, the plugin places an `onLoad` hook to capture all file-namespace paths,
 *   and then mimics esbuild's native loading behavior by guessing the loader it would use,
 *   and then `fetch`es the content (without invoking esbuild's native loading in the process).
 *
 * > _Van_: It was Asche who was supposed to come here, not you, replica.
 * >
 * > _Luke_: Even if you refuse to acknowledge me, I am ME! Master... no, Van! Prepare to DIE!
*/
export const nativeReplicaPluginSetup = (): EsbuildPluginSetup => {
	return async (build: EsbuildPluginBuild) => {
		const
			user_ext_to_loader_map = build.initialOptions.loader ?? {},
			guess_extension_loader = guessExtensionLoader_Factory(user_ext_to_loader_map),
			{ resolve, stop } = await esbuildNativeResolverFactory(build.esbuild, build.initialOptions)

		build.onEnd(stop) // stop the sub-build from hanging once the main build has concluded.

		build.onResolve({ filter: /.*/ }, (args: OnResolveArgs) => {
			const { path, ...rest_args } = args
			return resolve(args.path, rest_args)
		})

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

/** a subset of build configuration options that the {@link esbuildNativeResolverFactory} function supports.
 * all of these build options have the potential to influence esbuild's resolved path.
*/
type EsbuildNativeResolverBuildOptions = Pick<
	EsbuildBuildOptions,
	| "absWorkingDir" | "alias" | "conditions" | "external"
	| "mainFields" | "nodePaths" | "packages" | "platform"
	| "resolveExtensions" | "tsconfig" | "tsconfigRaw"
>

type EsbuildNativeResolver = {
	resolve: EsbuildPluginBuild["resolve"],
	stop: () => Promise<void>,
}

/** this function creates a `resolve` function that is capable of resolving paths using esbuild's node-resolution scanner.
 *
 * it works by invoking esbuild's `PluginBuild.resolve` function whenever the returned `resolve` method is called,
 * and it holds an `onLoad` hook hostage by hanging forever, so that the build does not conclude until the returned `stop` method is called.
*/
const esbuildNativeResolverFactory = async (
	base_esbuild: EsbuildPluginBuild["esbuild"],
	build_options: EsbuildBuildOptions,
): Promise<EsbuildNativeResolver> => {
	let resolver_fn: EsbuildPluginBuild["resolve"]
	const
		[stop_session_promise, stop_session_resolve] = promiseOutside<void>(),
		[start_session_promise, start_session_resolve] = promiseOutside<void>(),
		namespace = "the-void",
		entrypoint = "<the-unloadable-void>",
		entrypoint_regex = RegExp(escapeLiteralStringForRegex(entrypoint) + "$"),
		{
			absWorkingDir, alias, conditions, external,
			mainFields, nodePaths, packages, platform,
			resolveExtensions, tsconfig, tsconfigRaw,
		}: EsbuildNativeResolverBuildOptions = build_options
	const setup_fn = (build: EsbuildPluginBuild) => {
		build.onResolve({ filter: entrypoint_regex }, async (args) => {
			return { path: entrypoint, namespace }
		})

		build.onLoad({ filter: entrypoint_regex, namespace }, async (args) => {
			start_session_resolve()
			resolver_fn = (path, args) => {
				return build.resolve(path, { kind: "entry-point", resolveDir: "./", ...args })
			}
			await stop_session_promise
			return { contents: "", loader: "empty" }
		})
	}

	const build_result = base_esbuild.build({
		absWorkingDir, alias, conditions, external,
		mainFields, nodePaths, packages, platform,
		resolveExtensions, tsconfig, tsconfigRaw,
		bundle: false, minify: false, write: false,
		outdir: "./temp/", entryPoints: [entrypoint],
		plugins: [{
			name: "native-esbuild-resolver-capture",
			setup: setup_fn,
		}],
	})
	const stop_fn = async (): Promise<void> => {
		stop_session_resolve()
		await build_result
		return
	}

	await start_session_promise
	return { resolve: resolver_fn!, stop: stop_fn }
}
