import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export type Role = "shopper" | "mandate" | "merchant" | "auditor" | "payer";
export type TraceRow = { role: Role; step: string; ruleId: string; reason: string; numbers: Record<string, number | string | boolean | null>; at: number; from?: Role; to?: Role };
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
const STORY_FACTS = ["status", "cash", "coupon", "sku", "shelf", "shipping", "ok", "platform_id", "cardOff", "tender", "score", "parts", "weights", "winner", "topScore", "idempotencyKey", "proposedTo", "proposedType", "codeTo", "codeType"];

export function formatRow(row: TraceRow) {
  const who = row.from && row.to ? `${row.from} → ${row.to}` : row.role;
  const said = typeof row.numbers.reason === "string" ? row.numbers.reason : row.reason === who ? "" : row.reason;
  const explanation = typeof row.numbers.explanation === "string" ? row.numbers.explanation : "";
  const facts = STORY_FACTS.filter(key => row.numbers[key] !== undefined && row.numbers[key] !== null && row.numbers[key] !== "").map(key => `${key}=${row.numbers[key]}`).join("  ");
  return `${who.padEnd(20)}${row.ruleId.padEnd(24)}${said}${explanation ? `  "${explanation}"` : ""}${facts ? `  ${facts}` : ""}`.trimEnd();
}

export function log(trace: Trace, step: string, ruleId: string, reason: string, numbers: Record<string, number | string | boolean | null>, at: number, direction?: { from: Role; to: Role }) {
  const row: TraceRow = { role: direction?.from ?? roleFor(step, ruleId), step, ruleId, reason, numbers, at, from: direction?.from, to: direction?.to };
  trace.rows.push(row);
  if (process.env.SCOUT_TRACE !== "1" && (process.env.SCOUT_TRACE === "0" || process.env.VITEST)) return;
  const line = formatRow(row);
  console.log(line);
  const path = process.env.SCOUT_LOG ?? join(process.cwd(), "logs", "scout.log");
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${trace.id}  at=${row.at}  ${line}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not write the trace log");
  }
}
