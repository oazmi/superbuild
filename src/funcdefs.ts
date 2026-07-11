/** a utility functions submodule.
 *
 * @module
*/

import { bind_array_push, console_log, crc32, date_now, DEBUG, dom_clearTimeout, dom_setTimeout, isArray, isString, math_max, noop, object_entries } from "./deps.js"
import type { LoggerFunction } from "./typedefs.js"


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
	logger: LoggerFunction = noopLogger,
): [resolve: (value: T) => void, cancel: (delay?: number) => void] => {
	let
		// bloody deno's node-compatibility "enhancements" is creating more incompatibilities with existing well known web-compatible constructs.
		// man, do I hate the direction deno is heading. this didn't use to be an issue pre-v2.8 of deno.
		timer_id: number | ReturnType<typeof setTimeout> = -1,
		delay = original_delay
	const
		resolve = (value: T) => {
			dom_clearTimeout(timer_id) // clear out any previous timer.
			if (DEBUG.LOG) { logger(`delayed promise will resolve in ${delay}ms.`) }
			timer_id = dom_setTimeout(promise_resolver, delay, value)
		},
		cancel = (new_delay: number = original_delay) => {
			dom_clearTimeout(timer_id) // clear out any previous timer.
			if (DEBUG.LOG) { logger(`delayed promise was canceled.`) }
			delay = new_delay
		}
	return [resolve, cancel]
}

let uuid_counter = -1

/** generates `segments` number of 8-character (32-bit) uuid based on the current time stamp. */
export const generateUuid = (segments = 1, current_time?: number): string => {
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

export const splitNamespacedPath = (resolved_namespaced_path: string): { namespace: string, path: string } => {
	const
		namespace_splitting_idx = resolved_namespaced_path.indexOf(":"),
		namespace = resolved_namespaced_path.slice(0, namespace_splitting_idx),
		path = resolved_namespaced_path.slice(namespace_splitting_idx + 1)
	return { namespace, path }
}

/** alias for `console.log`. this is the default logging function. */
export const logLogger: LoggerFunction = console_log

const arrayLoggerFactory = (history: Array<any[]>): LoggerFunction => {
	const history_push = bind_array_push(history)
	return (...data: any[]): void => { history_push(data) }
}

/** the history of the {@link arrayLogger} function gets contained here. */
export const arrayLoggerHistory: Array<any[]> = []

/** an array based logging function. the log history is kept in the {@link arrayLoggerHistory} array. */
export const arrayLogger: LoggerFunction = /*@__PURE__*/ arrayLoggerFactory(arrayLoggerHistory)

/** a no operation logger function that does nothing. */
export const noopLogger: LoggerFunction = noop
