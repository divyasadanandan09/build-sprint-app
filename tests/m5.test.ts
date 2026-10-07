import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import agentTest from "@convex-dev/agent/test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { copy } from "../convex/lib/copy";
import { followupDelay } from "../convex/lib/timing";
const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@convex-dev/agent", () => ({ Agent: class { generateText = generate; } }));
const modules = import.meta.glob("../convex/**/*.ts");
let t: ReturnType<typeof convexTest<typeof schema>>;
let sent: any[], counter: number, refuse: boolean;
const phone = "919000000051", praise = "I enjoy the music in class. I look forward to every session.";
async function drain() {
  // Finish ready work without jumping to the workpool's future monitor alarm.
  // Moving the fake clock backwards leaves that alarm in the future and can
  // strand a later workflow. Keep all timer assertions chronological.
  for (let n = 0; n < 2000; n++) {
    vi.advanceTimersByTime(100);
    await t.finishInProgressScheduledFunctions();
    const busy = await t.run(async ctx => {
      const messages = await ctx.db.query("inbound").collect();
      const jobs = await ctx.db.query("followupEvents").collect();
      const nudges = await ctx.db.query("checkIns").collect();
      return messages.some(x => ["queued", "processing"].includes(x.state)) || jobs.some(x => ["queued", "sending"].includes(x.state)) || nudges.some(x => ["queued", "sending"].includes(x.state));
    });
    if (!busy && n >= 9) return;
  }
  throw new Error("Ready workflow did not finish");
}
async function post(text: string, responseId?: string, sender = phone) {
  const raw = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: "123456789" }, messages: [{ id: `m5-${++counter}`, from: sender, type: responseId ? "interactive" : "text", ...(responseId ? { interactive: { button_reply: { id: responseId, title: "untrusted title" } } } : { text: { body: text } }) }] } }] }] });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("fake-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))), b => b.toString(16).padStart(2, "0")).join("");
  expect((await t.fetch("/whatsapp", { method: "POST", body: raw, headers: { "X-Hub-Signature-256": `sha256=${signature}` } })).status).toBe(200);
  await drain();
}
async function trainer(sender = phone) {
  return t.run(async ctx => {
    const existing = await ctx.db.query("trainers").withIndex("by_phone", q => q.eq("phone", sender)).first();
    const id = existing?._id ?? await ctx.db.insert("trainers", { phone: sender, name: "Test Instructor", waitDays: 28, joinedAt: Date.now() });
    await ctx.db.insert("inbound", { trainerId: id, messageId: `seed-${++counter}`, text: "Hi", type: "text", state: "processed", receivedAt: Date.now() });
    return id;
  });
}
async function start(phase: "waiting" | "asked" | "paused" = "asked", name = "Test Nia", trainerId?: any) {
  const id = trainerId ?? await trainer();
  const at = Date.now();
  await t.mutation(internal.m5Store.start, { trainerId: id, name, source: `draft-${++counter}`, phase, createdAt: at });
  return { trainerId: id, at, name };
}
async function tickAt(at: number) { expect(at).toBeGreaterThanOrEqual(Date.now()); vi.setSystemTime(at); const queued = await t.mutation(internal.m5.tick, {}); if (queued) await drain(); }
const buttons = () => sent.at(-1).interactive.action.buttons;
const button = (title: string) => buttons().find((b: any) => title === "She posted it" ? b.reply.id.endsWith(":posted") : title === "She said no" ? b.reply.id.endsWith(":no") : b.reply.title === title).reply.id;
async function events() { return t.run(ctx => ctx.db.query("followupEvents").collect()); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-07T01:00:00Z"));
  for (const [key, value] of Object.entries({ APP_TIMING_MODE: "dev", WHATSAPP_TOKEN: "fake-token", WHATSAPP_PHONE_NUMBER_ID: "123456789", WHATSAPP_APP_SECRET: "fake-secret", OPENAI_API_KEY: "fake-openai", SARVAM_API_KEY: "fake-sarvam" })) vi.stubEnv(key, value);
  sent = []; counter = 0; refuse = false;
  generate.mockReset().mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Nia", passages: [praise] }) });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (!url.startsWith("https://graph.facebook.com/") || options.method !== "POST") throw new Error("All WhatsApp/OpenAI/Sarvam traffic must be mocked");
    const body = JSON.parse(options.body as string); if (!body.typing_indicator) sent.push(body);
    return new Response(JSON.stringify(refuse ? { error: { code: 131031 } } : { messages: [{ id: `fake-${counter}` }] }), { status: refuse ? 400 : 200 });
  }));
  t = convexTest(schema, modules); workflowTest.register(t); rateLimiterTest.register(t); agentTest.register(t);
});
afterEach(async () => { await t.finishAllScheduledFunctions(() => vi.runAllTimers(), 2000); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("starts the posting timer from a named review through the signed webhook", async () => {
  await post(`This is a review: Test Nia: ${praise}`);
  expect(sent).toHaveLength(1); expect(sent[0].interactive.type).toBe("cta_url");
  const jobs = await events(); expect(jobs).toHaveLength(1);
  const question = jobs.find(e => e.kind === "posting")!;
  await tickAt(question.dueAt - 1); expect(sent).toHaveLength(1);
  await Promise.all([t.mutation(internal.m5.tick, {}), t.mutation(internal.m5.tick, {})]); expect(sent).toHaveLength(1);
  await tickAt(question.dueAt); expect(sent).toHaveLength(2);
  expect(sent.at(-1).interactive.body.text).toBe("Did Test Nia share her recommendation?");
  expect(buttons().map((b: any) => b.reply.title)).toEqual(["Test Nia posted it", "Test Nia said no", "Not yet"]);
  await post("", button("She posted it"));
  expect(sent.at(-1).text.body).toBe("Test Nia's society just heard about you from a neighbour. That's 1 referral this month.");
  await tickAt(question.dueAt + 10 * 60_000); expect(sent).toHaveLength(3);
  expect(generate).toHaveBeenCalledTimes(1);
  if (process.env.M5_SHOW_EXCHANGE === "1") {
    console.info("MOCK M5 EXCHANGE — signed webhook, fake clock and all providers mocked");
    console.info(`Trainer: This is a review: Test Nia: ${praise}`);
    for (const message of sent) console.info("Agent: " + (message.text?.body ?? message.interactive.body.text));
    console.info("Trainer taps: Test Nia posted it\nLater ticks: no further messages; total real AI calls: 0");
  }
});
it("sends one reminder after three dev minutes, gives a check-in-only draft, and never chases again", async () => {
  const flow = await start("waiting");
  await tickAt(flow.at + 3 * 60_000 - 1); expect(sent).toHaveLength(0);
  await tickAt(flow.at + 3 * 60_000); expect(sent).toHaveLength(1);
  expect(sent[0].interactive.body.text).toBe(copy.noReply(flow.name));
  const id = button("Send reminder"); await post("", id);
  expect(sent.at(-1).interactive.body.text).toBe(copy.reminder(flow.name));
  expect(decodeURIComponent(sent.at(-1).interactive.action.parameters.url.split("?text=")[1])).toBe(copy.reminder(flow.name));
  await post("", id); await tickAt(flow.at + 30 * 60_000); expect(sent).toHaveLength(2);
  expect(generate).not.toHaveBeenCalled(); expect(sent.every(m => m.to === phone)).toBe(true);
});
it("Leave it stops all pending chases without inventing an acknowledgement", async () => {
  const flow = await start("waiting"); await tickAt(flow.at + 3 * 60_000);
  await post("", button("Leave it")); await tickAt(flow.at + 60 * 60_000);
  expect(sent).toHaveLength(1);
  expect((await t.query(internal.m5Store.guard, { trainerId: flow.trainerId, name: flow.name })).phase).toBe("stopped");
});
it("Not yet asks exactly once more after three minutes and then stops", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000);
  await post("", button("Not yet"));
  const second = (await events()).find(e => e.attempt === 1)!;
  await tickAt(second.dueAt - 1); expect(sent).toHaveLength(1);
  await tickAt(second.dueAt); expect(sent).toHaveLength(2);
  expect(sent.at(-1).interactive.body.text).toBe(copy.postedQuestion(flow.name));
  await post("", button("Not yet")); await tickAt(second.dueAt + 24 * 60_000);
  expect(sent).toHaveLength(2); expect((await events()).filter(e => e.kind === "posting")).toHaveLength(2);
});
it("She said no sends one combined thank-you/button and prevents later sharing asks", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000);
  const id = button("She said no"); await post("", id);
  expect(sent.at(-1).interactive.body.text).toBe(copy.declined + "\n\n" + copy.thankYou(flow.name));
  expect(decodeURIComponent(sent.at(-1).interactive.action.parameters.url.split("?text=")[1])).toBe(copy.thankYou(flow.name));
  await post("", id); await tickAt(flow.at + 20 * 60_000); expect(sent).toHaveLength(2);
  await post(`This is a review: ${flow.name}: ${praise}`);
  expect(sent.at(-1).text.body).toBe(copy.privateOnly + `\n\nThis is a review: ${flow.name}: ${praise}`);
  expect(generate).not.toHaveBeenCalled();
  await start("asked", flow.name, flow.trainerId); await tickAt(Date.now() + 5 * 60_000); expect(sent).toHaveLength(3);
});
it("uses real deduplicated trainer-specific counts and the IST month boundary", async () => {
  vi.setSystemTime(new Date("2026-10-31T18:26:00Z"));
  const a = await start("asked", "Test A"); const b = await start("asked", "Test B", a.trainerId);
  const other = await trainer("919000000052"); const c = await start("asked", "Other Private", other);
  await tickAt(a.at + 2 * 60_000);
  const posting = (await events()).filter(e => e.kind === "posting");
  const flows = await t.run(ctx => ctx.db.query("followups").collect());
  const find = (name: string) => posting.find(e => flows.find(f => f._id === e.flowId)?.name === name)!;
  const firstId = `m5:${find("Test A")._id}:posted`;
  await post("", firstId); expect(sent.at(-1).text.body).toContain("That's 1 referral this month.");
  await post("", firstId);
  await post("", `m5:${find("Other Private")._id}:posted`, "919000000052"); expect(sent.at(-1).text.body).toContain("That's 1 referral this month.");
  await post("", `m5:${find("Test B")._id}:posted`); expect(sent.at(-1).text.body).toContain("That's 2 referrals this month.");
  vi.setSystemTime(new Date("2026-10-31T18:31:00Z"));
  const next = await start("asked", "Test C", a.trainerId); await tickAt(next.at + 2 * 60_000); await post("", button("She posted it"));
  expect(sent.at(-1).text.body).toContain("That's 1 referral this month.");
  expect((await t.run(ctx => ctx.db.query("monthlyPosts").collect())).map(x => x.count).sort()).toEqual([1, 1, 2]);
});
it("ignores forged, cross-trainer, stale and repeated buttons", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000); const id = button("She posted it");
  await post("", id, "919000000052"); await post("", "m5:not-an-id:posted"); await post("", id.replace(":posted", ":remind"));
  expect(sent).toHaveLength(1);
  await start("asked", flow.name, flow.trainerId); await post("", id); expect(sent).toHaveLength(1);
  expect(await t.run(ctx => ctx.db.query("monthlyPosts").collect())).toHaveLength(0);
});
it("uses days in prod, waits safely outside the 24-hour window, then sends once after a fresh Hi", async () => {
  vi.stubEnv("APP_TIMING_MODE", "prod"); const flow = await start();
  expect(followupDelay(2)).toBe(2 * 86_400_000);
  await tickAt(flow.at + 3 * 60_000); expect(sent).toHaveLength(0);
  await tickAt(flow.at + 2 * 86_400_000); expect(sent).toHaveLength(0);
  const blocked = (await events()).find(e => e.kind === "posting")!;
  expect(blocked.blockedReason).toBe("outside_24h_window_no_approved_followup_template");
  await post("Hi"); expect(sent).toHaveLength(1);
  await tickAt(blocked.dueAt); expect(sent).toHaveLength(2);
  expect(sent.at(-1).interactive.body.text).toBe(copy.postedQuestion(flow.name));
  await tickAt(Date.now() + 60_000); expect(sent).toHaveLength(2);
});
it("records Meta rejection without claiming delivery or retrying", async () => {
  const flow = await start("waiting"); refuse = true;
  await tickAt(flow.at + 3 * 60_000);
  expect((await events())[0].state).toBe("failed"); expect((await events())[0].failure).toBe("whatsapp_account_locked");
  refuse = false; await tickAt(flow.at + 10 * 60_000); expect(sent).toHaveLength(1);
});
it("a newly identified reply cancels a queued reminder before it is sent", async () => {
  const flow = await start("waiting"); vi.setSystemTime(flow.at + 3 * 60_000);
  await t.mutation(internal.m5.tick, {});
  const inboundId = await t.run(ctx => ctx.db.insert("inbound", { trainerId: flow.trainerId, messageId: "new-reply", text: praise, type: "text", state: "processing", receivedAt: Date.now() }));
  await t.mutation(internal.m4Store.begin, { inboundId, transcript: praise, name: flow.name });
  await t.mutation(internal.m2Store.finish, { inboundId, failure: null });
  await drain(); expect(sent).toHaveLength(0); expect((await events())[0].state).toBe("cancelled");
});
it("unpauses an unhappy named client only on the trainer command and requires fresh client words", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "unhappy", clientName: "Test Nia", passages: [] }) });
  await post("This is a review: Test Nia: I am disappointed with the classes.");
  expect(sent.at(-1).interactive.body.text).toBe(copy.unhappyDraft("Test Nia"));
  const count = sent.length;
  await tickAt(Date.now() + 10 * 60_000); expect(sent).toHaveLength(count);
  await post("Test Nia is happy now", undefined, "919000000052"); expect(sent.at(-1).text.body).toBe(copy.unknownUnpause);
  await post("Test Nia is happy now"); expect(sent.at(-1).text.body).toBe(copy.unpaused);
  expect(generate).toHaveBeenCalledTimes(1); expect((await events()).filter(e => e.state === "pending")).toHaveLength(0);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: "Test Nia", passages: [praise] }) });
  await post(`This is a review: Test Nia: ${praise}`); expect(sent.at(-1).interactive.body.text).toContain("society group?"); expect(generate).toHaveBeenCalledTimes(2);
});
it("starts M5 from a successful M3 check-in and keeps the reminder allowance across later asks", async () => {
  const id = await trainer(); const at = Date.now();
  const clientId = await t.run(ctx => ctx.db.insert("clients", { trainerId: id, name: "Test Nia", startDate: "2026-09-09", dueDate: "2026-10-07", waitDays: 28, status: "due", reminderUsed: false, lastStepAt: at }));
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain(); expect(sent).toHaveLength(1);
  const reminder = (await events())[0]; await tickAt(reminder.dueAt); await post("", button("Send reminder")); expect(sent).toHaveLength(3);
  await post(`This is a review: Test Nia: ${praise}`);
  const jobs = await events(); expect(jobs.filter(e => e.kind === "reminder")).toHaveLength(1);
  expect((await t.run(ctx => ctx.db.get(clientId)))?.reminderUsed).toBe(true);
});
it("handles the exact off-topic fallback without a real provider call", async () => {
  generate.mockResolvedValue({ text: JSON.stringify({ read: "off_topic", clientName: null, passages: [] }) });
  await post("What is the capital of France?"); expect(sent.at(-1).text.body).toBe(copy.fallback);
  await post("thanks"); expect(sent.at(-1).text.body).toBe(copy.fallback); expect(generate).toHaveBeenCalledTimes(1);
});
it("queues all due events in bounded batches, including more than fifty, once only", async () => {
  const id = await trainer(); const at = Date.now();
  for (let n = 0; n < 51; n++) await start("waiting", `Test ${n}`, id);
  await tickAt(at + 3 * 60_000); expect(sent).toHaveLength(51);
  await tickAt(Date.now() + 60_000); expect(sent).toHaveLength(51);
});

