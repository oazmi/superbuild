# TODO

## bucket list

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

## pre-version `0.1.2` todo list

- [ ] in [`/readme.md`](./readme.md) include information on how to initialize a sub-build,
      and on how to access the underlying true `build.esbuild` object (rather than the overloaded version).

## pre-version `0.1.2` todo list

- [ ] generalize/weaken the typing so that the library becomes compatible with any version of esbuild.

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
