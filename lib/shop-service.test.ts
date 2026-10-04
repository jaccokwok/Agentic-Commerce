import { afterEach, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema, createUser } from "@/lib/db";
import { saveMandate, createRequest, searchRequest, actOnAttempt } from "@/lib/shop-service";
import { defaultMandate } from "@/lib/mandate";
import { parseIntent } from "@/lib/intent";
import { latestReceipt, spent7d, traceForReceipt } from "@/lib/ledger";

const databases: DatabaseSync[] = [];
async function setup() {
  const db = new DatabaseSync(":memory:"); initializeSchema(db); databases.push(db);
  const user = await createUser("shop@example.com", "Shop", "test", db);
  await saveMandate(user.id, defaultMandate(), db);
  return { db, user };
}
afterEach(() => databases.splice(0).forEach(d => d.close()));
test("server owns mandate, quote and payment refs; other users cannot access requests", async () => {
  const { db, user } = await setup();
  const req = createRequest(user.id, { text: "rice", goals: [{ ...parseIntent("rice").goals[0], qty: 1 }], shares: { groceries: 350 }, budget: 350, partialAccepted: false }, 1000, db);
  await expect(searchRequest(999, req.id, "groceries", undefined, false, 1000, db)).rejects.toThrow();
  const a = await searchRequest(user.id, req.id, "groceries", undefined, false, 1000, db);
  await expect(actOnAttempt(999, a.id, { type: "confirm", version: a.quoteVersion }, 1000, db)).rejects.toThrow();
  expect((await actOnAttempt(user.id, a.id, { type: "confirm", version: a.quoteVersion }, 1000, db)).status).toBe("paid");
  expect((await actOnAttempt(user.id, a.id, { type: "confirm", version: a.quoteVersion }, 1000, db)).status).toBe("paid");
  const latest = latestReceipt(user.id, db)!;
  const trace = traceForReceipt(user.id, latest.trace_id, db);
  expect(trace?.id).toBe(a.trace.id);
  expect(trace?.rows.some(row => row.from === "payer" && row.to === "shopper")).toBe(true);
  expect(traceForReceipt(999, latest.trace_id, db)).toBeNull();
  expect(spent7d(user.id, 1000, db)).toBe(a.quote!.cashTotal);
});
test("mandate changes or revocation cancel outstanding coupons", async () => {
  const { db, user } = await setup();
  const req = createRequest(user.id, { text: "snacks", goals: [{ ...parseIntent("snacks").goals[0], qty: 1 }], shares: { snacks: 350 }, budget: 350, partialAccepted: false }, 1000, db);
  const a = await searchRequest(user.id, req.id, "snacks", undefined, false, 1000, db);
  await saveMandate(user.id, { ...defaultMandate(), revoked: true }, db);
  const ended = await actOnAttempt(user.id, a.id, { type: "confirm", version: a.quoteVersion }, 1000, db);
  expect(ended.status).toBe("terminate");
  expect(ended.coupon).toBe("unused");
  expect(spent7d(user.id, 1000, db)).toBe(0);
});
test("split request completes both goals from fixed shares without borrowing", async () => {
  const { db, user } = await setup();
  const req = createRequest(user.id, { text: "food budget 350", goals: parseIntent("food").goals.map(g => ({ ...g, qty: 1 })), shares: { snacks: 175, groceries: 175 }, budget: 350, partialAccepted: true }, 1000, db);
  for (const goalId of ["snacks", "groceries"]) {
    const a = await searchRequest(user.id, req.id, goalId, undefined, false, 1000, db);
    expect(a.status).toBe("quote");
    expect((await actOnAttempt(user.id, a.id, { type: "confirm", version: a.quoteVersion }, 1000, db)).status).toBe("paid");
  }
});
test("two prepared payments cannot spend the same goal share twice", async () => {
  const { db, user } = await setup();
  const req = createRequest(user.id, { text: "rice", goals: [{ ...parseIntent("rice").goals[0], qty: 1 }], shares: { groceries: 100 }, budget: 100, partialAccepted: false }, 1000, db);
  const a = await searchRequest(user.id, req.id, "groceries", "party-shop", false, 1000, db);
  const b = await searchRequest(user.id, req.id, "groceries", "party-shop", false, 1000, db);
  expect((await actOnAttempt(user.id, a.id, { type: "confirm", version: a.quoteVersion }, 1000, db)).status).toBe("paid");
  expect((await actOnAttempt(user.id, b.id, { type: "confirm", version: b.quoteVersion }, 1000, db)).status).toBe("terminate");
  expect(spent7d(user.id, 1000, db)).toBe(60);
});
test("automatic mode uses the server-stored authorization and stored payment refs", async () => {
  const { db, user } = await setup();
  await saveMandate(user.id, { ...defaultMandate(), confirmMode: "auto" }, db);
  const req = createRequest(user.id, { text: "rice", goals: [{ ...parseIntent("rice").goals[0], qty: 1 }], shares: { groceries: 350 }, budget: 350, partialAccepted: false }, 1000, db);
  expect((await searchRequest(user.id, req.id, "groceries", "party-shop", false, 1000, db)).status).toBe("paid");
  expect(spent7d(user.id, 1000, db)).toBe(60);
});
