import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { closeDb, createUser } from "@/lib/db";
import { bookPurchase, recordRefund, skusSince, spentSince } from "@/lib/ledger";
import { beforeEach, expect, test } from "vitest";

const now = new Date("2026-06-01T00:00:00.000Z");

beforeEach(() => {
  closeDb();
  process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "scout-"));
});

test("registration stores a vault id and an address id", async () => {
  const user = await createUser("a@example.com", "Ada", "hash");
  expect(user.vault_ref).toMatch(/^vault_/);
  expect(user.address_ref).toMatch(/^addr_/);
});

test("book writes cash, a refund does not give it back, and old rows fall out of the window", () => {
  bookPurchase(1, "balloon-cheap", 350, now);
  expect(spentSince(1, now)).toBe(350);
  recordRefund(1, "balloon-cheap", 350, now);
  expect(spentSince(1, now)).toBe(350);

  const stale = new Date(now.getTime() - 169 * 60 * 60 * 1000);
  bookPurchase(1, "old-sku", 80, stale);
  expect(spentSince(1, now)).toBe(350);
  expect(skusSince(1, now, 72)).toEqual(["balloon-cheap"]);
  expect(skusSince(1, now, 72)).not.toContain("old-sku");
});
