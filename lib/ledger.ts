import type { DatabaseSync } from "node:sqlite";
import { getDb } from "@/lib/db";
import { cents } from "@/lib/money";

export type Receipt = { key: string; user_id: number; trace_id: string; request_id: string; goal_id: string; skus: string; cash_cents: number; cashback_cents: number; paid_at: number; refunded_at: number | null };
export function receipt(key: string, database = getDb()): Receipt | null {
  return database.prepare("SELECT * FROM orders WHERE key = ?").get(key) as Receipt | undefined ?? null;
}
export function spent7d(userId: number, now: number, database = getDb()) {
  const row = database.prepare("SELECT COALESCE(SUM(cash_cents), 0) AS total FROM orders WHERE user_id = ? AND paid_at > ? AND paid_at <= ?").get(userId, now - 168 * 3600000, now)!;
  return Number(row.total) / 100;
}
export async function currentSpend(userId: number) {
  return spent7d(userId, Date.now());
}
export function spentShare(userId: number, requestId: string, goalId: string, database = getDb()) {
  const row = database.prepare("SELECT COALESCE(SUM(cash_cents), 0) AS total FROM orders WHERE user_id = ? AND request_id = ? AND goal_id = ?").get(userId, requestId, goalId)!;
  return Number(row.total) / 100;
}
export function spentRequest(userId: number, requestId: string, database = getDb()) {
  const row = database.prepare("SELECT COALESCE(SUM(cash_cents), 0) AS total FROM orders WHERE user_id = ? AND request_id = ?").get(userId, requestId)!;
  return Number(row.total) / 100;
}
export function historySkus(userId: number, database = getDb()): string[] {
  return database.prepare("SELECT skus FROM orders WHERE user_id = ?").all(userId).flatMap(row => JSON.parse(String(row.skus)) as string[]);
}
export function recentSkus(userId: number, now: number, database = getDb()): string[] {
  return database.prepare("SELECT skus FROM orders WHERE user_id = ? AND paid_at > ? AND paid_at <= ?").all(userId, now - 72 * 3600000, now).flatMap(row => JSON.parse(String(row.skus)) as string[]);
}
export function book(input: { userId: number; key: string; traceId: string; requestId: string; goalId: string; skus: string[]; cashTotal: number; cashback: number; successful: boolean; now: number }, database: DatabaseSync = getDb(), guard?: () => void): Receipt {
  if (!input.successful) throw new Error("Only successful payments can be booked");
  database.exec("BEGIN IMMEDIATE");
  try {
    const existing = receipt(input.key, database);
    if (existing) {
      if (existing.user_id !== input.userId || existing.cash_cents !== cents(input.cashTotal) || existing.request_id !== input.requestId || existing.goal_id !== input.goalId || existing.skus !== JSON.stringify(input.skus)) throw new Error("Idempotency key mismatch");
      database.exec("COMMIT");
      return existing;
    }
    guard?.();
    database.prepare("INSERT INTO orders (key, user_id, trace_id, request_id, goal_id, skus, cash_cents, cashback_cents, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      input.key, input.userId, input.traceId, input.requestId, input.goalId, JSON.stringify(input.skus), cents(input.cashTotal), cents(input.cashback), input.now);
    database.exec("COMMIT");
    return receipt(input.key, database)!;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
export function refund(userId: number, key: string, now: number, database = getDb()) {
  database.prepare("UPDATE orders SET refunded_at = ? WHERE key = ? AND user_id = ?").run(now, key, userId);
}
