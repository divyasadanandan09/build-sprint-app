import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { inspectIncoming, validSignature } from "./lib/webhook";
const http = httpRouter();
http.route({ path: "/privacy", method: "GET", handler: httpAction(async () => {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>Privacy policy</h1><p>This WhatsApp assistant helps fitness trainers turn their clients' feedback into recommendations. We store the trainer's WhatsApp number, the names and start dates of clients she adds, and the reviews and replies she forwards to us, so the assistant can draft messages for her. Voice notes are deleted once transcribed. We never message clients, never read WhatsApp groups, and never sell or share data. To delete your data, message the assistant "Delete my data" or email emailpromo97@gmail.com</p></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}) });
http.route({ path: "/whatsapp", method: "GET", handler: httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected) return new Response("Webhook configuration missing", { status: 503 });
  if (url.searchParams.get("hub.mode") !== "subscribe" || url.searchParams.get("hub.verify_token") !== expected) return new Response("Forbidden", { status: 403 });
  const challenge = url.searchParams.get("hub.challenge");
  return challenge ? new Response(challenge, { status: 200 }) : new Response("Missing challenge", { status: 400 });
}) });
http.route({ path: "/whatsapp", method: "POST", handler: httpAction(async (ctx, request) => {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const log = {
    signature_valid: null as boolean | null,
    phone_number_id: [] as string[],
    contains_messages: false,
    contains_statuses: false,
    message_type: [] as string[],
    ignored_entry_reasons: [] as string[],
    ignored_reason: null as string | null,
    queued_messages: 0,
  };
  let stage = "body_read_failed";
  try {
    const raw = await request.arrayBuffer();
    if (raw.byteLength > 1_000_000) {
      log.ignored_reason = !secret || !phoneId ? "missing_configuration" : "payload_too_large";
      return new Response(!secret || !phoneId ? "Webhook configuration missing" : "Payload too large", { status: !secret || !phoneId ? 503 : 413 });
    }
    let jsonValid = true;
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { jsonValid = false; }
    const inspected = inspectIncoming(body, phoneId);
    Object.assign(log, inspected.diagnostics);
    stage = "signature_check_failed";
    if (secret) log.signature_valid = await validSignature(raw, request.headers.get("x-hub-signature-256"), secret);
    if (!secret || !phoneId) {
      log.ignored_reason = !secret ? "missing_app_secret" : "missing_configured_phone_number_id";
      return new Response("Webhook configuration missing", { status: 503 });
    }
    if (!log.signature_valid) {
      log.ignored_reason = "invalid_signature";
      return new Response("Invalid signature", { status: 401 });
    }
    if (!jsonValid) {
      log.ignored_reason = "invalid_json";
      return new Response("Invalid JSON", { status: 400 });
    }
    const messages = inspected.messages;
    if (messages.length > 100) {
      log.ignored_reason = "batch_too_large";
      return new Response("Batch too large", { status: 413 });
    }
    stage = "enqueue_failed";
    log.queued_messages = await ctx.runMutation(internal.m2Store.receive, { messages });
    if (!messages.length) log.ignored_reason = log.ignored_entry_reasons.join(",") || "no_supported_messages";
    else if (!log.queued_messages) log.ignored_reason = "duplicate_message_ids";
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch {
    log.ignored_reason = stage;
    return new Response("Webhook processing failed", { status: 500 });
  } finally {
    // Exactly one application log line per POST, including rejected requests.
    console.info("whatsapp_post " + JSON.stringify(log));
  }
}) });
export default http;
