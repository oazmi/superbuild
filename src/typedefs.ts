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

/** an import map is just a key-value dictionary, where the value is an absolute path to a package's resource,
 * and the key associated with it is an alias used by your code to reference the resource's path.
 *
 * > [!note]
 * > the all keys that are provided are normalized first, so that a key like "hello/earth/../world" would transform to "hello/world".
 * > further reading on [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).
*/
export type ImportMap = Record<string, string>

/** a logging function that can be used as an alternative to the default `console.log` logger function. */
export type LoggerFunction = (...data: any[]) => void

/** these are the various formats of input and output specification accepted by esbuild for a single entity. */
export type EsbuildEntryPointType =
	| string // here, output name = input name.
	| { in: string, out: string } // the `in` field specifies the input-file/pacakge's name, and `out` specifies the output's name.
	| [input: string, output: string] // the first element specifies the input-file/pacakge's name, and second element specifies the output's name.

/** these are the various formats of entry points accepted by esbuild. */
export type EsbuildEntryPointsType = ImportMap | Array<EsbuildEntryPointType>
