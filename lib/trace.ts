import { randomUUID } from "node:crypto";

export type TraceRow = { step: string; rule: string; detail: string };

export function createTrace(id = `trace_${randomUUID()}`) {
  const rows: TraceRow[] = [];
  return {
    id,
    rows,
    add(step: string, rule: string, detail: string) {
      rows.push({ step, rule, detail });
    },
  };
}
