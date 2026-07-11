/** this module contains type definitions for super-build's extended plugin api.
 *
 * @module
*/
/** this symbol gives you access to the **true** internal `PluginBuild` object that was used for constructing a {@link SuperPluginBuild}.
 * it can be used as a means to check whether you're inside super-build or not,
 * or if you have a situation where it is necessary for super-build to be bypassed,
 * such as in the case of {@link EsbuildNativeResolver}, which is spawned by {@link nativeReplicaPluginSetup}.
*/
export const INNER_PLUGIN_BUILD = Symbol();
