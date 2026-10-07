import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { deliver } from "./onboarding";
import { normalizeReviewInput } from "./lib/reviewInput";
import { copy } from "./lib/copy";
import { buttonPayload, replyButtons, replyList, textPayload, sendWhatsApp, typingPayload } from "./lib/whatsapp";
import { formatRecommendation, groupWording, combinedReview } from "./lib/recommendation";

const questions = [ ["What's changed?", "What's changed for you since you started?"], ["What's easier now?", "What's easier now than in week 1?"], ["What do you enjoy?", "What do you look forward to in class?"] ];
async function classify(ctx: ActionCtx, trainerId: Id<"trainers">, replyId: Id<"replies">, source: string, override?: string): Promise<string | null> {
  const { reply, trainer, client } = await ctx.runQuery(internal.m4Store.context, { trainerId, replyId });
  if (!reply || !trainer || !reply.clientName) return "invalid_reply";
  const send = (part: string, text: string) => deliver(ctx, trainerId, source, part, textPayload(trainer.phone, text));
  // Only the trainer can unpause an unhappy client.
  let text = normalizeReviewInput(reply.transcript);
  if (reply.kind === "voice" && !text) {
    const audio = await ctx.runAction(internal.voice.transcribe, { inboundId: reply.inboundId, trainerId });
    if (audio.read !== "ok") {
      await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "failed" });
      return send("voice-error", audio.read === "long" ? copy.voiceLong : audio.read === "text_long" ? copy.transcriptLong : audio.read === "busy" ? copy.busy : copy.voiceError);
    }
    text = audio.text;
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "classifying", transcript: text });
  }
  if (!text.trim() || text.length > 2000) {
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "failed" });
    return send("error", copy.reviewError);
  }
  if (client?.status === "unhappy" || await ctx.runQuery(internal.m4Store.pausedName, { trainerId, name: reply.clientName, excludeReplyId: replyId })) {
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "complete", read: "unhappy" });
    return send("paused", copy.unhappy(reply.clientName) + "\n\n" + text);
  }
  const flow = await ctx.runQuery(internal.m5Store.guard, { trainerId, name: reply.clientName });
  if (flow?.phase === "declined") {
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "complete", transcript: text });
    return send("private-only", copy.privateOnly + "\n\n" + text);
  }
  const triggering = await ctx.runQuery(internal.voice.inbound, { inboundId: reply.inboundId });
  if (triggering) await sendWhatsApp(typingPayload(triggering.messageId));
  const forcedRead = override ?? reply.read;
  const result = forcedRead ? { read: forcedRead, recommendation: null } : await ctx.runAction(internal.drafting.fromText, { text, replyMode: true });
  if (["busy", "error", "off_topic"].includes(result.read)) {
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "failed" });
    return send("error", result.read === "busy" ? copy.busy : result.read === "off_topic" ? copy.fallback : copy.reviewError);
  }
  if (result.read === "uncertain") {
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "select_feeling", read: "uncertain" });
    return deliver(ctx, trainerId, source, "feeling", replyButtons(trainer.phone, copy.unsure(reply.clientName), ["Happy", "Short reply", "Not happy"].map((title, i) => ({ title, id: `m4:${replyId}:feeling:${i}` }))));
  }
  if (result.read === "unhappy") {
    const draft = copy.unhappyDraft(reply.clientName);
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "complete", read: "unhappy", kind: "unhappy", draft });
    const failure = await send("private-feedback", copy.unhappy(reply.clientName) + "\n\n" + text);
    return failure ?? deliver(ctx, trainerId, source, "private-draft", buttonPayload(trainer.phone, draft, draft, copy.sendTo(reply.clientName)));
  }
  if (result.read === "short" && !reply.followupUsed) {
    await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "select_question", read: "short" });
    return deliver(ctx, trainerId, source, "short", replyButtons(trainer.phone, copy.short(reply.clientName), questions.map(([title], i) => ({ title, id: `m4:${replyId}:question:${i}` }))));
  }
  // For the second short reply or a trainer's sentiment choice, source words
  // are the entire draft. No second model call, and nothing invented.
  let recommendation = result.recommendation ?? formatRecommendation([groupWording(text.replace(/^[\p{L} .'-]{1,80}:\s*/u, ""))], []);
  const draft = combinedReview(reply.clientName, recommendation);
  if (!draft) return send("error", copy.reviewError);
  const createdAt = Date.now();
  await ctx.runMutation(internal.m4Store.update, { trainerId, replyId, state: "complete", read: result.read, kind: "recommendation", draft });
  const failure = await send("happy", copy.happy(reply.clientName));
  const draftFailure = failure ?? await deliver(ctx, trainerId, source, "happy-draft", buttonPayload(trainer.phone, draft, draft, copy.sendTo(reply.clientName)));
  if (!draftFailure) await ctx.runMutation(internal.m5Store.start, { trainerId, name: reply.clientName, source: `${replyId}:recommendation`, phase: "asked", createdAt });
  return draftFailure;
}
async function choose(ctx: ActionCtx, trainerId: Id<"trainers">, replyId: Id<"replies">, source: string, forceList = false, cursor: string | null = null): Promise<string | null> {
  const data = await ctx.runQuery(internal.m4Store.context, { trainerId, replyId, cursor });
  if (!data.reply || !data.trainer) return "invalid_reply";
  const to = data.trainer.phone;
  if (data.clients.length === 1 && !data.cursor && !forceList) {
    const client = data.clients[0];
    return deliver(ctx, trainerId, source, "who", replyButtons(to, copy.isReply(client.name), [{ title: "Yes", id: `m4:${replyId}:client:${client._id}` }, { title: "Someone else", id: `m4:${replyId}:other` }]));
  }
  if (!data.clients.length && !data.cursor) return deliver(ctx, trainerId, source, "who-empty", textPayload(to, copy.noWaiting));
  const rows = data.clients.map((c: { _id: string; name: string }) => ({ id: `m4:${replyId}:client:${c._id}`, title: c.name.slice(0, 24) }));
  // Cursor tokens can exceed Meta's 200-character reply-ID cap: store page
  // lookup on the server rather than putting private cursor tokens in buttons.
  if (data.cursor) rows.push({ id: `m4:${replyId}:page:${cursor ? Number(source.split(':').at(-1)) + 1 : 1}`, title: "[COPY NEEDED: more]" });
  return deliver(ctx, trainerId, source, "who-list", replyList(to, copy.whose, rows, "[COPY NEEDED: list]"));
}
export const handle = internalAction({
  args: { inboundId: v.id("inbound"), reviewRead: v.optional(v.union(v.literal("short"), v.literal("unhappy"))) }, returns: v.object({ handled: v.boolean(), failure: v.union(v.string(), v.null()) }),
  handler: async (ctx, { inboundId, reviewRead }): Promise<{ handled: boolean; failure: string | null }> => {
    const message = await ctx.runQuery(internal.voice.inbound, { inboundId });
    if (!message) return { handled: false, failure: null };
    message.text = normalizeReviewInput(message.text);
    const trainerId = message.trainerId;
    const data = await ctx.runQuery(internal.m4Store.context, { trainerId });
    if (message.responseId?.startsWith("m4:")) {
      const [_, id, action, value] = message.responseId.split(":");
      // The only accepted reply ID is the latest session belonging to this trainer.
      const reply = data.reply;
      if (!reply || reply._id !== id) return { handled: true, failure: null };
      if (action === "client" && reply.state === "select_client") {
        const clientId = value as Id<"clients">;
        try {
          if (await ctx.runMutation(internal.m4Store.select, { trainerId, replyId: reply._id, clientId })) return { handled: true, failure: await classify(ctx, trainerId, reply._id, inboundId) };
        } catch { /* malformed or another trainer's client: ignore */ }
      } else if (action === "other" && reply.state === "select_client") return { handled: true, failure: await choose(ctx, trainerId, reply._id, inboundId, true) };
      else if (action === "page" && reply.state === "select_client" && /^\d{1,3}$/.test(value ?? "")) {
        let cursor: string | null = null;
        for (let n = 0; n < Number(value); n++) { const p: { cursor: string | null } = await ctx.runQuery(internal.m4Store.context, { trainerId, replyId: reply._id, cursor }); cursor = p.cursor; if (!cursor) return { handled: true, failure: null }; }
        return { handled: true, failure: await choose(ctx, trainerId, reply._id, `${inboundId}:${value}`, true, cursor) };
      } else if (action === "feeling" && reply.state === "select_feeling" && /^[0-2]$/.test(value ?? "")) {
        await ctx.runMutation(internal.m4Store.update, { trainerId, replyId: reply._id, state: "classifying" });
        return { handled: true, failure: await classify(ctx, trainerId, reply._id, inboundId, ["happy", "short", "unhappy"][Number(value)]) };
      } else if (action === "question" && reply.state === "select_question" && /^[0-2]$/.test(value ?? "")) {
        const draft = questions[Number(value)][1];
        const createdAt = Date.now();
        await ctx.runMutation(internal.m4Store.update, { trainerId, replyId: reply._id, state: "awaiting_followup", kind: "followup", draft });
        const failure = await deliver(ctx, trainerId, inboundId, "followup", buttonPayload(data.trainer!.phone, draft, draft, copy.sendTo(reply.clientName!)));
        if (!failure && reply.clientName) await ctx.runMutation(internal.m5Store.start, { trainerId, name: reply.clientName, source: `${reply._id}:followup`, phase: "waiting", createdAt });
        return { handled: true, failure };
      }
      return { handled: true, failure: null };
    }
    if (/^(?:hi|hello|hey|say\s+thanks|thanks|thank\s+you)[^\p{L}\p{N}]*$/iu.test(message.text.trim()) || /^who['’]s due\??$/i.test(message.text.trim()) || /^(?:new client |add )/i.test(message.text.trim())) return { handled: false, failure: null };
    if (message.type === "audio" && !message.mediaId) return { handled: true, failure: await deliver(ctx, trainerId, inboundId, "voice-invalid", textPayload(data.trainer!.phone, copy.voiceError)) };
    if (data.reply?.state === "select_client" && message.type === "text" && message.text.trim().split(/\s+/u).length <= 5 && /^[\p{L} .'-]{1,80}$/u.test(message.text.trim()) && !/^(?:hi|hello|hey|thanks|thank you)$/i.test(message.text.trim())) {
      if (await ctx.runMutation(internal.m4Store.selectName, { trainerId, replyId: data.reply._id, name: message.text.trim() })) return { handled: true, failure: await classify(ctx, trainerId, data.reply._id, inboundId) };
    }
    const trigger = /^\s*this is (?:a )?reply\s*[:.!]?\s*([\s\S]*)$/i.exec(message.text);
    const explicitName = /^(?:this is a review\s*[:.!]?\s*)?([\p{L} .'-]{1,80}):/iu.exec(message.text.trim())?.[1].trim();
    if (explicitName && await ctx.runQuery(internal.m4Store.pausedName, { trainerId, name: explicitName })) {
      const pausedReply = await ctx.runMutation(internal.m4Store.begin, { inboundId, transcript: message.text, name: explicitName });
      return { handled: true, failure: await classify(ctx, trainerId, pausedReply, inboundId) };
    }
    if (!reviewRead && /^\s*this is a review\b/i.test(message.text)) {
      await ctx.runMutation(internal.m4Store.endPending, { trainerId });
      return { handled: false, failure: null };
    }
    const waitingFollowup = data.reply?.state === "awaiting_followup";
    if (!message.forwarded && message.type !== "audio" && !trigger && !waitingFollowup && !reviewRead) return { handled: false, failure: null };
    if (message.type !== "audio" && message.type !== "text") return { handled: false, failure: null };
    const text = trigger ? trigger[1] : message.text.replace(/^\s*this is a review\s*[:.!]?\s*/i, "");
    const label = reviewRead ? /^([\p{L} .'-]{1,80}):/u.exec(text)?.[1].trim() : undefined;
    const replyId = await ctx.runMutation(internal.m4Store.begin, { inboundId, transcript: message.type === "audio" ? "" : text, ...(reviewRead ? { read: reviewRead } : {}), ...(label ? { name: label } : {}) });
    const session = await ctx.runQuery(internal.m4Store.context, { trainerId, replyId });
    return { handled: true, failure: session.reply?.clientName ? await classify(ctx, trainerId, replyId, inboundId, reviewRead) : await choose(ctx, trainerId, replyId, inboundId) };
  },
});
