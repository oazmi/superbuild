/** a utility functions submodule.
 *
 * @module
*/

import { bind_array_push, console_log, crc32, date_now, dom_clearTimeout, dom_setTimeout, ensureRelativeDotSlash, isAbsolutePath, isArray, isString, math_max, object_entries, object_fromEntries, pathToPosixPath } from "./deps.ts"
import type { EsbuildMetafile } from "./esbuild/strongtypes.ts"

export const concatArrays = <T>(arr1?: Array<T>, arr2?: Array<T>): Array<T> | undefined => {
	return (!arr1 && !arr2) ? undefined
		: !arr1 ? arr2
			: !arr2 ? arr1
				: [...arr1, ...arr2]
}

export const mergeMapArrays = <K, T>(map1: Map<K, Array<T>>, map2: Map<K, Array<T>>): Map<K, Array<T>> => {
	const result = new Map<K, Array<T>>(map1)
	for (const [key, arr] of map2) {
		const existing_arr = result.get(key)
		if (existing_arr === undefined) { result.set(key, arr) }
		else { result.set(key, existing_arr.concat(arr)) }
	}
	return result
}

/** this function wraps on top of a promise-resolver function, and returns two functions.
 * the first function, when called, will resolve the original `promise_resolver` _after_ the specified `delay` amount of milliseconds have passed.
 * during this delay time, you may use the second function that is returned to cancel the task of running the `promise_resolver` before it times out.
 * you also have the option to specify the `delay` for the next time the returned `resolve` function is called.
 * if it is not specified, then the `original_delay` will be used in its place.
*/
export const cancelableDelayedPromiseResolver = <T>(
	promise_resolver: (value: T) => void,
	original_delay: number,
): [resolve: (value: T) => void, cancel: (delay?: number) => void] => {
	let
		timer_id = -1,
		delay = original_delay
	const
		resolve = (value: T) => {
			dom_clearTimeout(timer_id) // clear out any previous timer.
			timer_id = dom_setTimeout(promise_resolver, delay, value)
		},
		cancel = (new_delay: number = original_delay) => {
			dom_clearTimeout(timer_id) // clear out any previous timer.
			delay = new_delay
		}
	return [resolve, cancel]
}

let uuid_counter = -1

/** generates `segments` number of 8-character (32-bit) uuid based on the current time stamp. */
export const generateUuid = (segments = 1, current_time?: number) => {
	current_time ??= date_now()
	uuid_counter++
	const crc32_segments = Array<number>(math_max(segments, 0)).fill(current_time).map((time, i) => {
		const
			seed = uuid_counter + time + i,
			seed_arr = new Uint8Array((new Uint32Array([seed])).buffer),
			uuid_segment = crc32(seed_arr)
		return uuid_segment.toString(16).padStart(8, "0")
	})
	return crc32_segments.join("-")
}

// regex for detecting if a path is an absolute windows path. copied from `@oazmi/kitchensink/pathman`.
const windows_absolute_path_regex = /^[a-z]\:[\/\\]/i

/** normalize an esbuild resolved file path so that it:
 * - uses posix `"/"` directory separators.
 * - always has a leading `"./"` for relative paths.
 * - is always in the `${namespace}:${path}` format, even when `namespace === "file".`
*/
const normalize_esbuild_filepath = (path: string): string => {
	const is_local_path = !path.includes(":") || windows_absolute_path_regex.test(path)
	return is_local_path
		? "file:" + normalize_local_filepath(path)
		: path
}

const normalize_local_filepath = (path: string): string => {
	const is_abs_path = isAbsolutePath(path)
	return pathToPosixPath(is_abs_path ? path : ensureRelativeDotSlash(path))
}

export const normalizeMetafile = (esbuild_metafile: EsbuildMetafile): EsbuildMetafile => {
	let { inputs, outputs } = structuredClone(esbuild_metafile) // we will be mutating directly, hence the need for a clone.

	inputs = object_fromEntries(object_entries(inputs).map(([resolved_path, props]) => {
		// resolved path name of this input file.
		resolved_path = normalize_esbuild_filepath(resolved_path)
		// direct dependencies of this input file as resolved paths.
		props.imports = props.imports.map((props) => {
			props.path = normalize_esbuild_filepath(props.path)
			return props
		})
		return [resolved_path, props]
	}))

	outputs = object_fromEntries(object_entries(outputs).map(([output_path, props]) => {
		// path name of the output file (including the path to the `outdir` relative to the `cwd` or `absWorkingDir`).
		output_path = normalize_local_filepath(output_path)
		// list of linked output files that are referenced by this resource (but not bundled into it).
		// even though the import paths are relative, they are relative to the `cwd` or `absWorkingDir`,
		// and not relative to the `pathname`.
		props.imports = props.imports.map((props) => {
			props.path = normalize_local_filepath(props.path)
			return props
		})
		// list of files (as resolved paths) that were bundled into this resource.
		props.inputs = object_fromEntries(object_entries(props.inputs).map(([resolved_path, props]) => {
			return [normalize_esbuild_filepath(resolved_path), props]
		}))
		// entrypoint's resolved path corresponding to this output resource.
		if (props.entryPoint) { props.entryPoint = normalize_esbuild_filepath(props.entryPoint) }
		return [output_path, props]
	}))

	return { inputs, outputs }
}

/** lower the casing of an esbuild metafile's namespaced resolved paths,
 * to ensure that there won't be any casing conflicts when searching for a particular resource.
 * however, the casing on the output file names (keyof {@link EsbuildMetafile.outputs} and
 * `EsbuildMetafile.outputs[string].imports[string].path`) won't be affected.
*/
export const lowercaseMetafile = (esbuild_metafile: EsbuildMetafile): EsbuildMetafile => {
	let { inputs, outputs } = structuredClone(esbuild_metafile) // we will be mutating directly, hence the need for a clone.

	inputs = object_fromEntries(object_entries(inputs).map(([resolved_path, props]) => {
		props.imports = props.imports.map((props) => {
			props.path = props.path.toLowerCase()
			return props
		})
		return [resolved_path.toLowerCase(), props]
	}))

	outputs = object_fromEntries(object_entries(outputs).map(([output_path, props]) => {
		props.inputs = object_fromEntries(object_entries(props.inputs).map(([resolved_path, props]) => {
			return [resolved_path.toLowerCase(), props]
		}))
		if (props.entryPoint) { props.entryPoint = props.entryPoint.toLowerCase() }
		return [output_path, props]
	}))

	return { inputs, outputs }
}
