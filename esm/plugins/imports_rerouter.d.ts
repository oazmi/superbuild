/** the plugin in this module re-routes relative imports inside either a `js` or `css` entry-point file to an alternate directory.
 *
 * @module
*/
import { type Require } from "../deps.js";
import type { EsbuildPlugin, EsbuildPluginSetup } from "../esbuild/strongtypes.js";
import type { ImportedEntity } from "../super/typedefs.js";
/** configuration options for {@link importsRerouterPluginSetup}. */
export interface ImportsRerouterPluginSetupConfig {
    /** the absolute path where the entry-point currently resides in. */
    initialPath: NonNullable<ImportedEntity["initialPath"]>;
    /** the updated absolute path where the entry-point is to be migrated to.
     * if the entry-point is not to be moved, then do not declare this field.
    */
    outputPath?: ImportedEntity["outputPath"];
    /** declare all known imports of this js or css module. inside each element of the array:
     * - the `outputPath` required field should declare the current absolute path of the resource.
     * - the `initialPath` optional field should declare the _original_ absolute path of the resource,
     *   where _your entry-point_ is currently coded to load this resource from.
     *   when the `initialPath` is declared, it indicates that the referenced imported resource's path _inside_
     *   your entry-point file needs to be updated to match the resource's current `outputPath`.
     * - the `external` optional field specifies if the imported resource's absolute `outputPath` is _external_,
     *   and hence not influenced by the location/migration of the entry-point to an alternate directory ({@link outputPath}).
     *   however, any `initialPath` field that might be present on the imported entity will still indicate that it needs to be updated,
     *   just not with respect to any new {@link outputPath}, but rather with respect to the old {@link initialPath}.
     *   (moreover, the resource's import path string will an absolute path rather than a relative path).
    */
    imports: Require<Partial<ImportedEntity>, "outputPath">[];
}
/** this plugin is intended to be executed with just a single entry-point.
 * it re-routes the entry-point's relative import paths,
 * such that they would remain valid if the entry-point had been moved to the {@link ImportsRerouterPluginSetupConfig.outputPath}.
*/
export declare const importsRerouterPluginSetup: (config: ImportsRerouterPluginSetupConfig) => EsbuildPluginSetup;
/** {@inheritDoc importsRerouterPluginSetup} */
export declare const importsRerouterPlugin: (config: ImportsRerouterPluginSetupConfig) => EsbuildPlugin;
//# sourceMappingURL=imports_rerouter.d.ts.map