/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/
import { type AutoSuggestOrString } from "../deps.js";
import type { Esbuild, EsbuildBuildOptions, EsbuildBuildResult, EsbuildLoaderType, SameShape } from "../esbuild/strongtypes.js";
import type { LoggerFunction } from "../typedefs.js";
export interface SuperBuildOptions extends Omit<EsbuildBuildOptions, keyof SuperBuildExclusiveOptions>, SuperBuildExclusiveOptions {
}
export interface SuperBuildExclusiveOptions {
    /** enable internal logging of super-build for debugging, when {@link DEBUG.LOG} is enabled.
     *
     * when set to `true`, the logs will show up in your console via `console.log()`.
     * you may also provide your own custom logger function if you wish.
     *
     * @defaultValue `false`
    */
    debuggingLogs?: boolean | LoggerFunction;
    /** specify what loader (generic or built-in) to use for various file extensions. */
    loader?: {
        [ext: string]: AutoSuggestOrString<EsbuildLoaderType>;
    };
}
/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * this class creates a mere wrapper over a base `esbuild` object (acquired from `import esbuild from "npm:esbuild"`).
 * this class itself does not do anything interesting aside from overloading the `esbuild.build` and `esbuild.buildSync` methods,
 * to pass a modified version of your `esbuild.BuildOptions` that alters the plugin api (which is performed by {@link SuperBuildContext}).
*/
export declare class SuperBuild implements Omit<Esbuild, "build" | "buildSync"> {
    #private;
    version: Esbuild["version"];
    analyzeMetafile: Esbuild["analyzeMetafile"];
    analyzeMetafileSync: Esbuild["analyzeMetafileSync"];
    context: Esbuild["context"];
    formatMessages: Esbuild["formatMessages"];
    formatMessagesSync: Esbuild["formatMessagesSync"];
    initialize: Esbuild["initialize"];
    transform: Esbuild["transform"];
    transformSync: Esbuild["transformSync"];
    stop: Esbuild["stop"];
    constructor(base_esbuild: Esbuild);
    build<T extends SuperBuildOptions>(options: T): Promise<EsbuildBuildResult<SameShape<EsbuildBuildOptions, Omit<T, keyof SuperBuildExclusiveOptions>>>>;
    buildSync<T extends SuperBuildOptions>(options: T): EsbuildBuildResult<SameShape<EsbuildBuildOptions, Omit<T, keyof SuperBuildExclusiveOptions>>>;
}
//# sourceMappingURL=build.d.ts.map