import { charge, memoryPayStore } from "@/lib/pay";
import { expect, test } from "vitest";

const base = {
  vaultId: "vault_1",
  addressId: "addr_1",
  amount: 130,
  currency: "HKD",
  expiresAt: Date.parse("2026-06-01T01:00:00.000Z"),
  tender: "card",
  allowedTenders: [] as string[],
  idempotencyKey: "pay_1",
  phase: "ok" as const,
};

test("a charge sends ids and amount, and a second try does not book again", () => {
  const memory = memoryPayStore();
  const first = charge(base, memory);
  const second = charge(base, memory);
  expect(first).toMatchObject({ status: "paid", booked: true, first: true });
  expect(second).toMatchObject({ status: "paid", booked: true, first: false });
});

test("card numbers are refused", () => {
  const result = charge({ ...base, pan: "4242424242424242" }, memoryPayStore());
  expect(result).toMatchObject({ status: "terminate", reason: "card_data", booked: false });
});

test("a tender list that excludes card terminates", () => {
  const result = charge({ ...base, allowedTenders: ["alipay"] }, memoryPayStore());
  expect(result.status).toBe("terminate");
  if (result.status === "terminate") expect(result.reason).toBe("tender");
});

test("a timeout before any charge does not book", () => {
  const result = charge({ ...base, phase: "timeout_before" }, memoryPayStore());
  expect(result).toMatchObject({ status: "terminate", reason: "timeout_before", booked: false });
});

test("a timeout after the charge keeps the same booked result", () => {
  const memory = memoryPayStore();
  const first = charge({ ...base, phase: "timeout_after" }, memory);
  const second = charge({ ...base, phase: "timeout_after" }, memory);
  expect(first).toMatchObject({ status: "paid", booked: true, first: true });
  expect(second.first).toBe(false);
});
