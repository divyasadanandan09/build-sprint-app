import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const context = internalQuery({
  args: { trainerId: v.id("trainers"), replyId: v.optional(v.id("replies")), cursor: v.optional(v.union(v.string(), v.null())) }, returns: v.any(),
  handler: async (ctx, args) => {
    const trainer = await ctx.db.get(args.trainerId);
    const latest = await ctx.db.query("replies").withIndex("by_trainer", q => q.eq("trainerId", args.trainerId)).order("desc").first();
    const requested = args.replyId ? await ctx.db.get(args.replyId) : latest;
    const reply = requested?.trainerId === args.trainerId ? requested : null;
    // Paginate all owned clients; checked-in and short replies are the waiting set.
    const page = await ctx.db.query("clients").withIndex("by_trainer", q => q.eq("trainerId", args.trainerId)).paginate({ numItems: 9, cursor: args.cursor ?? null });
    const clients = page.page.filter(c => c.status === "checked_in" || c.status === "short_reply");
    const client = reply?.clientId ? await ctx.db.get(reply.clientId) : null;
    return { trainer, reply, clients, client: client?.trainerId === args.trainerId ? client : null, cursor: page.isDone ? null : page.continueCursor };
  },
});
export const begin = internalMutation({
  args: { inboundId: v.id("inbound"), transcript: v.string(), name: v.optional(v.string()), read: v.optional(v.union(v.literal("short"), v.literal("unhappy"))) }, returns: v.id("replies"),
  handler: async (ctx, args) => {
    const inbound = await ctx.db.get(args.inboundId);
    if (!inbound) throw new Error("Missing inbound");
    const existing = await ctx.db.query("replies").withIndex("by_inbound", q => q.eq("inboundId", args.inboundId)).unique();
    if (existing) return existing._id;
    const last = await ctx.db.query("replies").withIndex("by_trainer", q => q.eq("trainerId", inbound.trainerId)).order("desc").first();
    const following = last?.state === "awaiting_followup" && !inbound.forwarded && inbound.type === "text" && !args.name;
    const named = args.name ? await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", inbound.trainerId).eq("name", args.name!)).first() : null;
    const namedReply = args.name ? await ctx.db.query("replies").withIndex("by_trainer_name", q => q.eq("trainerId", inbound.trainerId).eq("clientName", args.name!)).order("desc").first() : null;
    if (last && !["complete", "failed"].includes(last.state)) await ctx.db.patch(last._id, { state: "complete" });
    const clientId = following ? last.clientId : named?._id;
    const clientName = following ? last.clientName : args.name;
    return ctx.db.insert("replies", { trainerId: inbound.trainerId, inboundId: inbound._id, transcript: args.transcript, ...(args.read ? { read: args.read } : {}), kind: inbound.type === "audio" ? "voice" : "text", state: clientName ? "classifying" : "select_client", followupUsed: following || named?.followupUsed === true || namedReply?.followupUsed === true, createdAt: Date.now(), ...(clientId ? { clientId } : {}), ...(clientName ? { clientName } : {}) });
  },
});
export const select = internalMutation({
  args: { trainerId: v.id("trainers"), replyId: v.id("replies"), clientId: v.id("clients") }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const reply = await ctx.db.get(args.replyId), client = await ctx.db.get(args.clientId);
    const latest = await ctx.db.query("replies").withIndex("by_trainer", q => q.eq("trainerId", args.trainerId)).order("desc").first();
    if (!reply || latest?._id !== reply._id || reply.trainerId !== args.trainerId || reply.state !== "select_client" || client?.trainerId !== args.trainerId || !["checked_in", "short_reply"].includes(client.status)) return false;
    const previous = await ctx.db.query("replies").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("clientName", client.name)).order("desc").first();
    await ctx.db.patch(reply._id, { clientId: client._id, clientName: client.name, followupUsed: client.followupUsed === true || previous?.followupUsed === true, state: "classifying" });
    return true;
  },
});
export const update = internalMutation({
  args: { trainerId: v.id("trainers"), replyId: v.id("replies"), state: v.union(v.literal("select_client"), v.literal("classifying"), v.literal("select_feeling"), v.literal("select_question"), v.literal("awaiting_followup"), v.literal("complete"), v.literal("failed")), transcript: v.optional(v.string()), read: v.optional(v.string()), draft: v.optional(v.string()), kind: v.optional(v.union(v.literal("recommendation"), v.literal("followup"), v.literal("unhappy"))) }, returns: v.null(),
  handler: async (ctx, args) => {
    const reply = await ctx.db.get(args.replyId);
    if (!reply || reply.trainerId !== args.trainerId) throw new Error("Invalid reply owner");
    await ctx.db.patch(reply._id, { state: args.state, ...(args.transcript !== undefined ? { transcript: args.transcript } : {}), ...(args.read ? { read: args.read } : {}), ...(args.kind === "followup" ? { followupUsed: true } : {}) });
    if (args.draft && args.kind) await ctx.db.insert("replyDrafts", { trainerId: args.trainerId, replyId: reply._id, kind: args.kind, text: args.draft, createdAt: Date.now() });
    if (reply.clientId) {
      const client = await ctx.db.get(reply.clientId);
      if (client?.trainerId !== args.trainerId) throw new Error("Invalid client owner");
      const status = args.read === "unhappy" ? "unhappy" : args.kind === "followup" || args.read === "short" && args.state === "select_question" ? "short_reply" : args.kind === "recommendation" ? "happy" : null;
      if (status) await ctx.db.patch(client._id, { status, lastStepAt: Date.now(), ...(args.kind === "followup" ? { followupUsed: true } : {}) });
    }
    // Only transcripts survive; discard the temporary provider-media reference.
    if (args.transcript !== undefined || args.state === "failed") await ctx.db.patch(reply.inboundId, { mediaId: undefined });
    return null;
  },
});

export const selectName = internalMutation({
  args: { trainerId: v.id("trainers"), replyId: v.id("replies"), name: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const reply = await ctx.db.get(args.replyId);
    const latest = await ctx.db.query("replies").withIndex("by_trainer", q => q.eq("trainerId", args.trainerId)).order("desc").first();
    if (!reply || latest?._id !== reply._id || reply.trainerId !== args.trainerId || reply.state !== "select_client" || !/^[\p{L} .'-]{1,80}$/u.test(args.name)) return false;
    const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("name", args.name)).first();
    const previous = await ctx.db.query("replies").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("clientName", args.name)).order("desc").first();
    await ctx.db.patch(reply._id, { followupUsed: client?.followupUsed === true || previous?.followupUsed === true, clientName: args.name, state: "classifying", ...(client ? { clientId: client._id } : {}) });
    return true;
  },
});

export const pausedName = internalQuery({
  args: { trainerId: v.id("trainers"), name: v.string(), excludeReplyId: v.optional(v.id("replies")) }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const client = await ctx.db.query("clients").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("name", args.name)).first();
    if (client?.status === "unhappy") return true;
    const last = await ctx.db.query("replies").withIndex("by_trainer_name", q => q.eq("trainerId", args.trainerId).eq("clientName", args.name)).order("desc").take(2);
    return last.some(reply => reply._id !== args.excludeReplyId && reply.read === "unhappy");
  },
});

export const endPending = internalMutation({
  args: { trainerId: v.id("trainers") }, returns: v.null(),
  handler: async (ctx, args) => {
    const last = await ctx.db.query("replies").withIndex("by_trainer", q => q.eq("trainerId", args.trainerId)).order("desc").first();
    if (last && !["complete", "failed"].includes(last.state)) await ctx.db.patch(last._id, { state: "complete" });
    return null;
  },
});
