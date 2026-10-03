import { looksLikeInstruction } from "@/lib/untrusted";

export type Goal = {
  id: string;
  label: string;
  qty: null;
  appearance: string | null;
  brand: string | null;
};

const GOALS: { id: string; label: string; pattern: RegExp }[] = [
  { id: "snacks", label: "Snacks", pattern: /snacks?/i },
  { id: "balloons", label: "Balloons", pattern: /balloons?/i },
  { id: "cookware", label: "Cookware", pattern: /cookware/i },
  { id: "shoes", label: "Shoes", pattern: /shoes?/i },
];

export function parseIntent(
  text: string,
): { ok: true; goals: Goal[]; budgetHint: number | null } | { ok: false; reason: "injection" | "invalid_input" } {
  if (looksLikeInstruction(text)) return { ok: false, reason: "injection" };

  const ids = new Set<string>();
  if (/party items?/i.test(text)) {
    ids.add("snacks");
    ids.add("balloons");
  }
  for (const goal of GOALS) {
    if (goal.pattern.test(text)) ids.add(goal.id);
  }
  if (ids.size === 0) return { ok: false, reason: "invalid_input" };

  const appearance = /\bred\b/i.test(text) ? "red" : /\bblue\b/i.test(text) ? "blue" : null;
  const brand = text.match(/\bbrand\s+([a-z0-9]+)/i)?.[1] ?? null;
  const budget = text.match(/\bbudget\s*(\d+)/i);
  const goals = GOALS.filter((goal) => ids.has(goal.id)).map((goal) => ({
    id: goal.id,
    label: goal.label,
    qty: null,
    appearance: goal.id === "balloons" ? appearance : null,
    brand,
  }));

  return {
    ok: true,
    goals,
    budgetHint: budget ? Number(budget[1]) : null,
  };
}