it("a tracked unhappy client unpauses, stays selectable and starts posting timers only after a fresh happy reply", async () => {
  const trainerId = await trainer();
  const clientId = await t.run(ctx => ctx.db.insert("clients", { trainerId, name: "Test Nia", startDate: "2026-09-09", dueDate: "2026-10-07", waitDays: 28, status: "unhappy", reminderUsed: false, lastStepAt: Date.now() }));
  await start("paused", "Test Nia", trainerId);
  await post("Test Nia is happy now"); expect((await t.run(ctx => ctx.db.get(clientId)))?.status).toBe("checked_in");
  expect(await events()).toHaveLength(0);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: null, passages: [praise] }) });
  await post(`This is a reply: ${praise}`); expect(sent.at(-1).interactive.body.text).toBe("Is this Test Nia's reply?");
  await post("", button("Yes")); expect(sent.at(-1).interactive.type).toBe("cta_url");
  expect((await t.run(ctx => ctx.db.get(clientId)))?.status).toBe("asked"); expect(await events()).toHaveLength(1);
});
it("a short follow-up starts only the no-reply timer and a further reply replaces it with posting timers", async () => {
  await trainer(); generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: "Test Nia", passages: [] }) });
  await post("This is a review: Test Nia: Good!");
  expect(await events()).toHaveLength(0);
  await post("", button("What's changed?"));
  expect((await events()).map(e => e.kind)).toEqual(["reminder"]);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "happy", clientName: null, passages: [praise] }) });
  await post(praise);
  const jobs = await events(); expect(jobs[0].state).toBe("cancelled"); expect(jobs.filter(e => e.state === "pending").map(e => e.kind).sort()).toEqual(["posting"]);
});
it("does not create timers for a draft rejected by Meta", async () => {
  refuse = true; await post(`This is a review: Test Nia: ${praise}`); expect(await events()).toHaveLength(0);
  generate.mockResolvedValue({ text: JSON.stringify({ read: "short", clientName: "Test Nia", passages: [] }) });
  refuse = false; await post("This is a review: Test Nia: Good!");
  refuse = true; await post("", button("What's changed?")); expect(await events()).toHaveLength(0);
});
it("a forwarded positive reply from a declined client remains private, without an AI call or a new ask", async () => {
  const trainerId = await trainer(); const flow = await start("asked", "Test Nia", trainerId);
  await tickAt(flow.at + 2 * 60_000); await post("", button("She said no"));
  await post(`This is a reply: ${praise}`); expect(sent.at(-1).text.body).toBe(copy.noWaiting);
  await post("Test Nia"); expect(sent.at(-1).text.body).toBe(copy.privateOnly + "\n\n" + praise);
  expect(generate).not.toHaveBeenCalled(); expect((await events()).filter(e => e.state === "pending")).toHaveLength(0);
});

