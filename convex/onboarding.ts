import { v } from "convex/values";
import { internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { copy } from "./lib/copy";
import { isClientMessage, parseClient } from "./lib/dates";
import { buttonPayload, sendWhatsApp, textPayload, typingPayload, type WhatsAppPayload } from "./lib/whatsapp";

async function deliver(ctx: ActionCtx, trainerId: Id<"trainers">, source: string, part: string, payload: WhatsAppPayload): Promise<string | null> {
  const outboundId = await ctx.runMutation(internal.m2Store.beginSend, { trainerId, source, part, payload: JSON.stringify(payload) });
  if (!outboundId) return "send_already_attempted";
  const result = await sendWhatsApp(payload);
  await ctx.runMutation(internal.m2Store.finishSend, { outboundId, state: result.ok ? "sent" : result.reason === "account_locked" ? "blocked" : "failed", providerMessageId: result.ok ? result.messageId : null, providerCode: result.ok ? null : result.code, failure: result.ok ? null : result.reason });
  return result.ok ? null : `whatsapp_${result.reason}`;
}
export const process = internalAction({
  args: { inboundId: v.id("inbound") }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const message = await ctx.runMutation(internal.m2Store.claim, args);
    if (!message) return null;
    const reviewTrigger = /^\s*this is a review(?:\s*[:.!]?\s*)([\s\S]*)$/i.exec(message.text);
    const reviewText = reviewTrigger ? reviewTrigger[1].trim() : message.text;
    let failure: string | null = null;
    try {
      const send = (part: string, body: string) => deliver(ctx, message.trainerId, message.inboundId, part, textPayload(message.phone, body));
      if (message.type === "reaction") {
        // A reaction acknowledges an existing message; it is not a new review.
      }
      else if (message.type !== "text" || !message.text.trim() || message.text.length > 2000) failure = await send("error", copy.reviewError);
      else if (/^(?:say\s+thanks|thanks|thank\s+you)[^\p{L}\p{N}]*$/iu.test(message.text.trim()) || !/[\p{L}\p{N}]/u.test(message.text)) failure = await send("fallback", copy.fallback);
      else if (/^(hi|hello|hey)[!.\s]*$/i.test(message.text.trim())) failure = await send("welcome", copy.welcome);
      else if (reviewTrigger && !reviewText) failure = await send("review-invitation", copy.reviewInvitation);
      else if (!reviewTrigger && isClientMessage(message.text)) {
        const client = parseClient(message.text, Date.now());
        if (!client) failure = await send("date-error", copy.dateError);
        else {
          const saved = await ctx.runMutation(internal.m2Store.saveClient, { trainerId: message.trainerId, pendingId: message.pendingId, name: client.name, startDate: client.startDate, dueDate: client.dueDate });
          failure = await send("client-saved", saved ? copy.saved(client.name, client.displayDueDate) : copy.duplicateClient);
        }
      } else {
        // A refused typing indicator must not discard an otherwise valid review.
        await sendWhatsApp(typingPayload(message.messageId));
        const result = await ctx.runAction(internal.drafting.fromText, { text: reviewText });
        if (result.read !== "happy" || !result.recommendation || !result.ask) failure = await send("error", result.read === "busy" ? copy.busy : result.read === "off_topic" ? copy.fallback : copy.reviewError);
        else {
          const draftId = await ctx.runMutation(internal.m2Store.saveDraft, { inboundId: message.inboundId, recommendation: result.recommendation, ask: result.ask, clientName: result.clientName });
          failure = await send("recommendation", result.recommendation);
          if (!failure) failure = await send("ask", result.ask);
          if (!failure) failure = await deliver(ctx, message.trainerId, message.inboundId, "send-button", buttonPayload(message.phone, copy.ready(result.clientName), result.recommendation, copy.sendReview));
          if (!failure) failure = await deliver(ctx, message.trainerId, message.inboundId, "ask-button", buttonPayload(message.phone, result.ask, result.ask, copy.sendAsk));
        }
      }
    } catch { failure = "processing_failed"; }
    await ctx.runMutation(internal.m2Store.finish, { inboundId: message.inboundId, failure });
    return null;
  },
});
export const nextClient = internalAction({
  args: { pendingId: v.id("pending") }, returns: v.null(),
  handler: async (ctx, { pendingId }): Promise<null> => {
    await ctx.runMutation(internal.m2Store.claimQuestion, { pendingId });
    return null;
  },
});
