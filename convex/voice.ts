import { v } from "convex/values";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { limitedBytes, splitVoice } from "./lib/voice";
export const inbound = internalQuery({ args: { inboundId: v.id("inbound") }, returns: v.any(), handler: (ctx, args) => ctx.db.get(args.inboundId) });
export const transcribe = internalAction({
  args: { inboundId: v.id("inbound"), trainerId: v.id("trainers") }, returns: v.object({ read: v.union(v.literal("ok"), v.literal("error"), v.literal("long"), v.literal("text_long"), v.literal("busy")), text: v.string() }),
  handler: async (ctx, args): Promise<{ read: "ok" | "error" | "long" | "text_long" | "busy"; text: string }> => {
    const message = await ctx.runQuery(internal.voice.inbound, { inboundId: args.inboundId });
    if (!message || message.trainerId !== args.trainerId || !message.mediaId || !/^\d{1,40}$/.test(message.mediaId)) return { read: "error", text: "" };
    const token = process.env.WHATSAPP_TOKEN, key = process.env.SARVAM_API_KEY;
    if (!token || !key) return { read: "busy", text: "" };
    try {
      const meta = await fetch(`https://graph.facebook.com/v25.0/${message.mediaId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
      if (!meta.ok) return { read: "error", text: "" };
      const data = await meta.json() as { url?: string; file_size?: number };
      if (!data.url || (data.file_size ?? 0) > 8_000_000) return { read: "error", text: "" };
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.username || url.password || !(url.hostname === "lookaside.fbsbx.com" || url.hostname.endsWith(".fbsbx.com") || url.hostname === "graph.facebook.com")) return { read: "error", text: "" };
      const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(15_000) });
      const chunks = splitVoice(await limitedBytes(response));
      const transcripts: string[] = [];
      for (const bytes of chunks) {
        if (!await ctx.runMutation(internal.drafting.reserveCall, {})) return { read: "busy", text: "" };
        const form = new FormData();
        form.set("file", new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "audio/ogg" }), "voice.ogg");
        form.set("model", "saaras:v3"); form.set("mode", "transcribe"); form.set("language_code", "unknown");
        const result = await fetch("https://api.sarvam.ai/speech-to-text", { method: "POST", headers: { "api-subscription-key": key }, body: form, signal: AbortSignal.timeout(30_000) });
        if (!result.ok) return { read: result.status === 429 || result.status >= 500 ? "busy" : "error", text: "" };
        const parsed = await result.json() as { transcript?: string };
        if (typeof parsed.transcript !== "string" || !parsed.transcript.trim()) return { read: "error", text: "" };
        transcripts.push(parsed.transcript.trim());
      }
      const text = transcripts.join(" ");
      return text.length <= 2000 ? { read: "ok", text } : { read: "text_long", text: "" };
    } catch (error) { return { read: error instanceof Error && error.message === "long_audio" ? "long" : "error", text: "" }; }
  },
});
