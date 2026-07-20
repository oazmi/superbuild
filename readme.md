# @oazmi/superbuild

A wrapper on top of esbuild to provide you with extended esbuild Plugin-API capabilities (hence a super set of esbuild).

> [!note]
> This project is free of dependencies (only using my `jsr:@oazmi/kitchensink` for utility functionality),
> and bundles down to just `45kb` with minification. so, fear not of carrying extra baggage by using this library.

## General Usage

```ts
import esbuild from "npm:esbuild"
import { SuperBuild } from "jsr:@oazmi/superbuild" // or use "npm:@oazmi/superbuild".

const spbuild = new SuperBuild(esbuild)
const result = await spbuild.build({
	entryPoints: ["./mod.ts"],
	// ... other build options.
	plugins: [{
		name: "my-plugin",
		setup: my_plugin_setup, // see the examples that follow.
	}],
})
```

## Extended API Features

### _onLoad_

The super-build wrapper lets you use any arbitrary string for the returned `loader` field,
and then have that loaded resource get captured by the [`onTransform`](#ontransform) stage's filter.

example:

```ts
import type { OnLoadArgs, SuperPluginBuild, SuperPluginSetup } from "jsr:@oazmi/superbuild"

const my_plugin_setup: SuperPluginSetup = (build: SuperPluginBuild) => {
	// ...
	build.onLoad({ filter: /\.html$/ }, async (args: OnLoadArgs) => {
		const contents = await (await fetch("...")).text()
		return {
			contents: contents,
			loader: "html", // you may use any arbitrary string for the loader.
		}
	})
	// ...
}
```

You also don't have to go through an `onLoad` for your custom-loader resources if you're just loading it through the filesystem;
All you have to do is declare it in the `loader` option of the bundle build:

```ts
import esbuild from "npm:esbuild"
import { SuperBuild } from "jsr:@oazmi/superbuild"

const spbuild = new SuperBuild(esbuild)
const result = await spbuild.build({
	entryPoints: ["./mod.ts", "./meow.html", "./neko/nyaa.html", "./styles.scss"],
	loader: {
		".html": "html",
		".scss": "sass-loader",
		".css": "lightningcss",
	},
	// ... other build options.
})
```

### _onTransform_

The newly added `build.onTransform` function lets you capture [_loaded_](#onload) content,
transform them in any arbitrary way, and then specify additional arbitrary imports that need to be bundled.

> [!caution]
> your import entity's `key` **must be** json serializable!

example:

```ts
import type { ImportEntity, OnTransformArgs, SuperPluginBuild, SuperPluginSetup } from "@oazmi/superbuild"

const my_plugin_setup: SuperPluginSetup = (build: SuperPluginBuild) => {
	// ...
	build.onTransform({ filter: /.*/, loader: "html" }, async (args: OnTransformArgs) => {
		const contents = typeof args.contents === "string" ? args.contents : new TextDecoder().decode(args.contents)
		const html_doc = new DOMParser().parseFromString(contents, "text/html"),
			js_imports: ImportEntity[] = scanJsImports(html_doc), // just a hypothetical function.
			css_imports: ImportEntity[] = scanCssImports(html_doc), // just a hypothetical function.
			my_additional_import: ImportEntity = {
				key: "external-ref-0",
				path: "http://example.com/favicon.ico",
				external: true,
			}
		return {
			contents: contents,
			// below, you must specify an esbuild-compatible loader.
			// for an html file , `copy` makes the most sense.
			loader: "copy",
			// all non-external files specified in the imports will also get bundled.
			imports: [...js_imports, ...css_imports, my_additional_import],
			// you may also attach arbitrary data that'll get re-captured during the onEmit stage.
			emitData: { timeStamp: Date.now(), copywrites: ["Seto frikking Kaiba"] },
		}
	})
	// ...
}
```

### _onEmit_

The new `build.onEmit` function lets you capture output file contents _after_ they have been bundled,
to transform them in any arbitrary manner (such as re-incorporating user-made imports from the [transform stage](#ontransform)),
and finally renaming them (in topological dependency order).

The second argument provided to your `onEmit` callback function is an output file registry,
that lets you inspect the contents and paths of _other_ emitted files (though, it is strictly readonly).

example:

```ts
import type { ImportedEntity, OnEmitArgs, ReducedMetafile, SuperPluginBuild, SuperPluginSetup } from "@oazmi/superbuild"

const my_plugin_setup: SuperPluginSetup = (build: SuperPluginBuild) => {
	// ...
	// this symbol will be imprinted onto `args.reEmitData` to stop it from being processed again when re-emitted.
	const ALREADY_CAPTURED = Symbol()

	build.onEmit({
		filter: /.*/,
		inputs: [{
			// filter based on the resolved path of the resource that is bundled into the output file.
			filter: /.*/,
			namespace: undefined, // capture all namespaces.
			loader: "html", // loader based filter.
			transformLoader: "copy", // on-transform's loader based filter.
		}],
	}, async (args: OnEmitArgs, output_files_registry: ReducedMetafile) => {
		// this logic lets prevents the emitted resource from being processed again when re-emitted later.
		if (args.reEmitData?.[ALREADY_CAPTURED] === true) {
			return
		}

		const contents = typeof args.contents === "string" ? args.contents : new TextDecoder().decode(args.contents)
		const html_doc = new DOMParser().parseFromString(contents, "text/html")
		// just a hypothetical way of re-incorporating the bundled imports.
		args.imports.forEach((imported_entity: ImportedEntity) => {
			const { key, outputPath, write, external, kind } = imported_entity
			if (external || !write) {
				return
			}
			console.assert(kind === "user-import")
			html_doc.querySelectorAll(`#${key}`).forEach((dom_element) => {
				dom_element.setAttribute("src", outputPath)
			})
		})

		// reading the `emitData` contained within the input source.
		console.assert(args.inputs.length === 1, "expected the bundled html file to be made up of just a single input html source file.")
		const emit_data = args.inputs[0].emitData as { timeStamp: number; copywrites: string[] }
		console.assert(emit_data.copywrites.includes("Seto frikking Kaiba"), "expected Seto Kaiba to be one of the stakeholders.")

		// renaming the output file's path for old schoolers.
		const new_output_path = args.outputPath.replace(/\.html$/, ".xhtml")
		const reEmitData = args.reEmitData ?? {}
		reEmitData[ALREADY_CAPTURED] = true
		return {
			contents: html_doc.documentElement.outerHTML,
			path: new_output_path,
			write: true,
			reEmit: true, // you can specify if this output entity needs to be sent to other `onEmit` handlers.
			reEmitData: reEmitData, // and in case you do re-emit the processed resource, including a `reEmitData` is recommended.
		}
	})
	// ...
}
```

### _resolvePath_

The new `build.resolvePath` method lets you resolve local file paths with respect to either the current working directory (`cwd`),
or the build's `absWorkingDir` (preferred if defined).

example:

```ts
import type { OnResolveArgs, SuperPluginBuild, SuperPluginSetup } from "@oazmi/superbuild"

