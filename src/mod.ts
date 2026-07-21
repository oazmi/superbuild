/** exports a wrapper on top of esbuild to provide you with extended esbuild plugin-api capabilities (hence a super set of esbuild). */

export type { Metafile, MetafileConfig, ReducedMetafile } from "./esbuild/metafile.ts"
export type { ExternalFileEntity, ImportedEntityNode, OutputFileEntity } from "./esbuild/outputfile.ts"
export type * from "./super/mod.ts"
export { INNER_PLUGIN_BUILD, SuperBuild, SuperBuildContext, SuperPluginBuild } from "./super/mod.ts"