it("still enforces the 2000-character limit for feedback from a declined client", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000); await post("", button("She said no"));
  await post("This is a review: Test Nia: " + "x".repeat(2001));
  expect(sent.at(-1).text.body).toBe(copy.reviewError); expect(generate).not.toHaveBeenCalled();
  expect((await events()).filter(e => e.state === "pending")).toHaveLength(0);
});

it("never sends a no-reply prompt while waiting for the trainer to answer the posting question", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000);
  expect(sent[0].interactive.body.text).toBe(copy.postedQuestion(flow.name));
  await tickAt(flow.at + 3 * 60_000); await tickAt(flow.at + 10 * 60_000);
  expect(sent).toHaveLength(1);
});
it("cancels an old queued reminder for an existing sharing ask and ignores its old reminder buttons", async () => {
  const flow = await start();
  const id = await t.run(async ctx => {
    const saved = await ctx.db.query("followups").withIndex("by_trainer_name", q => q.eq("trainerId", flow.trainerId).eq("name", flow.name)).unique();
    return ctx.db.insert("followupEvents", { flowId: saved!._id, source: saved!.source, kind: "reminder", attempt: 0, dueAt: flow.at + 3 * 60_000, state: "pending" });
  });
  await tickAt(flow.at + 3 * 60_000); expect(sent).toHaveLength(1); expect((await t.run(ctx => ctx.db.get(id)))?.state).toBe("cancelled");
  await t.run(ctx => ctx.db.patch(id, { state: "awaiting" }));
  await post("", `m5:${id}:remind`); expect(sent).toHaveLength(1);
});
it("personalizes the send and posting buttons without changing the draft or trusting a button title", async () => {
  await post(`This is a review: Test Nia: ${praise}`);
  const draft = sent[0].interactive;
  expect(draft.action.parameters.display_text).toBe("Send to Test Nia");
  expect(decodeURIComponent(draft.action.parameters.url.split("?text=")[1])).toBe(draft.body.text);
  const question = (await events())[0]; await tickAt(question.dueAt);
  expect(buttons().map((b: any) => b.reply.title)).toEqual(["Test Nia posted it", "Test Nia said no", "Not yet"]);
  await post("", button("She said no"));
  expect(sent.at(-1).interactive.action.parameters.display_text).toBe("Send to Test Nia");
});

