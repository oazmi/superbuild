import { isString } from "@oazmi/kitchensink/struct"
import type { MaybePromise } from "@oazmi/kitchensink/typedefs"


export type * as esbuild from "@oazmi/esbuild-types"
export { array_isEmpty, console_log, date_now, dom_clearTimeout, dom_setTimeout, json_stringify, math_max, object_assign, object_entries, object_fromEntries, object_keys, promise_all, promise_outside } from "@oazmi/kitchensink/alias"
export { bind_array_push } from "@oazmi/kitchensink/binder"
export { ensureFile, getRuntimeCwd, identifyCurrentRuntime, statEntry, writeFile } from "@oazmi/kitchensink/crossenv"
export { crc32 } from "@oazmi/kitchensink/cryptoman"
export { ensureEndSlash, ensureFileUrlIsLocalPath, ensureStartDotSlash, fileUrlToLocalPath, getUriScheme, isAbsolutePath, parseFilepathInfo, pathToPosixPath, relativePath, resolveAsUrl, resolvePathFactory } from "@oazmi/kitchensink/pathman"
export { promiseOutside, promiseTimeout } from "@oazmi/kitchensink/promiseman"
export { escapeLiteralStringForRegex } from "@oazmi/kitchensink/stringman"
export { isArray, isFunction, isNull, isRecord, isString } from "@oazmi/kitchensink/struct"
export type { AutoSuggestOrString, MaybePromise, MaybePromiseLike, Optional, Require } from "@oazmi/kitchensink/typedefs"

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
