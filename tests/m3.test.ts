import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import workflowTest from "@convex-dev/workflow/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import agentTest from "@convex-dev/agent/test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
import { copy } from "../convex/lib/copy";
const modules = import.meta.glob("../convex/**/*.ts");
let t: ReturnType<typeof convexTest<typeof schema>>;
let sent: any[];
let locked: boolean;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-06T03:30:00Z"));
  vi.stubEnv("APP_TIMING_MODE", "dev"); vi.stubEnv("WHATSAPP_TOKEN", "fake-token"); vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123456789");
  sent = []; locked = false;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    if (!url.startsWith("https://graph.facebook.com/")) throw new Error("OpenAI and Sarvam must remain mocked; M3 requires no AI calls");
    sent.push(JSON.parse(options.body as string));
    return new Response(JSON.stringify(locked ? { error: { code: 131031 } } : { messages: [{ id: `fake-${sent.length}` }] }), { status: locked ? 400 : 200 });
  }));
  t = convexTest(schema, modules); workflowTest.register(t); rateLimiterTest.register(t); agentTest.register(t);
});
afterEach(async () => { await t.finishAllScheduledFunctions(() => vi.runAllTimers(), 2000); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function client(name = "Priya", dueDate = "2026-10-06", phone = "919000000011") {
  return t.run(async (ctx) => {
    let trainer = await ctx.db.query("trainers").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    const trainerId = trainer?._id ?? await ctx.db.insert("trainers", { phone, name: "Test Instructor", waitDays: 28, joinedAt: Date.now() });
    const clientId = await ctx.db.insert("clients", { trainerId, name, startDate: "2026-09-08", waitDays: 28, dueDate, status: "due", reminderUsed: false, lastStepAt: Date.now() });
    return { trainerId, clientId };
  });
}
async function drain() { await t.finishAllScheduledFunctions(() => vi.runAllTimers(), 2000); }
it("sends an eligible dev client one nudge and a check-in-only button; repeated ticks never duplicate it", async () => {
  const c = await client();
  await Promise.all([t.mutation(internal.m3.tick, { source: "dev" }), t.mutation(internal.m3.tick, { source: "dev" })]); await drain();
  expect(sent).toHaveLength(1);
  expect(sent[0].interactive.body.text).toBe(copy.nudge("Priya") + "\n\n" + copy.checkIn("Priya", "Test Instructor"));
  const button = sent[0].interactive.action.parameters;
  expect(button.display_text).toBe("Send to client");
  expect(decodeURIComponent(button.url.split("?text=")[1])).toBe(copy.checkIn("Priya", "Test Instructor"));
  expect(sent.map((message) => JSON.stringify(message)).join(" ")).not.toContain("society");
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain(); expect(sent).toHaveLength(1);
  expect((await t.run((ctx) => ctx.db.get(c.clientId)))?.status).toBe("checked_in");
  if (process.env.M3_SHOW_EXCHANGE === "1") {
    console.info("MOCK M3 EXCHANGE — made-up client, all providers mocked");
    for (const message of sent) console.info("Agent: " + (message.text?.body ?? message.interactive.body.text));
    console.info("Button: " + button.display_text + " → " + button.url);
    console.info("Second tick: no additional messages");
  }
});
it("never nudges future clients, stays silent when no one is due, and catches up overdue clients", async () => {
  await client("Future", "2026-10-07");
  expect(await t.mutation(internal.m3.tick, { source: "dev" })).toBe(0); await drain(); expect(sent).toHaveLength(0);
  await client("Overdue", "2026-10-05"); await t.mutation(internal.m3.tick, { source: "dev" }); await drain();
  expect(sent[0].interactive.body.text).toBe(copy.overdueNudge("Overdue", "5 Oct 2026") + "\n\n" + copy.checkIn("Overdue", "Test Instructor"));
});
it("requires 9am IST and an enabled approved template in production", async () => {
  await client(); vi.stubEnv("APP_TIMING_MODE", "prod");
  expect(await t.mutation(internal.m3.tick, { source: "dev" })).toBe(0);
  expect(await t.mutation(internal.m3.tick, { source: "daily" })).toBe(0);
  vi.stubEnv("WHATSAPP_NUDGE_TEMPLATE_READY", "true");
  vi.setSystemTime(new Date("2026-10-06T03:29:00Z"));
  expect(await t.mutation(internal.m3.tick, { source: "daily" })).toBe(0);
  vi.setSystemTime(new Date("2026-10-06T03:30:00Z"));
  expect(await t.mutation(internal.m3.tick, { source: "daily" })).toBe(1); await drain();
  expect(sent).toHaveLength(1); expect(sent[0].type).toBe("template");
  expect(sent[0].template.name).toBe("week4_nudge");
  expect(sent[0].template.components[0].parameters[0].text).toBe("Priya");
  expect(sent[0].template.components[0].parameters[1].text).toBe(copy.checkIn("Priya", "Test Instructor"));
  expect(decodeURIComponent(sent[0].template.components[1].parameters[0].text)).toBe(copy.checkIn("Priya", "Test Instructor"));
});
it("records blocked sends without marking clients checked in or sending duplicate retries", async () => {
  const c = await client(); locked = true;
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain();
  expect(sent).toHaveLength(1); expect((await t.run((ctx) => ctx.db.get(c.clientId)))?.status).toBe("due");
  const events = await t.run((ctx) => ctx.db.query("checkIns").collect());
  expect(events[0].state).toBe("blocked");
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain(); expect(sent).toHaveLength(1);
});
it("lists only the requesting trainer's clients in the current IST week", async () => {
  const c = await client("Priya", "2026-10-06"); await client("Other", "2026-10-06", "919000000012");
  await client("Next Week", "2026-10-12");
  const result = await t.query(internal.m3.due, { trainerId: c.trainerId, cursor: null });
  expect(result.page.map((row) => row.name)).toEqual(["Priya"]);
});
it("recognizes Add client and Who's due commands without AI", async () => {
  const c = await client("Priya", "2026-10-06");
  const inboundId = await t.run((ctx) => ctx.db.insert("inbound", { trainerId: c.trainerId, messageId: "fake-due-command", text: "Who's due?", type: "text", state: "queued", receivedAt: Date.now() }));
  await t.action(internal.onboarding.process, { inboundId });
  expect(sent[0].text.body).toBe(copy.dueLine("Priya", "6 Oct 2026"));
  const addId = await t.run((ctx) => ctx.db.insert("inbound", { trainerId: c.trainerId, messageId: "fake-add-command", text: "Add Ananya, 12 Sept", type: "text", state: "queued", receivedAt: Date.now() }));
  await t.action(internal.onboarding.process, { inboundId: addId });
  const added = await t.run((ctx) => ctx.db.query("clients").withIndex("by_trainer_name", (q) => q.eq("trainerId", c.trainerId).eq("name", "Ananya")).unique());
  expect(added?.dueDate).toBe("2026-10-10");
});
it("does not trust an early due date when the minimum wait period has not passed", async () => {
  const c = await client();
  await t.run((ctx) => ctx.db.patch(c.clientId, { startDate: "2026-10-01" }));
  expect(await t.mutation(internal.m3.tick, { source: "dev" })).toBe(0); await drain();
  expect(sent).toHaveLength(0);
});
it("continues beyond 50 clients and does not let blocked clients hide later ones", async () => {
  for (let i = 0; i < 51; i++) await client(`Test ${i}`);
  locked = true;
  expect(await t.mutation(internal.m3.tick, { source: "dev" })).toBe(50); await drain();
  expect(sent).toHaveLength(51);
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain(); expect(sent).toHaveLength(51);
});
it("lists clients in batches of at most five lines and uses the copy placeholder for an empty week", async () => {
  const c = await client();
  for (let i = 0; i < 6; i++) await client(`Week ${i}`);
  await t.action(internal.m3.sendDue, { trainerId: c.trainerId, source: "list-many" });
  expect(sent).toHaveLength(2);
  expect(sent[0].text.body.split("\n")).toHaveLength(5); expect(sent[1].text.body.split("\n")).toHaveLength(2);
  const other = await client("Future", "2026-11-01", "919000000013");
  await t.action(internal.m3.sendDue, { trainerId: other.trainerId, source: "list-empty" });
  expect(sent.at(-1).text.body).toBe(copy.noDue);
});
it("does not use the today-only production template for overdue clients", async () => {
  await client("Overdue", "2026-10-05");
  vi.stubEnv("APP_TIMING_MODE", "prod"); vi.stubEnv("WHATSAPP_NUDGE_TEMPLATE_READY", "true");
  expect(await t.mutation(internal.m3.tick, { source: "daily" })).toBe(0); await drain();
  expect(sent).toHaveLength(0);
});
it("records a network failure without marking the combined nudge sent or retrying it", async () => {
  const c = await client();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Fake network failure")));
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain();
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect((await t.run((ctx) => ctx.db.get(c.clientId)))?.status).toBe("due");
  const events = await t.run((ctx) => ctx.db.query("checkIns").collect());
  expect(events[0].state).toBe("failed"); expect(events[0].failure).toBe("whatsapp_network_error");
  await t.mutation(internal.m3.tick, { source: "dev" }); await drain();
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});