it("keeps long client names intact in the question and identity while shortening only the button labels", async () => {
  const name = "An Extraordinarily Long Test Name";
  const flow = await start("asked", name); await tickAt(flow.at + 2 * 60_000);
  expect(sent[0].interactive.body.text).toBe(`Did ${name} share her recommendation?`);
  expect(buttons().every((b: any) => b.reply.title.length <= 20)).toBe(true);
  await post("", button("She said no"));
  expect(sent.at(-1).interactive.body.text).toContain(name);
  expect(sent.at(-1).interactive.action.parameters.display_text).toMatch(/^Send to /);
  expect(sent.at(-1).interactive.action.parameters.display_text.length).toBeLessThanOrEqual(20);
});

it("confirms a changed answer before correcting a posted count and sending the new step", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000);
  const posted = button("She posted it"), declined = button("She said no");
  await post("", posted);
  await post("", declined);
  expect(sent.at(-1).interactive.body.text).toContain("confirm change");
  expect((await t.run(ctx => ctx.db.query("monthlyPosts").collect()))[0].count).toBe(1);
  const yes = button("Yes"); await post("Yes");
  expect(sent.at(-1).interactive.body.text).toContain("No problem. Here's a thank-you.");
  expect((await t.run(ctx => ctx.db.query("monthlyPosts").collect()))[0].count).toBe(0);
  const n = sent.length; await post("", yes); expect(sent).toHaveLength(n);
  await post("", posted); await post("", button("Yes"));
  expect(sent.at(-1).text.body).toContain("That's 1 referral this month.");
});

