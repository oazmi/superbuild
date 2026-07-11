/** this module contains esbuild type definitions that are compatible with multiple versions of esbuild.
 *
 * this file is a partial copy from my `@oazmi/esbuild-plugin-deno` esbuild plugin's `typedefs` file.
 * here's the original source: [github](https://github.com/oazmi/esbuild-plugin-deno/blob/b20109988a7245804b52e219ca0f2948fa4012ba/src/plugins/typedefs.ts).
 *
 * @module
*/

import type { AutoSuggestOrString, MaybePromise } from "../deps.js"
import type { EsbuildBuildOptions, EsbuildBuildResult, EsbuildLoaderType, EsbuildMessage, EsbuildPluginBuild, OnLoadResult, SameShape } from "./strongtypes.js"


/** weakly typed alias for `esbuild.Plugin`, so that it is compatible over all versions of esbuild. */
export type EsbuildPluginCompatible = {
	name: string
	setup: EsbuildPluginSetupCompatible
}

/** weakly typed alias for `esbuild.Plugin["setup"]`, so that it is compatible over all versions of esbuild. */
export type EsbuildPluginSetupCompatible = (build: EsbuildPluginBuildCompatible) => MaybePromise<void>

/** weakly typed alias for `esbuild.PluginBuild`, so that it is compatible over all versions of esbuild. */
export type EsbuildPluginBuildCompatible = Omit<{ [K in keyof EsbuildPluginBuild]: any }, "onLoad"> & {
	onLoad: (options: any, callback: (args: any) => MaybePromise<OnLoadResult | null | undefined>) => void
}

/** weakly typed alias for `esbuild.BuildOptions`, so that it is compatible over all versions of esbuild. */
export type EsbuildBuildOptionsCompatible = Omit<EsbuildBuildOptions, "alias" | "incremental" | "watch" | "packages" | "entryPoints" | "plugins"> & {
	alias?: any
	incremental?: any
	watch?: any
	packages?: any
	entryPoints?: any
}

/** weakly typed alias for `esbuild.BuildResult`, so that it is compatible over all versions of esbuild. */
export type EsbuildBuildResultCompatible = EsbuildBuildResult<EsbuildBuildOptionsCompatible>

/** weakly typed alias for `esbuild.build`, so that it is compatible over all versions of esbuild. */
export type EsbuildBuildCompatible = <T extends EsbuildBuildOptionsCompatible>(options: SameShape<EsbuildBuildOptionsCompatible, T>) => Promise<EsbuildBuildResult<T>>

/** weakly typed alias for `esbuild.Loader`.
 * (though, technically it is a super-type, therefore incompatible with old esbuild versions.)
*/
export type EsbuildLoaderTypeCompatible = AutoSuggestOrString<EsbuildLoaderType>

/** weakly typed alias for `esbuild.Message`, so that it is compatible over all versions of esbuild.
 *
 * > [!note]
 * > the type interface hasn't changed since `v0.15.0` through the current version (`v0.28.0`).
 * > so for now, this type is exactly equivalent to `esbuild.Message` (i.e. not weakly typed at all).
*/
export type EsbuildMessageCompatible = EsbuildMessage
