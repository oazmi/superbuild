/** additional type definitions and central enum/constants variable management.
 *
 * this file is a partial copy from my `@oazmi/esbuild-plugin-deno` esbuild plugin's `typedefs` file.
 * here's the original source: [github](https://github.com/oazmi/esbuild-plugin-deno/blob/b20109988a7245804b52e219ca0f2948fa4012ba/src/plugins/typedefs.ts).
 *
 * @module
*/

import type { AbsolutePath } from "../typedefs.ts"
import type { EsbuildLoaderTypeOrEmpty } from "./strongtypes.ts"
import type { EsbuildLoaderTypeCompatible } from "./weaktypes.ts"


/** a central enum containing the list of esbuild namespaces used by the plugins in this library. */
export const enum PLUGIN_NAMESPACE {
	LOADER_GENERIC = "oazmi-loader-generic",
}

/** a list of default namespaces that esbuild uses for native/entry-point resolution. */
export const defaultEsbuildNamespaces = [undefined, "", "file"]

/** a list of all esbuild content type loaders. */
export const allEsbuildLoaders: Array<EsbuildLoaderTypeCompatible> = [
	"base64", "binary", "copy", "css", "dataurl",
	"default", "empty", "file", "js", "json",
	"jsx", "local-css", "text", "ts", "tsx",
]

/** this is the common plugin data utilized by this esbuild-plugin. */
export type CommonPluginData = {}

/** these are the various formats of input and output specification accepted by esbuild for a single entity. */
export type EsbuildEntryPointType =
	| string // here, output name = input name.
	| { in: string, out: string } // the `in` field specifies the input-file/pacakge's name, and `out` specifies the output's name.
	| [input: string, output: string] // the first element specifies the input-file/pacakge's name, and second element specifies the output's name.

/** these are the various formats of entry points accepted by esbuild. */
export type EsbuildEntryPointsType = ImportMap | Array<EsbuildEntryPointType>

/** an import map is just a key-value dictionary, where the value is an absolute path to a package's resource,
 * and the key associated with it is an alias used by your code to reference the resource's path.
 *
 * > [!note]
 * > the all keys that are provided are normalized first, so that a key like "hello/earth/../world" would transform to "hello/world".
 * > further reading on [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).
 *
 * @example
 * suppose that you have the following import map:
 *
 * ```ts
 * const myImportMap: ImportMap = {
 * 	"@scope/lib/some-entry": "https://jsr.io/@oazmi/kitchensink/0.9.2/src/array2d.ts", // this should require the http plugin to resolve
 * 	"type-definitions"     : "jsr:@oazmi/kitchensink@0.9.2/typedefs", // this should require the jsr plugin to resolve
 * 	"build-cli/"           : "jsr:@oazmi/build-tools@0.2.4/cli/",     // reference to a whole directory
 * }
 * ```
 *
 * then, with this import map, you should hypothetically be able to reference these libraries in your code as the following when bundling:
 *
 * ```ts ignore
 * import { transposeArray2D }            from "@scope/lib/some-entry"
 * import { Optional, MethodsOf }         from "type-definitions"
 * import type { CliArgs as DocsCliArgs } from "build-cli/docs.ts" // the prefix is part of the import map
 * import type { CliArgs as DistCliArgs } from "build-cli/dist.ts" // the prefix is part of the import map
 *
 * // your code...
 * ```
 *
 * ### Rules for import maps
 *
 * here are some rules that your import map record should follow:
 * (copied from [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap#module_specifier_map)):
 * - none of the _keys_ may be empty.
 * - all of the _values_ must be strings, defining either a valid absolute url or a valid relative url string that starts with `"/"`, `"./"`, or `"../"`.
 * - if a _key_ ends with `"/"`, then the corresponding value must also end with `"/"`.
 *   a key with a trailing `"/"` can be used as a prefix for when mapping (or remapping) modules addresses.
 * - the object properties' ordering is irrelevant; if multiple keys can match the module specifier, the most specific key is used.
 *   in other words, a specifier "olive/branch/" would match before "olive/".
 * - any path that is being matched against an import-map _will_ be normalized before being matched.
 *   this means that the path `"./foo/../js/app.js"` will be normalized and transformed to `"./js/app.js"`,
 *   before a suitable match is looked up in the import-map.
 * - your import-map's keys should be **always** be pre-normalized.
 *   this is because a non-normalized key, such as `"hello/earth/../to/./this/world.txt"`, will never match any possible input path,
 *   because the input path will always be normalized first, thereby becoming un-matchable with any un-normalized key.
 *   so, the correct thing to do would be to ensure that your import-map keys are normalize before hand.
 *   (in the example here, the normalized version of the key would be `"hello/to/this/world.txt"`)
*/
export type ImportMap = Record<string, string>

