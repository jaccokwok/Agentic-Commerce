import { afterEach, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "@/lib/db";
import { mockPay } from "@/lib/pay";
import { receipt, spent7d } from "@/lib/ledger";
import { defaultMandate } from "@/lib/mandate";

const databases: DatabaseSync[] = [];
function setup() { const database = new DatabaseSync(":memory:"); initializeSchema(database); databases.push(database); return database; }
afterEach(() => databases.splice(0).forEach(d => d.close()));
const input = { vaultId: "vault_test", addressId: "address_test", amount: 350, currency: "HKD", expiresAt: 9999, tender: "card", idempotencyKey: "one" };
const context = { userId: 1, requestId: "request", goalId: "snacks", traceId: "trace", skus: ["sku"], cashback: 6.4, mandate: defaultMandate(), now: 1000 };
test("mock card pay receives refs and books exactly once for the same key", () => {
  const database = setup();
  expect(mockPay(input, context, database).status).toBe("paid");
  expect(mockPay(input, context, database).status).toBe("paid");
  expect(spent7d(1, 1000, database)).toBe(350);
});
test("failure, pre-charge timeout, disallowed tender and unexpected PAN do not book", () => {
  for (const variant of ["failed", "timeout_before"] as const) {
    const database = setup();
    expect(mockPay(input, { ...context, simulation: variant }, database).status).toBe("terminate");
    expect(spent7d(1, 1000, database)).toBe(0);
  }
  const database = setup();
  expect(mockPay(input, { ...context, mandate: { ...defaultMandate(), tenders: ["points"] } }, database).status).toBe("terminate");
  expect(mockPay(input, { ...context, mandate: { ...defaultMandate(), tenders: [] } }, database).status).toBe("paid");
  const unexpectedInput = { ...input, cardNumber: "not-a-card" };
  expect(mockPay(unexpectedInput, context, database).status).toBe("terminate");
});
test("timeout after charge retries the same key and reconciles, atomic budget guard prevents races", () => {
  const database = setup();
  expect(mockPay(input, { ...context, simulation: "timeout_after" }, database).status).toBe("clarify");
  expect(mockPay(input, context, database).status).toBe("paid");
  expect(spent7d(1, 1000, database)).toBe(350);
  expect(mockPay({ ...input, idempotencyKey: "two" }, { ...context, guard: () => { throw new Error("No budget"); } }, database).status).toBe("terminate");
  expect(spent7d(1, 1000, database)).toBe(350);
});
test("card declined before charge lets wallet book once; a charge does not start wallet", () => {
  const database = setup();
  const mandate = { ...defaultMandate(), tenders: ["card", "wallet"] };
  const paid = mockPay(input, { ...context, mandate, simulation: "card_declined" }, database);
  expect(paid.status).toBe("paid");
  expect(receipt("wallet:one", database)?.cash_cents).toBe(35000);
  expect(receipt("one", database)).toBeNull();
  expect(spent7d(1, 1000, database)).toBe(350);
  expect(mockPay(input, { ...context, mandate }, database).status).toBe("paid");
  expect(spent7d(1, 1000, database)).toBe(350);
  const charged = setup();
  expect(mockPay(input, { ...context, mandate, simulation: "timeout_after" }, charged).status).toBe("clarify");
  expect(receipt("one", charged)?.cash_cents).toBe(35000);
  expect(receipt("wallet:one", charged)).toBeNull();
  const discounted = setup();
  expect(mockPay(input, { ...context, mandate, simulation: "card_declined", cardOff: 40 }, discounted).status).toBe("clarify");
  expect(receipt("one", discounted)).toBeNull();
  expect(receipt("wallet:one", discounted)).toBeNull();
  expect(spent7d(1, 1000, discounted)).toBe(0);
  const timed = setup();
  expect(mockPay(input, { ...context, mandate, simulation: "timeout_after", cardOff: 40 }, timed).status).toBe("clarify");
  expect(receipt("one", timed)?.cash_cents).toBe(35000);
  expect(receipt("wallet:one", timed)).toBeNull();
});
test("a named card books its own key, and a discount decline does not start the next card", () => {
  const mandate = { ...defaultMandate(), tenders: ["hsbc-visa", "citi-mastercard", "wallet"] };
  const named = { ...input, tender: "hsbc-visa", amount: 260 };
  const declined = setup();
  expect(mockPay(named, { ...context, mandate, simulation: "card_declined", cardOff: 40 }, declined).status).toBe("clarify");
  expect(receipt("hsbc-visa:one", declined)).toBeNull();
  expect(receipt("citi-mastercard:one", declined)).toBeNull();
  expect(spent7d(1, 1000, declined)).toBe(0);
  const timed = setup();
  expect(mockPay(named, { ...context, mandate, simulation: "timeout_after", cardOff: 40 }, timed).status).toBe("clarify");
  expect(receipt("hsbc-visa:one", timed)?.cash_cents).toBe(26000);
  expect(receipt("citi-mastercard:one", timed)).toBeNull();
  expect(mockPay(named, { ...context, mandate, cardOff: 40 }, timed).status).toBe("paid");
  expect(spent7d(1, 1000, timed)).toBe(260);
});
test("a failed credential check does not book", () => {
  const database = setup();
  expect(mockPay(input, { ...context, credentials: "bad" }, database).status).toBe("terminate");
  expect(spent7d(1, 1000, database)).toBe(0);
});
