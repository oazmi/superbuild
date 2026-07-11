/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * @module
*/
import type { Esbuild, EsbuildBuildOptions, EsbuildBuildResult } from "../esbuild/strongtypes.js";
import type { LoggerFunction } from "../typedefs.js";
import { SuperBuildContext } from "./build_context.js";
export interface SuperBuildOptions extends EsbuildBuildOptions {
    /** enable internal logging of super-build for debugging, when {@link DEBUG.LOG} is enabled.
     *
     * when set to `true`, the logs will show up in your console via `console.log()`.
     * you may also provide your own custom logger function if you wish.
     *
     * @defaultValue `false`
    */
    debuggingLogs?: boolean | LoggerFunction;
}
export type SuperBuildExclusiveOptions = Omit<SuperBuildOptions, keyof EsbuildBuildOptions>;
/** super-build lets you overload esbuild to expand what you're capable of doing in the plugin-api.
 *
 * this class creates a mere wrapper over a base `esbuild` object (acquired from `import esbuild from "npm:esbuild"`).
 * this class itself does not do anything interesting aside from overloading the `esbuild.build` and `esbuild.buildSync` methods,
 * to pass a modified version of your `esbuild.BuildOptions` that alters the plugin api (which is performed by {@link SuperBuildContext}).
*/
export declare class SuperBuild implements Esbuild {
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
    protected splitOptions(options: SuperBuildOptions): [
        super_options: SuperBuildExclusiveOptions,
        esbuild_options: EsbuildBuildOptions
    ];
    protected createContext(options: SuperBuildOptions): [
        ctx: SuperBuildContext,
        esbuild_options: EsbuildBuildOptions
    ];
    build<T extends SuperBuildOptions>(options: T & {
        [Key in Exclude<keyof T, keyof SuperBuildOptions>]: never;
    }): Promise<EsbuildBuildResult<T>>;
    buildSync<T extends SuperBuildOptions>(options: T & {
        [Key in Exclude<keyof T, keyof SuperBuildOptions>]: never;
    }): EsbuildBuildResult<T>;
}
//# sourceMappingURL=build.d.ts.map