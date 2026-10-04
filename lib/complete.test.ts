import { afterEach, expect, test } from "vitest";
import { complete } from "@/lib/complete";

afterEach(() => { delete process.env.SCOUT_LLM; delete process.env.QWEN_API_KEY; delete process.env.QWEN_BASE_URL; });

test("complete posts the sentence to Qwen and returns the text, and stays off without the switch", async () => {
  let called = 0;
  await expect(complete("plain rice", async () => { called += 1; return new Response(""); })).rejects.toThrow("SCOUT_LLM is unset");
  expect(called).toBe(0);
  process.env.SCOUT_LLM = "qwen-plus";
  await expect(complete("plain rice", async () => { called += 1; return new Response(""); })).rejects.toThrow("QWEN_API_KEY is unset");
  expect(called).toBe(0);
  process.env.QWEN_API_KEY = "test-key";
  const text = await complete("plain rice", async (url, init) => {
    called += 1;
    expect(String(url)).toBe("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("qwen-plus");
    expect(body.messages[0].content).toContain("plain rice");
    expect(body.messages[0].content).not.toContain("test-key");
    return new Response(JSON.stringify({ choices: [{ message: { content: "{\"goals\":[\"groceries\"]}" } }] }), { status: 200 });
  });
  expect(text).toBe("{\"goals\":[\"groceries\"]}");
  expect(called).toBe(1);
});
