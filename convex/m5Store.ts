import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { followupDelay, istDay } from "./lib/timing";

export async function flowFor(ctx: Pick<QueryCtx, "db">, trainerId: Id<"trainers">, name: string) {
  return ctx.db.query("followups").withIndex("by_trainer_name", q => q.eq("trainerId", trainerId).eq("name", name)).unique();
}
export async function cancelJobs(ctx: MutationCtx, flowId: Id<"followups">) {
  // A cycle creates at most three events; completed historical events aren't scanned.
  for (const state of ["pending", "queued", "sending", "awaiting"] as const) {
    const events = await ctx.db.query("followupEvents").withIndex("by_flow_state", q => q.eq("flowId", flowId).eq("state", state)).take(10);
    for (const event of events) await ctx.db.patch(event._id, { state: "cancelled" });
  }
}
export async function receivedReply(ctx: MutationCtx, trainerId: Id<"trainers">, name: string) {
  const flow = await flowFor(ctx, trainerId, name);
  if (!flow) return;
  await cancelJobs(ctx, flow._id);
  if (!["paused", "declined", "posted"].includes(flow.phase)) await ctx.db.patch(flow._id, { phase: "waiting" });
}
export async function scheduleFlow(ctx: MutationCtx, args: { trainerId: Id<"trainers">; name: string; source: string; phase: "waiting" | "asked" | "paused"; createdAt: number }) {
  let flow = await flowFor(ctx, args.trainerId, args.name);
  if (flow?.source === args.source) return;
  if (flow) await cancelJobs(ctx, flow._id);
  // A refusal remains final even if another positive review is forwarded.
  if (flow?.phase === "declined" || flow?.phase === "posted" && args.phase !== "paused") return;
  const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("name", args.name)).first();
  if (flow) {
    await ctx.db.patch(flow._id, { phase: args.phase, source: args.source, createdAt: args.createdAt, postAgainUsed: false, lastPostingChoice: undefined, answerRevision: (flow.answerRevision ?? 0) + 1 });
    flow = (await ctx.db.get(flow._id))!;
  } else {
    const id = await ctx.db.insert("followups", { ...args, reminderUsed: client?.reminderUsed ?? false, postAgainUsed: false });
    flow = (await ctx.db.get(id))!;
  }
  if (client && args.phase === "asked") await ctx.db.patch(client._id, { status: "asked", lastStepAt: args.createdAt });
  if (args.phase === "paused") return;
  if (args.phase === "waiting" && !flow.reminderUsed) await ctx.db.insert("followupEvents", { flowId: flow._id, source: args.source, kind: "reminder", attempt: 0, dueAt: args.createdAt + followupDelay(3), state: "pending" });
  if (args.phase === "asked") await ctx.db.insert("followupEvents", { flowId: flow._id, source: args.source, kind: "posting", attempt: 0, dueAt: args.createdAt + followupDelay(2), state: "pending" });
}
export const guard = internalQuery({ args: { trainerId: v.id("trainers"), name: v.string() }, returns: v.any(), handler: (ctx, args) => flowFor(ctx, args.trainerId, args.name) });
export const start = internalMutation({
  args: { trainerId: v.id("trainers"), name: v.string(), source: v.string(), phase: v.union(v.literal("waiting"), v.literal("asked"), v.literal("paused")), createdAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => { await scheduleFlow(ctx, args); return null; },
});
export const claim = internalMutation({ args: { eventId: v.id("followupEvents") }, returns: v.any(), handler: async (ctx, { eventId }) => {
  const event = await ctx.db.get(eventId);
  if (!event || event.state !== "queued") return null;
  const flow = await ctx.db.get(event.flowId);
  if (!flow || event.source !== flow.source || !["waiting", "asked"].includes(flow.phase) || event.kind === "reminder" && flow.phase !== "waiting") { await ctx.db.patch(eventId, { state: "cancelled" }); return null; }
  const trainer = await ctx.db.get(flow.trainerId);
  if (!trainer) { await ctx.db.patch(eventId, { state: "cancelled" }); return null; }
  const last = await ctx.db.query("inbound").withIndex("by_trainer", q => q.eq("trainerId", trainer._id)).order("desc").first();
  if (!last || Date.now() - last.receivedAt >= 86_400_000) {
    // No approved M5 templates yet. Keep it pending without calling Meta;
    // a fresh trainer message opens the window, then the minute cron can send.
    await ctx.db.patch(eventId, { state: "pending", dueAt: Date.now() + 60_000, blockedReason: "outside_24h_window_no_approved_followup_template" }); return null;
  }
  await ctx.db.patch(eventId, { state: "sending", blockedReason: undefined });
  return { event, flow, phone: trainer.phone };
} });
export const finish = internalMutation({ args: { eventId: v.id("followupEvents"), failure: v.union(v.string(), v.null()) }, returns: v.null(), handler: async (ctx, { eventId, failure }) => {
  const event = await ctx.db.get(eventId);
  if (!event || event.state !== "sending") return null;
  await ctx.db.patch(eventId, { state: failure ? "failed" : "awaiting", ...(failure ? { failure } : {}) });
  if (!failure && event.kind === "reminder") {
    const flow = await ctx.db.get(event.flowId);
    if (flow) {
      await ctx.db.patch(flow._id, { reminderUsed: true });
      const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", flow.trainerId).eq("name", flow.name)).first();
      if (client) await ctx.db.patch(client._id, { reminderUsed: true });
    }
  }
  return null;
} });
const choice = v.union(v.literal("remind"), v.literal("leave"), v.literal("posted"), v.literal("no"), v.literal("later"));
async function respondTo(ctx: MutationCtx, args: { trainerId: Id<"trainers">; eventId: Id<"followupEvents">; choice: "remind" | "leave" | "posted" | "no" | "later" }) {
  const event = await ctx.db.get(args.eventId), flow = event ? await ctx.db.get(event.flowId) : null;
  if (!event || !flow || flow.trainerId !== args.trainerId || event.state !== "awaiting" || flow.source !== event.source || !["waiting", "asked"].includes(flow.phase)) return null;
  if (event.kind === "reminder" && flow.phase !== "waiting") { await ctx.db.patch(event._id, { state: "cancelled" }); return null; }
  if ((event.kind === "reminder") !== ["remind", "leave"].includes(args.choice)) return null;
  await ctx.db.patch(event._id, { state: "complete" });
  if (["posted", "no", "later"].includes(args.choice)) await ctx.db.patch(flow._id, { lastPostingChoice: args.choice as "posted" | "no" | "later", answerRevision: (flow.answerRevision ?? 0) + 1 });
  let count = 0;
  if (args.choice === "posted") {
    const month = istDay(Date.now()).slice(0, 7);
    let counter = await ctx.db.query("monthlyPosts").withIndex("by_trainer_month", q => q.eq("trainerId", args.trainerId).eq("month", month)).unique();
    count = (counter?.count ?? 0) + 1;
    if (counter) await ctx.db.patch(counter._id, { count }); else await ctx.db.insert("monthlyPosts", { trainerId: args.trainerId, month, count });
    await cancelJobs(ctx, flow._id); await ctx.db.patch(flow._id, { phase: "posted", postedAt: Date.now() });
  } else if (args.choice === "no" || args.choice === "leave") {
    await cancelJobs(ctx, flow._id); await ctx.db.patch(flow._id, { phase: args.choice === "no" ? "declined" : "stopped" });
  } else if (args.choice === "later") {
    await cancelJobs(ctx, flow._id);
    if (!flow.postAgainUsed) {
      await ctx.db.patch(flow._id, { postAgainUsed: true });
      await ctx.db.insert("followupEvents", { flowId: flow._id, source: flow.source, kind: "posting", attempt: 1, dueAt: Date.now() + followupDelay(3), state: "pending" });
    } else await ctx.db.patch(flow._id, { phase: "stopped" });
  } else {
    // One reminder draft, then silence. Keep a posting question that has
    // already been delivered answerable, but never schedule another chase.
    await ctx.db.patch(flow._id, { reminderUsed: true });
  }
  const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("name", flow.name)).first();
  if (client && ["posted", "no", "leave"].includes(args.choice)) await ctx.db.patch(client._id, { status: args.choice === "posted" ? "posted" : args.choice === "no" ? "said_no" : "dropped", lastStepAt: Date.now() });
  return { name: flow.name, count };
}
export const respond = internalMutation({ args: { trainerId: v.id("trainers"), eventId: v.id("followupEvents"), choice }, returns: v.any(), handler: respondTo });
export const unpause = internalMutation({ args: { trainerId: v.id("trainers"), name: v.string() }, returns: v.boolean(), handler: async (ctx, args) => {
  let flow = await flowFor(ctx, args.trainerId, args.name);
  const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("name", args.name)).first();
  const last = await ctx.db.query("replies").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("clientName", args.name)).order("desc").first();
  if (flow ? flow.phase !== "paused" : client?.status !== "unhappy" && last?.read !== "unhappy") return false;
  if (flow?.phase === "declined") return false;
  if (!flow) {
    await scheduleFlow(ctx, { ...args, source: "unpause", phase: "paused", createdAt: Date.now() });
    flow = await flowFor(ctx, args.trainerId, args.name);
  }
  await cancelJobs(ctx, flow!._id);
  await ctx.db.patch(flow!._id, { phase: "waiting", unpausedAt: Date.now() });
  if (client) await ctx.db.patch(client._id, { status: "checked_in", lastStepAt: Date.now() });
  return true;
} });

