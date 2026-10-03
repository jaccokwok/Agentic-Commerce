import { randomUUID } from "node:crypto";

export type Role = "shopper" | "mandate" | "merchant" | "auditor" | "payer";
export type TraceRow = { role: Role; step: string; ruleId: string; reason: string; numbers: Record<string, number | string | boolean | null>; at: number };
export type Trace = { id: string; rows: TraceRow[] };

const AUDITOR_RULES = new Set(["listing_injection", "agent_surcharge", "shipping_missing", "invalid_offer", "credentials_ok", "credentials_bad"]);

export function roleFor(step: string, ruleId: string): Role {
  if (AUDITOR_RULES.has(ruleId)) return "auditor";
  if (step === "mandate" || ruleId === "offer_limit" || ruleId === "cash_gate") return "mandate";
  if (step === "negotiate") return "merchant";
  if (step === "pay") return "payer";
  return "shopper";
}

export function newTrace(): Trace { return { id: randomUUID(), rows: [] }; }
export function log(trace: Trace, step: string, ruleId: string, reason: string, numbers: Record<string, number | string | boolean | null>, at: number) {
  trace.rows.push({ role: roleFor(step, ruleId), step, ruleId, reason, numbers, at });
}
