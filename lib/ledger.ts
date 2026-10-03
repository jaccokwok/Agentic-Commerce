import { getDb } from "@/lib/db";

const HOUR_MS = 60 * 60 * 1000;

export function bookPurchase(userId: number, skuId: string, cashTotal: number, at: Date) {
  getDb()
    .prepare(
      "INSERT INTO ledger_entries (user_id, sku_id, cash_total, kind, created_at) VALUES (?, ?, ?, 'book', ?)",
    )
    .run(userId, skuId, cashTotal, at.toISOString());
}

export function recordRefund(userId: number, skuId: string, cashTotal: number, at: Date) {
  getDb()
    .prepare(
      "INSERT INTO ledger_entries (user_id, sku_id, cash_total, kind, created_at) VALUES (?, ?, ?, 'refund', ?)",
    )
    .run(userId, skuId, cashTotal, at.toISOString());
}

export function spentSince(userId: number, now: Date, hours = 168): number {
  const cutoff = new Date(now.getTime() - hours * HOUR_MS).toISOString();
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(cash_total), 0) AS spent
       FROM ledger_entries
       WHERE user_id = ? AND kind = 'book' AND created_at >= ?`,
    )
    .get(userId, cutoff) as { spent: number };
  return Number(row.spent);
}

export function skusSince(userId: number, now: Date, hours: number): string[] {
  const cutoff = new Date(now.getTime() - hours * HOUR_MS).toISOString();
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT sku_id
       FROM ledger_entries
       WHERE user_id = ? AND kind = 'book' AND created_at >= ?`,
    )
    .all(userId, cutoff) as { sku_id: string }[];
  return rows.map((row) => row.sku_id);
}
