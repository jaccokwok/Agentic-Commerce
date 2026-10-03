import { randomUUID } from "node:crypto";
export type Trace = { id: string; rows: { step: string; ruleId: string; reason: string; numbers: Record<string, number | string | boolean | null>; at: number }[] };
export function newTrace(): Trace { return { id: randomUUID(), rows: [] }; }
export function log(trace: Trace, step: string, ruleId: string, reason: string, numbers: Record<string, number | string | boolean | null>, at: number) {
  trace.rows.push({ step, ruleId, reason, numbers, at });
}
