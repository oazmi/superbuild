import { isString } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/struct.js"
import type { MaybePromise } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/typedefs.js"


export type * as esbuild from "./deps/jsr.io/@oazmi/esbuild-types/0.28.0/src/mod.js"
export { array_isEmpty, console_log, date_now, dom_clearTimeout, dom_setTimeout, json_stringify, math_max, object_assign, object_entries, object_fromEntries, object_keys, promise_all, promise_outside } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/alias.js"
export { bind_array_push } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/binder.js"
export { ensureFile, getRuntimeCwd, identifyCurrentRuntime, statEntry, writeFile } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/crossenv.js"
export { crc32 } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/cryptoman.js"
export { ensureEndSlash, ensureFileUrlIsLocalPath, ensureStartDotSlash, fileUrlToLocalPath, getUriScheme, isAbsolutePath, parseFilepathInfo, pathToPosixPath, relativePath, resolveAsUrl, resolvePathFactory } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/pathman.js"
export { promiseOutside, promiseTimeout } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/promiseman.js"
export { escapeLiteralStringForRegex } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/stringman.js"
export { isArray, isFunction, isNull, isRecord, isString } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/struct.js"
export type { AutoSuggestOrString, MaybePromise, MaybePromiseLike, Optional, Require } from "./deps/jsr.io/@oazmi/kitchensink/0.10.1/src/typedefs.js"

/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export const enum DEBUG {
	LOG = 1,
	ASSERT = 1,
	ERROR = 1,
	PRODUCTION = 1,
	MINIFY = 0,
}

export const noop = (() => undefined)

export const urlToString = (url: string | URL): string => { return isString(url) ? url : url.href }

const
	// posix directory path separator.
	sep = "/",
	// posix relative directory path navigator.
	dotslash = "./",
	// posix relative parent directory path navigator.
	dotdotslash = "../",
	string_starts_with = (str: string, starts_with: string): boolean => str.startsWith(starts_with),
	string_ends_with = (str: string, ends_with: string): boolean => str.endsWith(ends_with)

export const ensureRelativeDotSlash = (str: string): string => {
	return (string_starts_with(str, dotslash) || string_starts_with(str, dotdotslash)) ? str
		: string_starts_with(str, sep) ? "." + str
			: dotslash + str
}

export const
	textEncoder = new TextEncoder(),
	textDecoder = new TextDecoder()

/** represents either a regular value `T`, or nullable value (`null | undefined`), or a `Promise` thereof. */
export type MaybePromiseOrNull<T> = MaybePromise<T | null | undefined>

/** represents either a regular value `T`, or void value (`null | undefined | void`), or a `Promise` thereof. */
export type MaybePromiseOrVoid<T> = MaybePromise<T | null | undefined | void>
