/** this module contains esbuild type definitions of the latest esbuild version.
 *
 * this file is a partial copy from my `@oazmi/esbuild-plugin-deno` esbuild plugin's `typedefs` file.
 * here's the original source: [github](https://github.com/oazmi/esbuild-plugin-deno/blob/b20109988a7245804b52e219ca0f2948fa4012ba/src/plugins/typedefs.ts).
 *
 * @module
*/

import type { esbuild, MaybePromiseOrNull, MaybePromiseOrVoid } from "../deps.ts"
import type { CommonPluginData } from "./typedefs.ts"


//// `esbuild` namespace. ////

/** an interface representing the `esbuild` namespace. */
export interface Esbuild {
	/** this is only available at the top-level `esbuild` object, not in sub-builds residing inside of {@link EsbuildPluginBuild}. */
	stop?: typeof esbuild.stop
	analyzeMetafile: typeof esbuild.analyzeMetafile
	analyzeMetafileSync: typeof esbuild.analyzeMetafileSync
	build: typeof esbuild.build
	buildSync: typeof esbuild.buildSync
	context: typeof esbuild.context
	formatMessages: typeof esbuild.formatMessages
	formatMessagesSync: typeof esbuild.formatMessagesSync
	initialize: typeof esbuild.initialize
	transform: typeof esbuild.transform
	transformSync: typeof esbuild.transformSync
	version: typeof esbuild.version
}


//// `onResolve` ////

/** type alias for `esbuild.OnResolveOptions`. */
export type OnResolveOptions = esbuild.OnResolveOptions

/** type alias for `esbuild.OnResolveArgs`, slightly tweaked for this library's internal use. */
export type OnResolveArgs = Omit<esbuild.OnResolveArgs, "pluginData"> & { pluginData: undefined | CommonPluginData }

/** type alias for `esbuild.OnResolveResult`. */
export type OnResolveResult = esbuild.OnResolveResult

/** type alias for the callback function provided to the `onResolve` function (aka `esbuild.PluginBuild["onResolve"]`). */
export type OnResolveCallback = (args: OnResolveArgs) => MaybePromiseOrNull<OnResolveResult>


//// `onLoad` ////

/** type alias for `esbuild.OnLoadOptions`. */
export type OnLoadOptions = esbuild.OnLoadOptions

/** type alias for `esbuild.OnLoadArgs`, slightly tweaked for this library's internal use. */
export type OnLoadArgs = Omit<esbuild.OnLoadArgs, "pluginData"> & { pluginData: undefined | CommonPluginData }

/** type alias for `esbuild.OnLoadResult`. */
export type OnLoadResult = esbuild.OnLoadResult

/** type alias for the callback function provided to the `OnLoad` function (aka `esbuild.PluginBuild["OnLoad"]`). */
export type OnLoadCallback = (args: OnLoadArgs) => MaybePromiseOrNull<OnLoadResult>


//// `resolve` ////

/** type alias for `esbuild.ResolveOptions`. */
export type EsbuildResolveOptions = esbuild.ResolveOptions

/** type alias for `esbuild.ResolveResult`. */
export type EsbuildResolveResult = esbuild.ResolveResult


//// `onStart` and `onEnd` ///

/** type alias for `esbuild.OnStartResult`. */
export type EsbuildOnStartResult = esbuild.OnStartResult

/** type alias for the callback function provided to the `OnStart` function (aka `esbuild.PluginBuild["OnStart"]`). */
export type EsbuildOnStartCallback = () => MaybePromiseOrVoid<EsbuildOnStartResult>

/** type alias for `esbuild.OnEndResult`. */
export type EsbuildOnEndResult = esbuild.OnEndResult

/** type alias for the callback function provided to the `OnEnd` function (aka `esbuild.PluginBuild["OnEnd"]`). */
export type EsbuildOnEndCallback<
	ProvidedOptions extends EsbuildBuildOptions = EsbuildBuildOptions
> = (result: EsbuildBuildResult<ProvidedOptions>) => MaybePromiseOrVoid<EsbuildOnEndResult>


//// build options, build results, and build type ////

/** type alias for `esbuild.BuildOptions`. */
export type EsbuildBuildOptions = esbuild.BuildOptions

/** type alias for `esbuild.BuildResult`. */
export type EsbuildBuildResult<ProvidedOptions extends EsbuildBuildOptions = EsbuildBuildOptions> = esbuild.BuildResult<ProvidedOptions>

/** type alias for `esbuild.build`. */
export type EsbuildBuild = typeof esbuild.build


//// `Plugin` ////

/** type alias for `esbuild.Plugin`. */
export type EsbuildPlugin = esbuild.Plugin

/** type alias for `esbuild.Plugin["setup"]`. */
export type EsbuildPluginSetup = esbuild.Plugin["setup"]

/** type alias for `esbuild.PluginBuild`. */
export type EsbuildPluginBuild = esbuild.PluginBuild


//// misc ////

/** type alias for `esbuild.Loader`. */
export type EsbuildLoaderType = esbuild.Loader

/** type alias for `esbuild.Loader | undefined`. */
export type EsbuildLoaderTypeOrEmpty = EsbuildLoaderType | undefined

/** type alias for `esbuild.ImportKind`. */
export type EsbuildImportKind = esbuild.ImportKind

/** type alias for `esbuild.ImportKind | "file-loader"`. */
export type EsbuildOutputsImportKind = EsbuildMetafileImportProps["kind"]

/** type alias for `esbuild.Metafile`. */
export type EsbuildMetafile = esbuild.Metafile

/** type alias for `esbuild.Metafile.outputs[number].imports[number]`. */
export type EsbuildMetafileImportProps = Required<esbuild.Metafile["outputs"][number]["imports"][number]>

/** type alias for `esbuild.Message`. */
export type EsbuildMessage = esbuild.Message

/** type alias for `esbuild.PartialMessage`. */
export type EsbuildPartialMessage = esbuild.PartialMessage

/** useful non-public utility type copied from esbuild's source code. */
export type SameShape<Out, In extends Out> = In & { [Key in Exclude<keyof In, keyof Out>]: never }
