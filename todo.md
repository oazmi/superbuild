# TODO

## bucket list

- [ ] make it so that any update to a js or css dependencies' output path (see the `0.2.0 todo list`)
      will reflect into the dependent script's content, by utilizing a sub-build and declaring all imports as external,
      and renaming all updated relative imports accordingly.
  > (2026-07-20) this capability was originally set for the `0.2.2 todo list`, but I've decided to delay it indefinitely.
- [ ] make it so that the user can declare the `isAbsolute` path-segment test function when instantiating a `SuperBuild`,
      so that it is not just fixed to my `@oazmi/kitchensink/pathman`'s built-in `isAbsolute` function.

## issues list

## pre-version `0.3.x` todo list

- [ ] give a thorough explanation on the inner workings of each of the three plugins, and what problems they try to solve.

## pre-version `0.2.x` todo list

- [ ] add support for `stdin` entrypoint by adding a new plugin that replaces `initialOptions.stdin` with a `<virtual-stdin>` entrypoint,
      so that it gets resolved and loaded by the plugin, instead of getting resolved and loaded inside of esbuild natively.
- [ ] add a `build.fetch` function for fetching file contents.
      and add an optional `BuildOptions.fetchBase` option for declaring the base path of absolute file paths that start with `/`,
      which will default to the user's local fs, but can be made to have an alternate meaning (such as a url).
- [ ] add proper tests under [`/test/`](./test/), or at least include proper examples under [`/examples/`](./examples/).
- [ ] css imports performed inside long-build js (originating from something that requests the bundling of css during the transformation stage)
      causes the creation of `${LongBuildController.uuid}.css` files in the output.
      I need to investigate them, remove them from the output files,
      and see how the import requester can be given back these bundled css files that have adopted the name of long-build's uuid.

## pre-version `0.2.5` todo list

- [ ] in [`/readme.md`](./readme.md) include information on how to initialize a sub-build,
      and on how to access the underlying true `build.esbuild` object (rather than the overloaded version).

## pre-version `0.2.4` todo list

- [ ] generalize/weaken the typing so that the library becomes compatible with any version of esbuild.
- [ ] currently, if a resource does not resolve (i.e. fails to resolve), then the build process halts indefinitely,
      due to the `remainingFilesCounter` of the long-build controller never falling to zero.

## (2026-07-20) pre-version `0.2.3` todo list

- [x] export the [`ReducedMetafile`](./src/esbuild/metafile.ts) and [`OutputFileEntity`](./src/esbuild/outputfile.ts)
      types in [`./src/mod.ts`](./src/mod.ts).
- [x] add a [`OutputFileEntity.toOnEmitArgs`](./src/esbuild/outputfile.ts) method for end-user's convenience,
      when they use the `output_file_registry` in their `OnEmitCallback` functions to acquire _other_ `OutputFileEntity` resources,
      and pass them on to `SuperPluginBuild.rerouteImports`.

## (2026-07-20) pre-version `0.2.2` todo list

- [ ] ~~make it so that any update to a js or css dependencies' output path (see the `0.2.0 todo list`)
      will reflect into the dependent script's content, by utilizing a sub-build and declaring all imports as external,
      and renaming all updated relative imports accordingly.~~
  > (2026-07-20) TODO: I FEEL CONFLICTED: I feel like it's better to leave off this feature for some other time,
  > now that the user can emulate this feature themselves with the introduction of `OnEmitResult.reEmit`
  > and `SuperPluginBuild.rerouteImport`, with even more granular control.
- [x] update [`readme.md`](./readme.md) to boast the new features.
- [x] add the ability for users to resolve local paths via a new `SuperPluginBuild.resolvePath` method.
- [x] make the second argument of `OnEmitCallback` (i.e. the `output_file_registry`) not only permit output file entity search,
      but also enable searching by the input sources' resolved paths.
  > (2026-07-20) DONE: added a [`ReducedMetafile`](./src/esbuild/metafile.ts) class that provides a subset of the `Metafile`'s features,
  > and now it gets passed onto the second argument of the `OnEmitCallback`.

