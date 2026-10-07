import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { workflow } from "./m2Workflow";
import { deliver } from "./onboarding";
import { copy } from "./lib/copy";
import { normalizeReviewInput } from "./lib/reviewInput";
import { buttonPayload, replyButtons, textPayload } from "./lib/whatsapp";

export const tick = internalMutation({ args: {}, returns: v.number(), handler: async (ctx) => {
  const events = await ctx.db.query("followupEvents").withIndex("by_state_due", q => q.eq("state", "pending").lte("dueAt", Date.now())).take(50);
  for (const event of events) {
    await ctx.db.patch(event._id, { state: "queued" });
    await workflow.start(ctx, internal.m5.sendWorkflow, { eventId: event._id });
  }
  if (events.length === 50) await ctx.scheduler.runAfter(0, internal.m5.tick, {});
  return events.length;
} });
export const sendWorkflow = workflow.define({ args: { eventId: v.id("followupEvents") }, returns: v.null() }).handler(async (step, args): Promise<null> => {
  await step.runAction(internal.m5.send, args, { retry: false }); return null;
});
export const send = internalAction({ args: { eventId: v.id("followupEvents") }, returns: v.null(), handler: async (ctx, { eventId }): Promise<null> => {
  const data = await ctx.runMutation(internal.m5Store.claim, { eventId });
  if (!data) return null;
  const reminder = data.event.kind === "reminder";
  const options = reminder ? [{ title: "Send reminder", value: "remind" }, { title: "Leave it", value: "leave" }] : [{ title: copy.postedButton(data.flow.name), value: "posted" }, { title: copy.declinedButton(data.flow.name), value: "no" }, { title: "Not yet", value: "later" }];
  let failure: string | null;
  try {
    failure = await deliver(ctx, data.flow.trainerId, eventId, "question", replyButtons(data.phone, reminder ? copy.noReply(data.flow.name) : copy.postedQuestion(data.flow.name), options.map(o => ({ title: o.title, id: `m5:${eventId}:${o.value}` }))));
  } catch { failure = "followup_send_failed"; }
  await ctx.runMutation(internal.m5Store.finish, { eventId, failure }); return null;
} });
export const handle = internalAction({ args: { inboundId: v.id("inbound") }, returns: v.object({ handled: v.boolean(), failure: v.union(v.string(), v.null()) }), handler: async (ctx, { inboundId }): Promise<{ handled: boolean; failure: string | null }> => {
  const message = await ctx.runQuery(internal.voice.inbound, { inboundId });
  if (!message || message.text.length > 2000) return { handled: false, failure: null };
  const trainer = await ctx.runQuery(internal.m3.trainer, { trainerId: message.trainerId });
  if (!trainer) return { handled: false, failure: null };
  const text = normalizeReviewInput(message.text).trim();
  const send = (part: string, body: string) => deliver(ctx, message.trainerId, inboundId, part, textPayload(trainer.phone, body));
  const outcome = async (value: string, result: { name: string; count: number }, changed = false) => {
    if (value === "posted") return send("posted", copy.posted(result.name, result.count));
    if (value === "no") {
      const draft = copy.thankYou(result.name);
      return deliver(ctx, message.trainerId, inboundId, "thank-you", buttonPayload(trainer.phone, copy.declined + "\n\n" + draft, draft, copy.sendTo(result.name)));
    }
    if (value === "remind") {
      const draft = copy.reminder(result.name);
      return deliver(ctx, message.trainerId, inboundId, "reminder", buttonPayload(trainer.phone, draft, draft, copy.sendTo(result.name)));
    }
    return value === "later" && changed ? send("changed", `[COPY NEEDED: ${result.name} status changed to Not yet]`) : null;
  };
  let changeResponse = message.responseId;
  if (!changeResponse && message.type === "text" && /^(yes|no|leave it)[.!]?$/i.test(text)) {
    const latest = await ctx.runQuery(internal.m5Store.latestConfirmation, { trainerId: message.trainerId });
    if (latest) changeResponse = latest.replace(/:yes$/, /^yes/i.test(text) ? ":yes" : ":keep");
  }
  if (changeResponse?.startsWith("m5change:")) {
    const pieces = changeResponse.split(":");
    if (pieces.length !== 4 || !["yes", "keep"].includes(pieces[3])) return { handled: true, failure: null };
    try {
      const result = await ctx.runMutation(internal.m5Store.confirmChange, { trainerId: message.trainerId, eventId: pieces[1] as Id<"followupEvents">, token: pieces[2], yes: pieces[3] === "yes" });
      return { handled: true, failure: result ? await outcome(result.choice, result, true) : null };
    } catch { return { handled: true, failure: null }; }
  }
  if (message.responseId?.startsWith("m5:")) {
    const pieces = message.responseId.split(":");
    const value = pieces[2];
    if (pieces.length !== 3 || !["remind", "leave", "posted", "no", "later"].includes(value)) return { handled: true, failure: null };
    let result: { name: string; count: number } | null;
    try { result = await ctx.runMutation(internal.m5Store.respond, { trainerId: message.trainerId, eventId: pieces[1] as Id<"followupEvents">, choice: value as "remind" | "leave" | "posted" | "no" | "later" }); } catch { return { handled: true, failure: null }; }
    if (!result) {
      if (!["posted", "no", "later"].includes(value)) return { handled: true, failure: null };
      try {
        const change = await ctx.runMutation(internal.m5Store.requestChange, { trainerId: message.trainerId, eventId: pieces[1] as Id<"followupEvents">, target: value as "posted" | "no" | "later", token: inboundId });
        if (!change) return { handled: true, failure: null };
        const label = (choice: string) => choice === "posted" ? "posted it" : choice === "no" ? "said no" : "Not yet";
        const body = `[COPY NEEDED: ${change.name} already marked ${label(change.previous)}; confirm change to ${label(change.target)}]`;
        return { handled: true, failure: await deliver(ctx, message.trainerId, inboundId, "confirm-change", replyButtons(trainer.phone, body, [{ title: "Yes", id: `m5change:${pieces[1]}:${inboundId}:yes` }, { title: "Leave it", id: `m5change:${pieces[1]}:${inboundId}:keep` }])) };
      } catch { return { handled: true, failure: null }; }
    }
    return { handled: true, failure: await outcome(value, result) };
  }
  const unpause = message.type === "text" && /^([\p{L} .'-]{1,80}?)\s+is happy now[.!]?$/iu.exec(text);
  if (unpause) {
    const changed = await ctx.runMutation(internal.m5Store.unpause, { trainerId: message.trainerId, name: unpause[1].trim() });
    return { handled: true, failure: await send("unpause", changed ? copy.unpaused : copy.unknownUnpause) };
  }
  const name = /^(?:this is a review\s*[:.!]?\s*)?([\p{L} .'-]{1,80}):/iu.exec(text)?.[1].trim();
  if (name) {
    const flow = await ctx.runQuery(internal.m5Store.guard, { trainerId: message.trainerId, name });
    if (flow?.phase === "declined") return { handled: true, failure: await send("private-only", copy.privateOnly + "\n\n" + text) };
  }
  return { handled: false, failure: null };
} });
