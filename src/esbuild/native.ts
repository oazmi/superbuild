/** a submodule to mimic some of esbuild's native behavior.
 *
 * TODO: in the future, make this _version_ dependent, using your `semver` submodule from kitchensink to match the version to a behavior.
 * also, use a factory function that takes in concrete semver version of esbuild, and then returns a function that matches the desired behavior.
 *
 * @module
*/

import { DEBUG, isString, parseFilepathInfo, urlToString } from "../deps.ts"
import type { EsbuildLoaderTypeOrEmpty, EsbuildPluginBuild, OnLoadArgs } from "./strongtypes.ts"
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
 * > [!important]
 * > while esbuild generally gives priority to any import-attributes (`with_attr`) that may be present, over file-extension based loader guessing,
 * > it makes an exception with regards to any file-extensions that uses the `"copy"` loader, giving it the highest priority.
 * > you can see this behavior detailed in the following line of esbuild:
 * > [`"/internal/bundler/bundler.go":parseFile`](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/bundler/bundler.go#L201)
 *
 * > [!note]
 * > the only behavioral difference in this function and esbuild's own function is that the default loader
 * > (for unidentified file-extensions, or those with none) resolves to `undefined` rather than `"js"`.
 * >
 * > the reason for this is because this information can be useful to the person using this function,
 * > in addition to not causing any harm if this info is not utilized,
 * > as passing an `undefined` loader to esbuild will cause it to use the `"js"` loader anyway.
 *
 * @param ext_to_loader_map a map tying file-extensions with loaders.
 * @param with_attr_type_map a mapping between `with.type` attributes and their respective loaders.
 * @param file_path the file path or url to guess the loader type from.
 * @param with_attr specify an optional `with` attribute dictionary that might be present.
 * @returns the appropriate esbuild loader type for the given file path.
 *
 * @example
 * ```ts
 * import { assertEquals, assertThrows } from "jsr:@std/assert"
 * import { EsbuildLoaderTypeOrEmpty } from "./strongtypes.ts"
 *
 * const my_loader_map: Record<string, EsbuildLoaderTypeOrEmpty> = {
 *	"": undefined,
 *	".js": "js",
 *	".jsx": "jsx",
 *	".ts": "ts",
 *	".css": "css",
 *	".module.css": "local-css",
 *	".json": "json",
 *	".txt.json": "text",
 *	".txt.json.png": "copy",
 * 	".png": "file",
 * }
 *
 * const my_with_type_map: Record<string, EsbuildLoaderTypeOrEmpty> = {
 * 	"json": "json",
 * 	"bytes": "binary",
 * 	"image": "binary",
 * 	"empty": undefined,
 * }
 *
 * // aliasing our function for brevity
 * const fn = (path: string, with_attr?: Record<string, string>) => {
 * 	return loaderFromFileExtension(my_loader_map, my_with_type_map, path, with_attr)
 * }
 *
 * // non-with import attribute tests:
 * assertEquals(fn("./hello/.world/.vscode/settings.json"), "json")
 * assertEquals(fn("./settings.json"),                      "json")
 * assertEquals(fn("./.settings.txt.json"),                 "text")
 * assertEquals(fn("~/home/hello/meow.module.css"),         "local-css")
 * assertEquals(fn("/some/dir/"),                           undefined)
 * assertEquals(fn("/some/dir/file.js"),                    "js")
 * assertEquals(fn("/some/dir/file.js.ts"),                 "ts")
 *
 * // with import attribute tests:
 * assertEquals(fn("./settings.txt.json",     { type: "empty" }), undefined)
 * assertEquals(fn("./settings.txt.json",     { type: "image" }), "binary")
 * // below, notice that the "copy" loader gets a higher precedence than any import attribute.
 * assertEquals(fn("./settings.txt.json.png", { type: "image" }), "copy")
 * ```
*/
export const loaderFromFileExtension = <L = EsbuildLoaderTypeOrEmpty>(
	ext_to_loader_map: Record<string, L>,
	with_attr_type_map: Record<string, L>,
	file_path: string | URL,
	with_attr?: OnLoadArgs["with"],
): L => {
	// first, we check if any `withAttr.type` exists that matches with the provided `withAttr mapping`.
	const with_attr_type = with_attr?.type
	if (isString(with_attr_type) && (with_attr_type in with_attr_type_map)) {
		// we don't return immediately because esbuild makes an exception for the "copy" loader,
		// giving it a higher precedence over any with-import attribute.
		const suggested_loader_without_with_attr = loaderFromFileExtension(ext_to_loader_map, with_attr_type_map, file_path)
		return suggested_loader_without_with_attr === "copy"
			? suggested_loader_without_with_attr
			: with_attr_type_map[with_attr_type]
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
export type GuessExtensionLoader<L> = (file_path: string | URL, with_attr?: OnLoadArgs["with"]) => L

/** returns a function that guesses the loader that esbuild would natively suggest for a given input file path.
 *
 * this factory function expects to be provided with the user's {@link EsbuildPluginBuild["initialOptions"]["loader"]} map.
*/
export const guessExtensionLoader_Factory = <L extends (string | undefined) = EsbuildLoaderTypeOrEmpty>(
	user_ext_to_loader_map: Record<string, L | EsbuildLoaderTypeOrEmpty>
): GuessExtensionLoader<L | EsbuildLoaderTypeOrEmpty> => {
	const
		ext_to_loader_map = { ...defaultExtensionToLoaderMap, ...user_ext_to_loader_map },
		with_attr_type_map: Record<string, L | EsbuildLoaderTypeOrEmpty> = {
			"json": "json",
			"bytes": "binary",
			"text": "text",
		}
	return (file_path: string | URL, with_attr?: OnLoadArgs["with"]) => {
		return loaderFromFileExtension<L | EsbuildLoaderTypeOrEmpty>(ext_to_loader_map, with_attr_type_map, file_path, with_attr)
	}
}
