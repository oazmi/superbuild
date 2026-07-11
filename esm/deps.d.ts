import type { MaybePromise } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/typedefs.js";
export type * as esbuild from "./deps/jsr.io/@oazmi/esbuild-types/0.28.0/src/mod.js";
export { array_isEmpty, console_log, date_now, dom_clearTimeout, dom_setTimeout, json_stringify, math_max, object_assign, object_entries, object_fromEntries, object_keys, promise_all, promise_outside } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/alias.js";
export { bind_array_push } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/binder.js";
export { ensureFile, getRuntimeCwd, identifyCurrentRuntime, statEntry, writeFile } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/crossenv.js";
export { crc32 } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/cryptoman.js";
export { ensureEndSlash, ensureFileUrlIsLocalPath, ensureStartDotSlash, fileUrlToLocalPath, getUriScheme, isAbsolutePath, parseFilepathInfo, pathToPosixPath, relativePath, resolveAsUrl, resolvePathFactory } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/pathman.js";
export { promiseOutside, promiseTimeout } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/promiseman.js";
export { escapeLiteralStringForRegex } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/stringman.js";
export { isArray, isFunction, isRecord, isString } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/struct.js";
export type { MaybePromise, MaybePromiseLike, Optional, Require } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/typedefs.js";
/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export declare const enum DEBUG {
    LOG = 1,
    ASSERT = 1,
    ERROR = 1,
    PRODUCTION = 1,
    MINIFY = 0
}
/** check if `obj` is either `null` or `undefined`. */
export declare const isNull: (obj: any) => obj is (null | undefined);
export declare const noop: () => undefined;
export declare const urlToString: (url: string | URL) => string;
export declare const ensureRelativeDotSlash: (str: string) => string;
export declare const textEncoder: TextEncoder, textDecoder: TextDecoder;
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
export type AutoSuggestOrString<T> = T | (string & {});
/** represents either a regular value `T`, or nullable value (`null | undefined`), or a `Promise` thereof. */
export type MaybePromiseOrNull<T> = MaybePromise<T | null | undefined>;
/** represents either a regular value `T`, or void value (`null | undefined | void`), or a `Promise` thereof. */
export type MaybePromiseOrVoid<T> = MaybePromise<T | null | undefined | void>;
//# sourceMappingURL=deps.d.ts.map