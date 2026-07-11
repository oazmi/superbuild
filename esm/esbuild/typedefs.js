/** additional type definitions and central enum/constants variable management.
 *
 * this file is a partial copy from my `@oazmi/esbuild-plugin-deno` esbuild plugin's `typedefs` file.
 * here's the original source: [github](https://github.com/oazmi/esbuild-plugin-deno/blob/b20109988a7245804b52e219ca0f2948fa4012ba/src/plugins/typedefs.ts).
 *
 * @module
*/
/** a central enum containing the list of esbuild namespaces used by the plugins in this library. */
export var PLUGIN_NAMESPACE;
(function (PLUGIN_NAMESPACE) {
    PLUGIN_NAMESPACE["LOADER_GENERIC"] = "oazmi-loader-generic";
})(PLUGIN_NAMESPACE || (PLUGIN_NAMESPACE = {}));
/** a list of default namespaces that esbuild uses for native/entry-point resolution. */
export const defaultEsbuildNamespaces = [undefined, "", "file"];
/** a list of all esbuild content type loaders. */
export const allEsbuildLoaders = [
    "base64", "binary", "copy", "css", "dataurl",
    "default", "empty", "file", "js", "json",
    "jsx", "local-css", "text", "ts", "tsx",
];
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
export const defaultExtensionToLoaderMap = {
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
};
