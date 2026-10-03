import type { DatabaseSync } from "node:sqlite";
import { agentFor } from "@/lib/agents";
import { speak } from "@/lib/complete";
import { log, type Role, type Trace } from "@/lib/trace";

export type AgentMessage = { traceId: string; from: Role; to: Role; type: string; body: Record<string, unknown> };
export type Agent = { role: Role; handle: (message: AgentMessage) => Promise<AgentMessage> };

function flat(body: Record<string, unknown>) {
  const numbers: Record<string, number | string | boolean | null> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === null || typeof value === "number" || typeof value === "string" || typeof value === "boolean") numbers[key] = value;
  }
  return numbers;
}

async function withSpeech(message: AgentMessage): Promise<AgentMessage> {
  const explanation = await speak(message.from, { type: message.type, to: message.to });
  if (!explanation) return message;
  return { ...message, body: { ...message.body, explanation } };
}

export async function deliver(trace: Trace, message: AgentMessage, at: number, step: string, database?: DatabaseSync): Promise<AgentMessage> {
  const outgoing = await withSpeech(message);
  if ((outgoing.type === "charge" || outgoing.type === "retry") && outgoing.to === "payer" && !trace.rows.some(row => row.from === "auditor" && row.to === "shopper" && row.ruleId === "credentials_ok")) {
    log(trace, step, outgoing.type, `${outgoing.from} → ${outgoing.to}`, flat(outgoing.body), at, { from: outgoing.from, to: outgoing.to });
    const refused: AgentMessage = { traceId: outgoing.traceId, from: "payer", to: outgoing.from, type: "pay_refused", body: { status: "terminate", reason: "Charge refused: auditor has not verified the slips" } };
    log(trace, step, refused.type, `${refused.from} → ${refused.to}`, flat(refused.body), at, { from: refused.from, to: refused.to });
    return refused;
  }
  const agent = agentFor(outgoing.to, database);
  log(trace, step, outgoing.type, `${outgoing.from} → ${outgoing.to}`, flat(outgoing.body), at, { from: outgoing.from, to: outgoing.to });
  const reply = await agent.handle(outgoing);
  if (reply.traceId !== message.traceId || reply.from !== agent.role || reply.to !== message.from) throw new Error("Reply must come back from the agent that was asked");
  log(trace, step, reply.type, `${reply.from} → ${reply.to}`, flat(reply.body), at, { from: reply.from, to: reply.to });
  return reply;
}
