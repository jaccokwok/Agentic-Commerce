import { afterEach, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema, createUser } from "@/lib/db";
import { book, spent7d, refund, recentSkus, historySkus } from "@/lib/ledger";

const databases: DatabaseSync[] = [];
function db() { const database = new DatabaseSync(":memory:"); initializeSchema(database); databases.push(database); return database; }
afterEach(() => databases.splice(0).forEach(d => d.close()));
const payment = { userId: 1, key: "one", traceId: "trace", requestId: "request", goalId: "snacks", skus: ["sku"], cashTotal: 350, cashback: 6.4, successful: true, now: 2000000000 };
test("successful payment books cash once; refunds do not restore the 168-hour budget", () => {
  const database = db();
  book(payment, database); book(payment, database);
  expect(spent7d(1, payment.now, database)).toBe(350);
  refund(1, "one", payment.now + 1, database);
  expect(spent7d(1, payment.now + 1, database)).toBe(350);
  expect(spent7d(1, payment.now + 168 * 3600000, database)).toBe(0);
  expect(recentSkus(1, payment.now + 71 * 3600000, database)).toContain("sku");
  expect(recentSkus(1, payment.now + 72 * 3600000, database)).not.toContain("sku");
  expect(historySkus(1, database)).toContain("sku");
});
test("failed attempts never book", () => {
  const database = db();
  expect(() => book({ ...payment, successful: false }, database)).toThrow();
  expect(spent7d(1, payment.now, database)).toBe(0);
});
test("registration creates both refs and preserves existing user schema", async () => {
  const database = new DatabaseSync(":memory:"); databases.push(database);
  database.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, name TEXT, password_hash TEXT, created_at TEXT DEFAULT (datetime('now')))");
  initializeSchema(database);
  const user = await createUser("test@example.com", "Test", "test-hash", database);
  expect(user.vault_id).toMatch(/^vault_/);
  expect(user.address_id).toMatch(/^address_/);
});
