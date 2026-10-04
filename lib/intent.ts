import { hasInjection } from "@/lib/catalog";

export type Goal = { id: string; categoryId: string; label: string; qty: number | null; brand: string | null; appearance: string | null };
export type Intent = { status: "ready" | "clarify" | "terminate"; goals: Goal[]; budgetHint: number | null; reason: string };
const FOOD_ONLY = "Mock catalogue is food only: snacks and groceries. Please edit the request.";
type FoodId = "snacks" | "groceries";
const NAMED: { pattern: RegExp; categoryId: FoodId; brand: string; rice?: boolean }[] = [
  { pattern: /chips|薯片/i, categoryId: "snacks", brand: "Chips" },
  { pattern: /cookies|饼干/i, categoryId: "snacks", brand: "Cookies" },
  { pattern: /chocolate|巧克力/i, categoryId: "snacks", brand: "Chocolate" },
  { pattern: /nuts|坚果/i, categoryId: "snacks", brand: "Nuts" },
  { pattern: /milk|牛奶/i, categoryId: "groceries", brand: "Milk" },
  { pattern: /bread|面包/i, categoryId: "groceries", brand: "Bread" },
  { pattern: /eggs|鸡蛋/i, categoryId: "groceries", brand: "Eggs" },
  { pattern: /(?:cooking\s+)?oil\b|食用油|(?<![饮酱])油/i, categoryId: "groceries", brand: "Oil" },
  { pattern: /rice|米/i, categoryId: "groceries", brand: "Rice", rice: true },
  { pattern: /noodles|面条|(?<!包)面/i, categoryId: "groceries", brand: "Noodles" },
];
function goal(id: FoodId, brand: string | null, appearance: string | null): Goal {
  return { id, categoryId: id, label: id === "snacks" ? "Snacks" : "Groceries", qty: null, brand, appearance: id === "groceries" ? appearance : null };
}
export function intentFromDraft(raw: unknown): Intent {
  const rejected = { goals: [] as Goal[], budgetHint: null as number | null, status: "clarify" as const, reason: "Model draft was not catalogue JSON" };
  let value = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); }
    catch { return rejected; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return rejected;
  const body = value as Record<string, unknown>;
  const listed = Array.isArray(body.goals) ? body.goals : null;
  const ids = listed?.filter((item): item is FoodId => item === "snacks" || item === "groceries") ?? [];
  if (!listed || !ids.length || ids.length !== listed.length) return rejected;
  if (hasInjection(`${body.brand ?? ""} ${body.appearance ?? ""}`)) return { ...rejected, status: "terminate", reason: "User input tries to override the mandate" };
  if (!(body.brand == null || typeof body.brand === "string")) return rejected;
  if (!(body.appearance == null || body.appearance === "plain")) return rejected;
  if (!(body.qty == null || (typeof body.qty === "number" && Number.isSafeInteger(body.qty)))) return rejected;
  if (!(body.budgetHint == null || (typeof body.budgetHint === "number" && Number.isFinite(body.budgetHint)))) return rejected;
  const appearance = body.appearance === "plain" ? "plain" : null;
  return { status: "ready", budgetHint: typeof body.budgetHint === "number" ? body.budgetHint : null,
    goals: ids.map(id => goal(id, typeof body.brand === "string" ? body.brand : null, appearance)),
    reason: "Editable list only. Set quantities and shares before search." };
}

export function parseIntent(text: string): Intent {
  const base = { goals: [] as Goal[], budgetHint: null as number | null };
  if (typeof text !== "string" || !text.trim() || text.length > 2000) return { ...base, status: "terminate", reason: "Enter 1–2000 characters" };
  if (hasInjection(text)) return { ...base, status: "terminate", reason: "User input tries to override the mandate" };
  const labeled = text.match(/(?:brand|品牌)\s*[:=]\s*([\w\p{Script=Han}-]+)/iu)?.[1] ?? null;
  const organic = /organic|有机/i.test(text);
  const bread = /bread|面包/i.exec(text);
  const picked = new Map<FoodId, { index: number; brand: string; rice?: boolean }>();
  for (const item of NAMED) {
    const match = item.pattern.exec(text);
    if (!match) continue;
    if (item.brand === "Noodles" && bread && match.index >= bread.index && match.index < bread.index + bread[0].length) continue;
    const current = picked.get(item.categoryId);
    if (!current || match.index < current.index) picked.set(item.categoryId, { index: match.index, brand: item.brand, rice: item.rice });
  }
  if (/\bfood\b|食品/i.test(text) && picked.size === 0) {
    picked.set("snacks", { index: 0, brand: "" });
    picked.set("groceries", { index: 1, brand: "" });
  }
  if (/snacks?|零食/i.test(text) && !picked.has("snacks")) picked.set("snacks", { index: 0, brand: "" });
  if (/groceries|grocery|杂货/i.test(text) && !picked.has("groceries")) picked.set("groceries", { index: 0, brand: "" });
  const goals = [...picked.entries()].sort((a, b) => a[1].index - b[1].index).map(([id, item]) => {
    const brand = labeled ?? (item.brand || null);
    const appearance = item.rice ? (organic ? "organic" : "plain") : null;
    return goal(id, brand, appearance);
  });
  const budget = text.match(/(?:budget|预算)\s*[:=]?\s*(?:HKD\s*|\$\s*)?(\d+(?:\.\d+)?)/i);
  return { status: goals.length ? "ready" : "clarify", goals, budgetHint: budget ? Number(budget[1]) : null,
    reason: goals.length ? "Catalogue request from the sentence." : FOOD_ONLY };
}

export function wantsAsMany(text: string): boolean {
  return /as many\b[\s\S]{0,48}\b(?:as possible|within the budget)|尽可能多|越多越好/i.test(text);
}
export function statedQuantity(text: string): number | null {
  const named = text.match(/(?:^|[^\d])(\d+)\s*(?:x|×)?\s*(?:plain\s+|organic\s+)?(?:rice|noodles|milk|bread|eggs|oil|chips|cookies|chocolate|nuts|snacks?|groceries|米|面|牛奶|面包|鸡蛋|油|薯片|饼干|巧克力|坚果|零食)/i);
  const labeled = text.match(/(?:qty|quantity|数量)\s*[:=]?\s*(\d+)/i);
  const raw = named?.[1] ?? labeled?.[1];
  if (!raw) return null;
  const qty = Number(raw);
  return Number.isSafeInteger(qty) && qty >= 1 && qty <= 10000 ? qty : null;
}
