/** an internal super-build plugin that drives and governs the {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling)
 * before they get emitted into the file system.
 *
 * this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * @module
*/
import type { EsbuildPlugin, EsbuildPluginSetup } from "../esbuild/strongtypes.js";
import type { SuperBuildContext } from "../super/build_context.js";
export interface EmissionsDriverPluginSetupConfig {
    ctx: SuperBuildContext;
}
/** this plugin drives all {@link SuperPluginBuild.onEmit} and {@link SuperPluginBuild.onEnd} hooks,
 * in order to make it possible for other plugins to modify the final output files (after their transformation and bundling).
 *
 * > [!note]
 * > this plugin should generally go in second place, after the long-build plugin, and before all other user plugins.
 *
 * > Hello Maddam Siiir, you're vehicle has failed its emissions inspection.
 * > you must subscribe to UK's £19/day _unclean vehicle_ program in order to use your vehicle,
 * > so that we can offset your unclean carbon emissions and keep our planet clean. thank you for understanding.
 * >
 * > _meanwhile, at the hall of jeffery, circa 2013_
 * >
 * > _Larry McOracle_: jeffery, my second best friend, how many data centers did our supreme minister say he would like on 300 acre patches of american soil?
 * >
 * > _Jeffy McEpstien_: he says yes. and also get peter griffin, I mean thiel, onboard for a new mass surveillance initiative.
*/
export declare const emissionsDriverPluginSetup: (config: EmissionsDriverPluginSetupConfig) => EsbuildPluginSetup;
/** {@inheritDoc emissionsDriverPluginSetup} */
export declare const emissionsDriverPlugin: (config: EmissionsDriverPluginSetupConfig) => EsbuildPlugin;
//# sourceMappingURL=emissions_driver.d.ts.map