## (2026-07-20) pre-version `0.2.1` todo list

- [x] make the `OnEmitCallback` function receive a second argument that would allow the user to pull any `OutputFileEntity`
      from the `metafile`'s `outputFileEntities` registry.
      it's kind of risky (if the user improperly modifies the output path or the `imports` field),
      but also super convenient for reading the contents of all available output files.
  > (2026-07-20) DONE: we now pass the `Metafile.getFile` method to the `OnEmitCallback` inside
  > [`OutputFileEntity.performOnEmitOnce`](./src/esbuild/outputfile.ts).
- [x] I think it would be a good idea to permit `OnEmitArgs` to also include a `importedBy: Array<AbsolutePath>` field,
      that dictates the absolute path-key of all importers of the given output resource.
- [x] add the ability to re-emit output entities that have been processed via an `onEmit` hook,
      by declaring an optional `OnEmitResult.reEmit` field to `true`.
      this feature would permit the user to stack up multiple `onEmit` handlers on a single output resource;
      which is something that I think is crucial when multiple plugins are working together, and expecting input from one another.
  > (2026-07-19) DONE: added the new fields `reEmit?: boolean` and `reEmitData?: Record<any, any>` to `OnEmitResult`,
  > and also migrate the bulk of logic inside the [`OutputFileEntity.performOnEmit`](./src/esbuild/outputfile.ts)
  > method to a new `OutputFileEntity.performOnEmitOnce` method, while making the old `OutputFileEntity.performOnEmit`
  > method handle the re-emission loop logic and halting conditions.
- [x] introduce an `importedBy` filter to `OnEmitOptions`,
      to make it possible to intercept certain resources that are dynamically imported _by_ the given set of emitted output files.
      I think I'll want its interface to be `type ImportedBy = Omit<OnEmitOptions, "importedBy">`,
      so that one can recursively select the filter that would apply to the resource that is importing the thing that we wish to intercept.
      why do I want this? well, in my html plugin, passing the `OnEmitArgs` of inlined scripts/styles to the `replaceContent`
      function is proving to be difficult in the html's `onEmit` stage,
      which comes _after_ the inlined scripts/styles have been processed by the `onEmit` stage.
      a forward lookahead mechanism would simplify my logic by a good amount.
  > (2026-07-19) DONE: added `type OnEmitOptions["importedBy"] = Array<OnEmitOptions>` without any omissions,
  > as it was trivial to make it work recursively in our [`OutputFileEntity.matchOnEmitFilter`](./src/esbuild/outputfile.ts) method.

## (2026-07-18) pre-version `0.2.0` todo list

- [x] the `SuperPluginBuild.renameEmittedOutput` method (or the `importsRerouterPlugin`)
      should also handle updating any path changes in the imported entities themselves,
      rather than just handling the migration of the input source file.
  > (2026-07-18) DONE: renamed the `renameEmittedOutput` method to `rerouteImports`
  > (since it handles more than just renaming the js/css source file),
  > and also make the `importsRerouterPlugin` (utilized by `rerouteImports`) handle path changes in the imported entities themselves,
  > in addition to respecting any imported entities that were declared as `external`.
  > one drawback of this is we must now perform imported-entity matching with each incoming `onResolve` request inside the plugin.
  > i.e. the plugin is no longer as stateless/independent as it previously was.
- [x] add the ability to change the directory of an output javascript or css file,
      **without** breaking the import paths inside of the rerouted file.
  > (2026-07-17) DONE: added the `SuperPluginBuild.renameEmittedOutput` method,
  > which utilizes the newly added [`importsRerouterPlugin`](./src/plugins/imports_rerouter.ts),
  > to create a sub-build that parses the source file to re-route its relative import paths.

## (2026-07-16) pre-version `0.1.3` todo list

- [x] improve the type compatibility of regular esbuild plugins, superbuild plugins, and hybrid plugins with the
      [`SuperBuild.build`](./src/super/build.ts) method.

