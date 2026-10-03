import { afterEach, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "@/lib/db";
import { mockPay } from "@/lib/pay";
import { spent7d } from "@/lib/ledger";
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
  expect(mockPay(input, { ...context, mandate: { ...defaultMandate(), tenders: [] } }, database).status).toBe("terminate");
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
