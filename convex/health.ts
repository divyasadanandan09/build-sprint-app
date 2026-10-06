import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Deployment check only. No trainer data or provider calls.
export const check = internalQuery({
  args: {},
  returns: v.null(),
  handler: async () => null,
});
