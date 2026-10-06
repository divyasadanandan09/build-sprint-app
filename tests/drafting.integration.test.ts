import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import agentTest from "@convex-dev/agent/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { internal } from "../convex/_generated/api";
const { providerGenerate } = vi.hoisted(() => ({ providerGenerate: vi.fn() }));
// Keep the actual Convex Agent and its context checks; replace only OpenAI.
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ responses: () => ({ specificationVersion: "v4", provider: "openai.responses", modelId: "gpt-6.1-sol", supportedUrls: {}, doGenerate: providerGenerate }) }) }));
const modules = import.meta.glob("../convex/**/*.ts");
const review = "Priya: I enjoy the dance classes. I look forward to the music every morning.";
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "fake-openai-key");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Real provider request forbidden in this test"); }));
  providerGenerate.mockReset().mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify({ read: "happy", clientName: "Priya", passages: [review.slice(7)] }) }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } }, warnings: [],
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("runs the real Convex Agent for one isolated review, with OpenAI mocked", async () => {
  const t = convexTest(schema, modules); agentTest.register(t); rateLimiterTest.register(t);
  const result = await t.action(internal.drafting.fromText, { text: review });
  expect(result.read).toBe("happy");
  expect(result.recommendation).toBe(review.slice(7));
  expect(providerGenerate).toHaveBeenCalledTimes(1);
  const prompt = providerGenerate.mock.calls[0][0].prompt;
  expect(prompt.filter((m: { role: string }) => m.role === "user")).toHaveLength(1);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