const my_plugin_setup: SuperPluginSetup = (build: SuperPluginBuild) => {
	// ...
	build.onResolve({ filter: /\.meow$/ }, async (args: OnResolveArgs) => {
		// declare all relative `.meow` files to be located under the build-directory's `./nyaa/` folder.
		const new_path = build.resolvePath("./nyaa/", args.path)
		return { path: new_path }
	})
	// ...
}
```

### _rerouteImports_

Finally, the newly added `build.rerouteImports` method is intended to be used inside an [`onEmit`](#onemit) hook's callback function.
It lets you modify the `contents` of your emitted `js` or `css` file entity, so that its import paths are updated with respect to:

1. The `args.imports: Array<ImportedEntity>`, when the `ImportedEntity.initialPath` is not `undefined`
   (which indicates that the `ImportedEntity.outputPath` was actually updated to a new path in a prior `onEmit` callback).
2. The provided `updated_output_path` (optional 3rd argument).
   specifying this optional argument in `build.rerouteImports` indicates that the resource being processed (i.e. `args`)
   itself is being moved to an alternate path (which would mean that all relative links would need to be updated).

## Other Notable Features

- Dependency free, and under `45kb` when bundled with minification.
- Cross-runtime compatible (deno, node, bun, and the web (only when `write` is `false`)).
- You can rename output files during the emission stage, and the updated paths will be reflected in the dependent output files' `args.imports`.
  This is because the emitted output files are always updated in their natural topological dependency order (in parallel).

## Documentation and Links

- Documentation page: [https://oazmi.github.io/superbuild](https://oazmi.github.io/superbuild).
- JSR release page: [https://jsr.io/@oazmi/superbuild](https://jsr.io/@oazmi/superbuild).
- NPM release page: [https://www.npmjs.com/package/@oazmi/superbuild](https://www.npmjs.com/package/@oazmi/superbuild).
- Github repository: [https://github.com/oazmi/superbuild](https://github.com/oazmi/superbuild).

## Prior Art

I was using [`esbuild-extra`](https://github.com/aleclarson/esbuild-extra) for a while for static-site generation, and I found it it be incredibly useful.
However, I needed additional freedom in manipulating resources, dynamically adding resources for bundling,
while supporting code-splitting and resource-sharing in the additional bundled resources (i.e. where sub-builds do not qualify).
So, I wrote this library, heavily inspired by the said library's vision.

However, do note that the `esbuild-extra`'s `onTransform` is fundamentally different from this library's `onTransform` hook.
In essence, the `onEmit` hook of this library resembles closer to `esbuild-extra`'s `onTransform`,
because it takes place _after_ esbuild has successfully bundled the resources.
Whereas the `onTransform` hook of _this_ library lets you manipulate the _loaded_ resources _before_ they get passed over to esbuild for bundling.

Another cool set of libraries that also manipulate esbuild's transformation and emission mechanism is [`@chialab/esbuild-rna`](https://github.com/chialab/rna).
Though, I could never get it to run with deno (during its early node-compatibility days), so I never gave it a try.

## Notes

### a few things that still need to be taken care of:

- I still need to figure out how to make `sourcemap`s possible for user-specified imports.
- Also, `<stdin>` isn't captured by my plugin right now, since esbuild process it directly (skipping the plugin API layer).

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
