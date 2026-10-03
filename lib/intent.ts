import { hasInjection } from "@/lib/catalog";

export type Goal = { id: string; categoryId: string; label: string; qty: number | null; brand: string | null; appearance: string | null };
export type Intent = { status: "ready" | "clarify" | "terminate"; goals: Goal[]; budgetHint: number | null; reason: string };
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
  const ids = listed?.filter((item): item is "snacks" | "balloons" => item === "snacks" || item === "balloons") ?? [];
  if (!listed || !ids.length || ids.length !== listed.length) return rejected;
  if (hasInjection(`${body.brand ?? ""} ${body.appearance ?? ""}`)) return { ...rejected, status: "terminate", reason: "User input tries to override the mandate" };
  if (!(body.brand == null || typeof body.brand === "string")) return rejected;
  if (!(body.appearance == null || body.appearance === "red" || body.appearance === "blue")) return rejected;
  if (!(body.qty == null || (typeof body.qty === "number" && Number.isSafeInteger(body.qty)))) return rejected;
  if (!(body.budgetHint == null || (typeof body.budgetHint === "number" && Number.isFinite(body.budgetHint)))) return rejected;
  const appearance = body.appearance === "red" || body.appearance === "blue" ? body.appearance : null;
  return { status: "ready", budgetHint: typeof body.budgetHint === "number" ? body.budgetHint : null,
    goals: ids.map(id => ({ id, categoryId: id, label: id === "snacks" ? "Snacks" : "Balloons", qty: typeof body.qty === "number" ? body.qty : null, brand: typeof body.brand === "string" ? body.brand : null, appearance: id === "balloons" ? appearance : null })),
    reason: "Editable list only. Set quantities and shares before search." };
}

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
