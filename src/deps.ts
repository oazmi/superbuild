import { } from "@oazmi/kitchensink/crossenv"
import { } from "@oazmi/kitchensink/pathman"


export type * as EsbuildTypes from "@oazmi/esbuild-types"
export { } from "@oazmi/kitchensink/alias"
export { } from "@oazmi/kitchensink/crossenv"
export { } from "@oazmi/kitchensink/pathman"
export { } from "@oazmi/kitchensink/stringman"
export { } from "@oazmi/kitchensink/struct"
export type { } from "@oazmi/kitchensink/typedefs"

/** flags used for minifying (or eliminating) debugging logs and asserts, when an intelligent bundler, such as `esbuild`, is used. */
export const enum DEBUG {
	LOG = 1,
	ASSERT = 1,
	ERROR = 0,
	PRODUCTION = 1,
	MINIFY = 0,
}
