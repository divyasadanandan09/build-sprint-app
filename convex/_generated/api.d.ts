/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as drafting from "../drafting.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as lib_copy from "../lib/copy.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_recommendation from "../lib/recommendation.js";
import type * as lib_webhook from "../lib/webhook.js";
import type * as lib_whatsapp from "../lib/whatsapp.js";
import type * as m2Store from "../m2Store.js";
import type * as m2Workflow from "../m2Workflow.js";
import type * as onboarding from "../onboarding.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  drafting: typeof drafting;
  health: typeof health;
  http: typeof http;
  "lib/copy": typeof lib_copy;
  "lib/dates": typeof lib_dates;
  "lib/recommendation": typeof lib_recommendation;
  "lib/webhook": typeof lib_webhook;
  "lib/whatsapp": typeof lib_whatsapp;
  m2Store: typeof m2Store;
  m2Workflow: typeof m2Workflow;
  onboarding: typeof onboarding;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