it("can keep an answer, rejects another trainer and superseded confirmations, and resumes Not yet once", async () => {
  const flow = await start(); await tickAt(flow.at + 2 * 60_000);
  const posted = button("She posted it"), declined = button("She said no"), later = button("Not yet");
  await post("", posted); const n = sent.length;
  await post("", declined, "919000000052"); expect(sent).toHaveLength(n);
  await post("", declined); const oldYes = button("Yes");
  await post("", button("Leave it"));
  await post("", oldYes); expect((await t.run(ctx => ctx.db.query("followups").collect()))[0].phase).toBe("posted");
  await post("", declined); const superseded = button("Yes");
  await post("", later); const yes = button("Yes");
  await post("", superseded); expect((await t.run(ctx => ctx.db.query("followups").collect()))[0].phase).toBe("posted");
  await post("", yes);
  const pending = (await events()).filter(e => e.state === "pending"); expect(pending).toHaveLength(1);
  await tickAt(pending[0].dueAt);
  expect(sent.at(-1).interactive.body.text).toBe(copy.postedQuestion(flow.name));
  await post("", button("Not yet"));
  expect((await events()).filter(e => e.state === "pending")).toHaveLength(0);
});

it("corrects the original month's posted count when the answer changes in a later month", async () => {
  vi.setSystemTime(new Date("2026-10-31T18:26:00Z"));
  const flow = await start(); await tickAt(flow.at + 2 * 60_000);
  const posted = button("She posted it"), declined = button("She said no");
  await post("", posted);
  vi.setSystemTime(new Date("2026-10-31T18:31:00Z"));
  await post("", declined); await post("", button("Yes"));
  await post("", posted); await post("", button("Yes"));
  expect((await t.run(ctx => ctx.db.query("monthlyPosts").collect())).map(x => [x.month, x.count])).toEqual([["2026-10", 0], ["2026-11", 1]]);
});
