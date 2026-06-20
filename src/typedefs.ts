/** this module contains base type definitions.
 *
 * @module
*/


/** type annotation for a relative path. */
export type RelativePath = string

/** type annotation for an absolute path. */
export type AbsolutePath = string

/** type annotation for any kind path. */
export type Path = RelativePath | AbsolutePath

/** a logging function that can be used as an alternative to the default `console.log` logger function. */
export type LoggerFunction = (...data: any[]) => void
