# @oazmi/super-build

A wrapper on top of esbuild to provide you with extended esbuild plugin-api capabilities (hence a super set of esbuild).

## notes

### esbuild `Metafile`

- `pathname in keyof Metafile.inputs` corresponds to the template `${namespace}:${resolve_path_string}`,
  unless the `namespace` is `file`, in which case it simply becomes `${resolve_path_string}`.
- esbuild's own path resolution format reads like: `"node_modules/@oazmi/kitchensink/esm/alias.js"`.
  in other words, it strips away the leading `"./"`, to indicate that it is in the current working directory (or `absWorkingDir`).
- `Metafile.inputs[string].imports[number].path` dictates the `${namespace}:${resolve_path_string}` name of the imported resource.
- `pathname in keyof Metafile.outputs` corresponds to the template `${outdir}/${filepath}`, without any leading `"./"`.
- `pathname in keyof Metafile.outputs[string].inputs` corresponds to the `pathname in keyof Metafile.inputs`,
  using the same `${namespace}:${resolve_path_string}` template.
- a new `entryPoint` is created for each dynamic importm using the same `${namespace}:${resolve_path_string}` template,
  however, not all `Metafile.outputs[string]` have an `entryPoint` property, especially if they were an intermediate stplitted dependency.
- `Metafile.outputs[string].inputs` can be an empty record in case the file is a split-up chunk that only re-exports other imports.
