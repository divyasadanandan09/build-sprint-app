import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import agentTest from "@convex-dev/agent/test";
import schema from "../convex/schema";
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@convex-dev/agent", () => ({ Agent: class { generateText = generate; } }));
const modules = import.meta.glob("../convex/**/*.ts");
let t: ReturnType<typeof convexTest<typeof schema>>;
let sent: any[], counter: number;
const praise = "I enjoy the music and look forward to every class.";
const phone = "919000000041";
async function post(text: string, extra: Record<string, unknown> = {}, sender = phone) {
  const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "123456789" }, messages: [{ id: `m4-${++counter}`, from: sender, type: "text", text: { body: text }, ...extra }] } }] }] });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("fake-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))), b => b.toString(16).padStart(2, "0")).join("");
  expect((await t.fetch("/whatsapp", { method: "POST", body: raw, headers: { "X-Hub-Signature-256": `sha256=${sig}` } })).status).toBe(200);
  await t.finishAllScheduledFunctions(() => vi.runAllTimers(), 2000);
}
async function tap(id: string, sender = phone) { await post("", { type: "interactive", interactive: { button_reply: { id, title: "ignored title" } } }, sender); }
async function seed(name = "M4 Test Ria", sender = phone) {
  return t.run(async ctx => {
    const trainer = await ctx.db.query("trainers").withIndex("by_phone", q => q.eq("phone", sender)).first();
    const trainerId = trainer?._id ?? await ctx.db.insert("trainers", { phone: sender, name: "Test Trainer", waitDays: 28, joinedAt: Date.now() });
    return ctx.db.insert("clients", { trainerId, name, startDate: "2026-09-01", dueDate: "2026-09-29", waitDays: 28, status: "checked_in", reminderUsed: false, lastStepAt: Date.now() });
  });
}
const buttons = () => sent.at(-1).interactive.action.buttons;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
  for (const [key, value] of Object.entries({ WHATSAPP_APP_SECRET: "fake-secret", WHATSAPP_PHONE_NUMBER_ID: "123456789", WHATSAPP_TOKEN: "fake-token", OPENAI_API_KEY: "fake-openai", SARVAM_API_KEY: "fake-sarvam", APP_TIMING_MODE: "dev" })) vi.stubEnv(key, value);
  sent = []; counter = 0; generate.mockReset().mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: null, passages: [praise] }) });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (!url.startsWith("https://graph.facebook.com/") || options.method !== "POST") throw new Error("Real providers forbidden in tests");
    const body = JSON.parse(options.body as string); if (!body.typing_indicator) sent.push(body);
    return new Response(JSON.stringify({ messages: [{ id: "fake-sent" }] }));
  }));
  t = convexTest(schema, modules); workflowTest.register(t); rateLimiterTest.register(t); agentTest.register(t);
});
afterEach(async () => { await t.finishAllScheduledFunctions(() => vi.runAllTimers(), 2000); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("asks whose forwarded reply this is before making an AI call, then drafts a grounded happy ask", async () => {
  await seed(); await post(praise, { context: { forwarded: true } });
  expect(generate).not.toHaveBeenCalled();
  expect(sent.at(-1).interactive.body.text).toBe("Is this M4 Test Ria's reply?");
  await tap(buttons()[0].reply.id);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(sent.at(-1).interactive.body.text).toContain(praise);
  expect(sent.at(-1).interactive.body.text).not.toContain("wa.me/");
  expect(sent.at(-1).interactive.body.text).toContain("Would you be okay forwarding it to your society group?");
});
it("allows one short follow-up, then drafts from a still-short second reply", async () => {
  await seed(); generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: null, passages: [] }) });
  await post("Good!", { context: { forwarded: true } }); await tap(buttons()[0].reply.id);
  expect(buttons().map((b: any) => b.reply.title)).toEqual(["What's changed?", "What's easier now?", "What do you enjoy?"]);
  await tap(buttons()[0].reply.id);
  expect(sent.at(-1).interactive.body.text).toBe("What's changed for you since you started?");
  await post("Still good!");
  expect(sent.at(-1).interactive.body.text).toContain("Still good!");
  expect(sent.at(-1).interactive.type).toBe("cta_url");
});
it("unhappy feedback stops the public-sharing flow", async () => {
  await seed(); generate.mockResolvedValue({ text: JSON.stringify({ read: "unhappy", clientName: null, passages: [] }) });
  await post("I am disappointed with the classes.", { context: { forwarded: true } }); await tap(buttons()[0].reply.id);
  expect(sent.at(-1).interactive.body.text).toBe("Thanks for telling me honestly, M4 Test Ria. Can we talk after Thursday's class? I want to make this right.");
  expect(sent.some(m => JSON.stringify(m).includes("society group"))).toBe(false);
});

