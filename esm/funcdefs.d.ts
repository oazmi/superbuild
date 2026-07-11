/** a utility functions submodule.
 *
 * @module
*/
import type { LoggerFunction } from "./typedefs.js";
export declare const concatArrays: <T>(arr1?: Array<T>, arr2?: Array<T>) => Array<T> | undefined;
export declare const mergeMapArrays: <K, T>(map1: Map<K, Array<T>>, map2: Map<K, Array<T>>) => Map<K, Array<T>>;
/** this function wraps on top of a promise-resolver function, and returns two functions.
 * the first function, when called, will resolve the original `promise_resolver` _after_ the specified `delay` amount of milliseconds have passed.
 * during this delay time, you may use the second function that is returned to cancel the task of running the `promise_resolver` before it times out.
 * you also have the option to specify the `delay` for the next time the returned `resolve` function is called.
 * if it is not specified, then the `original_delay` will be used in its place.
*/
export declare const cancelableDelayedPromiseResolver: <T>(promise_resolver: (value: T) => void, original_delay: number, logger?: LoggerFunction) => [resolve: (value: T) => void, cancel: (delay?: number) => void];
/** generates `segments` number of 8-character (32-bit) uuid based on the current time stamp. */
export declare const generateUuid: (segments?: number, current_time?: number) => string;
export declare const splitNamespacedPath: (resolved_namespaced_path: string) => {
    namespace: string;
    path: string;
};
/** alias for `console.log`. this is the default logging function. */
export declare const logLogger: LoggerFunction;
/** the history of the {@link arrayLogger} function gets contained here. */
export declare const arrayLoggerHistory: Array<any[]>;
/** an array based logging function. the log history is kept in the {@link arrayLoggerHistory} array. */
export declare const arrayLogger: LoggerFunction;
/** a no operation logger function that does nothing. */
export declare const noopLogger: LoggerFunction;
//# sourceMappingURL=funcdefs.d.ts.map