## (2026-07-14) pre-version `0.1.2` todo list

- [x] fix an issue with [`LongBuildController.parseLongBuildFileContent`](./src/plugins/long_build.ts),
      where if esbuild is set to using `"iife"` or `"cjs"` for its `format`,
      the generated bundled long-build file becomes un-importable, and hence unparsable.
      another sub-issue is the fact that top-level awaits is not permitted in `"iife"` format, causing the build to terminate fatally.
      you would think that this won't be an issue because everyone uses `"esm"`.
      however, anyone might use a sub-build, where they might either wish to use non-esm for bundling, or use the default `"iife"` format by accident,
      and in such cases, the newly created long-build file in the sub-build will fail/terminate and also ruin the main build.
  > (2026-07-13) DONE: we can now specify `LongBuildController.format` to change if `LongBuildStep.prepareLongBuildFileContent`
  > needs to modify the contents and the export mechanism to make it non-esm compatible and without top-level awaits.
  > and then in `LongBuildController.parseLongBuildFileContent`, we once again parse based on what `LongBuildController.format`
  > is being used, and apply the necessary wrapping and transformations for non-esm output bundled long-build files to become importable es-modules.
  >
  > I also changed [`EsbuildNativeResolver.initOptions`](./src/plugins/native_replica.ts) to explicitly set `format: "esm"`,
  > because `EsbuildNativeResolver` _was_ the reason why I discovered this issue when invoking a sub-build.
- [x] add support for specifying generic `loader`s in `SuperBuildOptions`.
      currently, passing a generic loader to esbuild causes it to halt immediately.
      I'll need to identify non-supported loaders and pass them separately to the native loader plugin, but not `esbuild.build`.
  > (2026-07-14) DONE: added this feature.

## (2026-07-12) pre-version `0.1.1` todo list

- [x] in the [`EsbuildNativeResolver`](./src/plugins/native_replica.ts), the `initOptions.bundle` **must** be set to `true`,
      otherwise esbuild will refuse to accept `initOptions.external` as a valid option
      (since all references _will_ be considered to be external anyway).
- [x] fix accidental use of underscore instead of hyphen in the `exports` of [`/deno.json`](./deno.json).
- [x] enable `provenance` in the [`publish-npm.yml`](./.github/workflows/publish-npm.yml) workflow.

## (2026-07-10) pre-version `0.1.0` todo list

- [x] update [`/readme.md`](./readme.md).
- [x] rename repo from `super-build` to `superbuild`.
- [x] disable global debug logging, and make it possible to enable/disable/customize debug logs from the build options.
  > (2026-07-09) DONE: added the interface [`SuperBuildOptions`](./src/super/build.ts) that extends esbuild's build options,
  > and adds the ability to customize debugging logs.
- [x] break down the emissions plugin into smaller parts, and make it possible to modify the contents of the output files that are to be emitted.
  > (2026-07-07) DONE: replaced the many tiny functions in [`emissions_driver.ts`](./src/plugins/emissions_driver.ts)
  > with more coherent classes: [`Metafile`](./src/esbuild/metafile.ts) and [`OutputFileEntity`](./src/esbuild/outputfile.ts).
- [x] in [`SuperPluginBuild.onResolve`](./src/super/plugin_build.ts), do not increment `remainingFilesCounter` for resources marked as `external`.
- [x] in the emissions plugin, the `onEmit` callback functions should be called in their natural topological dependency order.
  > (2026-07-03) DONE: we introduce a new [`DependencyGraphNode`](./src/plugins/emissions_driver.ts)
  > class to create a chain of promises that only run after their dependency promises have been executed.
- [x] in the emissions plugin, we shouldn't count on the output long-build js file being exactly named `${string}${uuid}.js`,
      since it is not guaranteed to be named as such if the user specifies a custom `entryNames` in the build options.
  > (2026-06-30) DONE: we scan the `inputs` in the metafile of each output file to find the output file corresponding to the long-build js file.