it("lists multiple waiting clients without revealing another trainer's clients", async () => {
  await seed("M4 Test Ria"); await seed("M4 Test Tara"); await seed("Private Other Client", "919000000042");
  await post(praise, { context: { forwarded: true } });
  expect(sent.at(-1).interactive.type).toBe("list");
  const rows = sent.at(-1).interactive.action.sections[0].rows;
  expect(rows.map((r: any) => r.title)).toEqual(["M4 Test Ria", "M4 Test Tara"]);
  await tap(rows[1].id);
  expect(sent.at(-1).interactive.body.text).toContain("M4 Test Tara,");
  expect(JSON.stringify(sent)).not.toContain("Private Other Client");
});
it("ignores another trainer's and already-used buttons without another AI call", async () => {
  await seed(); await post(praise, { context: { forwarded: true } }); const id = buttons()[0].reply.id;
  await tap(id, "919000000042"); expect(generate).not.toHaveBeenCalled();
  await tap(id); expect(generate).toHaveBeenCalledTimes(1);
  const count = sent.length; await tap(id); expect(sent).toHaveLength(count); expect(generate).toHaveBeenCalledTimes(1);
});
it("asks the trainer to resolve ambiguous sentiment without a second AI call", async () => {
  await seed(); generate.mockResolvedValue({ text: JSON.stringify({ read: "uncertain", clientName: null, passages: [] }) });
  await post("It was okay, I guess.", { context: { forwarded: true } }); await tap(buttons()[0].reply.id);
  expect(buttons().map((b: any) => b.reply.title)).toEqual(["Happy", "Short reply", "Not happy"]);
  await tap(buttons()[2].reply.id);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(sent.at(-1).interactive.body.text).toContain("Thanks for telling me honestly");
  expect(JSON.stringify(sent)).not.toContain("society group");
});
it("nurtures a named short pasted review, preserves commands, and does not repeat a tapped follow-up", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: null, passages: [] }) });
  await post("This is a review: Ria: Good!");
  expect(sent.at(-1).interactive.body.text).toContain("Ria's reply is short.");
  const id = buttons()[2].reply.id; await tap(id);
  expect(sent.at(-1).interactive.body.text).toBe("What do you look forward to in class?");
  const count = sent.length; await tap(id); expect(sent).toHaveLength(count);
  await post("Hi"); expect(sent.at(-1).text.body).toContain("Hi! I help your happy clients");
  await post("New client Nila joined on 1 Sept"); expect(sent.at(-1).text.body).toContain("I'll remind you");
  await post("Good!"); expect(sent.at(-1).interactive.type).toBe("cta_url");
});
it("resolves a forwarded reply with no waiting clients after the trainer supplies a name", async () => {
  await post(praise, { context: { forwarded: true } });
  expect(sent.at(-1).text.body).toContain("[COPY NEEDED:"); expect(generate).not.toHaveBeenCalled();
  await post("Test Ria");
  expect(sent.at(-1).interactive.body.text).toContain("Test Ria,");
});
it("paginated selectors do not lose clients after the first nine", async () => {
  for (let i = 0; i < 12; i++) await seed(`M4 Test Client ${i}`);
  await post(praise, { context: { forwarded: true } });
  const rows = sent.at(-1).interactive.action.sections[0].rows;
  expect(rows).toHaveLength(10); await tap(rows.at(-1).id);
  const second = sent.at(-1).interactive.action.sections[0].rows;
  expect(second).toHaveLength(3); await tap(second[2].id);
  expect(sent.at(-1).interactive.body.text).toContain("M4 Test Client 11,");
});
it("keeps forwarded follow-up client selection explicit and the follow-up limit on the client", async () => {
  const id = await seed(); generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: null, passages: [] }) });
  await post("Good!", { context: { forwarded: true } }); await tap(buttons()[0].reply.id); await tap(buttons()[0].reply.id);
  await post("Still good!", { context: { forwarded: true } });
  expect(sent.at(-1).interactive.body.text).toBe("Is this M4 Test Ria's reply?"); await tap(buttons()[0].reply.id);
  expect(sent.at(-1).interactive.type).toBe("cta_url");
  expect((await t.run(ctx => ctx.db.get(id)))?.followupUsed).toBe(true);
});

