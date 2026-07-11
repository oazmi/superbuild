import { isString } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/struct.js";
export { array_isEmpty, console_log, date_now, dom_clearTimeout, dom_setTimeout, json_stringify, math_max, object_assign, object_entries, object_fromEntries, object_keys, promise_all, promise_outside } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/alias.js";
export { bind_array_push } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/binder.js";
export { ensureFile, getRuntimeCwd, identifyCurrentRuntime, statEntry, writeFile } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/crossenv.js";
export { crc32 } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/cryptoman.js";
export { ensureEndSlash, ensureFileUrlIsLocalPath, ensureStartDotSlash, fileUrlToLocalPath, getUriScheme, isAbsolutePath, parseFilepathInfo, pathToPosixPath, relativePath, resolveAsUrl, resolvePathFactory } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/pathman.js";
export { promiseOutside, promiseTimeout } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/promiseman.js";
export { escapeLiteralStringForRegex } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/stringman.js";
export { isArray, isFunction, isRecord, isString } from "./deps/jsr.io/@oazmi/kitchensink/0.10.0/src/struct.js";
/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export var DEBUG;
(function (DEBUG) {
    DEBUG[DEBUG["LOG"] = 1] = "LOG";
    DEBUG[DEBUG["ASSERT"] = 1] = "ASSERT";
    DEBUG[DEBUG["ERROR"] = 1] = "ERROR";
    DEBUG[DEBUG["PRODUCTION"] = 1] = "PRODUCTION";
    DEBUG[DEBUG["MINIFY"] = 0] = "MINIFY";
})(DEBUG || (DEBUG = {}));
/** check if `obj` is either `null` or `undefined`. */
export const isNull = (obj) => {
    return (obj === undefined) || (obj === null);
};
export const noop = (() => undefined);
export const urlToString = (url) => { return isString(url) ? url : url.href; };
const 
// posix directory path separator.
sep = "/", 
// posix relative directory path navigator.
dotslash = "./", 
// posix relative parent directory path navigator.
dotdotslash = "../", string_starts_with = (str, starts_with) => str.startsWith(starts_with), string_ends_with = (str, ends_with) => str.endsWith(ends_with);
export const ensureRelativeDotSlash = (str) => {
    return (string_starts_with(str, dotslash) || string_starts_with(str, dotdotslash)) ? str
        : string_starts_with(str, sep) ? "." + str
            : dotslash + str;
};
export const textEncoder = new TextEncoder(), textDecoder = new TextDecoder();
