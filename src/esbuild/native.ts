/** a submodule to mimic some of esbuild's native behavior.
 *
 * TODO: in the future, make this _version_ dependent, using your `semver` submodule from kitchensink to match the version to a behavior.
 * also, use a factory function that takes in concrete semver version of esbuild, and then returns a function that matches the desired behavior.
 *
 * @module
*/

import { DEBUG, isString, parseFilepathInfo, urlToString } from "../deps.ts"
import type { EsbuildLoaderType, EsbuildPluginBuild, OnLoadArgs } from "./strongtypes.ts"
import { defaultExtensionToLoaderMap } from "./typedefs.ts"


/** this function guesses which esbuild loader to use, based on the files extension of the file.
 *
 * the way it works is by finding the longest matching suffix defined in the list of user-defined file-extensions,
 * and the predefined list of  known file-extensions ({@link defaultExtensionToLoaderMap}),
 * while also taking into account any `with` attribute arguments that may be present when the import was being performed.
 *
 * this function is roughly based on the following esbuild function:
 * [`"/internal/config/config.go":LoaderFromFileExtension`](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/config/config.go#L259)
 *
 * TODO: add deno doc tests.
 *
 * TODO: I think there is also an exception made with regards to `with_attr` if the user's loader map explicitly maps to "copy".
 * (i.e. "copy" loader for a given extension takes precedence over the importer's `with` attribute type.)
 *
 * @param ext_to_loader_map a map tying file-extensions with loaders.
 * @param with_attr_type_map a mapping between `with.type` attributes and their respective loaders.
 * @param file_path the file path or url to guess the loader type from.
 * @param with_attr specify an optional `with` attribute dictionary that might be present.
 * @returns the appropriate esbuild loader type for the given file path.
*/
export const loaderFromFileExtension = (
	ext_to_loader_map: Record<string, EsbuildLoaderType>,
	with_attr_type_map: Record<string, EsbuildLoaderType>,
	file_path: string | URL,
	with_attr?: OnLoadArgs["with"],
): EsbuildLoaderType => {
	// first, we check if any `withAttr.type` exists that matches with the provided `withAttr mapping`.
	const with_attr_type = with_attr?.type
	if (isString(with_attr_type) && (with_attr_type in with_attr_type_map)) {
		return with_attr_type_map[with_attr_type]
	}
	// next, we pick the longest matching extension by recursively trimming down the `".${remaining_ext}"` until a match is found.
	const filename = parseFilepathInfo(urlToString(file_path)).filename
	let slice_idx = 0
	while (true) {
		slice_idx = filename.indexOf(".", slice_idx)
		const remaining_ext = (slice_idx >= 0) ? filename.slice(slice_idx) : ""
		if (remaining_ext in ext_to_loader_map) { return ext_to_loader_map[remaining_ext] }
		if (slice_idx < 0) { break }
		slice_idx++ // we must move the cursor forward by one, so that the starting `"."` is ignored.
	}
	// the above should eventually match all possible file-extensions if the `""` extension is also present there (which it is, in esbuild's default config).
	// however, if for some reason we end up at this point, then we'll throw an error.
	throw new Error(DEBUG.ERROR ? `[loaderFromFileExtension]: expected at least one file-extension to match with the path: "${file_path}".` : "")
}

/** the return type of {@link guessExtensionLoader_Factory},
 * which guesses a file's loader based on its file-path and the import's `with` attributes,
 * behaving similar to how esbuild behaves natively.
*/
export type GuessExtensionLoader = (file_path: string | URL, with_attr?: OnLoadArgs["with"]) => EsbuildLoaderType

/** returns a function that guesses the loader that esbuild would natively suggest for a given input file path.
 *
 * this factory function expects to be provided with the user's {@link EsbuildPluginBuild["initialOptions"]["loader"]} map.
*/
export const guessExtensionLoader_Factory = (user_ext_to_loader_map: Record<string, EsbuildLoaderType>): GuessExtensionLoader => {
	const
		ext_to_loader_map = { ...defaultExtensionToLoaderMap, ...user_ext_to_loader_map },
		with_attr_type_map: Record<string, EsbuildLoaderType> = {
			"json": "json",
			"bytes": "binary",
			"text": "text",
		}
	return (file_path: string | URL, with_attr?: OnLoadArgs["with"]): EsbuildLoaderType => {
		return loaderFromFileExtension(ext_to_loader_map, with_attr_type_map, file_path, with_attr)
	}
}