import { voiceFixture } from "./voice.fixture";
import { splitVoice } from "../convex/lib/voice";
import { internal } from "../convex/_generated/api";

function mockVoice(transcript: string, seconds = 10, status = 200) {
  const prior = globalThis.fetch;
  const sarvam = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (url === "https://graph.facebook.com/v25.0/444") return new Response(JSON.stringify({ url: "https://lookaside.fbsbx.com/fake-audio", file_size: 2000 }));
    if (url === "https://lookaside.fbsbx.com/fake-audio") return new Response(voiceFixture(seconds));
    if (url === "https://api.sarvam.ai/speech-to-text") {
      sarvam(options);
      const form = options.body as FormData;
      expect(form.get("model")).toBe("saaras:v3"); expect(form.get("mode")).toBe("transcribe"); expect(form.get("language_code")).toBe("unknown");
      expect((options.headers as any)["api-subscription-key"]).toBe("fake-sarvam");
      return new Response(JSON.stringify({ transcript }), { status });
    }
    return prior(url, options);
  }));
  return sarvam;
}
it("transcribes a forwarded Kannada voice note in its language and retains no voice file or media reference", async () => {
  await seed(); const kannada = "ನನಗೆ ತರಗತಿಯ ಸಂಗೀತ ಇಷ್ಟ. ಪ್ರತಿ ತರಗತಿಗೂ ಕಾತರದಿಂದ ಕಾಯುತ್ತೇನೆ.";
  const sarvam = mockVoice(kannada);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: null, passages: [kannada] }) });
  await post("", { type: "audio", audio: { id: "444", mime_type: "audio/ogg; codecs=opus", voice: true }, context: { forwarded: true } });
  expect(sarvam).not.toHaveBeenCalled(); await tap(buttons()[0].reply.id);
  expect(sarvam).toHaveBeenCalledTimes(1); expect(sent.at(-1).interactive.body.text).toContain(kannada);
  const replies = await t.run(ctx => ctx.db.query("replies").collect()); expect(replies[0].transcript).toBe(kannada); expect(replies[0].kind).toBe("voice");
  const inbound = await t.run(ctx => ctx.db.query("inbound").collect()); expect(inbound[0].mediaId).toBeUndefined();
  expect(await t.run(ctx => ctx.db.system.query("_storage").collect())).toHaveLength(0);
  if (process.env.M4_SHOW_EXCHANGE === "1") { console.info("MOCK Kannada voice exchange; synthetic audio; no real provider calls"); for (const m of sent) console.info("Agent: " + (m.text?.body ?? m.interactive.body.text)); }
});
it("rejects a voice note over two minutes before calling Sarvam or OpenAI", async () => {
  await seed(); const sarvam = mockVoice("unused", 121);
  await post("", { type: "audio", audio: { id: "444" } }); await tap(buttons()[0].reply.id);
  expect(sent.at(-1).text.body).toBe("[COPY NEEDED: voice note longer than two minutes]"); expect(sarvam).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
});
it("splits a two-minute voice note into bounded chunks and joins transcripts in order", async () => {
  await seed(); const sarvam = mockVoice("ಚೆನ್ನಾಗಿದೆ.", 120);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: null, passages: [] }) });
  await post("", { type: "audio", audio: { id: "444" } }); await tap(buttons()[0].reply.id);
  expect(sarvam).toHaveBeenCalledTimes(5);
  const stored = await t.run(ctx => ctx.db.query("replies").first()); expect(stored?.transcript).toBe(Array(5).fill("ಚೆನ್ನಾಗಿದೆ.").join(" "));
  for (const chunk of splitVoice(voiceFixture(120))) expect(splitVoice(chunk)).toHaveLength(1);
});
it("handles Sarvam refusal with the exact voice error and removes the media reference", async () => {
  await seed(); mockVoice("", 10, 400);
  await post("", { type: "audio", audio: { id: "444" } }); await tap(buttons()[0].reply.id);
  expect(sent.at(-1).text.body).toBe("I couldn't hear that voice note clearly. Forward it again, or paste her words as text."); expect(generate).not.toHaveBeenCalled();
  expect((await t.run(ctx => ctx.db.query("inbound").first()))?.mediaId).toBeUndefined();
});
it("rejects another trainer's media and arbitrary download hosts without fetching them", async () => {
  await seed(); await post("", { type: "audio", audio: { id: "444" } });
  const inbound = await t.run(ctx => ctx.db.query("inbound").first());
  const other = await t.run(ctx => ctx.db.insert("trainers", { phone: "919000000042", name: "Other", waitDays: 28, joinedAt: Date.now() }));
  expect((await t.action(internal.voice.transcribe, { inboundId: inbound!._id, trainerId: other })).read).toBe("error");
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ url: "https://attacker.invalid/audio" })));
  vi.stubGlobal("fetch", fetcher);
  expect((await t.action(internal.voice.transcribe, { inboundId: inbound!._id, trainerId: inbound!.trainerId })).read).toBe("error"); expect(fetcher).toHaveBeenCalledTimes(1);
});
it("shares the global AI limit with speech transcription", async () => {
  const clientId = await seed(); const sarvam = mockVoice("unused");
  const fixture = await t.run(async ctx => {
    const client = await ctx.db.get(clientId);
    const inboundId = await ctx.db.insert("inbound", { trainerId: client!.trainerId, messageId: "limit-test", text: "", type: "audio", mediaId: "444", state: "processed", receivedAt: Date.now() });
    return { inboundId, trainerId: client!.trainerId };
  });
  for (let i = 0; i < 100; i++) await t.mutation(internal.drafting.reserveCall, {});
  expect((await t.action(internal.voice.transcribe, fixture)).read).toBe("busy");
  expect(sarvam).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
});
it("does not let a new named review bypass an unhappy client's pause", async () => {
  await seed("Test Ria"); generate.mockResolvedValue({ text: JSON.stringify({ read: "unhappy", clientName: null, passages: [] }) });
  await post("I am unhappy.", { context: { forwarded: true } }); await tap(buttons()[0].reply.id);
  const count = generate.mock.calls.length; generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Ria", passages: [praise] }) });
  await post("This is a review: Test Ria: " + praise);
  expect(generate).toHaveBeenCalledTimes(count); expect(sent.at(-1).text.body).toContain("isn't enjoying it yet"); expect(JSON.stringify(sent)).not.toContain("society group");
});
it("rejects oversized forwarded text and invented AI passages without any sharing draft", async () => {
  await seed(); await post("x".repeat(2001), { context: { forwarded: true } }); await tap(buttons()[0].reply.id);
  expect(generate).not.toHaveBeenCalled(); expect(sent.at(-1).text.body).toContain("I couldn't read");
  await post(praise, { context: { forwarded: true } }); generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: null, passages: ["I lost ten kilos."] }) }); await tap(buttons()[0].reply.id);
  expect(sent.at(-1).text.body).toContain("I couldn't read"); expect(JSON.stringify(sent)).not.toContain("ten kilos");
});

