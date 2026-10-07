/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as drafting from "../drafting.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as lib_copy from "../lib/copy.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_recommendation from "../lib/recommendation.js";
import type * as lib_reviewInput from "../lib/reviewInput.js";
import type * as lib_timing from "../lib/timing.js";
import type * as lib_voice from "../lib/voice.js";
import type * as lib_webhook from "../lib/webhook.js";
import type * as lib_whatsapp from "../lib/whatsapp.js";
import type * as m2Store from "../m2Store.js";
import type * as m2Workflow from "../m2Workflow.js";
import type * as m3 from "../m3.js";
import type * as m4 from "../m4.js";
import type * as m4Store from "../m4Store.js";
import type * as onboarding from "../onboarding.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  drafting: typeof drafting;
  health: typeof health;
  http: typeof http;
  "lib/copy": typeof lib_copy;
  "lib/dates": typeof lib_dates;
  "lib/recommendation": typeof lib_recommendation;
  "lib/reviewInput": typeof lib_reviewInput;
  "lib/timing": typeof lib_timing;
  "lib/voice": typeof lib_voice;
  "lib/webhook": typeof lib_webhook;
  "lib/whatsapp": typeof lib_whatsapp;
  m2Store: typeof m2Store;
  m2Workflow: typeof m2Workflow;
  m3: typeof m3;
  m4: typeof m4;
  m4Store: typeof m4Store;
  onboarding: typeof onboarding;
  voice: typeof voice;
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
