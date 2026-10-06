import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { workflow } from "./m2Workflow";
import { deliveryState } from "./schema";

export const receive = internalMutation({
  args: { messages: v.array(v.object({ messageId: v.string(), phone: v.string(), name: v.string(), text: v.string(), type: v.string() })) }, returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    let received = 0;
    for (const message of args.messages) {
      if (await ctx.db.query("inbound").withIndex("by_message", (q) => q.eq("messageId", message.messageId)).unique()) continue;
      let trainer = await ctx.db.query("trainers").withIndex("by_phone", (q) => q.eq("phone", message.phone)).unique();
      const trainerId = trainer?._id ?? await ctx.db.insert("trainers", { phone: message.phone, name: message.name, waitDays: 28, joinedAt: Date.now() });
      const inboundId = await ctx.db.insert("inbound", { messageId: message.messageId, trainerId, text: message.text, type: message.type, receivedAt: Date.now(), state: "queued" });
      await workflow.start(ctx, internal.m2Workflow.incoming, { inboundId });
      received++;
    }
    return received;
  },
});
export const claim = internalMutation({
  args: { inboundId: v.id("inbound") },
  returns: v.union(v.null(), v.object({ inboundId: v.id("inbound"), trainerId: v.id("trainers"), messageId: v.string(), phone: v.string(), text: v.string(), type: v.string(), pendingId: v.union(v.id("pending"), v.null()) })),
  handler: async (ctx, { inboundId }) => {
    const message = await ctx.db.get(inboundId);
    if (!message || message.state !== "queued") return null;
    const trainer = await ctx.db.get(message.trainerId);
    if (!trainer) return null;
    await ctx.db.patch(inboundId, { state: "processing" });
    const pending = await ctx.db.query("pending").withIndex("by_trainer", (q) => q.eq("trainerId", trainer._id)).order("desc").first();
    return { inboundId, trainerId: trainer._id, messageId: message.messageId, phone: trainer.phone, text: message.text, type: message.type, pendingId: pending?.state === "awaiting_client" ? pending._id : null };
  },
});
export const finish = internalMutation({
  args: { inboundId: v.id("inbound"), failure: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.patch(args.inboundId, args.failure ? { state: "failed", failure: args.failure } : { state: "processed" }); return null; },
});
export const saveDraft = internalMutation({
  args: { inboundId: v.id("inbound"), recommendation: v.string(), ask: v.string(), clientName: v.union(v.string(), v.null()) }, returns: v.id("drafts"),
  handler: async (ctx, args) => {
    const inbound = await ctx.db.get(args.inboundId);
    if (!inbound) throw new Error("Missing inbound message");
    const existing = await ctx.db.query("drafts").withIndex("by_inbound", (q) => q.eq("inboundId", args.inboundId)).unique();
    return existing?._id ?? await ctx.db.insert("drafts", { ...args, trainerId: inbound.trainerId, createdAt: Date.now() });
  },
});
export const beginSend = internalMutation({
  args: { trainerId: v.id("trainers"), source: v.string(), part: v.string(), payload: v.string() }, returns: v.union(v.id("outbound"), v.null()),
  handler: async (ctx, args) => {
    if (await ctx.db.query("outbound").withIndex("by_source_part", (q) => q.eq("source", args.source).eq("part", args.part)).unique()) return null;
    return ctx.db.insert("outbound", { ...args, state: "sending", createdAt: Date.now() });
  },
});
export const finishSend = internalMutation({
  args: { outboundId: v.id("outbound"), state: deliveryState, providerMessageId: v.union(v.string(), v.null()), providerCode: v.union(v.number(), v.null()), failure: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.outboundId, { state: args.state, ...(args.providerMessageId ? { providerMessageId: args.providerMessageId } : {}), ...(args.providerCode !== null ? { providerCode: args.providerCode } : {}), ...(args.failure ? { failure: args.failure } : {}) });
    return null;
  },
});
export const scheduleQuestion = internalMutation({
  args: { draftId: v.id("drafts") }, returns: v.null(),
  handler: async (ctx, { draftId }) => {
    if (await ctx.db.query("pending").withIndex("by_draft", (q) => q.eq("draftId", draftId)).unique()) return null;
    const draft = await ctx.db.get(draftId);
    if (!draft) throw new Error("Missing draft");
    const previous = await ctx.db.query("pending").withIndex("by_trainer", (q) => q.eq("trainerId", draft.trainerId)).order("desc").first();
    if (previous && previous.state !== "answered") await ctx.db.patch(previous._id, { state: "answered" });
    // PRODUCT.md owns timing: ask right after the draft sequence succeeds.
    const pendingId = await ctx.db.insert("pending", { trainerId: draft.trainerId, draftId, state: "scheduled", scheduledAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.onboarding.nextClient, { pendingId });
    return null;
  },
});
export const claimQuestion = internalMutation({
  args: { pendingId: v.id("pending") }, returns: v.union(v.null(), v.object({ trainerId: v.id("trainers"), phone: v.string() })),
  handler: async (ctx, { pendingId }) => {
    const pending = await ctx.db.get(pendingId);
    if (pending && pending.state === "scheduled") await ctx.db.patch(pendingId, { state: "answered" });
    // Retire queued prompts from earlier versions. Client additions are now
    // initiated by the instructor, never by an automatic question.
    return null;
  },
});
export const finishQuestion = internalMutation({
  args: { pendingId: v.id("pending"), sent: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => { await ctx.db.patch(args.pendingId, { state: args.sent ? "awaiting_client" : "blocked" }); return null; },
});
export const saveClient = internalMutation({
  args: { trainerId: v.id("trainers"), pendingId: v.union(v.id("pending"), v.null()), name: v.string(), startDate: v.string(), dueDate: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const pending = args.pendingId ? await ctx.db.get(args.pendingId) : null;
    if (args.pendingId && (!pending || pending.trainerId !== args.trainerId || pending.state !== "awaiting_client")) return false;
    if (!await ctx.db.get(args.trainerId)) return false;
    const existing = await ctx.db.query("clients").withIndex("by_trainer_name", (q) => q.eq("trainerId", args.trainerId).eq("name", args.name)).unique();
    // A repeated name must not silently overwrite a saved client's dates.
    if (existing && existing.startDate !== args.startDate) return false;
    if (!existing) await ctx.db.insert("clients", { trainerId: args.trainerId, name: args.name, startDate: args.startDate, dueDate: args.dueDate, waitDays: 28, status: "due", reminderUsed: false, lastStepAt: Date.now() });
    if (args.pendingId) await ctx.db.patch(args.pendingId, { state: "answered" });
    return true;
  },
});
