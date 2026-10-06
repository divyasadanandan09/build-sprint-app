import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { workflow } from "./m2Workflow";
import { copy } from "./lib/copy";
import { displayDate, isNudgeTime, istDay, istWeek, timingMode } from "./lib/timing";
import { buttonPayload, textPayload } from "./lib/whatsapp";
import { deliver } from "./onboarding";

export const tick = internalMutation({
  args: { source: v.union(v.literal("dev"), v.literal("daily")), cursor: v.optional(v.string()), cycleAt: v.optional(v.number()) }, returns: v.number(),
  handler: async (ctx, { source, cursor, cycleAt }) => {
    const now = Date.now();
    if (!isNudgeTime(source, cycleAt ?? now)) return 0;
    if (timingMode() === "prod" && process.env.WHATSAPP_NUDGE_TEMPLATE_READY !== "true") return 0;
    const batch = await ctx.db.query("clients").withIndex("by_status_due", (q) => q.eq("status", "due").lte("dueDate", istDay(cycleAt ?? now))).paginate({ numItems: 50, cursor: cursor ?? null });
    let queued = 0;
    for (const client of batch.page) {
      // The approved daily template says "today"; it cannot describe an
      // overdue client. That production catch-up copy/template is missing.
      if (timingMode() === "prod" && client.dueDate < istDay(now)) continue;
      if (Date.parse(client.startDate + "T00:00:00Z") + client.waitDays * 86_400_000 > Date.parse(istDay(now) + "T00:00:00Z")) continue;
      if (await ctx.db.query("checkIns").withIndex("by_client", (q) => q.eq("clientId", client._id)).unique()) continue;
      const trainer = await ctx.db.get(client.trainerId);
      if (!trainer) continue;
      const checkInId = await ctx.db.insert("checkIns", { clientId: client._id, trainerId: trainer._id, draft: copy.checkIn(client.name, trainer.name), createdAt: now, state: "queued" });
      await workflow.start(ctx, internal.m3.nudgeWorkflow, { checkInId });
      queued++;
    }
    if (!batch.isDone) await ctx.scheduler.runAfter(0, internal.m3.tick, { source, cursor: batch.continueCursor, cycleAt: cycleAt ?? now });
    return queued;
  },
});
export const nudgeWorkflow = workflow.define({ args: { checkInId: v.id("checkIns") }, returns: v.null() }).handler(async (step, args): Promise<null> => {
  await step.runAction(internal.m3.sendNudge, args, { retry: false });
  return null;
});
export const claim = internalMutation({
  args: { checkInId: v.id("checkIns") },
  returns: v.union(v.null(), v.object({ trainerId: v.id("trainers"), phone: v.string(), name: v.string(), dueDate: v.string(), draft: v.string() })),
  handler: async (ctx, { checkInId }) => {
    const event = await ctx.db.get(checkInId);
    if (!event || event.state !== "queued") return null;
    const client = await ctx.db.get(event.clientId), trainer = await ctx.db.get(event.trainerId);
    if (!client || !trainer || client.trainerId !== trainer._id || client.dueDate > istDay(Date.now()) || client.status !== "due" || Date.parse(client.startDate + "T00:00:00Z") + client.waitDays * 86_400_000 > Date.parse(istDay(Date.now()) + "T00:00:00Z")) {
      await ctx.db.patch(checkInId, { state: "failed", failure: "client_not_eligible" }); return null;
    }
    await ctx.db.patch(checkInId, { state: "sending" });
    return { trainerId: trainer._id, phone: trainer.phone, name: client.name, dueDate: client.dueDate, draft: event.draft };
  },
});
export const finish = internalMutation({
  args: { checkInId: v.id("checkIns"), failure: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, { checkInId, failure }) => {
    const event = await ctx.db.get(checkInId);
    if (!event || event.state !== "sending") return null;
    await ctx.db.patch(checkInId, { state: failure ? failure === "whatsapp_account_locked" ? "blocked" : "failed" : "sent", ...(failure ? { failure } : {}) });
    if (!failure) await ctx.db.patch(event.clientId, { status: "checked_in", lastStepAt: event.createdAt });
    return null;
  },
});
export const sendNudge = internalAction({
  args: { checkInId: v.id("checkIns") }, returns: v.null(),
  handler: async (ctx, { checkInId }) => {
    const event = await ctx.runMutation(internal.m3.claim, { checkInId });
    if (!event) return null;
    let failure: string | null = null;
    try {
      if (timingMode() === "prod") {
        if (process.env.WHATSAPP_NUDGE_TEMPLATE_READY !== "true") failure = "template_not_ready";
        else failure = await deliver(ctx, event.trainerId, checkInId, "nudge-template", {
          messaging_product: "whatsapp", to: event.phone, type: "template",
          template: { name: "week4_nudge", language: { code: "en" }, components: [
            { type: "body", parameters: [{ type: "text", text: event.name }, { type: "text", text: event.draft }] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: encodeURIComponent(event.draft) }] },
          ] },
        });
      } else {
        const nudge = event.dueDate === istDay(Date.now()) ? copy.nudge(event.name) : copy.overdueNudge(event.name, displayDate(event.dueDate));
        failure = await deliver(ctx, event.trainerId, checkInId, "nudge", buttonPayload(event.phone, `${nudge}\n\n${event.draft}`, event.draft));
      }
    } catch { failure = "nudge_processing_failed"; }
    await ctx.runMutation(internal.m3.finish, { checkInId, failure });
    return null;
  },
});
export const due = internalQuery({
  args: { trainerId: v.id("trainers"), cursor: v.union(v.string(), v.null()) },
  returns: v.object({ page: v.array(v.object({ name: v.string(), dueDate: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, { trainerId, cursor }) => {
    const week = istWeek(Date.now());
    const result = await ctx.db.query("clients").withIndex("by_trainer_due", (q) => q.eq("trainerId", trainerId).gte("dueDate", week.start).lte("dueDate", week.end)).paginate({ numItems: 5, cursor });
    return { page: result.page.map(({ name, dueDate }) => ({ name, dueDate })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const sendDue = internalAction({
  args: { trainerId: v.id("trainers"), source: v.string() }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, { trainerId, source }): Promise<string | null> => {
    const trainer = await ctx.runQuery(internal.m3.trainer, { trainerId });
    if (!trainer) return "missing_trainer";
    let cursor: string | null = null, part = 0;
    do {
      const result: { page: { name: string; dueDate: string }[]; isDone: boolean; continueCursor: string } = await ctx.runQuery(internal.m3.due, { trainerId, cursor });
      if (result.page.length || part === 0) {
        const text = result.page.length ? result.page.map((c) => copy.dueLine(c.name, displayDate(c.dueDate))).join("\n") : copy.noDue;
        const failure = await deliver(ctx, trainerId, source, `due-list-${part++}`, textPayload(trainer.phone, text));
        if (failure) return failure;
      }
      if (result.isDone) break;
      cursor = result.continueCursor;
    } while (cursor);
    return null;
  },
});
export const trainer = internalQuery({
  args: { trainerId: v.id("trainers") }, returns: v.union(v.null(), v.object({ phone: v.string() })),
  handler: async (ctx, { trainerId }) => {
    const trainer = await ctx.db.get(trainerId); return trainer ? { phone: trainer.phone } : null;
  },
});
