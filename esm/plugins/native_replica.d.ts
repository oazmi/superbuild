/** a plugin that replicates esbuild's native resource/path resolution and loading behavior through the plugin api layer.
 *
 * - for resolving paths, the plugin creates a sub-build that is free of any contaminating plugins to get esbuild to resolve the input resource naturally.
 * - for loading content, the plugin places an `onLoad` hook to capture all file-namespace paths,
 *   and then mimics esbuild's native loading behavior by guessing the loader it would use,
 *   and then `fetch`es the content (without invoking esbuild's native loading in the process).
 *
 * @module
*/
import type { EsbuildBuildOptions, EsbuildPlugin, EsbuildPluginBuild, EsbuildPluginSetup, EsbuildResolveOptions, EsbuildResolveResult } from "../esbuild/strongtypes.js";
import type { SuperBuildContext } from "../super/build_context.js";
/** configuration options for {@link nativeReplicaPluginSetup}. */
export interface NativeReplicaPluginSetupConfig extends Pick<SuperBuildContext, "genericLoader"> {
}
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
export declare const nativeReplicaPluginSetup: (config: NativeReplicaPluginSetupConfig) => EsbuildPluginSetup;
/** {@inheritDoc nativeReplicaPluginSetup} */
export declare const nativeReplicaPlugin: (config: NativeReplicaPluginSetupConfig) => EsbuildPlugin;
/** this class provides {@link resolve} method that is capable of resolving paths using esbuild's node-resolution scanner.
 *
 * it works by invoking esbuild's `PluginBuild.resolve` function whenever the {@link resolve} method is called,
 * and it holds an `onLoad` hook hostage by hanging forever,
 * so that the internal sub-build does not conclude until the {@link stop} method has been called.
*/
export declare class EsbuildNativeResolver {
    #private;
    protected entryPoint: string;
    protected namespace: string;
    protected readonly startBuildPromise: Promise<void>;
    protected readonly startBuildResolve: (() => void);
    protected readonly stopBuildPromise: Promise<void>;
    protected readonly stopBuildResolve: (() => void);
    constructor(base_esbuild: EsbuildPluginBuild["esbuild"], build_options?: EsbuildBuildOptions);
    resolve(path: string, options?: EsbuildResolveOptions): Promise<EsbuildResolveResult>;
    stop(): Promise<void>;
    protected initOptions(build_options?: EsbuildBuildOptions): EsbuildBuildOptions;
    protected initPlugin(): EsbuildPlugin;
}
//# sourceMappingURL=native_replica.d.ts.map