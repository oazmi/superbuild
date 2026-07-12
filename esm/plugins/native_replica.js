/** a plugin that replicates esbuild's native resource/path resolution and loading behavior through the plugin api layer.
 *
 * - for resolving paths, the plugin creates a sub-build that is free of any contaminating plugins to get esbuild to resolve the input resource naturally.
 * - for loading content, the plugin places an `onLoad` hook to capture all file-namespace paths,
 *   and then mimics esbuild's native loading behavior by guessing the loader it would use,
 *   and then `fetch`es the content (without invoking esbuild's native loading in the process).
 *
 * @module
*/
import { escapeLiteralStringForRegex, fileUrlToLocalPath, json_stringify, promiseOutside, resolveAsUrl } from "../deps.js";
import { guessExtensionLoader_Factory } from "../esbuild/native.js";
import { INNER_PLUGIN_BUILD } from "../super/typedefs.js";
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
export const nativeReplicaPluginSetup = () => {
    return async (build) => {
        const user_ext_to_loader_map = build.initialOptions.loader ?? {}, guess_extension_loader = guessExtensionLoader_Factory(user_ext_to_loader_map), 
        // if super-build is being used, we must extract the original hidden `esbuild` from it, otherwise the native-resolver won't work.
        base_esbuild = INNER_PLUGIN_BUILD in build
            ? build[INNER_PLUGIN_BUILD].esbuild
            : build.esbuild, native_resolver = new EsbuildNativeResolver(base_esbuild, build.initialOptions);
        build.onEnd(() => native_resolver.stop()); // stop the sub-build from hanging once the main build has concluded.
        build.onResolve({ filter: /.*/ }, (args) => {
            const { path, ...rest_args } = args;
            return native_resolver.resolve(args.path, rest_args);
        });
        build.onLoad({ filter: /.*/, namespace: "file" }, async (args) => {
            const path_url = resolveAsUrl(args.path), with_attr = args.with, loader = guess_extension_loader(path_url, with_attr), resolveDir = fileUrlToLocalPath(new URL("./", path_url)), path = fileUrlToLocalPath(path_url);
            const response = await fetch(path_url, { method: "GET" });
            if (!response.ok) {
                const message = `ERROR: network fetch response for url "${path_url.href}" was not ok (${response.status}). response header:\n${json_stringify(response.headers)}`;
                return { errors: [{ text: message }] };
            }
            const contents = await response.bytes();
            // to mimic esbuild's native loader behavior, we don't pass the `args.pluginData` (even though, I'd like pass it).
            // TODO: though, what if I were to pass it over? how bad would it be? will it realistically affect any existing popular plugin?
            return { contents, loader, resolveDir, watchFiles: [path] };
        });
    };
};
/** {@inheritDoc nativeReplicaPluginSetup} */
export const nativeReplicaPlugin = () => {
    return {
        name: "oazmi-superbuild-native_loader-plugin",
        setup: nativeReplicaPluginSetup(),
    };
};
/** this class provides {@link resolve} method that is capable of resolving paths using esbuild's node-resolution scanner.
 *
 * it works by invoking esbuild's `PluginBuild.resolve` function whenever the {@link resolve} method is called,
 * and it holds an `onLoad` hook hostage by hanging forever,
 * so that the internal sub-build does not conclude until the {@link stop} method has been called.
*/
export class EsbuildNativeResolver {
    entryPoint = "<the-unloadable-void>";
    namespace = "the-void";
    startBuildPromise;
    startBuildResolve;
    stopBuildPromise;
    stopBuildResolve;
    #internal_resolve;
    #build_result;
    constructor(base_esbuild, build_options) {
        [this.startBuildPromise, this.startBuildResolve] = promiseOutside();
        [this.stopBuildPromise, this.stopBuildResolve] = promiseOutside();
        build_options = this.initOptions(build_options);
        build_options.plugins = [this.initPlugin()];
        this.#build_result = base_esbuild.build(build_options);
    }
    async resolve(path, options) {
        await this.startBuildPromise;
        return this.#internal_resolve(path, options);
    }
    async stop() {
        this.stopBuildResolve();
        await this.#build_result;
    }
    initOptions(build_options = {}) {
        const { absWorkingDir, alias, conditions, external, mainFields, nodePaths, packages, platform, resolveExtensions, tsconfig, tsconfigRaw, } = build_options;
        const entrypoint = this.entryPoint;
        return {
            absWorkingDir, alias, conditions, external,
            mainFields, nodePaths, packages, platform,
            resolveExtensions, tsconfig, tsconfigRaw,
            bundle: true, minify: false, write: false,
            outdir: "./temp/", entryPoints: [entrypoint],
        };
    }
    initPlugin() {
        const self = this;
        const setup_fn = (build) => {
            const entrypoint = self.entryPoint, filter = RegExp(escapeLiteralStringForRegex(entrypoint) + "$"), namespace = self.namespace;
            build.onResolve({ filter }, async (args) => {
                return { path: entrypoint, namespace };
            });
            build.onLoad({ filter, namespace }, async (args) => {
                self.startBuildResolve();
                self.#internal_resolve = (path, args) => {
                    return build.resolve(path, { kind: "entry-point", resolveDir: "./", ...args });
                };
                await self.stopBuildPromise;
                return { contents: "", loader: "empty" };
            });
        };
        return {
            name: "native-esbuild-resolver-capture",
            setup: setup_fn,
        };
    }
}
