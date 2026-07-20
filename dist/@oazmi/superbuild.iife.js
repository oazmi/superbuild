"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/alias.ts
  var array_constructor = Array;
  var date_constructor = Date;
  var json_constructor = JSON;
  var math_constructor = Math;
  var object_constructor = Object;
  var promise_constructor = Promise;
  var console_object = console;
  var noop = () => {
  };
  var array_isEmpty = (array) => array.length === 0;
  var array_from = /* @__PURE__ */ (() => array_constructor.from)();
  var array_isArray = /* @__PURE__ */ (() => array_constructor.isArray)();
  var date_now = /* @__PURE__ */ (() => date_constructor.now)();
  var json_stringify = /* @__PURE__ */ (() => json_constructor.stringify)();
  var math_max = /* @__PURE__ */ (() => math_constructor.max)();
  var math_min = /* @__PURE__ */ (() => math_constructor.min)();
  var object_assign = /* @__PURE__ */ (() => object_constructor.assign)();
  var object_entries = /* @__PURE__ */ (() => object_constructor.entries)();
  var object_fromEntries = /* @__PURE__ */ (() => object_constructor.fromEntries)();
  var object_keys = /* @__PURE__ */ (() => object_constructor.keys)();
  var promise_outside = () => {
    let resolve, reject;
    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    return [promise, resolve, reject];
  };
  var promise_all = /* @__PURE__ */ promise_constructor.all.bind(promise_constructor);
  var string_toUpperCase = (str) => str.toUpperCase();
  var console_log = /* @__PURE__ */ (() => console_object.log)();
  var dom_setTimeout = setTimeout;
  var dom_clearTimeout = clearTimeout;
  var dom_encodeURI = encodeURI;
  var dom_decodeURI = decodeURI;

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/struct.ts
  var isComplex = (obj) => {
    const obj_type = typeof obj;
    return obj_type === "object" || obj_type === "function";
  };
  var isNull = (obj) => {
    return obj === void 0 || obj === null;
  };
  var isObject = (obj) => {
    return typeof obj === "object";
  };
  var isArray = array_isArray;
  var isRecord = (obj) => {
    return isObject(obj) && obj !== null && !isArray(obj);
  };
  var isString = (obj) => {
    return typeof obj === "string";
  };

  // src/_dnt.shims.ts
  var dntGlobals = {};
  var dntGlobalThis = createMergeProxy(globalThis, dntGlobals);
  function createMergeProxy(baseObj, extObj) {
    return new Proxy(baseObj, {
      get(_target, prop, _receiver) {
        if (prop in extObj) {
          return extObj[prop];
        } else {
          return baseObj[prop];
        }
      },
      set(_target, prop, value) {
        if (prop in extObj) {
          delete extObj[prop];
        }
        baseObj[prop] = value;
        return true;
      },
      deleteProperty(_target, prop) {
        let success = false;
        if (prop in extObj) {
          delete extObj[prop];
          success = true;
        }
        if (prop in baseObj) {
          delete baseObj[prop];
          success = true;
        }
        return success;
      },
      ownKeys(_target) {
        const baseKeys = Reflect.ownKeys(baseObj);
        const extKeys = Reflect.ownKeys(extObj);
        const extKeysSet = new Set(extKeys);
        return [...baseKeys.filter((k) => !extKeysSet.has(k)), ...extKeys];
      },
      defineProperty(_target, prop, desc) {
        if (prop in extObj) {
          delete extObj[prop];
        }
        Reflect.defineProperty(baseObj, prop, desc);
        return true;
      },
      getOwnPropertyDescriptor(_target, prop) {
        if (prop in extObj) {
          return Reflect.getOwnPropertyDescriptor(extObj, prop);
        } else {
          return Reflect.getOwnPropertyDescriptor(baseObj, prop);
        }
      },
      has(_target, prop) {
        return prop in extObj || prop in baseObj;
      }
    });
  }

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/eightpack.ts
  var textEncoder = /* @__PURE__ */ new TextEncoder();

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/stringman.ts
  var commonPrefix = (inputs) => {
    const len = inputs.length;
    if (len < 1) return "";
    const inputs_lengths = inputs.map((str) => str.length), shortest_input_length = math_min(...inputs_lengths), shortest_input = inputs[inputs_lengths.indexOf(shortest_input_length)];
    let left = 0, right = shortest_input_length;
    while (left <= right) {
      const center = (left + right) / 2 | 0, prefix = shortest_input.substring(0, center);
      if (inputs.every((input) => input.startsWith(prefix))) {
        left = center + 1;
      } else {
        right = center - 1;
      }
    }
    return shortest_input.substring(0, (left + right) / 2 | 0);
  };
  var escapeLiteralCharsRegex = /[.*+?^${}()|[\]\\]/g;
  var escapeLiteralStringForRegex = (str) => str.replaceAll(escapeLiteralCharsRegex, "\\$&");

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/pathman.ts
  var uriProtocolSchemeMap = /* @__PURE__ */ object_entries({
    "node:": "node",
    "npm:": "npm",
    "jsr:": "jsr",
    "blob:": "blob",
    "data:": "data",
    "http://": "http",
    "https://": "https",
    "file://": "file",
    "./": "relative",
    "../": "relative"
  });
  var forbiddenBaseUriSchemes = ["blob", "data", "relative"];
  var packageUriSchemes = ["jsr", "npm", "node"];
  var packageUriProtocols = ["jsr:", "npm:", "node:"];
  var sep = "/";
  var dotslash = "./";
  var dotdotslash = "../";
  var windows_directory_slash_regex = /\\/g;
  var windows_absolute_path_regex = /^[a-z]\:[\/\\]/i;
  var windows_leading_slash_correction_regex = /^[\/\\]([a-z])\:[\/\\]/i;
  var leading_slashes_regex = /^\/+/;
  var filename_regex = /\/?[^\/]+$/;
  var basename_and_extname_regex = /^(?<basename>.+?)(?<ext>\.[^\.]+)?$/;
  var package_regex = /^(?<protocol>jsr:|npm:|node:)(\/*(@(?<scope>[^\/\s]+)\/)?(?<pkg>[^@\/\s]+)(@(?<version>[^\/\r\n\t\f\v]+))?)?(?<pathname>\/.*)?$/;
  var string_starts_with = (str, starts_with) => str.startsWith(starts_with);
  var string_ends_with = (str, ends_with) => str.endsWith(ends_with);
  var isAbsolutePath = (path) => {
    return string_starts_with(path, sep) || string_starts_with(path, "~") || windows_absolute_path_regex.test(path);
  };
  var getUriScheme = (path) => {
    if (!path || path === "") {
      return void 0;
    }
    for (const [protocol, scheme] of uriProtocolSchemeMap) {
      if (string_starts_with(path, protocol)) {
        return scheme;
      }
    }
    return isAbsolutePath(path) ? "local" : "relative";
  };
  var parsePackageUrl = (url_href) => {
    url_href = dom_decodeURI(isString(url_href) ? url_href : url_href.href);
    const { protocol, scope: scope_str, pkg, version: version_str, pathname: pathname_str } = package_regex.exec(url_href)?.groups ?? {};
    if (protocol === void 0 || pkg === void 0) {
      throw new Error(1 /* ERROR */ ? "invalid package url format was provided: " + url_href : "");
    }
    const scope = scope_str ? scope_str : void 0, version = version_str ? version_str : void 0, pathname = pathname_str ? pathname_str : sep, host = `${scope ? "@" + scope + sep : ""}${pkg}${version ? "@" + version : ""}`, href = dom_encodeURI(`${protocol}/${host}${pathname}`);
    return {
      protocol,
      scope,
      pkg,
      version,
      pathname,
      host,
      href
    };
  };
  var resolveAsUrl = (path, base) => {
    if (!isString(path)) {
      return path;
    }
    path = pathToPosixPath(path);
    let base_url = base;
    if (isString(base) && base !== "") {
      const base_scheme = getUriScheme(base);
      if (forbiddenBaseUriSchemes.includes(base_scheme)) {
        throw new Error(1 /* ERROR */ ? "the following base scheme (url-protocol) is not supported: " + base_scheme : "");
      }
      base_url = resolveAsUrl(base);
    }
    const path_scheme = getUriScheme(path), base_protocol = base_url ? base_url.protocol : void 0, path_is_package = packageUriSchemes.includes(path_scheme), base_is_package = packageUriProtocols.includes(base_protocol), path_is_root = string_starts_with(path, "/"), path_is_local = path_scheme === "local", path_is_relative = path_scheme === "relative";
    if (path_is_package) {
      return new URL(parsePackageUrl(path).href);
    }
    if (base_url && base_is_package && (path_is_root || path_is_relative)) {
      const { host, protocol, pathname } = parsePackageUrl(base_url);
      if (path_is_root) {
        return new URL(`${protocol}/${dom_encodeURI(host)}${dom_encodeURI(path)}`);
      }
      if (path_is_relative) {
        const full_pathname = new URL(path, "x:" + pathname).pathname;
        return new URL(`${protocol}/${dom_encodeURI(host)}${full_pathname}`);
      }
    }
    if (base_url && (path_is_root || path_is_relative)) {
      return new URL(path, base_url);
    }
    if (path_is_local) {
      return new URL("file://" + dom_encodeURI(path));
    }
    return new URL(path);
  };
  var trimStartSlashes = (str) => {
    return str.replace(leading_slashes_regex, "");
  };
  var ensureEndSlash = (str) => {
    return string_ends_with(str, sep) ? str : str + sep;
  };
  var normalizePosixPath = (path, config = {}) => {
    const { keepRelative = true } = isObject(config) ? config : {}, segments = path.split(sep), last_segment = segments.at(-1), output_segments = [".."], prepend_relative_dotslash_to_output_segments = keepRelative && segments[0] === ".", ends_with_dir_navigator_without_a_trailing_slash = segments.length >= 2 && (last_segment === "." || last_segment === "..");
    if (ends_with_dir_navigator_without_a_trailing_slash) {
      segments.push("");
    }
    for (const segment of segments) {
      if (segment === "..") {
        if (output_segments.at(-1) !== "..") {
          output_segments.pop();
        } else {
          output_segments.push(segment);
        }
      } else if (segment !== ".") {
        output_segments.push(segment);
      }
    }
    output_segments.shift();
    if (prepend_relative_dotslash_to_output_segments && output_segments[0] !== "..") {
      output_segments.unshift(".");
    }
    return output_segments.join(sep);
  };
  var normalizePath = (path, config) => {
    return normalizePosixPath(pathToPosixPath(path), config);
  };
  var pathToPosixPath = (path) => path.replaceAll(windows_directory_slash_regex, sep);
  var commonNormalizedPosixPath = (paths) => {
    const common_prefix = commonPrefix(paths), common_prefix_length = common_prefix.length;
    for (const path of paths) {
      const remaining_substring = path.slice(common_prefix_length);
      if (!string_starts_with(remaining_substring, sep)) {
        const common_dir_prefix_length = common_prefix.lastIndexOf(sep) + 1, common_dir_prefix = common_prefix.slice(0, common_dir_prefix_length);
        return common_dir_prefix;
      }
    }
    return common_prefix;
  };
  var commonPathTransform = (paths, map_fn) => {
    const normal_paths = paths.map(normalizePath), common_dir = commonNormalizedPosixPath(normal_paths), common_dir_length = common_dir.length, path_infos = array_from(normal_paths, (normal_path) => {
      return [common_dir, normal_path.slice(common_dir_length)];
    });
    return path_infos.map(map_fn);
  };
  var parseNormalizedPosixFilename = (file_path) => {
    return trimStartSlashes(filename_regex.exec(file_path)?.[0] ?? "");
  };
  var parseBasenameAndExtname_FromFilename = (filename) => {
    const { basename = "", ext = "" } = basename_and_extname_regex.exec(filename)?.groups ?? {};
    return [basename, ext];
  };
  var parseFilepathInfo = (file_path) => {
    const path = normalizePath(file_path), filename = parseNormalizedPosixFilename(path), filename_length = filename.length, dirpath = filename_length > 0 ? path.slice(0, -filename_length) : path, dirname = parseNormalizedPosixFilename(dirpath.slice(0, -1)), [basename, extname] = parseBasenameAndExtname_FromFilename(filename);
    return { path, dirpath, dirname, filename, basename, extname };
  };
  var fileUrlToLocalPath = (file_url) => {
    if (isString(file_url)) {
      if (getUriScheme(file_url) !== "file") {
        return;
      }
      file_url = new URL(file_url);
    }
    if (!string_starts_with(file_url.protocol, "file:")) {
      return;
    }
    const local_path_with_leading_slash = pathToPosixPath(dom_decodeURI(file_url.pathname)), corrected_local_path = local_path_with_leading_slash.replace(windows_leading_slash_correction_regex, "$1:/");
    return corrected_local_path;
  };
  var ensureFileUrlIsLocalPath = (path) => {
    const path_is_string = isString(path), file_uri_to_local_path_conversion = fileUrlToLocalPath(path);
    return file_uri_to_local_path_conversion ?? (path_is_string ? pathToPosixPath(path) : path.href);
  };
  var relativePath = (from_path, to_path) => {
    const [
      [common_dir, from_subpath],
      [, to_subpath]
    ] = commonPathTransform([from_path, to_path], (common_dir_and_subpath) => common_dir_and_subpath);
    if (common_dir === "") {
      throw new Error(1 /* ERROR */ ? `there is no common directory between the two provided paths:
	"${from_path}" and
	"to_path"` : "");
    }
    const upwards_traversal = Array(from_subpath.split(sep).length).fill("..");
    upwards_traversal[0] = ".";
    return normalizePosixPath(upwards_traversal.join(sep) + sep + to_subpath);
  };
  var joinPosixPaths_reduce_fn = (concatenatible_full_path, segment) => {
    const prev_segment = concatenatible_full_path.pop(), prev_segment_is_dir = string_ends_with(prev_segment, sep), prev_segment_as_dir = prev_segment_is_dir ? prev_segment : prev_segment + sep;
    if (!prev_segment_is_dir) {
      const segment_is_rel_to_dir = string_starts_with(segment, dotslash), segment_is_rel_to_parent_dir = string_starts_with(segment, dotdotslash);
      if (segment_is_rel_to_dir) {
        segment = "." + segment;
      } else if (segment_is_rel_to_parent_dir) {
        segment = dotdotslash + segment;
      }
    }
    concatenatible_full_path.push(prev_segment_as_dir, segment);
    return concatenatible_full_path;
  };
  var joinPosixPaths = (...segments) => {
    segments = segments.map((segment) => {
      return segment === "." ? dotslash : segment === ".." ? dotdotslash : segment;
    });
    const concatenatible_segments = segments.reduce(joinPosixPaths_reduce_fn, [sep]);
    concatenatible_segments.shift();
    return normalizePosixPath(concatenatible_segments.join(""));
  };
  var joinPaths = (...segments) => {
    return joinPosixPaths(...segments.map(pathToPosixPath));
  };
  var resolvePosixPathFactory = (absolute_current_dir, absolute_segment_test_fn = isAbsolutePath) => {
    const getCwdPath = isString(absolute_current_dir) ? (() => absolute_current_dir) : absolute_current_dir;
    return (...segments) => {
      const last_abs_segment_idx = segments.findLastIndex(absolute_segment_test_fn);
      if (last_abs_segment_idx >= 0) {
        segments = segments.slice(last_abs_segment_idx);
      } else {
        segments.unshift(ensureEndSlash(getCwdPath()));
      }
      return joinPosixPaths(...segments);
    };
  };
  var resolvePathFactory = (absolute_current_dir, absolute_segment_test_fn = isAbsolutePath) => {
    if (isString(absolute_current_dir)) {
      absolute_current_dir = pathToPosixPath(absolute_current_dir);
    }
    const getCwdPath = isString(absolute_current_dir) ? (() => absolute_current_dir) : (() => pathToPosixPath(absolute_current_dir())), posix_path_resolver = resolvePosixPathFactory(getCwdPath, absolute_segment_test_fn);
    return (...segments) => posix_path_resolver(...segments.map(pathToPosixPath));
  };

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/crossenv.ts
  var global_this_object = dntGlobalThis;
  var currentRuntimeValidationFnMap = {
    [0 /* DENO */]: () => global_this_object.Deno?.version ? true : false,
    [1 /* BUN */]: () => global_this_object.Bun?.version ? true : false,
    [2 /* NODE */]: () => global_this_object.process?.versions ? true : false,
    [3 /* CHROMIUM */]: () => global_this_object.chrome?.runtime ? true : false,
    [4 /* EXTENSION */]: () => global_this_object.browser?.runtime ? true : false,
    [5 /* WEB */]: () => global_this_object.window?.document ? true : false,
    [7 /* TXIKI */]: () => global_this_object.tjs?.version ? true : false,
    [6 /* WORKER */]: () => isObject(global_this_object.self) && isComplex(global_this_object.WorkerGlobalScope) && global_this_object.self instanceof global_this_object.WorkerGlobalScope ? true : false
  };
  var currentRuntimeIdentificationOrdering = [
    0 /* DENO */,
    1 /* BUN */,
    7 /* TXIKI */,
    2 /* NODE */,
    3 /* CHROMIUM */,
    4 /* EXTENSION */,
    5 /* WEB */,
    6 /* WORKER */
  ];
  var identifyCurrentRuntime = () => {
    for (const runtime of currentRuntimeIdentificationOrdering) {
      if (currentRuntimeValidationFnMap[runtime]()) {
        return runtime;
      }
    }
    throw new Error(1 /* ERROR */ ? `failed to detect current javascript runtime!
please report this issue to "https://github.com/omar-azmi/kitchensink_ts/issues", along with information on your runtime environment.` : "");
  };
  var getRuntime = (runtime_enum) => {
    switch (runtime_enum) {
      case 0 /* DENO */:
        return global_this_object.Deno;
      case 1 /* BUN */:
        return global_this_object.Bun;
      case 2 /* NODE */:
        return global_this_object.process;
      case 3 /* CHROMIUM */:
        return global_this_object.chrome;
      case 4 /* EXTENSION */:
        return global_this_object.browser;
      case 5 /* WEB */:
        return global_this_object.window;
      case 6 /* WORKER */:
        return global_this_object.self;
      case 7 /* TXIKI */:
        return global_this_object.tjs;
      default:
        throw new Error(1 /* ERROR */ ? `an invalid runtime enum was provided: "${runtime_enum}".` : "");
    }
  };
  var getRuntimeCwd = (runtime_enum, current_path = true) => {
    const runtime = getRuntime(runtime_enum);
    if (!runtime) {
      throw new Error(1 /* ERROR */ ? `the requested runtime associated with the enum "${runtime_enum}" is undefined (i.e. you're running on a different runtime from the provided enum).` : "");
    }
    switch (runtime_enum) {
      case 0 /* DENO */:
      case 1 /* BUN */:
      case 2 /* NODE */:
        return pathToPosixPath(runtime.cwd());
      case 7 /* TXIKI */:
        return pathToPosixPath(runtime.cwd);
      case 3 /* CHROMIUM */:
      case 4 /* EXTENSION */:
        return runtime.runtime.getURL("");
      case 5 /* WEB */:
      case 6 /* WORKER */:
        return new URL("./", current_path ? runtime.location.href : runtime.location.origin).href;
    }
  };
  var defaultWriteFileConfig = {
    append: false,
    create: true,
    mode: void 0
  };
  var writeFile = async (runtime_enum, file_path, data, config = {}) => {
    file_path = ensureFileUrlIsLocalPath(file_path);
    const { append, create, mode, signal } = { ...defaultWriteFileConfig, ...config }, { buffer, byteLength, byteOffset } = data, bytes = data instanceof Uint8Array ? data : new Uint8Array(buffer, byteOffset, byteLength), node_config = { encoding: "binary", append, create, mode, signal }, deno_config = { append, create, mode, signal }, runtime = getRuntime(runtime_enum);
    switch (runtime_enum) {
      case 0 /* DENO */:
        return runtime.writeFile(file_path, bytes, deno_config);
      case 1 /* BUN */:
      case 2 /* NODE */:
        return node_writeFile(file_path, bytes, node_config);
      case 7 /* TXIKI */:
        return txiki_writeFile(file_path, bytes, deno_config);
      default:
        throw new Error(1 /* ERROR */ ? `your non-system runtime environment enum ("${runtime_enum}") does not support filesystem writing operations` : "");
    }
  };
  var node_fs;
  var import_node_fs = async () => {
    return import("node:fs/promises");
  };
  var get_node_fs = async () => {
    return node_fs ??= await import_node_fs();
  };
  var node_writeFile = async (file_path, data, config = {}) => {
    const fs = await get_node_fs(), { append, create, mode, signal, encoding } = { ...defaultWriteFileConfig, ...config }, fs_config = { encoding, mode, signal };
    if (create) {
      return fs.writeFile(file_path, data, { ...fs_config, flag: append ? "a" : "w" });
    }
    const file = await fs.open(file_path, "r+", mode);
    if (!append) {
      await file.truncate(0);
    }
    await file.appendFile(data, fs_config);
    return file.close();
  };
  var txiki_writeFile = async (file_path, data, config) => {
    const runtime = getRuntime(7 /* TXIKI */), { append, create, mode, signal } = config, flag = create ? append ? "a" : "w" : append ? "a+" : "r+", file = await runtime.open(file_path, flag, mode);
    let aborted = false;
    signal?.addEventListener("abort", () => {
      aborted = true;
      file.close();
    });
    if (!create && !append) {
      await file.truncate(0);
    }
    const bytes = data instanceof Uint8Array ? data : isString(data) ? textEncoder.encode(data) : new Uint8Array(data.buffer, data.byteOffset);
    await file.write(bytes);
    await file.close();
    if (aborted) {
      throw new Error("AbortError");
    }
  };
  var fs_entry_info_fields = ["size", "mtime", "atime", "birthtime", "ctime", "dev", "mode"];
  var fs_entry_info_all_fields = ["isFile", "isDirectory", "isSymlink", ...fs_entry_info_fields];
  var object_assign_fields = (target, source, fields) => {
    fields.forEach((prop) => {
      target[prop] = source[prop];
    });
    return target;
  };
  var capture_nonexistent_fs_entry = (error) => {
    if (string_toUpperCase(error.code) === "ENOENT") {
      return void 0;
    }
    throw error;
  };
  var node_statEntry = async (path) => {
    const fs = await get_node_fs(), stat = await fs.stat(path).catch(capture_nonexistent_fs_entry);
    if (!stat) {
      return void 0;
    }
    const result = object_assign_fields({
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      isSymlink: stat.isSymbolicLink()
    }, stat, fs_entry_info_fields);
    return result;
  };
  var tjs_statEntry = async (path) => {
    const runtime = getRuntime(7 /* TXIKI */), stat = await runtime.stat(path).catch(capture_nonexistent_fs_entry);
    if (!stat) {
      return void 0;
    }
    const { atim: atime, birthtim: birthtime, ctim: ctime, dev, isDirectory, isFile, isSymbolicLink: isSymlink, mode, mtim: mtime, size } = stat;
    return { atime, birthtime, ctime, dev, isDirectory, isFile, isSymlink, mode, mtime, size };
  };
  var statEntry = async (runtime_enum, path) => {
    switch (runtime_enum) {
      case 0 /* DENO */: {
        const stat = await getRuntime(runtime_enum).stat(path).catch(capture_nonexistent_fs_entry);
        if (!stat) {
          return void 0;
        }
        const result = object_assign_fields({}, stat, fs_entry_info_all_fields);
        return result;
      }
      case 1 /* BUN */:
      case 2 /* NODE */:
        return node_statEntry(ensureFileUrlIsLocalPath(path));
      case 7 /* TXIKI */:
        return tjs_statEntry(ensureFileUrlIsLocalPath(path));
      default:
        throw new Error(1 /* ERROR */ ? `your non-system runtime environment enum ("${runtime_enum}") does not support filesystem stat-query operations` : "");
    }
  };
  var ensureDir = async (runtime_enum, dir_path) => {
    dir_path = ensureEndSlash(ensureFileUrlIsLocalPath(dir_path));
    const existing_entry_stats = await statEntry(runtime_enum, dir_path);
    if (existing_entry_stats?.isDirectory) {
      return;
    }
    const runtime = getRuntime(runtime_enum);
    switch (runtime_enum) {
      case 0 /* DENO */:
        return runtime.mkdir(dir_path, { recursive: true });
      case 1 /* BUN */:
      case 2 /* NODE */:
        return get_node_fs().then((fs) => fs.mkdir(dir_path, { recursive: true })).then(noop);
      case 7 /* TXIKI */:
        return runtime.makeDir(dir_path, { recursive: true });
      default:
        throw new Error(1 /* ERROR */ ? `your non-system runtime environment enum ("${runtime_enum}") does not support filesystem writing operations` : "");
    }
  };
  var ensureFile = async (runtime_enum, file_path) => {
    file_path = ensureFileUrlIsLocalPath(file_path);
    const existing_entry_stats = await statEntry(runtime_enum, file_path);
    if (existing_entry_stats?.isFile) {
      return;
    }
    const parent_dir = parseFilepathInfo(file_path).dirpath;
    await ensureDir(runtime_enum, parent_dir);
    return writeFile(runtime_enum, file_path, new Uint8Array(0));
  };

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/cryptoman.ts
  var createCrc32Table = () => {
    const polynomial = -306674912, crc32_table2 = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let r = i;
      for (let bit = 8; bit > 0; --bit) {
        r = r & 1 ? r >>> 1 ^ polynomial : r >>> 1;
      }
      crc32_table2[i] = r;
    }
    return crc32_table2;
  };
  var crc32_table;
  var crc32 = (bytes, crc) => {
    crc = crc === void 0 ? 4294967295 : crc ^ -1;
    crc32_table ??= createCrc32Table();
    for (let i = 0; i < bytes.length; ++i) {
      crc = crc32_table[(crc ^ bytes[i]) & 255] ^ crc >>> 8;
    }
    return (crc ^ -1) >>> 0;
  };
  var P = (1n << 255n) - 19n;
  var a24 = (486662n - 2n) / 4n;

  // src/deps/jsr.io/@oazmi/kitchensink/0.10.1/src/promiseman.ts
  var promiseOutside = promise_outside;
  var THROTTLE_REJECT = /* @__PURE__ */ Symbol(1 /* MINIFY */ || "a rejection by a throttled function");
  var TIMEOUT = /* @__PURE__ */ Symbol(1 /* MINIFY */ || "a timeout by an awaited promiseTimeout function");

  // src/deps.ts
  var noop2 = (() => void 0);
  var urlToString = (url) => {
    return isString(url) ? url : url.href;
  };
  var sep2 = "/";
  var dotslash2 = "./";
  var dotdotslash2 = "../";
  var string_starts_with2 = (str, starts_with) => str.startsWith(starts_with);
  var isRelativePath = (path) => {
    return string_starts_with2(path, dotslash2) || string_starts_with2(path, dotdotslash2);
  };
  var ensureRelativeDotSlash = (path) => {
    return isRelativePath(path) ? path : string_starts_with2(path, sep2) ? "." + path : dotslash2 + path;
  };
  var textEncoder2 = new TextEncoder();
  var textDecoder2 = new TextDecoder();

  // src/funcdefs.ts
  var concatArrays = (arr1, arr2) => {
    return !arr1 && !arr2 ? void 0 : !arr1 ? arr2 : !arr2 ? arr1 : [...arr1, ...arr2];
  };
  var cancelableDelayedPromiseResolver = (promise_resolver, original_delay, logger = noopLogger) => {
    let timer_id = -1, delay = original_delay;
    const resolve = (value) => {
      dom_clearTimeout(timer_id);
      if (1 /* LOG */) {
        logger(`delayed promise will resolve in ${delay}ms.`);
      }
      timer_id = dom_setTimeout(promise_resolver, delay, value);
    }, cancel = (new_delay = original_delay) => {
      dom_clearTimeout(timer_id);
      if (1 /* LOG */) {
        logger(`delayed promise was canceled.`);
      }
      delay = new_delay;
    };
    return [resolve, cancel];
  };
  var uuid_counter = -1;
  var generateUuid = (segments = 1, current_time) => {
    current_time ??= date_now();
    uuid_counter++;
    const crc32_segments = Array(math_max(segments, 0)).fill(current_time).map((time, i) => {
      const seed = uuid_counter + time + i, seed_arr = new Uint8Array(new Uint32Array([seed]).buffer), uuid_segment = crc32(seed_arr);
      return uuid_segment.toString(16).padStart(8, "0");
    });
    return crc32_segments.join("-");
  };
  var splitNamespacedPath = (resolved_namespaced_path) => {
    const namespace_splitting_idx = resolved_namespaced_path.indexOf(":"), namespace = resolved_namespaced_path.slice(0, namespace_splitting_idx), path = resolved_namespaced_path.slice(namespace_splitting_idx + 1);
    return { namespace, path };
  };
  var logLogger = console_log;
  var noopLogger = noop2;

  // src/esbuild/outputfile.ts
  var OutputFileEntity = class {
    /** the **absolute** output path of this resource entity. */
    outputPath;
    /** if this resource entity was renamed during the {@link SuperPluginBuild.onEmit, emission stage},
     * then its original (absolute) {@link outputPath} will get saved here.
    */
    initialPath;
    hash;
    contents;
    /** specify if this file entry should be written.
     *
     * @defaultValue `true` (i.e. it'll be written if `EsbuildBuildOption.write` is enabled, otherwise it won't be.)
    */
    write = true;
    /** an array of metadata on the loaded input files that were bundled into _this_ physical output file entity. */
    inputs = [];
    /** an array of metadata on the output files that are imported by _this_ file entity during runtime.
     *
     * each of these is basically associated with a js (`import { x, y, z } from "abc"`), css (`@import url("./blahblah.css")`),
     * or user-import (i.e. {@link OnTransformResult.imports}) statement.
    */
    imports = [];
    /** a set of emitted output entities that import _this_ file entity during runtime. */
    importedBy = /* @__PURE__ */ new Set();
    metafile;
    constructor(metafile, esbuild_file) {
      this.metafile = metafile;
      const output_path = metafile.resolvePath(esbuild_file.path), output_path_lowercase = output_path.toLowerCase(), metadata = metafile.outputs.get(output_path_lowercase);
      if (!metadata) {
        throw Error(`[OutputFileEntity.constructor]: no matching metadata for the file with the path "${output_path_lowercase}" could be found.`);
      }
      this.outputPath = output_path;
      this.initialPath = void 0;
      this.hash = esbuild_file.hash;
      this.contents = esbuild_file.contents;
      this.scanEsbuildInputs();
    }
    /** scans esbuild's metafile outputs to find the input sources bundled into this output file.
     * the input sources are presented with resolved path information, namespace, `onEmit` information,
     * and other additional information acquired from the resource's resolver, loader, and transformer results.
     * (the collection of this information is stored in {@link metafile.resolvedResourceRegistry},
     * which is inherited from the {@link SuperBuildContext}.)
    */
    scanEsbuildInputs() {
      const bundled_files = this.inputs;
      if (!array_isEmpty(bundled_files)) {
        return bundled_files;
      }
      const metafile = this.metafile, warnings = metafile.warnings, resolvedResourceRegistry = metafile.resolvedResourceRegistry, output_path_key = (this.initialPath ?? this.outputPath).toLowerCase(), metadata = metafile.outputs.get(output_path_key);
      if (!metadata) {
        throw Error(`[OutputFileEntity.scanEsbuildInputs]: no matching metadata for the file with the path "${output_path_key}" could be found.`);
      }
      for (const input_source_resolved_path of metadata.inputs) {
        const bundled_file = resolvedResourceRegistry.get(input_source_resolved_path);
        if (bundled_file) {
          bundled_files.push(bundled_file);
        } else {
          warnings.push({ text: `[OutputFileEntity.scanEsbuildInputs]: resource registry never encountered the resource: "${input_source_resolved_path}".` });
        }
      }
      return bundled_files;
    }
    /** scans esbuild's metafile outputs to find all file imports performed by this output file.
     * these only include entity imports found by esbuild natively (js imports, css imports, etc...), and not long-build plugin based imports.
     *
     * > [!important]
     * > this function should be run _after_ all files have been added to your {@link metafile} via {@link metafile.addFile},
     * > because the imports need to reference the {@link OutputFileEntity} associated with the imported file.
    */
    scanEsbuildImports() {
      const imported_entities = this.imports;
      if (!array_isEmpty(imported_entities)) {
        return imported_entities;
      }
      const metafile = this.metafile, warnings = metafile.warnings, outputs = metafile.outputs, output_path_key = (this.initialPath ?? this.outputPath).toLowerCase(), metadata = outputs.get(output_path_key);
      if (!metadata) {
        throw Error(`[OutputFileEntity.scanEsbuildImports]: no matching metadata for the file with the path "${output_path_key}" could be found.`);
      }
      for (const import_props of metadata.imports) {
        const { path: import_output_path, kind, external } = import_props;
        if (external) {
          const external_entity = { externalPath: import_output_path };
          imported_entities.push({ key: [import_output_path], kind, external, entity: external_entity });
          continue;
        }
        const import_output_path_key = import_output_path.toLowerCase(), entity = metafile.outputFileEntities.get(import_output_path_key);
        if (!entity) {
          throw Error(`[OutputFileEntity.scanEsbuildImports]: no matching output file entity for the path "${import_output_path_key}" could be found.`);
        }
        const import_sources = entity.inputs.map((props) => {
          return (props.namespace + ":" + props.path).toLowerCase();
        });
        if (array_isEmpty(import_sources)) {
          warnings.push({
            text: `[OutputFileEntity.scanEsbuildImports]: expected import file to be made out of at least one input resource. but worry not, as this could happen when the emitted file is just a re-exporting chunk file.`,
            location: { file: import_output_path }
          });
        }
        imported_entities.push({ key: import_sources, kind, external, entity });
      }
      return imported_entities;
    }
    /** broadcast _this_ entity to its {@link imports}, so that it (_this_ object) gets registered to their (the import's) {@link importedBy} list. */
    broadcastImporter() {
      for (const { entity } of this.imports) {
        const is_external_entity = "externalPath" in entity;
        if (is_external_entity) {
          continue;
        }
        entity.importedBy.add(this);
      }
    }
    /** test if an `onEmit` handler's filters apply to _this_ output file entity. */
    matchOnEmitFilter(options) {
      const { filter, inputs: input_filters, importedBy: imported_by_filters = [] } = options, output_path = this.outputPath;
      if (!filter.test(output_path)) {
        return false;
      }
      const bundled_files = this.inputs;
      for (const input_filter of input_filters ?? []) {
        const { filter: filter2, namespace, loader, transformLoader } = input_filter;
        const at_least_one_file_satisfies_conditions = bundled_files.some((bundled_file) => {
          return filter2.test(bundled_file.path) && (namespace ? namespace === bundled_file.namespace : true) && (loader ? loader === bundled_file.loader : true) && (transformLoader ? transformLoader === bundled_file.transformLoader : true);
        });
        if (!at_least_one_file_satisfies_conditions) {
          return false;
        }
      }
      const all_importers = [...this.importedBy];
      for (const imported_by_filter of imported_by_filters) {
        const at_least_one_importer_satisfies_conditions = all_importers.some((importer_entity) => {
          return importer_entity.matchOnEmitFilter(imported_by_filter);
        });
        if (!at_least_one_importer_satisfies_conditions) {
          return false;
        }
      }
      return true;
    }
    /** perform `onEmit` action on _this_ output file entity, based on the provided `onEmit` handlers. */
    async performOnEmit(on_emit_handlers) {
      const imported_entities = this.imports.map((imported_entity_node) => {
        const { key, kind, external, entity, with: with_attr } = imported_entity_node, is_external_entity = "externalPath" in entity, outputPath = is_external_entity ? entity.externalPath : entity.outputPath, initialPath = is_external_entity ? void 0 : entity.initialPath, write = is_external_entity ? false : entity.write;
        return { key, outputPath, initialPath, kind, external, with: with_attr, write };
      });
      const metafile = this.metafile, importer_paths = [...this.importedBy].map((entity) => {
        return entity.initialPath ?? entity.outputPath;
      }), output_file_registry = new ReducedMetafile(metafile);
      const warnings = [], errors = [];
      let prior_on_emit_result = void 0, prior_re_emit_data = void 0;
      while (true) {
        const on_emit_result = await this.performOnEmitOnce(on_emit_handlers, imported_entities, importer_paths, output_file_registry, prior_re_emit_data);
        if (isNull(on_emit_result)) {
          break;
        }
        prior_re_emit_data = on_emit_result.reEmitData ?? prior_re_emit_data;
        prior_on_emit_result = on_emit_result;
        warnings.push(...on_emit_result.warnings ?? []);
        errors.push(...on_emit_result.errors ?? []);
        if (errors.length > 0) {
          break;
        }
        if (!(on_emit_result.reEmit ?? false)) {
          break;
        }
      }
      return { ...prior_on_emit_result, warnings, errors };
    }
    /** performs a single `onEmit` action on _this_ output file entity, without performing any kind of re-emission. */
    async performOnEmitOnce(on_emit_handlers, imported_entities, importer_paths, output_file_registry, reEmitData) {
      for (const handler of on_emit_handlers) {
        if (!this.matchOnEmitFilter(handler)) {
          continue;
        }
        const on_emit_result = await handler.callback({
          outputPath: this.outputPath,
          contents: this.contents,
          write: this.write,
          inputs: this.inputs,
          imports: imported_entities,
          importedBy: importer_paths,
          reEmitData
        }, output_file_registry);
        if (isNull(on_emit_result)) {
          continue;
        }
        if (on_emit_result.contents) {
          this.contents = isString(on_emit_result.contents) ? textEncoder2.encode(on_emit_result.contents) : on_emit_result.contents;
        }
        if (on_emit_result.path) {
          this.rename(on_emit_result.path);
        }
        if (!isNull(on_emit_result.write)) {
          this.write = on_emit_result.write;
        }
        const pluginName = handler.pluginName;
        on_emit_result.warnings?.forEach((warning) => {
          if (!warning.pluginName) {
            warning.pluginName = pluginName;
          }
        });
        on_emit_result.errors?.forEach((error) => {
          if (!error.pluginName) {
            error.pluginName = pluginName;
          }
        });
        return on_emit_result;
      }
      return void 0;
    }
    /** rename this file. you can either provide an absolute path, or a relative path.
     * relative paths will be resolved with respect to the `cwd` or esbuild's `absWorkingDir`.
    */
    rename(new_output_path) {
      this.initialPath ??= this.outputPath;
      this.outputPath = this.metafile.resolvePath(new_output_path);
    }
    /** convert an output file entity to an esbuild-compatible {@link EsbuildOutputFile | output file description}.
     *
     * (honestly, I don't see myself using it, and if we're overloading esbuild anyway, why don't we overload the `OutputFile`
     * interface to include new fields, such as `write` and `external`, etc...?)
    */
    toEsbuildOutputFile(outdir = "./") {
      if (!this.write) {
        return void 0;
      }
      const metafile = this.metafile;
      outdir = metafile.resolvePath(outdir);
      const relative_path = relativePath(this.outputPath, outdir);
      return {
        path: relative_path,
        hash: this.hash,
        contents: this.contents
      };
    }
    async writeFile(write_file_fn) {
      if (!this.write) {
        return;
      }
      return write_file_fn(this.outputPath, this.contents);
    }
  };

  // src/esbuild/metafile.ts
  var windows_absolute_path_regex2 = /^[a-z]\:[\/\\]/i;
  var normalize_esbuild_filepath = (path) => {
    const is_local_path = !path.includes(":") || windows_absolute_path_regex2.test(path);
    return is_local_path ? "file:" + normalize_local_filepath(path) : path;
  };
  var normalize_local_filepath = (path) => {
    const is_abs_path = isAbsolutePath(path);
    return pathToPosixPath(is_abs_path ? path : ensureRelativeDotSlash(path));
  };
  var file_namespace = "file:";
  var file_namespace_length = file_namespace.length;
  var namespaced_path_to_abs_namespaced_path_factory = (resolve_path_fn) => {
    return (namespaced_path) => {
      if (!namespaced_path.startsWith(file_namespace)) {
        return namespaced_path;
      }
      const abs_path = resolve_path_fn(namespaced_path.slice(file_namespace_length));
      return file_namespace + abs_path;
    };
  };
  var Metafile = class _Metafile {
    value;
    inputs;
    outputs;
    outputFileEntities = /* @__PURE__ */ new Map();
    /** a copy of the {@link SuperBuildContext.resolvedResourceRegistry}, where all keys use lower case characters.
     * this is extremely important, as we've internally standardized to using only lower casing for namespaced resolved paths,
     * in order to evade the filesystem case-insesnsitivity problem when matching strings.
    */
    resolvedResourceRegistry;
    /** a function that resolves the given path segment to an absolute path, with respect to `cwd` or `absWorkingDir`. */
    resolvePath;
    /** holds all warnings that have occurred during method calls. */
    warnings = [];
    constructor(esbuild_metafile, config) {
      const { resolvedResourceRegistry, resolvePath } = config;
      esbuild_metafile = _Metafile.asNormalized(esbuild_metafile);
      esbuild_metafile = _Metafile.asAbsolute(esbuild_metafile, { resolvePath });
      esbuild_metafile = _Metafile.asLowercased(esbuild_metafile, {
        namespacedPaths: true,
        outputPaths: true,
        externalPaths: false
      });
      const { result: registry_lowercase, warnings } = format_resolved_resource_registry(resolvedResourceRegistry);
      this.value = esbuild_metafile;
      this.resolvedResourceRegistry = registry_lowercase;
      this.resolvePath = resolvePath;
      this.inputs = new Map(object_entries(this.value.inputs));
      this.outputs = new Map(object_entries(this.value.outputs).map(([output_path_lowercase, props]) => {
        return [output_path_lowercase, {
          entryPoint: props.entryPoint,
          inputs: object_keys(props.inputs),
          imports: props.imports.map(({ path, kind, external = false }) => ({ path, kind, external }))
        }];
      }));
      this.warnings.push(...warnings);
    }
    addFile(esbuild_file) {
      const file_entity = new OutputFileEntity(this, esbuild_file), output_path_lowercase = (file_entity.initialPath ?? file_entity.outputPath).toLowerCase();
      this.outputFileEntities.set(output_path_lowercase, file_entity);
      return file_entity;
    }
    /** this function is intended to run _after_ you have added **all** of your {@link EsbuildOutputFile | esbuild output files} via {@link addFile}.
     * what it does is that it simply calls the {@link OutputFileEntity.scanEsbuildImports} method of each {@link outputFileEntities | registered file},
     * so that they can discover the file entity associated which each of their esbuild-based imports.
    */
    scanEsbuildImports() {
      this.outputFileEntities.forEach((file_entity) => {
        file_entity.scanEsbuildImports();
      });
    }
    /** broadcast each importer entity to its import entity's {@link OutputFileEntity.importedBy} set.
     * this action should be performed _after_ **all** imports have been added to each output file entity.
     * i.e. it should be called after `incorporateLongBuildImportedEntities` is called inside the emissions driver plugin.
    */
    scanImporters() {
      this.outputFileEntities.forEach((file_entity) => {
        file_entity.broadcastImporter();
      });
    }
    /** find the file entity corresponding to the given absolute output path. you won't receive entities associated with external paths/references. */
    getFile(output_path_key) {
      output_path_key = output_path_key.toLowerCase();
      const file_entity = this.outputFileEntities.get(output_path_key);
      if (file_entity) {
        return file_entity;
      }
      this.warnings.push({ text: `[Metafile.getFile]: no file entity with the following path key was ever added: "${output_path_key}".` });
    }
    /** find all file entities that incorporate (i.e. originate from) certain namespaced source files/resources into their bundled form. */
    findFilesFromSources(predicate_fn) {
      const file_entity_matches = [];
      this.outputFileEntities.forEach((file_entity) => {
        const file_sources = file_entity.inputs.map(({ namespace, path }) => ({ namespace, path }));
        if (predicate_fn(file_sources)) {
          file_entity_matches.push(file_entity);
        }
      });
      return file_entity_matches;
    }
    /** prepares a dependency graph from the current list of {@link outputFileEntities}. */
    createFileDependencyGraph() {
      const graph = /* @__PURE__ */ new Map();
      for (const [output_path_key, entity] of this.outputFileEntities) {
        const dependencies = entity.imports.filter((dep_node) => {
          return !("externalPath" in dep_node.entity);
        }).map((dep_node) => {
          return dep_node.entity;
        });
        graph.set(entity, new Set(dependencies));
      }
      return graph;
    }
    /** write all output file entities (those with `entity.write !== false`) to the filesystem. */
    async writeFiles(allow_overwrite = false) {
      const current_runtime = identifyCurrentRuntime(), write_file_fn = async (file_path, data) => {
        if (!allow_overwrite && await statEntry(current_runtime, file_path)) {
          return;
        }
        await ensureFile(current_runtime, file_path);
        await writeFile(current_runtime, file_path, data);
      };
      const promises = [...this.outputFileEntities].map(async ([output_path_key, entity]) => {
        const is_external_entity = "externalPath" in entity;
        if (is_external_entity) {
          return;
        }
        return entity.writeFile(write_file_fn);
      });
      await Promise.all(promises);
    }
    /** normalizes an esbuild metafile to use namespaced paths (`${namespace}:${resolved_path}`) for resolved paths,
     * and absolute paths for output file paths.
     *
     * this function mutates the original metafile object passed to it.
    */
    static asNormalized(esbuild_metafile) {
      const { inputs, outputs } = esbuild_metafile;
      esbuild_metafile.inputs = object_fromEntries(object_entries(inputs).map(([resolved_path, props]) => {
        resolved_path = normalize_esbuild_filepath(resolved_path);
        props.imports = props.imports.map((props2) => {
          props2.path = normalize_esbuild_filepath(props2.path);
          return props2;
        });
        return [resolved_path, props];
      }));
      esbuild_metafile.outputs = object_fromEntries(object_entries(outputs).map(([output_path, props]) => {
        output_path = normalize_local_filepath(output_path);
        props.imports = props.imports.map((props2) => {
          props2.path = normalize_local_filepath(props2.path);
          return props2;
        });
        props.inputs = object_fromEntries(object_entries(props.inputs).map(([resolved_path, props2]) => {
          return [normalize_esbuild_filepath(resolved_path), props2];
        }));
        if (props.entryPoint) {
          props.entryPoint = normalize_esbuild_filepath(props.entryPoint);
        }
        return [output_path, props];
      }));
      return esbuild_metafile;
    }
    /** lower the casing of an esbuild metafile's namespaced resolved paths,
     * output file paths, and external paths, based on your `config` configuration.
     *
     * lower casing helps in ensuring that there won't be any casing conflicts when searching for a particular resource.
     *
     * this function mutates the original metafile object passed to it.
    */
    static asLowercased(esbuild_metafile, config) {
      const { namespacedPaths, outputPaths, externalPaths } = config, { inputs, outputs } = esbuild_metafile;
      esbuild_metafile.inputs = object_fromEntries(object_entries(inputs).map(([resolved_path, props]) => {
        if (namespacedPaths) {
          resolved_path = resolved_path.toLowerCase();
          props.imports = props.imports.map((props2) => {
            props2.path = props2.path.toLowerCase();
            return props2;
          });
        }
        return [resolved_path, props];
      }));
      esbuild_metafile.outputs = object_fromEntries(object_entries(outputs).map(([output_path, props]) => {
        if (namespacedPaths) {
          props.inputs = object_fromEntries(object_entries(props.inputs).map(([resolved_path, props2]) => {
            return [resolved_path.toLowerCase(), props2];
          }));
          if (props.entryPoint) {
            props.entryPoint = props.entryPoint.toLowerCase();
          }
        }
        if (outputPaths) {
          output_path = output_path.toLowerCase();
          props.imports = props.imports.map((props2) => {
            if (externalPaths || !(props2.external ?? false)) {
              props2.path = props2.path.toLowerCase();
            }
            return props2;
          });
        }
        return [output_path, props];
      }));
      return esbuild_metafile;
    }
    /** resolve all relative file paths in a {@link asNormalized | **normalized**} esbuild metafile to absolute file paths.
     *
     * this function mutates the original metafile object passed to it.
    */
    static asAbsolute(esbuild_metafile, config) {
      const { resolvePath } = config, namespaced_path_to_abs_namespaced_path = namespaced_path_to_abs_namespaced_path_factory(resolvePath), output_entries = object_entries(esbuild_metafile.outputs);
      esbuild_metafile.outputs = object_fromEntries(output_entries.map(([output_path, props]) => {
        output_path = resolvePath(output_path);
        props.entryPoint = props.entryPoint ? namespaced_path_to_abs_namespaced_path(props.entryPoint) : void 0;
        props.inputs = object_fromEntries(object_entries(props.inputs).map(([input_path, props2]) => {
          input_path = namespaced_path_to_abs_namespaced_path(input_path);
          return [input_path, props2];
        }));
        props.imports = props.imports.map((props2) => {
          props2.path = props2.external ? props2.path : resolvePath(props2.path);
          return props2;
        });
        return [output_path, props];
      }));
      return esbuild_metafile;
    }
  };
  var format_resolved_resource_registry = (registry) => {
    const warnings = [], registry_lowercase = new Map([...registry].map(([resolved_path, props]) => {
      return [resolved_path.toLowerCase(), props];
    }));
    if (registry_lowercase.size < registry.size) {
      const size_difference = registry.size - registry_lowercase.size, conflicting_keys = /* @__PURE__ */ new Set(), encountered_lowercase_keys = new Map([...registry].map(([key, props]) => {
        const key_lowercase = key.toLowerCase();
        return [key_lowercase, key];
      }));
      for (const [key, props] of registry) {
        const key_lowercase = key.toLowerCase(), key_original = encountered_lowercase_keys.get(key_lowercase);
        if (key_original !== key) {
          conflicting_keys.add(key);
          conflicting_keys.add(key_original);
        }
      }
      warnings.push({
        text: `[format_resolved_resource_registry]: ${size_difference} resolved resources use the same name, but only differ in letter casing. right now, super-build is not able to distinguish between the two (in order to achieve path name casing insensitivity), so this problem will likely mess up your build. if it's possible, you should change the name of the duplicate resources. see the notes for the conflicting resource names:`,
        notes: [...conflicting_keys].map((resolved_path) => {
          const { path, namespace } = splitNamespacedPath(resolved_path);
          return {
            text: `conflicting key: "${resolved_path.toLowerCase()}"`,
            location: { file: path, namespace }
          };
        })
      });
    }
    return { result: registry_lowercase, warnings };
  };
  var ReducedMetafile = class {
    metafile;
    constructor(metafile) {
      this.metafile = metafile;
    }
    getFile(output_path_key) {
      return this.metafile.getFile(output_path_key);
    }
    findFilesFromSources(predicate_fn) {
      return this.metafile.findFilesFromSources(predicate_fn);
    }
  };

  // src/esbuild/typedefs.ts
  var allEsbuildLoaders = [
    "base64",
    "binary",
    "copy",
    "css",
    "dataurl",
    "default",
    "empty",
    "file",
    "js",
    "json",
    "jsx",
    "local-css",
    "text",
    "ts",
    "tsx"
  ];
  var defaultExtensionToLoaderMap = {
    "": void 0,
    ".js": "js",
    ".mjs": "js",
    ".cjs": "js",
    ".jsx": "jsx",
    ".ts": "ts",
    ".cts": "ts",
    ".mts": "js",
    ".tsx": "tsx",
    ".css": "css",
    ".module.css": "local-css",
    ".json": "json",
    ".txt": "text"
  };

  // src/super/typedefs.ts
  var INNER_PLUGIN_BUILD = Symbol();

  // src/plugins/emissions_driver.ts
  var emissionsDriverPluginSetup = (config) => {
    const buildCtx = config.ctx;
    return (build) => {
      const base_plugin_build = INNER_PLUGIN_BUILD in build ? build[INNER_PLUGIN_BUILD] : build, onEmitHandlers = buildCtx.onEmitHandlers, onEndHandlers = buildCtx.onEndHandlers;
      const performOnEmit = async (metafile) => {
        const ctx = {
          buildCtx,
          metafile,
          warnings: metafile.warnings,
          errors: []
        };
        const longbuild_file = findLongBuildFile(ctx);
        if (isNull(longbuild_file)) {
          return { warnings: ctx.warnings, errors: ctx.errors };
        }
        await incorporateLongBuildImportedEntities(ctx, longbuild_file);
        metafile.scanImporters();
        const files_dependency_graph = metafile.createFileDependencyGraph(), dependency_graph = DependencyGraphNode.fromGraph(files_dependency_graph), source_resource_nodes = DependencyGraphNode.chainNodePromises(dependency_graph), all_node_promises = Promise.all([...dependency_graph.values()].map((node) => node.promise)), on_emit_callback = async (node, dependency_results) => {
          const entity = node.key, on_emit_result = await entity.performOnEmit(onEmitHandlers);
          if ((on_emit_result?.errors?.length ?? 0) > 0) {
            node.reject(on_emit_result.errors);
          }
          return on_emit_result;
        };
        dependency_graph.forEach((node) => {
          node.setCallback(on_emit_callback);
        });
        source_resource_nodes.forEach((node) => {
          node.fire();
        });
        await all_node_promises.then((all_on_emit_results) => {
          for (const on_emit_result of all_on_emit_results) {
            if (on_emit_result?.warnings) {
              ctx.warnings.push(...on_emit_result.warnings);
            }
            if (on_emit_result?.errors) {
              ctx.errors.push(...on_emit_result.errors);
            }
          }
        }).catch((errors) => {
          if (isArray(errors)) {
            ctx.errors.push(...errors);
          } else {
            ctx.errors.push(errors);
          }
        });
        return { warnings: ctx.warnings, errors: ctx.errors };
      };
      const performOnEnd = async (result) => {
        const on_end_promises = onEndHandlers.map(async (handler) => {
          const { pluginName, callback } = handler, on_end_result = await callback(result);
          on_end_result?.warnings?.forEach((warning) => {
            if (!warning.pluginName) {
              warning.pluginName = pluginName;
            }
          });
          on_end_result?.errors?.forEach((error) => {
            if (!error.pluginName) {
              error.pluginName = pluginName;
            }
          });
          return on_end_result;
        });
        const warnings = [], errors = [];
        for (const value of await promise_all(on_end_promises)) {
          if (value?.warnings) {
            warnings.push(...value.warnings);
          }
          if (value?.errors) {
            errors.push(...value.errors);
          }
        }
        return { warnings, errors };
      };
      base_plugin_build.onEnd(async (result) => {
        const metafile = buildCtx.createMetafile(result), on_emit_results = await performOnEmit(metafile), on_end_results = await performOnEnd(result), warnings = concatArrays(on_emit_results?.warnings, on_end_results?.warnings), errors = concatArrays(on_emit_results?.errors, on_end_results?.errors);
        await buildCtx.endBuild(metafile);
        return { warnings, errors };
      });
    };
  };
  var emissionsDriverPlugin = (config) => {
    return {
      name: "oazmi-superbuild-emissions_driver-plugin",
      setup: emissionsDriverPluginSetup(config)
    };
  };
  var findLongBuildFile = (ctx) => {
    const { buildCtx, metafile, errors } = ctx;
    const longbuild_plugin_namespace = buildCtx.longBuildController.pluginNamespace, longbuild_files = metafile.findFilesFromSources((input_sources) => {
      const does_include_longbuild_source_file = input_sources.some(({ path: _source_resolved_path, namespace }) => {
        return namespace === longbuild_plugin_namespace;
      });
      return does_include_longbuild_source_file;
    });
    if (longbuild_files.length !== 1) {
      errors.push({ text: `[findLongBuildFile]: expected there to be only a single long-build file after bundling, instead found: ${longbuild_files.length} files.` });
      return;
    }
    const longbuild_file = longbuild_files[0];
    return longbuild_file;
  };
  var incorporateLongBuildImportedEntities = async (ctx, longbuild_file) => {
    const {
      buildCtx,
      metafile,
      warnings
    } = ctx;
    const longbuild_path = longbuild_file.initialPath ?? longbuild_file.outputPath, longbuild_contents = textDecoder2.decode(longbuild_file.contents), import_entities = await buildCtx.longBuildController.parseLongBuildFileContent(longbuild_contents);
    for (let [importer_resolved_path, entities_to_import] of import_entities) {
      importer_resolved_path = importer_resolved_path.toLowerCase();
      const entities_using_importer_as_input_source = metafile.findFilesFromSources((input_sources) => {
        const entity_uses_importer_as_source = input_sources.some(({ path, namespace }) => {
          return (namespace + ":" + path).toLowerCase() === importer_resolved_path;
        });
        return entity_uses_importer_as_source;
      });
      if (array_isEmpty(entities_using_importer_as_input_source)) {
        warnings.push({ text: `[incorporateLongBuildImportedEntities]: failed to find an output file that uses the following source as its input: "${importer_resolved_path}".` });
        continue;
      }
      if (entities_using_importer_as_input_source.length > 1) {
        warnings.push({ text: `[incorporateLongBuildImportedEntities]: we usually expect only a single output file to be made out of the given input source: "${importer_resolved_path}".` });
      }
      const imported_entity_nodes = entities_to_import.map((import_entity) => {
        const { key, path, with: with_attr = {}, external = false } = import_entity, kind = "user-import", entity = external ? { externalPath: path } : metafile.getFile(buildCtx.resolvePath(longbuild_path, path));
        return { key, kind, with: with_attr, external, entity };
      });
      for (const file_entity of entities_using_importer_as_input_source) {
        const initial_output_path = file_entity.initialPath ?? file_entity.outputPath, number_of_sources = file_entity.inputs.length;
        if (number_of_sources > 1) {
          const input_sources = file_entity.inputs.map((input_source) => input_source.namespace + ":" + input_source.path);
          warnings.push({
            text: `[incorporateLongBuildImportedEntities]: expected the output file "${initial_output_path}" to be composed of just a single file, but instead found it to be comprised of ${number_of_sources} source: [${input_sources.join(",\n")}]`
          });
        }
        file_entity.imports.push(...imported_entity_nodes.map((node) => {
          return { ...node };
        }));
      }
    }
  };
  var DependencyGraphNode = class {
    key;
    dependencies;
    promise;
    resolve;
    reject;
    callback;
    constructor(key, dependencies) {
      this.key = key;
      this.dependencies = new Set(dependencies);
      const [promise, resolve, reject] = promiseOutside();
      this.promise = promise;
      this.resolve = resolve;
      this.reject = reject;
    }
    /** set the callback function to run once the {@link promise | promises} of _this_ node's {@link dependencies} get resolved.
     * once your callback has been executed and waited for, the {@link promise} of _this_ node will also get resolved.
    */
    setCallback(callback) {
      this.callback = callback;
    }
    /** manually fire the {@link callback} function of this node, and have its {@Link promise} get resolved.
     * this is only intended to be used for source nodes (which carry no dependencies), although it is not enforced.
    */
    async fire() {
      if (this.callback) {
        this.callback(this, []).then(this.resolve, this.reject);
      } else {
        this.reject([{ text: `[DependencyGraphNode.fire]: no callback was set for node id: "${this.key}".` }]);
      }
      return this.promise;
    }
    /** create a dependency graph from an existing graph `Map`. */
    static fromGraph(dependency_graph) {
      const graph = [...dependency_graph].map(([key, dependencies]) => {
        const node = new this(key, dependencies);
        return [key, node];
      });
      return new Map(graph);
    }
    /** chains the promises of a dependency graph, so that each node's {@link callback} is fired after all of it dependencies have been fired,
     * while maintaining asynchronocity among all branches.
     * the returned value contains an array of all nodes that are source nodes (carry no dependency).
    */
    static chainNodePromises(dependency_graph) {
      const source_nodes = [];
      for (const [id, node] of dependency_graph) {
        if (node.dependencies.size <= 0) {
          source_nodes.push(node);
          continue;
        }
        const dependency_promises = [...node.dependencies].map((dep_id) => {
          const dep_node = dependency_graph.get(dep_id);
          return dep_node.promise;
        });
        Promise.all(dependency_promises).then((dependency_results) => {
          const callback = node.callback;
          if (!callback) {
            node.reject([{
              text: `[DependencyGraphNode::chainNodePromises]: no callback was set for node id: "${node.key}".`
            }]);
          } else {
            node.resolve(callback(node, dependency_results));
          }
        }).catch((reason) => node.reject(reason));
      }
      return source_nodes;
    }
  };

  // src/plugins/long_build.ts
  var import_statement_regex = new RegExp("await\\s+import\\s*\\(\\s*(?<quote>[\"'`])(?<importPath>.*?)\\k<quote>\\s*\\)", "g");
  var LongBuildController = class {
    /** the unique base filename that will be used by the {@link longBuildPluginSetup} plugin to insert its "long build" js file as an entry-point.
     * the full filename format it will use will be: `${recursion_number}.(${uuid}).js`.
    */
    uuid;
    /** the unique filename(s) that will be used for the "long build" js files.
     * it is a computed value that evaluates to `.(${uuid}).js`,
     * and the actual filename that gets inserted/injected will also have a leading number, signifying the "build/recursion number".
     *
     * for instance, the entry-point long build js file will be named: `0.(${uuid}).js`,
     * while the next recursive "long build" import within the `0.(${uuid}).js` file will be named `1.(${uuid}).js`,
     * and so on (until a "long build" js file with zero external imports/includes is discovered, at which point we shall halt).
    */
    baseFilename;
    /** the name of the "long build dependency" file, as defined in {@link LONGBUILD.DEPS_FILE}.
     *
     * its value evaluates to `deps.(${uuid}).js`, and it is imported by each "long build step" js file as a dependency,
     * in order to have a shared resource variable where all imports will get registered.
    */
    depsFilename;
    /** the namespace used by the {@link longBuildPlugin}.
     * it is a computed value that evaluates to `oazmi-superbuild-long_build-plugin-${uuid}`.
    */
    pluginNamespace;
    /** the current build/recursion number. it starts with zero, and it is used for indicating the filename of the current "long build" file. */
    buildNumber;
    /** the number of files in the esbuild build process that are currently in circulation.
     *
     * - everytime a new file hits the "long build" plugin's `onResolve` hook, this value gets incremented by one,
     *   since a "new file is currently in circulation".
     * - whenever a file gets successfully loaded via some plugin's `onLoad` hook,
     *   the {@link SuperPluginBuild.onLoad} overload decrements this shared-state counter,
     *   since a "file that was in circulation has exited".
     * - a caveat to look out for is the fact that if any plugin calls {@link SuperPluginBuild.resolve},
     *   this counter will get incremented again (double count),
     *   since the resolve request will go through our "long build" plugin's `onResolve` hook once again.
     *   to combat this double count, the {@link SuperPluginBuild.resolve} function decrements this counter whenever it gets called.
    */
    remainingFilesCounter;
    /** esbuild caches the loaded result of an `onLoad` hook, based on the result of the `onResolve` hook's `result.path` and `result.namespace`
     * (I don't know if esbuild also caches with respect to the `with` import attribute).
     * but we don't want to count any cached paths towards {@link remainingFilesCounter}, since they won't be loaded again;
     * which is why we need this hash-set to keep track of what has already been seen once.
    */
    encounteredPaths = /* @__PURE__ */ new Set();
    steps = [];
    /** a logging function for internal debugging. it gets called only when {@link DEBUG.LOG} is enabled. */
    log;
    /** {@inheritDoc LongBuildControllerConfig.format} */
    format;
    constructor(config) {
      const uuid = generateUuid(2);
      this.log = config?.debuggingLogs ?? noopLogger;
      this.format = config?.format ?? "esm";
      this.uuid = uuid;
      this.baseFilename = `.(${uuid}).js`;
      this.depsFilename = `deps.(${uuid}).js`;
      this.pluginNamespace = `oazmi-superbuild-long_build-plugin-${uuid}`;
      this.remainingFilesCounter = 0;
      this.buildNumber = -1;
      this.incrementBuild();
    }
    incrementBuild() {
      const warnings = [];
      if (this.remainingFilesCounter !== 0) {
        warnings.push({
          text: `[LongBuildController.incrementBuild]: the number of remaining files (${this.remainingFilesCounter}) in circulation during th current long-build (${this.buildNumber}) did not reach zero before the build was incremented!`
        });
      }
      this.steps.push(new LongBuildStep(this, ++this.buildNumber));
      return warnings;
    }
    incrementFilesCounter(pathname) {
      this.steps[this.buildNumber].cancelResolve();
      ++this.remainingFilesCounter;
      if (1 /* LOG */) {
        this.log(`[LongBuildController]: increment for: "${pathname}". remaining files: ${this.remainingFilesCounter}.`);
      }
    }
    decrementFilesCounter(pathname) {
      this.steps[this.buildNumber].cancelResolve();
      if (--this.remainingFilesCounter <= 0) {
        this.steps[this.buildNumber].signalresolve();
      }
      if (1 /* LOG */) {
        this.log(`[LongBuildController]: decrement for: "${pathname}". remaining files: ${this.remainingFilesCounter}.`);
      }
    }
    cacheResolvedResult(args) {
      if (args.external) {
        this.decrementFilesCounter(args.path);
        return;
      }
      const path = pathToPosixPath(args.path), namespace = args.namespace ?? "file", key = namespace + ":" + path;
      if (this.encounteredPaths.has(key)) {
        if (1 /* LOG */) {
          this.log(`[LongBuildController]: already encountered: "${key}"`);
        }
        this.decrementFilesCounter(args.path);
      } else {
        if (1 /* LOG */) {
          this.log(`[LongBuildController]: never encountered  : "${key}"`);
        }
        this.encounteredPaths.add(key);
      }
    }
    /** this function does the inverse of {@link prepareLongBuildFileContent};
     * it parses the js-transpiled contents of the "long build" file and extracts/reconstructs the resource import `Map` from it.
     *
     * since I plan on using a dynamic script `import()` to execute the contents of a modified version of the "long build" file content,
     * this method has to be made asynchronous.
     * I'm certainly not going to be using `eval` or the `Function` constructor, because they are often restricted in some js-environments.
    */
    async parseLongBuildFileContent(longbuild_file_contents) {
      if (this.format !== "esm") {
        longbuild_file_contents = `
const fakeGlobalThis = { };
fakeGlobalThis.${"iifeModules" /* IIFE_MODULES_VAR_NAME */} = [];
// running the script in a separate scope to prevent cjs top-level var-declaration conflict its name with the exported "RESOURCE_VAR_NAME".
(() => {
	${longbuild_file_contents}
})();

await Promise.all(fakeGlobalThis.${"iifeModules" /* IIFE_MODULES_VAR_NAME */})
export const ${"resourceImports" /* RESOURCE_VAR_NAME */} = fakeGlobalThis.${"resourceImports" /* RESOURCE_VAR_NAME */}`;
      }
      const js_content_without_imports = longbuild_file_contents.replaceAll(import_statement_regex, "String.raw`$<importPath>`"), js_blob = new Blob([js_content_without_imports], { type: "text/javascript" }), js_blob_url = URL.createObjectURL(js_blob), { ["resourceImports" /* RESOURCE_VAR_NAME */]: resourceImports } = await import(js_blob_url);
      if (!(resourceImports instanceof Map)) {
        const error_message = `[LongBuildController.parseLongBuildFileContent]: expected the parsed "resourceImports" to be a "Map". but found it to be: "${resourceImports}".`;
        this.log(error_message);
        throw new Error(error_message);
      }
      return resourceImports;
    }
  };
  var LongBuildStep = class {
    /** the build number of this build step, starting with zero. */
    buildNumber;
    /** the unique filename of this "long build step" js file.
     * it is a computed value that evaluates to `${buildNumber}.(${uuid}).js`.
    */
    filename;
    promise;
    signalresolve;
    cancelResolve;
    resourceImports = /* @__PURE__ */ new Map();
    controller;
    constructor(parent_controller, build_number) {
      this.controller = parent_controller;
      this.buildNumber = build_number;
      this.filename = `${build_number}${parent_controller.baseFilename}`;
      const [promise, resolve, reject] = promiseOutside();
      [this.signalresolve, this.cancelResolve] = cancelableDelayedPromiseResolver(resolve, 500 /* ONLOAD_MIN_DELAY */, parent_controller.log);
      this.promise = promise;
    }
    /** register imports performed by some resource `importer_key`.
     * the `importer_key` should be formatted as `${namespace}:${resolved_path}` of the resource performing the `imports`.
    */
    pushImports(importer_key, imports) {
      this.resourceImports.set(importer_key, imports);
    }
    /** prepares the file contents of the "long build" of this "long build step".
     *
     * you would use this once you have deduced that all files that were in circulation during this build step have exited,
     * and therefore your long build plugin must also halt by loading the contents prepared here by this method.
     *
     * > [!caution]
     * > the file's contents are in typescript rather than javascript.
     * > so make sure to use the `"ts"` esbuild loader for it.
    */
    prepareLongBuildFileContent() {
      const all_imports_this_build = [...this.resourceImports];
      let all_imports_js_str = all_imports_this_build.map(([importer_key, imports_arr]) => {
        const imports_str_arr = imports_arr.map((import_entity) => {
          const { key, path, with: with_attr = {}, external = false } = import_entity, key_str = json_stringify(key), path_str = json_stringify(path), with_str = json_stringify(with_attr), external_str = json_stringify(external), import_statement = external ? path_str : `await import(${path_str})`;
          return `{ key: ${key_str}, path: ${import_statement}, with: ${with_str}, external: ${external_str} }`;
        });
        const imports_str = imports_str_arr.join(",\n	");
        const importer_key_str = json_stringify(importer_key);
        return `resourceImports.set(${importer_key_str}, [
	${imports_str}
])`;
      }).join("\n");
      const format = this.controller.format, deps_filename = this.controller.depsFilename, next_filename = `${this.buildNumber + 1}${this.controller.baseFilename}`, deps_import_statement = `import { ${"resourceImports" /* RESOURCE_VAR_NAME */}, console_log } from "${deps_filename}"`, recursion_import_statement = !array_isEmpty(all_imports_this_build) ? `import "${next_filename}" // recursion to the next long-build.` : "// no imports were pushed this build-number. hence, this is the final long-build file.";
      const export_statement = this.buildNumber !== 0 ? "" : format === "esm" ? `export { ${"resourceImports" /* RESOURCE_VAR_NAME */} }` : `fakeGlobalThis.${"resourceImports" /* RESOURCE_VAR_NAME */} = ${"resourceImports" /* RESOURCE_VAR_NAME */}`;
      if (format !== "esm") {
        all_imports_js_str = `
fakeGlobalThis.${"iifeModules" /* IIFE_MODULES_VAR_NAME */}.push((async () => {
${all_imports_js_str}
})())`;
      }
      return `
${deps_import_statement}
${recursion_import_statement}

console_log("long build: ${this.buildNumber}")
${all_imports_js_str}
${export_statement}
		`.trim();
    }
  };
  var longBuildPluginSetup = (config) => {
    const controller = config.controller, longbuild_base_filename = controller.baseFilename, longbuild_deps_filename = controller.depsFilename, plugin_namespace = controller.pluginNamespace;
    return (build) => {
      const sbuild = build, filter = RegExp(escapeLiteralStringForRegex(longbuild_base_filename) + "$"), deps_file_filter = RegExp(escapeLiteralStringForRegex(longbuild_deps_filename) + "$");
      build.onResolve({ filter: /.*/ }, (args) => {
        controller.incrementFilesCounter(args.path);
        if (!args.path.endsWith(longbuild_base_filename)) {
          return void 0;
        }
        const filename = parseFilepathInfo(args.path).filename;
        return { path: filename, namespace: plugin_namespace };
      });
      build.onLoad({ filter: deps_file_filter, namespace: plugin_namespace }, (args) => {
        return { contents: `
export interface ImportEntity<K = any> {
	key: K
	path: string
	with: Record<string, string>
	external: boolean
}

export const resourceImports: Map<
	string,        // the importer's key.
	ImportEntity[] // all of the entities imported by the importer.
> = new Map()

// esbuild likes to add a "@__PURE__" annotation to the variable above.
// hence, to ensure that it never gets stripped away (because we want to dynamically import it later),
// we perform an action that has a potential for side-effect, preventing esbuild from ever dropping this variable in the bundle.
resourceImports.size

export const console_log = (...args: any[]) => {
	// console.log(...args) // for debugging purposes.
}
` /* DEPS_FILE */, loader: "ts" };
      });
      build.onLoad({ filter, namespace: plugin_namespace }, async (args) => {
        controller.decrementFilesCounter(args.path);
        const filename = args.path, build_number = Number(filename.slice(0, -longbuild_base_filename.length)), build_step = controller.steps[build_number];
        await build_step.promise;
        const contents = build_step.prepareLongBuildFileContent(), warnings = controller.incrementBuild();
        ++controller.remainingFilesCounter;
        return { contents, loader: "ts", resolveDir: "./", warnings };
      });
      sbuild.onEmit({
        filter: /.*/,
        inputs: [{ filter: /.*/, namespace: plugin_namespace }]
      }, (args) => {
        return { write: false };
      });
    };
  };
  var longBuildPlugin = (config) => {
    return {
      name: "oazmi-superbuild-long_build-plugin",
      setup: longBuildPluginSetup(config)
    };
  };

  // src/esbuild/native.ts
  var loaderFromFileExtension = (ext_to_loader_map, with_attr_type_map, file_path, with_attr) => {
    const with_attr_type = with_attr?.type;
    if (isString(with_attr_type) && with_attr_type in with_attr_type_map) {
      const suggested_loader_without_with_attr = loaderFromFileExtension(ext_to_loader_map, with_attr_type_map, file_path);
      return suggested_loader_without_with_attr === "copy" ? suggested_loader_without_with_attr : with_attr_type_map[with_attr_type];
    }
    const filename = parseFilepathInfo(urlToString(file_path)).filename;
    let slice_idx = 0;
    while (true) {
      slice_idx = filename.indexOf(".", slice_idx);
      const remaining_ext = slice_idx >= 0 ? filename.slice(slice_idx) : "";
      if (remaining_ext in ext_to_loader_map) {
        return ext_to_loader_map[remaining_ext];
      }
      if (slice_idx < 0) {
        break;
      }
      slice_idx++;
    }
    throw new Error(1 /* ERROR */ ? `[loaderFromFileExtension]: expected at least one file-extension to match with the path: "${file_path}".` : "");
  };
  var guessExtensionLoader_Factory = (user_ext_to_loader_map) => {
    const ext_to_loader_map = { ...defaultExtensionToLoaderMap, ...user_ext_to_loader_map }, with_attr_type_map = {
      "json": "json",
      "bytes": "binary",
      "text": "text"
    };
    return (file_path, with_attr) => {
      return loaderFromFileExtension(ext_to_loader_map, with_attr_type_map, file_path, with_attr);
    };
  };

  // src/plugins/native_replica.ts
  var nativeReplicaPluginSetup = (config) => {
    return async (build) => {
      const sbuild = build, user_ext_to_loader_map = build.initialOptions.loader ?? {}, superbuild_user_ext_to_loader_map = config.genericLoader, guess_extension_loader = guessExtensionLoader_Factory({ ...user_ext_to_loader_map, ...superbuild_user_ext_to_loader_map }), base_esbuild = INNER_PLUGIN_BUILD in build ? build[INNER_PLUGIN_BUILD].esbuild : build.esbuild, native_resolver = new EsbuildNativeResolver(base_esbuild, build.initialOptions);
      build.onEnd(() => native_resolver.stop());
      build.onResolve({ filter: /.*/ }, (args) => {
        const { path, ...rest_args } = args;
        return native_resolver.resolve(args.path, rest_args);
      });
      sbuild.onLoad({ filter: /.*/, namespace: "file" }, async (args) => {
        const path_url = resolveAsUrl(args.path), with_attr = args.with, loader = guess_extension_loader(path_url, with_attr), resolveDir = fileUrlToLocalPath(new URL("./", path_url)), path = fileUrlToLocalPath(path_url);
        const response = await fetch(path_url, { method: "GET" });
        if (!response.ok) {
          const message = `ERROR: network fetch response for url "${path_url.href}" was not ok (${response.status}). response header:
${json_stringify(response.headers)}`;
          return { errors: [{ text: message }] };
        }
        const contents = await response.bytes();
        return { contents, loader, resolveDir, watchFiles: [path] };
      });
    };
  };
  var nativeReplicaPlugin = (config) => {
    return {
      name: "oazmi-superbuild-native_loader-plugin",
      setup: nativeReplicaPluginSetup(config)
    };
  };
  var EsbuildNativeResolver = class {
    entryPoint = "<the-unloadable-void>";
    namespace = "the-void";
    startBuildPromise;
    startBuildResolve;
    stopBuildPromise;
    stopBuildResolve;
    #internal_resolve;
    #build_result;
    constructor(base_esbuild, build_options) {
      [this.startBuildPromise, this.startBuildResolve] = promiseOutside();
      [this.stopBuildPromise, this.stopBuildResolve] = promiseOutside();
      build_options = this.initOptions(build_options);
      build_options.plugins = [this.initPlugin()];
      this.#build_result = base_esbuild.build(build_options);
    }
    async resolve(path, options) {
      await this.startBuildPromise;
      return this.#internal_resolve(path, options);
    }
    async stop() {
      this.stopBuildResolve();
      await this.#build_result;
    }
    initOptions(build_options = {}) {
      const {
        absWorkingDir,
        alias,
        conditions,
        external,
        mainFields,
        nodePaths,
        packages,
        platform,
        resolveExtensions,
        tsconfig,
        tsconfigRaw
      } = build_options;
      const entrypoint = this.entryPoint;
      return {
        absWorkingDir,
        alias,
        conditions,
        external,
        mainFields,
        nodePaths,
        packages,
        platform,
        resolveExtensions,
        tsconfig,
        tsconfigRaw,
        bundle: true,
        minify: false,
        write: false,
        format: "esm",
        outdir: "./temp/",
        entryPoints: [entrypoint]
      };
    }
    initPlugin() {
      const self = this;
      const setup_fn = (build) => {
        const entrypoint = self.entryPoint, filter = RegExp(escapeLiteralStringForRegex(entrypoint) + "$"), namespace = self.namespace;
        build.onResolve({ filter }, async (args) => {
          return { path: entrypoint, namespace };
        });
        build.onLoad({ filter, namespace }, async (args) => {
          self.startBuildResolve();
          self.#internal_resolve = (path, args2) => {
            return build.resolve(path, { kind: "entry-point", resolveDir: "./", ...args2 });
          };
          await self.stopBuildPromise;
          return { contents: "", loader: "empty" };
        });
      };
      return {
        name: "native-esbuild-resolver-capture",
        setup: setup_fn
      };
    }
  };

  // src/plugins/imports_rerouter.ts
  var normalize_abs_path = (abs_path) => {
    return pathToPosixPath(abs_path).toLowerCase();
  };
  var create_import_path_key = (imported_entity) => {
    const abs_import_path = imported_entity.initialPath ?? imported_entity.outputPath, path_key = normalize_abs_path(abs_import_path);
    return path_key;
  };
  var importsRerouterPluginSetup = (config) => {
    const { initialPath, outputPath, imports } = config, imports_map = new Map(imports.map((imported_entity) => {
      return [create_import_path_key(imported_entity), imported_entity];
    }));
    return async (build) => {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point") {
          return;
        }
        const { path } = args, is_relative = isRelativePath(path), abs_path = is_relative ? joinPaths(initialPath, path) : path, path_key = normalize_abs_path(abs_path), imported_entity = imports_map.get(path_key);
        if (isNull(imported_entity)) {
          const warning_text = `[importsRerouterPlugin]: expected the following import entity to be part of the provided list of imports: "${path_key}".`;
          const updated_import_path = is_relative && !isNull(outputPath) ? relativePath(outputPath, abs_path) : path;
          return { path: updated_import_path, external: true, warnings: [{ location: { file: initialPath }, text: warning_text }] };
        }
        const new_path = isNull(imported_entity.initialPath) ? abs_path : imported_entity.outputPath;
        if (imported_entity.external) {
          return { path: new_path, external: true };
        }
        const rel_path = relativePath(outputPath ?? initialPath, abs_path);
        return { path: rel_path, external: true };
      });
    };
  };
  var importsRerouterPlugin = (config) => {
    return {
      name: "oazmi-superbuild-imports_rerouter-plugin",
      setup: importsRerouterPluginSetup(config)
    };
  };

  // src/super/plugin_build.ts
  var ORIGINAL_PLUGINDATA = Symbol();
  var ORIGINAL_PLUGINDATA_DNE = Symbol();
  var wrap_resolve_call_options = (options = {}) => {
    const original_plugindata = "pluginData" in options ? options.pluginData : ORIGINAL_PLUGINDATA_DNE, wrapped_options = { ...options, pluginData: { [ORIGINAL_PLUGINDATA]: original_plugindata } };
    return wrapped_options;
  };
  var unwrap_resolve_call_options = (args) => {
    const original_plugindata = args.pluginData[ORIGINAL_PLUGINDATA], unwrapped_args = { ...args, pluginData: original_plugindata };
    if (original_plugindata === ORIGINAL_PLUGINDATA_DNE) {
      delete unwrapped_args["pluginData"];
    }
    return unwrapped_args;
  };
  var is_wrapped_resolve_call = (args) => {
    return isRecord(args.pluginData) ? ORIGINAL_PLUGINDATA in args.pluginData : false;
  };
  var SuperPluginBuild = class {
    ctx;
    basePluginBuild;
    pluginName;
    initialOptions;
    esbuild;
    /** a reference to the original {@link EsbuildPluginBuild} that was used to construct this class.
     *
     * its presence can be used to check whether or not your plugin is running inside a super-build.
     * gaining access to esbuild's original `PluginBuild` can be useful in certain situations where bypassing super-build is necessary,
     * such as in the case of the {@link nativeReplicaPlugin}, and the underlying {@link EsbuildNativeResolver} that it uses.
    */
    [INNER_PLUGIN_BUILD];
    constructor(ctx, base_plugin_build, plugin_name) {
      base_plugin_build = INNER_PLUGIN_BUILD in base_plugin_build ? base_plugin_build[INNER_PLUGIN_BUILD] : base_plugin_build;
      this.ctx = ctx;
      this.basePluginBuild = base_plugin_build;
      this.pluginName = plugin_name;
      this.initialOptions = base_plugin_build.initialOptions;
      this.esbuild = new SuperBuild(base_plugin_build.esbuild);
      this[INNER_PLUGIN_BUILD] = base_plugin_build;
    }
    /** type cast this {@link SuperPluginBuild} as an esbuild-compatible {@link EsbuildPluginBuild}.
     * there's no logic that gets executed. this function merely performs a type casting for the sake of esbuild-compatibility.
    */
    castToEsbuildPluginBuild() {
      return this;
    }
    resolve(path, options = {}) {
      return this.basePluginBuild.resolve(path, wrap_resolve_call_options(options));
    }
    onStart(callback) {
      return this.basePluginBuild.onStart(callback);
    }
    onEnd(callback) {
      this.ctx.onEndHandlers.push({ pluginName: this.pluginName, callback });
    }
    onResolve(options, callback) {
      const long_build_controller = this.ctx.longBuildController;
      const new_callback = async (args) => {
        const is_resolve_call = is_wrapped_resolve_call(args), result = await callback(is_resolve_call ? unwrap_resolve_call_options(args) : args), is_valid_result = !isNull(result?.path) || result?.external === true;
        if (is_valid_result) {
          if (is_resolve_call) {
            long_build_controller.decrementFilesCounter(result.path);
          } else {
            long_build_controller.cacheResolvedResult(result);
          }
        }
        return result;
      };
      return this.basePluginBuild.onResolve(options, new_callback);
    }
    onLoad(options, callback) {
      const resolvedResourceRegistry = this.ctx.resolvedResourceRegistry, onTransformHandlers = this.ctx.onTransformHandlers, long_build_controller = this.ctx.longBuildController;
      const transform_interceptor_callback = async (args) => {
        const { namespace, path, suffix, with: with_attrs } = args, onload_result = await callback(args);
        if (isNull(onload_result?.contents)) {
          return;
        }
        if (!array_isEmpty(onload_result.errors ?? [])) {
          return onload_result;
        }
        const { contents, loader = "", resolveDir = "", pluginData } = onload_result;
        for (const handler of onTransformHandlers) {
          const { pluginName: transformerPluginName, filter, namespace: handler_ns, loader: handler_loader } = handler;
          if (filter.test(path) && (handler_ns ? handler_ns === namespace : true) && (handler_loader ? handler_loader === loader : true)) {
            const { imports = [], emitData, ...transform_result } = await handler.callback({
              contents,
              loader,
              namespace,
              path,
              pluginData,
              resolveDir,
              suffix,
              with: with_attrs
            }) ?? {};
            if (isNull(transform_result.contents)) {
              continue;
            }
            transform_result.warnings = concatArrays(transform_result.warnings, onload_result.warnings);
            transform_result.watchDirs = concatArrays(transform_result.watchDirs, onload_result.watchDirs);
            transform_result.watchFiles = concatArrays(transform_result.watchDirs, onload_result.watchFiles);
            transform_result.pluginName ??= transformerPluginName;
            if (imports.length > 0) {
              const importer_path = namespace === "file" ? pathToPosixPath(path) : path, importer_key = namespace + ":" + importer_path;
              long_build_controller.steps.at(-1).pushImports(importer_key, imports);
            }
            return [
              transform_result,
              { loader, transformLoader: transform_result.loader ?? "", emitData }
            ];
          }
        }
        return [
          onload_result,
          { emitData: void 0, loader, transformLoader: loader }
        ];
      };
      const resource_registry_interceptor_callback = async (args) => {
        const [result, additional_info] = await transform_interceptor_callback(args) ?? [];
        if (!isNull(result)) {
          const { path: _path, namespace: _namespace, suffix, with: with_attrs } = args, { emitData, loader, transformLoader } = additional_info, path = pathToPosixPath(_path), namespace = _namespace ? _namespace : "file", key = namespace + ":" + path, contributing_emit_file = { path, namespace, suffix, loader, transformLoader, emitData };
          resolvedResourceRegistry.set(key, contributing_emit_file);
        }
        return result;
      };
      const long_build_interceptor_callback = async (args) => {
        const result = await resource_registry_interceptor_callback(args);
        if (!isNull(result)) {
          long_build_controller.decrementFilesCounter(args.path);
        }
        return result;
      };
      return this.basePluginBuild.onLoad(options, long_build_interceptor_callback);
    }
    onDispose(callback) {
      return this.basePluginBuild.onDispose(callback);
    }
    /** TODO: add documentation and usage examples. */
    onTransform(options, callback) {
      const { filter, namespace, loader } = options;
      this.ctx.onTransformHandlers.push({ pluginName: this.pluginName, filter, namespace, loader, callback });
    }
    /** TODO: add documentation and usage examples. */
    onEmit(options, callback) {
      const { filter, inputs, importedBy } = options;
      this.ctx.onEmitHandlers.push({ pluginName: this.pluginName, filter, inputs, importedBy, callback });
    }
    /** a path resolver function that joins `path_segments` wherever they're relative,
     * and resolves with respect to the current working directory (`cwd`) or the esbuild-provided `absWorkingDir`.
     *
     * unlike the {@link resolve} method, this method does not involve any `onResolve` handlers assigned to esbuild,
     * and it only uses basic relative path and absolute path resolution for the computation, and nothing more.
    */
    resolvePath(...path_segments) {
      return this.ctx.resolvePath(...path_segments);
    }
    /** re-route the statically analyzable relative imports of an emitted js or css file's contents.
     * this process is akin to either moving/renaming the base emitted file to a different directory,
     * and/or individually renaming the import paths of a select number of dependency files.
     *
     * @param on_emit_args the same `OnEmitArgs` that you receive in your {@link onEmit} hook's callback function.
     *   this will describe your emitted output file's contents and its original output path,
     *   in addition to all of the imports that it performs (and any imported entities that may need to have their paths updated).
     * @param loader specify the kind of content that's in your emitted file.
     *   only `js` and `css` files are currently supported,
     *   as only these two can have their import statements natively parse by esbuild
     *   (which is what we use for modifying the relative import paths).
     * @param updated_output_path the new path where your emitted output file is to be migrated to.
     *   you should ideally provide an absolute path here; but if you don't,
     *   it will be assumed that the path is relative to `on_emit_args.outputPath`.
     * @returns the new updated contents of the migrated file, any errors, and the migrated path
     *   (which is the same as the input {@link updated_output_path}, but resolved to become an absolute path),
     * 	 using the same interface of an {@link onEmit} hook's callback function's return value.
     *
     * > [!note]
     * > remember, the returned value is merely the transformed input content.
     * > it does **not** implicitly apply the new contents onto the underlying virtual output file.
     * > for that, you will have to use the returned value of this method as the returned value for your resource's
     * > {@link onEmit} hook's callback function.
    */
    async rerouteImports(on_emit_args, loader, updated_output_path) {
      const { outputPath: initialPath, contents, imports = [] } = on_emit_args, output_dir = pathToPosixPath(parseFilepathInfo(initialPath).dirpath), outputPath = isNull(updated_output_path) ? void 0 : isRelativePath(updated_output_path) ? joinPaths(initialPath, updated_output_path) : updated_output_path, plugin_config = { initialPath, outputPath, imports };
      const build_result = await this.basePluginBuild.esbuild.build({
        stdin: {
          contents,
          loader,
          resolveDir: output_dir,
          sourcefile: initialPath
        },
        format: "esm",
        write: false,
        bundle: true,
        minify: false,
        treeShaking: false,
        plugins: [importsRerouterPlugin(plugin_config)]
      });
      const warnings = [...build_result.warnings], errors = [...build_result.errors], output_files = build_result.outputFiles, migrated_contents = output_files.at(0)?.contents ?? new Uint8Array();
      if (output_files.length !== 1) {
        errors.push({
          text: `[SuperBuildPlugin.renameEmittedOutput]: expected only a single file to be emitted when renaming to "${outputPath ?? initialPath}".`,
          location: { file: initialPath }
        });
      }
      return {
        path: outputPath ?? initialPath,
        contents: migrated_contents,
        warnings,
        errors
      };
    }
  };

  // src/super/plugin.ts
  var SuperPlugin = class {
    // unfortunately, esbuild disallows any enumerable custom property to be set on the plugin `Object`.
    // hence, we declare all custom properties as private, so that esbuild does not discover them.
    // in the future, I may consider turning it into non-enumerable properties rather than private ones, if class extensions are desired.
    #basePlugin;
    #ctx;
    name;
    setup;
    constructor(ctx, base_plugin) {
      this.#basePlugin = base_plugin;
      this.#ctx = ctx;
      this.name = base_plugin.name;
      const self = this;
      this.setup = (build) => {
        return self.#basePlugin.setup(
          new SuperPluginBuild(self.#ctx, build, self.name).castToEsbuildPluginBuild()
        );
      };
    }
  };

  // src/super/build_context.ts
  var SuperBuildContext = class {
    /** a backup of the options assigned to this build-context. */
    esbuildOptions;
    /** contains a list of transformation handlers that will be used for matching contents returned by the plugins' `onLoad` hooks,
     * in order to transfer them to the registered {@link SuperPluginBuild.onTransform} hooks.
    */
    onTransformHandlers = [];
    /** contains a list of `onEmit` handlers that will be called once the file contents of the bundle has been finalized by esbuild,
     * but additional actions (such as linking, and re-incorporating imports for generic loaders) still need to be taken care of by the user's plugins.
     * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEmit}.
    */
    onEmitHandlers = [];
    /** contains a list of `onEnd` handlers that will be called at the end of the build,
     * after we have modified the contents of the resulting in-memory files.
     * the callbacks accumulated here are registered by {@link SuperPluginBuild.onEnd}.
    */
    onEndHandlers = [];
    /** holds all loaded resources, using `${namespace}:${resolved_path}` for the key.
     * this registry is needed in order to trace back the loaded input file(s) from which an emitted file originates from,
     * in order to make the functionality of {@link SuperPluginBuild.onEmit} possible.
    */
    resolvedResourceRegistry = /* @__PURE__ */ new Map();
    /** the controller used for commanding the state of the "long build" plugin. */
    longBuildController;
    /** contains all of the generic loaders specified in the initial build options.
     * they don't get passed over to esbuild directly because it gets really mad about it.
    */
    genericLoader;
    /** indicates the original `write` option specified by the user when instantiating the build. */
    shouldWrite = true;
    /** indicates if the original `allowOverwrite` option was enabled when the build was started. */
    shouldOverwrite = false;
    /** a logging function for internal debugging. it gets called only when {@link DEBUG.LOG} is enabled. */
    log;
    /** a path resolver function that joins `path_segments` wherever they're relative.
     * this is intended to be used exclusively by the {@link resolvePath} method, and not by other external things.
    */
    resolve_path;
    constructor(options) {
      options = this.initFields(options);
      const format = options.format;
      this.longBuildController = new LongBuildController({
        debuggingLogs: this.log,
        format: format ? format : "iife"
        // assigning esbuild's default `format` when this option is not provided.
      });
      this.esbuildOptions = this.processOptions(options);
    }
    getBuildOptions() {
      return this.esbuildOptions;
    }
    initFields(options) {
      const {
        debuggingLogs = false,
        loader = {},
        write = true,
        allowOverwrite = false,
        ...esbuild_options
      } = options;
      this.log = debuggingLogs === false ? noopLogger : debuggingLogs === true ? logLogger : debuggingLogs;
      this.shouldWrite = write;
      this.shouldOverwrite = allowOverwrite;
      this.genericLoader = object_fromEntries(object_entries(loader).filter(([ext, loader_type]) => {
        return !allEsbuildLoaders.includes(loader_type);
      }));
      const abs_working_dir = pathToPosixPath(options.absWorkingDir ?? "./"), runtime_cwd = ensureEndSlash(getRuntimeCwd(identifyCurrentRuntime())), cwd = fileUrlToLocalPath(resolveAsUrl(abs_working_dir, runtime_cwd)), resolve_path = resolvePathFactory(cwd);
      this.resolve_path = resolve_path;
      return { loader, ...esbuild_options };
    }
    processOptions(options) {
      const {
        debuggingLogs,
        loader = {},
        entryPoints: original_entry_points = [],
        plugins: pseudo_super_plugins = [],
        ...esbuild_options
      } = options;
      const esbuild_approved_loaders = object_fromEntries(
        object_entries(loader).filter(([ext, loader_type]) => {
          return allEsbuildLoaders.includes(loader_type);
        })
      );
      const plugins = this.processPlugins(pseudo_super_plugins);
      const entryPoints = this.processEntryPoints(original_entry_points);
      return {
        ...esbuild_options,
        entryPoints,
        plugins,
        // esbuild rejects execution if it finds any non-standard loader being user. hence is why we've split apart all generic loaders.
        loader: esbuild_approved_loaders,
        // we are forced to enable `metafile` and disable `write` because our emissions driver plugin depends on these crucial options.
        // once the build has concluded, the emissions driver plugin will call the `endBuild`
        // method to take care of emitting the files to the filesystem if `this.shouldWrite` is set to `true`.
        metafile: true,
        write: false
      };
    }
    /** this method wraps a {@link SuperPlugin} on top of each of the user's base plugin,
     * in addition to injecting two essential plugins at their correct position to make the new plugin apis work.
     *
     * the two internal plugins that get injected are:
     * - {@link nativeReplicaPlugin}: this plugin mimics esbuild's native resource path resolution and loading,
     *   and it gets injected at the last, since esbuild only performs its native actions when other plugins don't return a viable result.
     * - {@link longBuildPlugin}: this plugin gets injected at the beginning,
     *   and it book-keeps the number of resources/paths that have entered, the number of resources that have exited (i.e. loaded),
     *   and the number of resources that have been cached, in order to determine when esbuild has concluded processing all inputs,
     *   before esbuild exists out of the build and begins calling the `build.onEnd` callbacks.
     *   once this plugin has determined that all files in the current scope have been processed, it gathers all `imports` from the {@link OnTransformResult}s,
     *   and compiles/bundles them in a new recursive scope (hence the name "long-build").
    */
    processPlugins(pseudo_super_plugins) {
      pseudo_super_plugins.push(nativeReplicaPlugin({ genericLoader: this.genericLoader }));
      pseudo_super_plugins.unshift(emissionsDriverPlugin({ ctx: this }));
      const controller = this.longBuildController;
      pseudo_super_plugins.unshift(longBuildPlugin({ controller }));
      const super_plugins = pseudo_super_plugins.map((plugin) => new SuperPlugin(this, plugin));
      return super_plugins;
    }
    processEntryPoints(entry_points) {
      const long_build_filename = this.longBuildController.steps.at(-1).filename;
      if (isArray(entry_points)) {
        return [...entry_points, long_build_filename];
      } else {
        const output_filename = parseFilepathInfo(long_build_filename).basename;
        return { ...entry_points, long_build_filename: output_filename };
      }
    }
    /** creates the the metafile object from esbuild's {@link EsbuildBuildResult},
     * and registers all output files onto it for the {@link emissionsDriverPlugin} to initiate the next step (`onEmit` stage).
    */
    createMetafile(result) {
      const metafile = new Metafile(result.metafile, {
        resolvePath: this.resolve_path,
        resolvedResourceRegistry: this.resolvedResourceRegistry
      });
      for (const esbuild_file of result.outputFiles) {
        metafile.addFile(esbuild_file);
      }
      metafile.scanEsbuildImports();
      return metafile;
    }
    /** a path resolver function that joins `path_segments` wherever they're relative,
     * and resolves with respect to the current working directory (`cwd`) or the esbuild-provided `absWorkingDir`.
    */
    resolvePath(...path_segments) {
      return this.resolve_path(...path_segments);
    }
    /** concludes the build after the all registered {@link onEmitHandlers} and {@link onEndHandlers}
     * have been executed by the {@link emissionsDriverPlugin} when it enters its `onEnd` stage (registered to the "true" `build` object).
     *
     * you must pass the mutated {@link Metafile} that you receive from calling the {@link createMetafile}
     * method at the beginning of the {@link emissionsDriverPlugin}'s `onEnd` stage,
     * so that if there's anything that should get written onto your filesystem, it will take place before the build concludes.
    */
    async endBuild(metafile) {
      if (this.shouldWrite) {
        await metafile.writeFiles(this.shouldOverwrite);
      }
    }
  };

  // src/super/build.ts
  var SuperBuild = class {
    #esbuild;
    constructor(base_esbuild) {
      this.#esbuild = base_esbuild;
      const { build, buildSync, ...rest_props } = base_esbuild;
      object_assign(this, rest_props);
    }
    async build(options) {
      const new_ctx = new SuperBuildContext(options), esbuild_options = new_ctx.getBuildOptions();
      return this.#esbuild.build(esbuild_options);
    }
    buildSync(options) {
      const new_ctx = new SuperBuildContext(options), esbuild_options = new_ctx.getBuildOptions();
      return this.#esbuild.buildSync(esbuild_options);
    }
  };
})();