- [x] in the long-build plugin, we should require the `importer_key` be namespaced in order to be a traceable input of an output file.
  > (2026-06-30) DONE: make the `importer_key` in `SuperPluginBuild.onLoad` use a namespaced resolved path.
- [x] create a plugin to drive the process of `onEmit` once the build has concluded (i.e. in the `onEnd` stage).
  > (2026-06-29) DONE: drafted the [`emissionsDriverPlugin`](./src/plugins/emissions_driver.ts) to drive the mechanism for registered `onEmit` handlers.
- [x] implement the `onEmit` hook.
- [x] we must **not** increment the `remainingFilesCounter` when the user calls [`SuperPluginBuild.resolve`](./src/super/plugin_build.ts)!
      this is because it does not equate to a "physical resource" getting loaded; anyone can call it anytime, and however many times.
      but the issue with simply decrementing the `remainingFilesCounter` _after_ the inner `resolve` has concluded is that it skips the cache check's result;
      meaning that it will lead to double decrement of the `remainingFilesCounter` instead of just a single decrement
      (to compensate for the long-build plugin's `onResolve`'s increment).
  > (2026-06-25) DONE: whenever `SuperPluginBuild.resolve` is utilized, we overwrite any `pluginData` with a special `symbol`
  > that makes it detectable by the overloaded callback of `SuperPluginBuild.onResolve`, and then skips file counting altogether for it.
- [x] make the individual "long build" js files somehow use a shared `resourceImports` map-object,
      instead of having a different one for each build step.
      I'd also prefer to avoid manipulating `globalThis` to create a shared map-object.
  > (2026-06-23) DONE: I simply added a common dependency js file that is mutual to each build-step's js file.
  > this way, nothing gets leaked to `globalThis` when it is bundled and imported as a dynamic js file, in order to get executed.
- [x] break down the "array of builds" in the `LongBuildPluginController` into tinier "build-steps", each associated with just a single build.
  > (2026-06-22) DONE: added [`LongBuildStep`](./src/plugins/long_build.ts), and renamed `LongBuildPluginController` to `LongBuildController`.
- [x] mock esbuild's native path resolver.
      unfortunately, esbuild's native node-path-resolver needs to be mimicked as well,
      since it will otherwise skip the cached `encounteredPath` check in `LongBuildPluginController`,
      used for decrementing `remainingFilesCounter` immediately.
  > (2026-06-21) DONE: added a native node-resolver in the [`nativeReplicaPlugin`](./src/plugins/native_replica.ts) to mimic esbuild's path resolution.
- [x] fix the issue with the long-build controller's `remainingFilesCounter` getting incremented for resources that have already been encountered, and hence no longer go through the loader stage.
  > (2026-06-17) DONE: we implement a cache under `LongBuildPluginController` that keeps a record of all the resolved paths that have been previously encountered,
  > so that the `remainingFilesCounter` associated with them is immediately decremented once their `onResolve` has concluded.
  >
  > - [ ] ISSUE: I haven't tested what happens to resources that resolve to a pre-encountered `${namespace}:${resolved_path}` string,
  >       but differ in their `with` or `suffix` argument?
  >       does esbuild still count it as "already-encountered", or does it go through the loading stage again?
- [x] implement the long-build plugin that enables multiple user-specified imports to be made during the `onTransform` stage's result.
  > (2026-06-16) DONE: added the [`longBuildPlugin`](./src/plugins/long_build.ts).
- [x] mock esbuild's native `loader` picker.
      this is needed because we cannot have any resources skip the plugin-layer's `onLoad` stage,
      and get passed over to the underlying esbuild process, since it'll then bypass our made up `onTransform` interceptor.
  > (2026-06-15) DONE: added the ~~[`nativeLoaderPlugin`](./src/plugin/native_loader.ts)~~ [`nativeReplicaPlugin`](./src/plugins/native_replica.ts).
- [x] implement the `onTransform` hook.