const postingChoice = v.union(v.literal("posted"), v.literal("no"), v.literal("later"));
export const latestConfirmation = internalQuery({
  args: { trainerId: v.id("trainers") }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, { trainerId }) => {
    const last = await ctx.db.query("outbound").withIndex("by_trainer", q => q.eq("trainerId", trainerId)).order("desc").first();
    if (!last || last.part !== "confirm-change" || last.state !== "sent") return null;
    const id = JSON.parse(last.payload).interactive?.action?.buttons?.[0]?.reply?.id;
    return typeof id === "string" && id.startsWith("m5change:") ? id : null;
  },
});
function currentAnswer(flow: Doc<"followups">) {
  return flow.lastPostingChoice ?? (flow.phase === "posted" ? "posted" : flow.phase === "declined" ? "no" : flow.postAgainUsed ? "later" : null);
}
export const requestChange = internalMutation({
  args: { trainerId: v.id("trainers"), eventId: v.id("followupEvents"), target: postingChoice, token: v.string() }, returns: v.any(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId), flow = event ? await ctx.db.get(event.flowId) : null;
    if (!event || !flow || event.kind !== "posting" || event.state !== "complete" || flow.trainerId !== args.trainerId || flow.source !== event.source || flow.phase === "paused") return null;
    const previous = currentAnswer(flow);
    if (!previous || previous === args.target) return null;
    await ctx.db.patch(event._id, { changeTarget: args.target, changeRevision: flow.answerRevision ?? 0, changeToken: args.token });
    return { name: flow.name, previous, target: args.target };
  },
});
export const confirmChange = internalMutation({
  args: { trainerId: v.id("trainers"), eventId: v.id("followupEvents"), token: v.string(), yes: v.boolean() }, returns: v.any(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId), flow = event ? await ctx.db.get(event.flowId) : null;
    if (!event || !flow || event.kind !== "posting" || event.state !== "complete" || flow.trainerId !== args.trainerId || flow.source !== event.source || flow.phase === "paused" || !event.changeTarget || event.changeToken !== args.token || event.changeRevision !== (flow.answerRevision ?? 0)) return null;
    const target = event.changeTarget;
    await ctx.db.patch(event._id, { changeTarget: undefined, changeRevision: undefined, changeToken: undefined });
    if (!args.yes) return null;
    // Reverse the original month's count, never a different month's total.
    if (currentAnswer(flow) === "posted" && flow.postedAt !== undefined) {
      const month = istDay(flow.postedAt).slice(0, 7);
      const counter = await ctx.db.query("monthlyPosts").withIndex("by_trainer_month", q => q.eq("trainerId", args.trainerId).eq("month", month)).unique();
      if (counter) await ctx.db.patch(counter._id, { count: Math.max(0, counter.count - 1) });
    }
    await cancelJobs(ctx, flow._id);
    await ctx.db.patch(flow._id, { phase: "asked", postedAt: undefined });
    await ctx.db.patch(event._id, { state: "awaiting" });
    const result = await respondTo(ctx, { trainerId: args.trainerId, eventId: event._id, choice: target });
    if (result && target === "later") {
      const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("name", flow.name)).first();
      if (client) await ctx.db.patch(client._id, { status: "asked", lastStepAt: Date.now() });
    }
    return result ? { ...result, choice: target } : null;
  },
});
