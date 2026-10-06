import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import agentTest from "@convex-dev/agent/test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { copy } from "../convex/lib/copy";
import { parseClient } from "../convex/lib/dates";
import { sendWhatsApp, textPayload } from "../convex/lib/whatsapp";
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@convex-dev/agent", () => ({ Agent: class { generateText = generate; } }));
const modules = import.meta.glob("../convex/**/*.ts");
const review = "I enjoy the dance classes. I look forward to the music every morning.";
const fakePhone = "919000000001";
const fakePhoneId = "123456789";
let calls: Record<string, any>[];
let locked: boolean;
let t: ReturnType<typeof convexTest<typeof schema>>;
function envelope(text = review, id = "fake-message-1", phone = fakePhone, type = "text") {
  return { object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: fakePhoneId }, contacts: [{ wa_id: phone, profile: { name: "Test Trainer" } }], messages: [{ id, from: phone, type, text: { body: text } }] } }] }] };
}
async function sign(body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("fake-app-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const result = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return "sha256=" + Array.from(new Uint8Array(result), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function post(body: unknown, signature?: string) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return t.fetch("/whatsapp", { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature ?? await sign(raw) }, body: raw });
}
async function drain() { await t.finishAllScheduledFunctions(() => vi.runAllTimers()); }
async function records(table: "trainers" | "inbound" | "drafts" | "outbound" | "clients" | "pending") {
  // Small isolated test database, never production data.
  return t.run((ctx) => ctx.db.query(table).collect());
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T04:00:00Z"));
  vi.stubEnv("WHATSAPP_APP_SECRET", "fake-app-secret");
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "fake-verify-token");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", fakePhoneId);
  vi.stubEnv("WHATSAPP_TOKEN", "fake-whatsapp-token");
  vi.stubEnv("OPENAI_API_KEY", "fake-openai-key");
  vi.stubEnv("SARVAM_API_KEY", "fake-sarvam-key");
  calls = []; locked = false;
  generate.mockReset().mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: null, passages: [review] }) });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (!url.startsWith("https://graph.facebook.com/")) throw new Error("Unexpected provider call: OpenAI and Sarvam must remain mocked");
    const payload = JSON.parse(options.body as string); calls.push(payload);
    return locked ? new Response(JSON.stringify({ error: { code: 131031, message: "Account locked" } }), { status: 400 }) : new Response(JSON.stringify("typing_indicator" in payload ? { success: true } : { messages: [{ id: `fake-out-${calls.length}` }] }), { status: 200 });
  }));
  t = convexTest(schema, modules);
  workflowTest.register(t); rateLimiterTest.register(t); agentTest.register(t);
});
afterEach(async () => { await drain(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("M2 signed webhook and onboarding", () => {
  it("saves a client from a conversational joined-on message, including copied Unicode spacing", async () => {
    await post(envelope("New client\u202fAnanya joined on 12 Sept\u202f\u2060.", "natural-client")); await drain();
    const client = (await records("clients"))[0];
    expect(client.name).toBe("Ananya"); expect(client.startDate).toBe("2026-09-12"); expect(client.dueDate).toBe("2026-10-10");
    expect(calls.at(-1)?.text.body).toBe(copy.saved("Ananya", "10 Oct 2026"));
    expect(generate).not.toHaveBeenCalled();
  });
  it("rejects an invalid date in a conversational client message", async () => {
    await post(envelope("New client Ananya joined on 31 Feb.", "invalid-natural-client")); await drain();
    expect(await records("clients")).toHaveLength(0); expect(calls.at(-1)?.text.body).toBe(copy.dateError);
    expect(generate).not.toHaveBeenCalled();
  });
  it("accepts spaced reviewer labels and direct-address reviews despite harmless AI rewriting differences", async () => {
    const source = "Mayuri, your dance sessions are cheerful. You guide us through the steps. I enjoy learning with the group.";
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [source], groupPassages: ["Mayuri’s dance sessions are cheerful. She guides us through the steps. I enjoy learning with the group."] }) });
    await post(envelope("Priya : " + source)); await drain();
    expect((await records("drafts"))[0].recommendation).toBe("Mayuri's dance sessions are cheerful. She guides us through the steps. I enjoy learning with the group.");
    expect(calls.some((c) => c.text?.body === copy.reviewError)).toBe(false);
    expect(calls.some((c) => c.text?.body === copy.nextClient)).toBe(false);
  });
  it("recognizes a conversational review trigger and a review following the trigger", async () => {
    await post(envelope("This is a review", "review-trigger")); await drain();
    expect(calls.at(-1)?.text.body).toBe(copy.reviewInvitation); expect(generate).not.toHaveBeenCalled();
    await post(envelope("This is a review: Priya : " + review, "trigger-with-review")); await drain();
    expect(await records("drafts")).toHaveLength(1);
    expect(generate.mock.calls[0][2].prompt).toBe(JSON.stringify({ review: "Priya : " + review }));
  });
  it("accepts a reviewer name with spaces around the colon", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [review] }) });
    await post(envelope("Priya : " + review)); await drain();
    expect(await records("drafts")).toHaveLength(1);
    expect(calls.some((c) => c.text?.body === copy.ask("Priya"))).toBe(true);
  });
  it("keeps the client as I, addresses Mayuri in third person, and preserves formatting in the send button", async () => {
    const original = "I love your classes. I feel more energetic.";
    const wording = "I love Mayuri's classes. I feel more energetic.";
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [original], groupPassages: [wording], highlights: ["I feel more energetic"] }) });
    await post(envelope("Priya: " + original)); await drain();
    const expected = "I love Mayuri's classes. *I feel more energetic*.";
    expect(calls.find((c) => c.text?.body === expected)).toBeDefined();
    const button = calls.find((c) => c.interactive)?.interactive.action.parameters;
    expect(decodeURIComponent(button.url.split("?text=")[1])).toContain(expected);
  });
  it("adds paragraph spacing to long reviews and discards invented highlights", async () => {
    const longReview = "I enjoy the dance classes and look forward to the music every morning because each class gives me something enjoyable to start the day with. I feel happier after each session and enjoy spending time with the people in my class. I have been attending regularly and appreciate the familiar routine each week. I enjoy the songs and always look forward to the next class.";
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [longReview], highlights: ["I feel happier after each session", "I lost ten kilos"] }) });
    await post(envelope("Priya: " + longReview)); await drain();
    const draft = (await records("drafts"))[0].recommendation;
    expect(draft).toContain("\n\n"); expect(draft).toContain("*I feel happier after each session*");
    expect(draft).not.toContain("ten kilos");
    expect(draft.replaceAll("*", "").replaceAll("\n\n", " ")).toBe(longReview);
  });
  it("discards invented rewritten results without rejecting a valid source review", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [review], groupPassages: [review + " I lost ten kilos."] }) });
    await post(envelope("Priya: " + review)); await drain();
    expect((await records("drafts"))[0].recommendation).toBe(review);
    expect(calls.some((c) => c.text?.body?.includes("ten kilos"))).toBe(false);
  });
  it("ignores emoji reactions without replying or calling AI", async () => {
    await post(envelope("", "reaction-test", fakePhone, "reaction")); await drain();
    expect(calls).toHaveLength(0); expect(generate).not.toHaveBeenCalled();
    expect((await records("inbound"))[0].state).toBe("processed");
  });
  it("uses DESIGN fallback for say thanks and emoji-only text without treating them as reviews", async () => {
    for (const [index, text] of ["say thanks", "thanks", "Thanks!", "thank you", "Thanks 😊", "😊", "🙏🏽 ❤️"].entries()) {
      await post(envelope(text, `non-review-${index}`)); await drain();
      expect(calls.at(-1)?.text.body).toBe(copy.fallback);
    }
    expect(generate).not.toHaveBeenCalled(); expect(await records("drafts")).toHaveLength(0);
  });
  it("preserves emojis in a detailed review and returns both drafts", async () => {
    const praise = review + " 😊💃🏽";
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [praise] }) });
    await post(envelope("Priya: " + praise)); await drain();
    expect(calls.some((c) => c.text?.body === praise)).toBe(true);
    expect(calls.some((c) => c.text?.body === copy.ask("Priya"))).toBe(true);
  });
  it("logs exactly one safe line for an ignored phone-number ID mismatch", async () => {
    const logger = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      const body = envelope("PRIVATE TEXT MUST NOT BE LOGGED");
      body.entry[0].changes[0].value.metadata.phone_number_id = "987654321";
      expect((await post(body)).status).toBe(200);
      const lines = logger.mock.calls.filter(([line]) => typeof line === "string" && line.startsWith("whatsapp_post "));
      expect(lines).toHaveLength(1);
      const raw = lines[0][0] as string;
      expect(JSON.parse(raw.slice("whatsapp_post ".length))).toMatchObject({ signature_valid: true, phone_number_id: ["987654321"], contains_messages: true, contains_statuses: false, message_type: ["text"], ignored_reason: "phone_number_id_mismatch", queued_messages: 0 });
      for (const privateValue of ["PRIVATE TEXT MUST NOT BE LOGGED", "Test Trainer", fakePhone, "fake-app-secret", "fake-whatsapp-token", "fake-message-1"]) expect(raw).not.toContain(privateValue);
    } finally { logger.mockRestore(); }
  });
  it("logs invalid signatures, malformed JSON and missing configuration once each", async () => {
    const logger = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await post(envelope(), "sha256=" + "0".repeat(64));
      await post("{");
      vi.stubEnv("WHATSAPP_APP_SECRET", "");
      await post(envelope());
      const logs = logger.mock.calls.filter(([line]) => typeof line === "string" && line.startsWith("whatsapp_post ")).map(([line]) => JSON.parse((line as string).slice("whatsapp_post ".length)));
      expect(logs).toHaveLength(3);
      expect(logs.map((log) => log.ignored_reason)).toEqual(["invalid_signature", "invalid_json", "missing_app_secret"]);
      expect(logs.map((log) => log.signature_valid)).toEqual([false, true, null]);
      expect(await records("inbound")).toHaveLength(0);
    } finally { logger.mockRestore(); }
  });
  it("logs status-only payloads without logging recipient numbers or status details", async () => {
    const logger = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await post({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: fakePhoneId }, statuses: [{ recipient_id: fakePhone, status: "delivered", private_detail: "NEVER LOG THIS" }] } }] }] });
      const lines = logger.mock.calls.filter(([line]) => typeof line === "string" && line.startsWith("whatsapp_post "));
      expect(lines).toHaveLength(1);
      const raw = lines[0][0] as string;
      expect(JSON.parse(raw.slice("whatsapp_post ".length))).toMatchObject({ signature_valid: true, phone_number_id: [fakePhoneId], contains_messages: false, contains_statuses: true, message_type: [], ignored_reason: "statuses_only" });
      expect(raw).not.toContain(fakePhone); expect(raw).not.toContain("NEVER LOG THIS");
    } finally { logger.mockRestore(); }
  });
  it("logs accepted and duplicate messages separately and sanitizes unknown message types", async () => {
    const logger = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await post(envelope("Hi")); await post(envelope("Hi"));
      const body = envelope("PRIVATE TEXT", "fake-other-id", fakePhone, "PRIVATE TYPE NAME");
      body.entry[0].changes[0].value.metadata.phone_number_id = "PRIVATE INVALID ID";
      await post(body);
      const logs = logger.mock.calls.filter(([line]) => typeof line === "string" && line.startsWith("whatsapp_post ")).map(([line]) => JSON.parse((line as string).slice("whatsapp_post ".length)));
      expect(logs).toHaveLength(3);
      expect(logs[0]).toMatchObject({ signature_valid: true, message_type: ["text"], ignored_reason: null, queued_messages: 1 });
      expect(logs[1]).toMatchObject({ ignored_reason: "duplicate_message_ids", queued_messages: 0 });
      expect(logs[2]).toMatchObject({ phone_number_id: [], message_type: ["unknown"], ignored_reason: "phone_number_id_mismatch" });
      expect(JSON.stringify(logs)).not.toContain("PRIVATE");
    } finally { logger.mockRestore(); }
  });
  it("verifies Meta's challenge and refuses a wrong token", async () => {
    expect(await (await t.fetch("/whatsapp?hub.mode=subscribe&hub.verify_token=fake-verify-token&hub.challenge=123")).text()).toBe("123");
    expect((await t.fetch("/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123")).status).toBe(403);
  });
  it("rejects unsigned and altered bodies before saving anything", async () => {
    expect((await post(envelope(), "sha256=" + "0".repeat(64))).status).toBe(401);
    const original = JSON.stringify(envelope());
    expect((await post(envelope("altered"), await sign(original))).status).toBe(401);
    expect(await records("trainers")).toHaveLength(0); expect(generate).not.toHaveBeenCalled();
  });
  it("fails closed when the app secret is missing", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", ""); expect((await post(envelope())).status).toBe(503);
    expect(await records("inbound")).toHaveLength(0);
  });
  it("rejects malformed signed JSON", async () => { expect((await post("{")).status).toBe(400); });
  it("ignores delivery statuses and messages for a different agent number", async () => {
    expect((await post({ object: "whatsapp_business_account", entry: [] })).status).toBe(200);
    const body = envelope(); body.entry[0].changes[0].value.metadata.phone_number_id = "999";
    expect((await post(body)).status).toBe(200); await drain(); expect(await records("trainers")).toHaveLength(0); expect(calls).toHaveLength(0);
  });
  it("welcomes the trainer without making an AI call", async () => {
    expect((await post(envelope("Hi"))).status).toBe(200); await drain();
    expect(calls.map((c) => c.text?.body)).toEqual([copy.welcome]); expect(generate).not.toHaveBeenCalled(); expect(await records("trainers")).toHaveLength(1);
  });
  it("sends separate drafts and buttons without a next-client question; saves a client the instructor initiates", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [review] }) });
    expect((await post(envelope("Priya: " + review))).status).toBe(200); await drain();
    const messages = calls.filter((c) => !("typing_indicator" in c));
    expect(messages[0].text.body).toBe(review);
    expect(messages[1].text.body).toBe(copy.ask("Priya"));
    const button = messages[2].interactive.action.parameters;
    expect(button.display_text).toBe("Send revised review");
    expect(decodeURIComponent(button.url.split("?text=")[1])).toBe(review);
    expect(messages).toHaveLength(4);
    expect(messages.filter((message) => message.interactive)).toHaveLength(2);
    const askButton = messages[3].interactive.action.parameters;
    expect(askButton.display_text).toBe("Ask client to post");
    expect(decodeURIComponent(askButton.url.split("?text=")[1])).toBe(copy.ask("Priya"));
    expect(askButton.display_text.length).toBeLessThanOrEqual(20);
    expect(calls.some((c) => c.text?.body === copy.nextClient)).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await records("pending")).toHaveLength(0);
    expect((await records("inbound"))[0].state).toBe("processed");
    await post(envelope("Ananya, 12 Sept", "fake-message-2")); await drain();
    const client = (await records("clients"))[0];
    expect(client.name).toBe("Ananya"); expect(client.startDate).toBe("2026-09-12"); expect(client.dueDate).toBe("2026-10-10");
    expect(calls.at(-1)?.text.body).toBe(copy.saved("Ananya", "10 Oct 2026"));
    expect(await records("pending")).toHaveLength(0);
    // Separate reads after processing model closing/reopening the chat.
    expect((await records("clients"))[0]._id).toBe(client._id);
    if (process.env.M2_SHOW_EXCHANGE === "1") {
      console.info("MOCK EXCHANGE — made-up review; no provider calls");
      console.info("Trainer: Priya: " + review);
      for (const message of messages) {
        console.info("Agent: " + (message.text?.body ?? message.interactive.body.text));
        if (message.interactive) console.info("Button: " + message.interactive.action.parameters.display_text + " → " + message.interactive.action.parameters.url);
      }
      console.info("Trainer: Ananya, 12 Sept");
      console.info("Agent: " + calls.at(-1)?.text.body);
      console.info("Saved client: Ananya; start 2026-09-12; due 2026-10-10; still present on a new read");
    }
  });
  it("uses the exact DESIGN ask and ready wording for a supplied client name", async () => {
    const named = "Priya: " + review;
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [review] }) });
    await post(envelope(named)); await drain();
    expect(calls.some((c) => c.text?.body === copy.ask("Priya"))).toBe(true);
    expect(calls.some((c) => c.interactive?.body.text === copy.ready("Priya"))).toBe(true);
  });
  it("deduplicates simultaneous webhook retries without prompting for a client", async () => {
    await Promise.all([post(envelope()), post(envelope())]); await drain();
    expect(await records("inbound")).toHaveLength(1); expect(await records("drafts")).toHaveLength(1);
    expect(generate).toHaveBeenCalledTimes(1); expect(calls.filter((c) => c.text?.body === copy.nextClient)).toHaveLength(0);
  });
  it("records Meta 131031 as blocked without pretending the drafts were sent or scheduling the question", async () => {
    locked = true; await post(envelope()); await drain();
    expect(await records("drafts")).toHaveLength(1);
    const out = await records("outbound"); expect(out).toHaveLength(1); expect(out[0].state).toBe("blocked"); expect(out[0].providerCode).toBe(131031);
    expect(await records("pending")).toHaveLength(0); expect((await records("inbound"))[0].failure).toBe("whatsapp_account_locked");
    await post(envelope()); await drain(); expect(generate).toHaveBeenCalledTimes(1);
  });
  it("does not resend a partial sequence or ask for the next client after its ask fails", async () => {
    const normalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
      const payload = JSON.parse(options.body as string);
      if (payload.text?.body === copy.ask(null)) return new Response(JSON.stringify({ error: { code: 131031 } }), { status: 400 });
      return normalFetch(url, options);
    }));
    await post(envelope()); await drain();
    const out = await records("outbound");
    expect(out.map((o) => o.state)).toEqual(["sent", "blocked"]);
    expect(await records("pending")).toHaveLength(0);
    await post(envelope()); await drain();
    expect(await records("outbound")).toHaveLength(2); expect(generate).toHaveBeenCalledTimes(1);
  });
  it("does not send legacy scheduled next-client questions", async () => {
    const trainerId = await t.run((ctx) => ctx.db.insert("trainers", { phone: fakePhone, name: "Test Trainer", waitDays: 28, joinedAt: Date.now() }));
    const inboundId = await t.run((ctx) => ctx.db.insert("inbound", { trainerId, messageId: "legacy-timer", text: review, type: "text", state: "processed", receivedAt: Date.now() }));
    const draftId = await t.mutation(internal.m2Store.saveDraft, { inboundId, recommendation: review, ask: copy.ask(null), clientName: null });
    const pendingId = await t.run((ctx) => ctx.db.insert("pending", { trainerId, draftId, state: "scheduled", scheduledAt: Date.now() }));
    await t.action(internal.onboarding.nextClient, { pendingId });
    expect(calls).toHaveLength(0);
  });
  it("will not save a next client against another trainer's pending question", async () => {
    await post(envelope()); await drain();
    const draft = (await records("drafts"))[0];
    const pendingId = await t.run((ctx) => ctx.db.insert("pending", { trainerId: draft.trainerId, draftId: draft._id, state: "awaiting_client", scheduledAt: Date.now() }));
    const otherTrainerId = await t.run((ctx) => ctx.db.insert("trainers", { phone: "919000000003", name: "Other Trainer", waitDays: 28, joinedAt: Date.now() }));
    expect(await t.mutation(internal.m2Store.saveClient, { trainerId: otherTrainerId, pendingId, name: "Ananya", startDate: "2026-09-12", dueDate: "2026-10-10" })).toBe(false);
    expect(await records("clients")).toHaveLength(0);
  });
  it("keeps trainer records and clients separate", async () => {
    await post(envelope()); await post(envelope(review, "other-review", "919000000002")); await drain();
    await post(envelope("Ananya, 12 Sept", "next-1")); await post(envelope("Ananya, 15 Sept", "next-2", "919000000002")); await drain();
    const clients = await records("clients"); expect(clients).toHaveLength(2); expect(clients[0].trainerId).not.toBe(clients[1].trainerId);
    expect(new Set(clients.map((c) => c.startDate)).size).toBe(2);
  });
  it("rejects more than 2000 characters without calling AI", async () => {
    await post(envelope("x".repeat(2001))); await drain(); expect(generate).not.toHaveBeenCalled(); expect(calls.at(-1)?.text.body).toBe(copy.reviewError);
  });
  it("does not call Sarvam for voice notes in M2", async () => {
    await post(envelope("", "voice-message", fakePhone, "audio")); await drain(); expect(generate).not.toHaveBeenCalled(); expect(calls.at(-1)?.text.body).toBe(copy.reviewError);
  });
  it("uses a copy placeholder on AI failure", async () => {
    generate.mockRejectedValue(new Error("Fake provider failure")); await post(envelope()); await drain();
    expect(calls.at(-1)?.text.body).toBe(copy.busy); expect(await records("drafts")).toHaveLength(0);
  });
  it("never sends a sharing ask for an unhappy or short input", async () => {
    for (const read of ["unhappy", "short"]) {
      generate.mockResolvedValue({ text: JSON.stringify({ read, clientName: null, passages: [] }) });
      await post(envelope(review, `fake-${read}`)); await drain();
    }
    expect(await records("drafts")).toHaveLength(0); expect(calls.every((c) => !c.interactive)).toBe(true);
  });
  it("rejects invented recommendation words and names", async () => {
    generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Invented", passages: ["I lost ten kilos"] }) });
    await post(envelope()); await drain(); expect(await records("drafts")).toHaveLength(0); expect(calls.at(-1)?.text.body).toBe(copy.reviewError);
  });
  it("limits AI calls to 100 an hour globally", async () => {
    for (let i = 0; i < 100; i++) expect(await t.mutation(internal.drafting.reserveCall, {})).toBe(true);
    expect(await t.mutation(internal.drafting.reserveCall, {})).toBe(false);
    // Check the action at the same instant; draining workflow timers can move
    // the fake clock into the next allowed rate-limit window.
    expect((await t.action(internal.drafting.fromText, { text: review })).read).toBe("busy");
    expect(generate).not.toHaveBeenCalled();
  });
  it("rejects bad instructor-initiated client dates without creating a pending question", async () => {
    await post(envelope()); await drain(); await post(envelope("Ananya, 31 Feb", "bad-date")); await drain();
    expect(await records("clients")).toHaveLength(0); expect(calls.at(-1)?.text.body).toBe(copy.dateError); expect(await records("pending")).toHaveLength(0);
  });
});
describe("M2 provider and dates", () => {
  it("records missing credentials and network failures without logging keys", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", ""); expect(await sendWhatsApp(textPayload(fakePhone, "test"))).toMatchObject({ ok: false, reason: "missing_configuration" });
    vi.stubEnv("WHATSAPP_TOKEN", "fake-token"); vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fake timeout")));
    expect(await sendWhatsApp(textPayload(fakePhone, "test"))).toMatchObject({ ok: false, reason: "network_error" });
  });
  it("rejects a malformed successful send response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    expect(await sendWhatsApp(textPayload(fakePhone, "test"))).toMatchObject({ ok: false, reason: "provider_error" });
  });
  it("parses dates using IST, rejects future dates, and handles a missing year", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseClient("Ananya, 12 Dec", now)?.startDate).toBe("2025-12-12");
    expect(parseClient("Ananya, 12 Dec 2026", now)).toBeNull();
    expect(parseClient("Ananya, 29 Feb 2025", now)).toBeNull();
  });
});
