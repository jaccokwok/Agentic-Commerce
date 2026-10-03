import { hasInjection } from "@/lib/catalog";

export type Goal = { id: string; categoryId: string; label: string; qty: number | null; brand: string | null; appearance: string | null };
export type Intent = { status: "ready" | "clarify" | "terminate"; goals: Goal[]; budgetHint: number | null; reason: string };
export function parseIntent(text: string): Intent {
  const base = { goals: [] as Goal[], budgetHint: null as number | null };
  if (typeof text !== "string" || !text.trim() || text.length > 2000) return { ...base, status: "terminate", reason: "Enter 1–2000 characters" };
  if (hasInjection(text)) return { ...base, status: "terminate", reason: "User input tries to override the mandate" };
  const party = /party\s+items|派对用品|聚会用品/i.test(text);
  const categories = [
    { id: "snacks", label: "Snacks", matched: party || /snack|零食/i.test(text) },
    { id: "balloons", label: "Balloons", matched: party || /balloon|气球/i.test(text) },
  ];
  const brand = text.match(/(?:brand|品牌)\s*[:=]\s*([\w\p{Script=Han}-]+)/iu)?.[1] ?? null;
  const appearance = /red|红色/i.test(text) ? "red" : /blue|蓝色/i.test(text) ? "blue" : null;
  const goals = categories.filter(c => c.matched).map(c => ({ id: c.id, categoryId: c.id, label: c.label, qty: null, brand, appearance: c.id === "balloons" ? appearance : null }));
  const budget = text.match(/(?:budget|预算)\s*[:=]?\s*(?:HKD\s*|\$\s*)?(\d+(?:\.\d+)?)/i);
  return { status: goals.length ? "ready" : "clarify", goals, budgetHint: budget ? Number(budget[1]) : null,
    reason: goals.length ? "Editable list only. Set quantities and shares before search." : "Mock catalogue supports snacks and balloons. Please edit the request." };
}
