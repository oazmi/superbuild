/** this module contains base type definitions.
 *
 * @module
*/
/** type annotation for a relative path. */
export type RelativePath = string;
/** type annotation for an absolute path. */
export type AbsolutePath = string;
/** type annotation for a resolved path (that originates from the path resolver stage).
 * it could either be an absolute path or an external absolute path.
*/
export type ResolvedPath = string;
/** type annotation for a namespaced resolved path of the form `${namespace}:${resolved_path}`, all in lowercasing.
 * this is often used as a key for various `Map`s to identify resources and references to resources.
*/
export type NamespacedPath = string;
/** type annotation for any kind path. */
export type Path = RelativePath | AbsolutePath;
/** a logging function that can be used as an alternative to the default `console.log` logger function. */
export type LoggerFunction = (...data: any[]) => void;
//# sourceMappingURL=typedefs.d.ts.map