import { } from "@oazmi/kitchensink/crossenv"
import { } from "@oazmi/kitchensink/pathman"
import { isString } from "@oazmi/kitchensink/struct"


export type * as esbuild from "@oazmi/esbuild-types"
export { array_isEmpty, console_log, dom_clearTimeout, dom_setTimeout, json_stringify, object_assign, object_entries, object_keys, promise_outside } from "@oazmi/kitchensink/alias"
export { bind_array_push } from "@oazmi/kitchensink/binder"
export { } from "@oazmi/kitchensink/crossenv"
export { ensureFileUrlIsLocalPath, fileUrlToLocalPath, getUriScheme, parseFilepathInfo, pathToPosixPath, resolveAsUrl } from "@oazmi/kitchensink/pathman"
export { promiseOutside, promiseTimeout } from "@oazmi/kitchensink/promiseman"
export { escapeLiteralStringForRegex } from "@oazmi/kitchensink/stringman"
export { isArray, isFunction, isString } from "@oazmi/kitchensink/struct"
export type { MaybePromise } from "@oazmi/kitchensink/typedefs"

/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export const enum DEBUG {
	LOG = 1,
	ASSERT = 1,
	ERROR = 1,
	PRODUCTION = 1,
	MINIFY = 0,
}

/** check if `obj` is either `null` or `undefined`. */
export const isNull = (obj: any): obj is (null | undefined) => {
	return (obj === undefined) || (obj === null)
}

export const noop = (() => undefined)

export const urlToString = (url: string | URL): string => { return isString(url) ? url : url.href }

/** this utility type lets makes your typescript LSP auto-suggest literals defined in the input generic type `T`,
 * while also permitting arbitrary strings to be used.
 *
 * TODO: add this utility type to kitchensink.
 *
 * @example
 * ```ts
 * type InstallationPath = AutoSuggestOrString<0 | undefined | "$CWD" | "C-DRIVE" | "$ROOT">
 *
 * const installProgram = async (installation_path: InstallationPath) => {
 * 	const abs_path = installation_path === undefined ? ""
 * 		: installation_path === "$CWD" ? Deno.cwd()   // LSP will suggest `0 | "$CWD" | "C-DRIVE" | "$ROOT"`.
 * 			: installation_path === "C-DRIVE" ? "C:/" // LSP will suggest `0 | "C-DRIVE" | "$ROOT"`.
 * 				: installation_path === "$ROOT" ? "/" // LSP will suggest `0 | "$ROOT"`.
 * 					: installation_path === 0 ? ""    // LSP will suggest `0`.
 * 						: installation_path satisfies string // `(string & {})` is still a valid string.
 * 	// perform installation
 * }
 *
 * await installProgram("$CWD")             // valid, and LSP will suggest the default options first.
 * await installProgram(undefined)          // valid.
 * await installProgram(0)                  // valid.
 * await installProgram("/etc/hello/world") // also valid.
 * ```
*/
export type AutoSuggestOrString<T> = T | (string & {})
