/** an internal super-build plugin that enables the inclusion of additional imports dynamically,
 * as esbuild is transforming the loaded content.
 *
 * the reason why this plugin is called "long build" is because it hangs up at its loader stage and waits for the import requests to come in,
 * until all known entities that had entered the `onResolve` stage have exited through at least one `onLoad` hook.
 *
 * @module
*/
import type { EsbuildBuildOptions, EsbuildPartialMessage, EsbuildPlugin, EsbuildPluginSetup, OnResolveResult } from "../esbuild/strongtypes.js";
import type { ImportEntity } from "../super/typedefs.js";
import type { LoggerFunction } from "../typedefs.js";
export interface LongBuildControllerConfig {
    /** enable internal logging for the {@link LongBuildController}, when {@link DEBUG.LOG} is enabled.
     *
     * @defaultValue {@link noopLogger}
    */
    debuggingLogs?: LoggerFunction;
    /** specify what build format is being used by your esbuild's build process.
     * this is important to specify correctly,
     * as we will need to manipulate the input and output contents of the long-build file(s) for the following reasons:
     * - `iife` does not support top-level awaits, hence this mode requires us to wrap the logic inside an async function.
     *   furthermore, `iife` results in no variable exports;
     *   hence the bundled output will need to be changed so that it exports the `resourceImports` variable as an es6 module.
     * - `cjs` does permit top-level awaits, but does not permit es6 exports. hence the need for additional manipulation of the output.
     * - `esm` faces none of these issues, and it is the base format which we maipulate for the other scenarios.
     *
     * @defaultValue `"esm"`
    */
    format?: EsbuildBuildOptions["format"];
}
/** the controller used for commanding the state of the "long build" plugin. */
export declare class LongBuildController {
    /** the unique base filename that will be used by the {@link longBuildPluginSetup} plugin to insert its "long build" js file as an entry-point.
     * the full filename format it will use will be: `${recursion_number}.(${uuid}).js`.
    */
    readonly uuid: string;
    /** the unique filename(s) that will be used for the "long build" js files.
     * it is a computed value that evaluates to `.(${uuid}).js`,
     * and the actual filename that gets inserted/injected will also have a leading number, signifying the "build/recursion number".
     *
     * for instance, the entry-point long build js file will be named: `0.(${uuid}).js`,
     * while the next recursive "long build" import within the `0.(${uuid}).js` file will be named `1.(${uuid}).js`,
     * and so on (until a "long build" js file with zero external imports/includes is discovered, at which point we shall halt).
    */
    readonly baseFilename: string;
    /** the name of the "long build dependency" file, as defined in {@link LONGBUILD.DEPS_FILE}.
     *
     * its value evaluates to `deps.(${uuid}).js`, and it is imported by each "long build step" js file as a dependency,
     * in order to have a shared resource variable where all imports will get registered.
    */
    readonly depsFilename: string;
    /** the namespace used by the {@link longBuildPlugin}.
     * it is a computed value that evaluates to `oazmi-superbuild-long_build-plugin-${uuid}`.
    */
    readonly pluginNamespace: string;
    /** the current build/recursion number. it starts with zero, and it is used for indicating the filename of the current "long build" file. */
    readonly buildNumber: number;
    /** the number of files in the esbuild build process that are currently in circulation.
     *
     * - everytime a new file hits the "long build" plugin's `onResolve` hook, this value gets incremented by one,
     *   since a "new file is currently in circulation".
     * - whenever a file gets successfully loaded via some plugin's `onLoad` hook,
     *   the {@link SuperPluginBuild.onLoad} overload decrements this shared-state counter,
     *   since a "file that was in circulation has exited".
     * - a caveat to look out for is the fact that if any plugin calls {@link SuperPluginBuild.resolve},
     *   this counter will get incremented again (double count),
     *   since the resolve request will go through our "long build" plugin's `onResolve` hook once again.
     *   to combat this double count, the {@link SuperPluginBuild.resolve} function decrements this counter whenever it gets called.
    */
    remainingFilesCounter: number;
    /** esbuild caches the loaded result of an `onLoad` hook, based on the result of the `onResolve` hook's `result.path` and `result.namespace`
     * (I don't know if esbuild also caches with respect to the `with` import attribute).
     * but we don't want to count any cached paths towards {@link remainingFilesCounter}, since they won't be loaded again;
     * which is why we need this hash-set to keep track of what has already been seen once.
    */
    protected encounteredPaths: Set<string>;
    steps: Array<LongBuildStep>;
    /** a logging function for internal debugging. it gets called only when {@link DEBUG.LOG} is enabled. */
    log: LoggerFunction;
    /** {@inheritDoc LongBuildControllerConfig.format} */
    format: LongBuildControllerConfig["format"];
    constructor(config?: LongBuildControllerConfig);
    incrementBuild(): EsbuildPartialMessage[];
    incrementFilesCounter(pathname?: string): void;
    decrementFilesCounter(pathname?: string): void;
    cacheResolvedResult(args: OnResolveResult): void;
    /** this function does the inverse of {@link prepareLongBuildFileContent};
     * it parses the js-transpiled contents of the "long build" file and extracts/reconstructs the resource import `Map` from it.
     *
     * since I plan on using a dynamic script `import()` to execute the contents of a modified version of the "long build" file content,
     * this method has to be made asynchronous.
     * I'm certainly not going to be using `eval` or the `Function` constructor, because they are often restricted in some js-environments.
    */
    parseLongBuildFileContent(longbuild_file_contents: string): Promise<Map<string, ImportEntity[]>>;
}
export declare class LongBuildStep {
    /** the build number of this build step, starting with zero. */
    readonly buildNumber: number;
    /** the unique filename of this "long build step" js file.
     * it is a computed value that evaluates to `${buildNumber}.(${uuid}).js`.
    */
    readonly filename: string;
    readonly promise: Promise<void>;
    readonly signalresolve: (() => void);
    readonly cancelResolve: (() => void);
    readonly resourceImports: Map<string, ImportEntity[]>;
    protected readonly controller: LongBuildController;
    constructor(parent_controller: LongBuildController, build_number: number);
    /** register imports performed by some resource `importer_key`.
     * the `importer_key` should be formatted as `${namespace}:${resolved_path}` of the resource performing the `imports`.
    */
    pushImports(importer_key: string, imports: ImportEntity[]): void;
    /** prepares the file contents of the "long build" of this "long build step".
     *
     * you would use this once you have deduced that all files that were in circulation during this build step have exited,
     * and therefore your long build plugin must also halt by loading the contents prepared here by this method.
     *
     * > [!caution]
     * > the file's contents are in typescript rather than javascript.
     * > so make sure to use the `"ts"` esbuild loader for it.
    */
    prepareLongBuildFileContent(): string;
}
export interface LongBuildPluginSetupConfig {
    controller: LongBuildController;
}
/** this plugin that enables the inclusion of additional imports dynamically, as esbuild is transforming the loaded content.
 *
 * the reason why this plugin is called "long build" is because it hangs up at its loader stage and waits for the import requests to come in,
 * until all known entities that had entered the `onResolve` stage have exited through at least one `onLoad` hook.
 *
 * > [!note]
 * > this plugin should be placed at the very beginning, as it needs to inspect all incoming path-resolution requests,
 * > in order to track if any unprocessed files still remain while bundling.
 *
 * > _Mr. Feast_: Hello everyone, it's your host jimmy neutrino,
 * > and today we'll be trafficking 100 foreign slaves to compete against one another in building the longest pyramid.
 * > whichever slave manages to build the tallest pyramid at the 100 hour mark will earn his freedom and a also a free bugatti**!
 * >
 * > _Lapdog #1_: the rules are simple: if a slave falls asleeps, or moves out of the red circle,
 * > they'll get disqualified immediately and be deported back to their original owner.
 * >
 * > _Lapdog #2_: look at this wonderful art piece that I commissioned from epstien himself!
 * > hey! stop criticizing me! I'm doing this for my son! also, I identify as they/them, so you can't criticize me now.
 * >
 * > **no auto insurance will be supplied, and state sales tax will be the responsibility of the winner.
 * > failing to register your prize within 6 hours of winning will indicate that you wish to forfeit from owning it.
*/
export declare const longBuildPluginSetup: (config: LongBuildPluginSetupConfig) => EsbuildPluginSetup;
/** {@inheritDoc longBuildPluginSetup} */
export declare const longBuildPlugin: (config: LongBuildPluginSetupConfig) => EsbuildPlugin;
//# sourceMappingURL=long_build.d.ts.map