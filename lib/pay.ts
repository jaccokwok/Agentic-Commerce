import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/db";
import { book, receipt } from "@/lib/ledger";
import { checkMandate, type Mandate } from "@/lib/mandate";
import { allowedTenders } from "@/lib/quote";

export type PayInput = { vaultId: string; addressId: string; amount: number; currency: string; tender: string; expiresAt: number; idempotencyKey: string };
export type PayContext = { userId: number; requestId: string; goalId: string; traceId: string; skus: string[]; cashback: number; mandate: Mandate; now: number;
  guard?: () => void; simulation?: "failed" | "timeout_before" | "timeout_after" | "retry_failed" | "card_declined"; credentials?: "bad" };

function payKey(tender: string, key: string) { return tender === "wallet" ? `wallet:${key}` : key; }

export function mockPay(input: PayInput, ctx: PayContext, database: DatabaseSync = getDb()) {
  const allowed = ["vaultId", "addressId", "amount", "currency", "tender", "expiresAt", "idempotencyKey"];
  const existing = receipt(input.idempotencyKey, database) ?? receipt(payKey("wallet", input.idempotencyKey), database);
  if (Object.keys(input).some(k => !allowed.includes(k)) || !input.vaultId?.startsWith("vault_") || !input.addressId?.startsWith("address_") ||
    !input.idempotencyKey || input.currency !== "HKD" || !Number.isFinite(input.amount) || input.amount < 0) {
    return { status: "terminate" as const, reason: "Invalid mock pay request. Only stored refs are accepted." };
  }
  if (existing) {
    if (existing.user_id !== ctx.userId || existing.cash_cents !== Math.round(input.amount * 100) || existing.request_id !== ctx.requestId || existing.goal_id !== ctx.goalId || existing.skus !== JSON.stringify(ctx.skus)) return { status: "terminate" as const, reason: "Idempotency key mismatch" };
    return { status: "paid" as const, reason: "Reconciled existing payment using the same idempotency key", receipt: existing };
  }
  if (ctx.credentials === "bad") return { status: "terminate" as const, reason: "Credentials were not verified" };
  const route = allowedTenders(ctx.mandate);
  if (!route.length || checkMandate(ctx.mandate, ctx.now).status !== "ready" || ctx.now >= input.expiresAt) return { status: "terminate" as const, reason: "Tender or authorization is invalid or expired" };
  if (ctx.simulation === "failed" || ctx.simulation === "timeout_before") return { status: "terminate" as const, reason: "Failed before any charge; no spend booked" };
  if (ctx.simulation === "retry_failed") return { status: "clarify" as const, reason: "Pay attempt unresolved; retry only the same key" };
  for (const tender of route) {
    if (ctx.simulation === "card_declined" && tender === "card") continue;
    try {
      const paid = book({ userId: ctx.userId, key: payKey(tender, input.idempotencyKey), traceId: ctx.traceId, requestId: ctx.requestId, goalId: ctx.goalId,
        skus: ctx.skus, cashTotal: input.amount, cashback: ctx.cashback, successful: true, now: ctx.now }, database, ctx.guard);
      if (ctx.simulation === "timeout_after") return { status: "clarify" as const, reason: "Response timed out after pay attempt; retry the same key" };
      return { status: "paid" as const, reason: tender === "wallet" ? "Mock wallet payment succeeded; cash and cashback booked" : "Mock payment succeeded; cash and cashback booked", receipt: paid };
    } catch (error) {
      return { status: "terminate" as const, reason: error instanceof Error ? error.message : "Payment could not be booked" };
    }
  }
  return { status: "terminate" as const, reason: "Card was declined before charge and no later tender booked" };
}