/** the in-memory output file description generated by `esbuild`. weakly similar to `esbuild.OutputFile`. */
export interface EsbuildOutputFile {
	/** the absolute output path of the file. */
	path: AbsolutePath

	/** a "text" rendering of the {@link contents} property, which changes automatically with any modifications to the {@link contents}.
	 *
	 * I'm not certain how it works under the hood, but I assume that it relies on checking for a new assignment (in its `setter` function),
	 * and only then updates the {@link text} accordingly.
	 * if that is the case, then mutations to the {@link contents} buffer itself will not result in the {@link text} being updated.
	 * instead, we will have to assign a new array buffer to the {@link contents} property for the effect to take place.
	*/
	text?: string

	/** the contents of the file to be written as a byte buffer.
	 * this is the single source of truth. the {@link text} property is merely a reflection of this property.
	 *
	 * TODO: this should ideally be set to `Uint8Array<ArrayBuffer>` instead of just `Uint8Array`,
	 * however, the typing on `esbuild.OutputFile.contents` still uses `Uint8Array`, causing type incompatibility issues.
	 * once esbuild has the typing fixed, I should update the type definition here as well.
	*/
	contents?: Uint8Array

	/** the (unique?) hash generated for this output file by esbuild. */
	hash?: string
}

/** this dictates esbuild's default/native file-extension to loader mapping.
 * it is roughly based on the following esbuild function:
 * [`"/internal/bundler/bundler.go":DefaultExtensionToLoaderMap`](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/bundler/bundler.go#L2916)
 *
 * > [!note]
 * > one important distinction to note down is the fact that the loader for the "no extension" case (`""` empty string) is `undefined`,
 * > meaning that it will use esbuild's own default loader for it (which happens to be `"js"` for such cases).
 * >
 * > the reason why we don't directly assign a `"js"` loader to this case is because our super-build's transformer hooks may utilize the knowledge of whether a "default" was originally passed,
 * > or if an actual "js" loader was intended to be used by the prior `onLoad` hook's callback.
 *
 * PERMANENT-TODO: periodically check if the definitions are up to date.
 *
 * TODO: also, in the future, define these extension loaders based on the version of esbuild that is being used,
 * using my `semver` resolver library from kitchensink.
 *
 * TODO: `".cts"` and `".mts"` both internally use a `LoaderTSNoAmbiguousLessThan` loader, which is different from a `LoaderTS`.
 * however, the former is not exposed as a loader in javascript, where as the latter is.
 * for now, I'm setting both `".cts"` and `".mts"` to load via the `"ts"` loader, but I don't know if there will be any negative consequences of this later.
*/
export const defaultExtensionToLoaderMap: Record<string, EsbuildLoaderTypeOrEmpty> = {
	"": undefined,
	".js": "js",
	".mjs": "js",
	".cjs": "js",
	".jsx": "jsx",
	".ts": "ts",
	".cts": "ts",
	".mts": "js",
	".tsx": "tsx",
	".css": "css",
	".module.css": "local-css",
	".json": "json",
	".txt": "text",
}
