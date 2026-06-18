/** a utility functions submodule.
 *
 * @module
*/

import { bind_array_push, console_log, dom_clearTimeout, dom_setTimeout, isArray, isString, object_entries } from "./deps.ts"

export const concatArrays = <T>(arr1?: Array<T>, arr2?: Array<T>): Array<T> | undefined => {
	return (!arr1 && !arr2) ? undefined
		: !arr1 ? arr2
			: !arr2 ? arr1
				: [...arr1, ...arr2]
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