it("does not make speech-provider calls when SARVAM_API_KEY is missing", async () => {
  await seed(); const sarvam = mockVoice("unused"); vi.stubEnv("SARVAM_API_KEY", "");
  await post("", { type: "audio", audio: { id: "444" } }); await tap(buttons()[0].reply.id);
  expect(sarvam).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled(); expect(sent.at(-1).text.body).toContain("[COPY NEEDED: busy");
});
it("routes a named unhappy pasted review privately and remembers its pause even before the client is added", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "unhappy", clientName: null, passages: [] }) });
  await post("This is a review: Test Ria: I am disappointed.");
  expect(sent.at(-1).interactive.body.text).toContain("Thanks for telling me honestly, Test Ria.");
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Ria", passages: [praise] }) });
  await post("Test Ria: " + praise);
  expect(generate).toHaveBeenCalledTimes(1); expect(sent.at(-1).text.body).toContain("isn't enjoying it yet"); expect(JSON.stringify(sent)).not.toContain("society group");
});
it("a repeated short testimonial from the same named client does not restart the one-follow-up allowance", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: null, passages: [] }) });
  await post("Test Ria: Good!"); await tap(buttons()[0].reply.id);
  await post("Test Ria: Still good!");
  expect(sent.at(-1).interactive.type).toBe("cta_url"); expect(sent.at(-1).interactive.body.text).toContain("Still good!");
});
it("greetings and client commands do not accidentally answer the pending client-name question", async () => {
  await post(praise, { context: { forwarded: true } }); await post("Hi");
  expect(sent.at(-1).text.body).toContain("Hi! I help your happy clients"); expect(generate).not.toHaveBeenCalled();
  await post("New client Test Nila joined on 1 Sept"); expect(sent.at(-1).text.body).toContain("I'll remind you"); expect(generate).not.toHaveBeenCalled();
});
it("an explicit new review gets a combined draft instead of becoming the previous client's follow-up", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: null, passages: [] }) });
  await post("This is a review: Test Ria: Good!"); await tap(buttons()[0].reply.id);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Tara", passages: [praise] }) });
  await post("This is a review: Test Tara: " + praise);
  expect(sent.at(-1).interactive.action.parameters.display_text).toBe("Send to Test Tara");
  expect(sent.at(-1).interactive.body.text).toContain("Test Tara,");
  expect((await t.run(ctx => ctx.db.query("replies").order("desc").first()))?.state).toBe("complete");
});
it("a direct named review gets one combined draft with a button and no added contact link", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Ria", passages: [praise] }) });
  await post("This is a review: Test Ria: " + praise);
  expect(sent).toHaveLength(1);
  expect(sent[0].interactive.body.text).toContain("Would you be okay forwarding it to your society group?");
  expect(sent[0].interactive.body.text).toContain(praise);
  expect(sent[0].interactive.body.text).not.toContain("wa.me/");
  expect(sent[0].interactive.action.parameters.display_text).toBe("Send to Test Ria");
  expect(decodeURIComponent(sent[0].interactive.action.parameters.url.split("?text=")[1])).toBe(sent[0].interactive.body.text);
});
it("bold review labels, triggers and passages reach AI as review words, not formatting", async () => {
  generate.mockImplementation(async (_ctx: unknown, _identity: unknown, args: { prompt: string }) => {
    const input = JSON.parse(args.prompt).review;
    return { text: JSON.stringify(input === "Test Ria: " + praise ? { read: "happy", clientName: "Test Ria", passages: [praise] } : { read: "off_topic" }) };
  });
  await post("*This is a review:* **Test Ria**: *I enjoy the music* and look forward to every class.");
  expect(sent.at(-1).interactive.body.text).toContain(praise);
  expect(generate).toHaveBeenCalledTimes(1);
});
it("formatted forwarded replies preserve their words and still use client selection", async () => {
  await seed(); await post("**" + praise + "**", { context: { forwarded: true } });
  expect(generate).not.toHaveBeenCalled(); await tap(buttons()[0].reply.id);
  expect(JSON.parse(generate.mock.calls[0][2].prompt).review).toBe(praise);
  expect(sent.at(-1).interactive.body.text).toContain(praise);
  expect(sent.at(-1).interactive.body.text).not.toContain("wa.me/");
});
it("a formatted reviewer label identifies the client even when the AI omits her name", async () => {
  await post("**Test Ria:** " + praise);
  expect(sent).toHaveLength(1); expect(sent[0].interactive.body.text).toContain("Test Ria,");
});
it("makes a generic review explicitly about Mayuri and her sessions without adding experiences", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Ria", passages: [praise] }) });
  await post("This is a review: Test Ria: " + praise);
  const body = sent.at(-1).interactive.body.text;
  expect(body).toContain("I've been going to Mayuri's sessions and " + praise);
  expect(body).not.toContain("lost"); expect(body).not.toContain("free demo");
});
it("also identifies Mayuri's sessions in a review without a client name", async () => {
  await post(praise);
  expect(sent[0].interactive.body.text).toBe("I've been going to Mayuri's sessions and " + praise);
  expect(decodeURIComponent(sent[0].interactive.action.parameters.url.split("?text=")[1])).toBe(sent[0].interactive.body.text);
});

it("uses the owner's natural first-person wording for the music test review", async () => {
  const text = "I enjoy the music in class. I look forward to every session.";
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Nia", passages: [text] }) });
  await post("This is a review: Test Nia: " + text);
  expect(sent[0].interactive.body.text).toContain("I've been going to Mayuri's sessions and I enjoy the music in the class. I look forward to every session.");
  expect(sent[0].interactive.body.text).not.toContain("Mayuri's sessions:");
});
