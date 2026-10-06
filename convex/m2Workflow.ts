import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
// Serial processing keeps short onboarding answers in arrival order.
export const workflow = new WorkflowManager(components.workflow, { workpoolOptions: { maxParallelism: 1, logLevel: "WARN" } });
export const incoming = workflow.define({ args: { inboundId: v.id("inbound") }, returns: v.null() }).handler(async (step, args): Promise<null> => {
  // Sending is not idempotent at Meta: never automatically retry an action.
  await step.runAction(internal.onboarding.process, args, { retry: false });
  return null;
});
