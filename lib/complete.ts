const QWEN_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const PARSE = `Return only JSON with keys goals, qty, brand, appearance, budgetHint. goals is an array of "snacks" and "groceries". qty is a whole number or null. brand is a string or null. appearance is "plain" or null. budgetHint is a number or null. Do not include price, shipping, tender, merchant, or confirm mode.`;
const EXPLAIN = `Return only JSON {"explanation":"one sentence"} about this tool result. Do not change cash, status, coupon, sku, shipping, signature, or limits.`;
const PROPOSE = `Return only JSON with keys to and type. to is merchant, mandate, or auditor. type is negotiate, review_text, filter_catalog, check_cash, validate_form, still_valid, request_conflict, filter_limits, or stop. Do not return payer, charge, or retry. Do not include cash, shipping, or a signature.`;

export type Explainer = (role: string, facts: Record<string, unknown>) => unknown | Promise<unknown>;
let explainer: Explainer | null = null;
export function setExplainer(next: Explainer | null) { explainer = next; }

export type Planner = (facts: Record<string, unknown>) => unknown | Promise<unknown>;
let planner: Planner | null = null;
export function setPlanner(next: Planner | null) { planner = next; }

export async function proposeTurn(facts: Record<string, unknown>): Promise<unknown> {
  if (!process.env.SCOUT_LLM) return null;
  if (planner) return planner(facts);
  const text = await complete(JSON.stringify(facts), fetch, PROPOSE);
  return JSON.parse(text.trim().replace(/^```json\s*/i, "").replace(/```$/, ""));
}

function explanationFrom(raw: unknown): string {
  let value = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "")); } catch { return "Explanation skipped"; }
  }
  if (!value || typeof value !== "object" || typeof (value as { explanation?: unknown }).explanation !== "string") return "Explanation skipped";
  const text = (value as { explanation: string }).explanation.trim();
  return text || "Explanation skipped";
}

export async function speak(role: string, facts: Record<string, unknown>): Promise<string | null> {
  if (!process.env.SCOUT_LLM) return null;
  try {
    const raw = explainer ? await explainer(role, facts) : await complete(JSON.stringify({ role, ...facts }), fetch, EXPLAIN);
    return explanationFrom(raw);
  } catch {
    return "Explanation skipped";
  }
}

export async function complete(sentence: string, fetchImpl: typeof fetch = fetch, instruction = PARSE): Promise<string> {
  if (!process.env.SCOUT_LLM) throw new Error("SCOUT_LLM is unset");
  const key = process.env.QWEN_API_KEY;
  if (!key) throw new Error("QWEN_API_KEY is unset");
  const response = await fetchImpl(process.env.QWEN_BASE_URL || QWEN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.SCOUT_LLM,
      messages: [{ role: "user", content: `${instruction}\n${sentence}` }],
    }),
  });
  if (!response.ok) throw new Error("Model draft failed");
  const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Model draft was not text");
  return text;
}
