import { afterEach, expect, test, vi } from "vitest";
import { understandShopping, validateIntent } from "@/lib/shopper-ai";

const milk = { kind: "products", goals: [{ category: "milk", qty: 1, preference: "" }], guests: null, budget: null, question: null };
afterEach(() => vi.unstubAllEnvs());
test("real provider adapter sends structured input only and validates returned intent", async () => {
  vi.stubEnv("SCOUT_AI_API_KEY", "test-only"); vi.stubEnv("SCOUT_AI_MODEL", "test-model"); vi.stubEnv("SCOUT_AI_BASE_URL", "https://provider.example/v1/");
  const fetcher: typeof fetch = async (url, init) => {
    expect(url).toBe("https://provider.example/v1/chat/completions");
    const body = JSON.parse(String(init?.body)); expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.model).toBe("test-model"); expect(body.messages[1].content).toContain("previous");
    expect(body.messages[1].content).not.toContain("address");
    return Response.json({ choices: [{ message: { content: JSON.stringify({ ...milk, price: 1, authorization: true }) } }] });
  };
  const result = await understandShopping("Could you get me some milk?", undefined, fetcher);
  expect(result).toEqual(milk); expect(result).not.toHaveProperty("authorization");
});
test("clarification context is sent; absent config, HTTP failure, refusal and invalid JSON fail explicitly", async () => {
  vi.stubEnv("SCOUT_AI_API_KEY", ""); vi.stubEnv("SCOUT_AI_MODEL", "");
  await expect(understandShopping("milk")).rejects.toThrow("尚未配置");
  vi.stubEnv("SCOUT_AI_API_KEY", "test-only"); vi.stubEnv("SCOUT_AI_MODEL", "test-model");
  await expect(understandShopping("milk", undefined, async () => new Response("failed", { status: 503 }))).rejects.toThrow("503");
  await expect(understandShopping("milk", undefined, async () => Response.json({ choices: [{ message: { refusal: "refused" } }] }))).rejects.toThrow("没有返回");
  await expect(understandShopping("milk", undefined, async () => Response.json({ choices: [{ message: { content: "{broken" } }] }))).rejects.toThrow("无法验证");
  const party = { kind: "party" as const, goals: [], guests: null, budget: 1000, question: null };
  const result = await understandShopping("十二个人", party, async (_url, init) => {
    expect(JSON.parse(JSON.parse(String(init?.body)).messages[1].content).previous).toEqual(party);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ ...party, guests: 12 }) } }] });
  });
  expect(result.guests).toBe(12);
});
test("untrusted model fields cannot invent categories, quantities, money, guests or bypass validation", () => {
  const invalid: unknown[] = [null, 42, {}, { ...milk, kind: "pay" }, { ...milk, goals: "milk" }, { ...milk, goals: [{ category: "invented", qty: 1, preference: "" }] },
    { ...milk, goals: [{ category: "milk", qty: -1, preference: "" }] }, { ...milk, goals: [{ category: "milk", qty: 1.5, preference: "" }] },
    { ...milk, goals: [...milk.goals, ...milk.goals] }, { ...milk, budget: -1 }, { ...milk, budget: Infinity }, { ...milk, guests: 0 }, { ...milk, guests: 1.2 },
    { ...milk, question: 10 }, { ...milk, question: "a".repeat(301) }, { ...milk, goals: [{ category: "milk", qty: null, preference: 1 }] }];
  for (const v of invalid) expect(() => validateIntent(v)).toThrow();
});
test("DeepSeek-style JSON mode still passes the same strict server validation", async () => {
  vi.stubEnv("SCOUT_AI_API_KEY", "test-only"); vi.stubEnv("SCOUT_AI_MODEL", "deepseek-flash"); vi.stubEnv("SCOUT_AI_BASE_URL", "https://api.deepseek.com"); vi.stubEnv("SCOUT_AI_FORMAT", "json_object");
  const fetcher: typeof fetch = async (url, init) => {
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(init?.body)); expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages.some((m: { content: string }) => m.content.includes("JSON object"))).toBe(true);
    return Response.json({ choices: [{ message: { content: JSON.stringify(milk) } }] });
  };
  expect(await understandShopping("买牛奶", undefined, fetcher)).toEqual(milk);
  await expect(understandShopping("买牛奶", undefined, async () => Response.json({ choices: [{ message: { content: JSON.stringify({ ...milk, goals: [{ category: "pay", qty: 1, preference: "" }] }) } }] }))).rejects.toThrow("无法验证");
});
