import { expect, test } from "vitest";
import { priceLine } from "@/lib/money";

const input = { shelf: 200, qty: 2, coupon: 80, shipping: 30, giftValue: 100, includeRewards: true };
test("cash includes shipping, per-item sees pre-coupon line, gift never reduces cash", () => {
  expect(priceLine(input)).toMatchObject({ lineTotal: 400, merchandise: 320, cashTotal: 350, effectiveCost: 300 });
  expect(priceLine({ ...input, includeRewards: false }).effectiveCost).toBe(350);
});
test("missing shipping and invalid money are rejected", () => {
  expect(() => priceLine({ ...input, shipping: undefined as unknown as number })).toThrow();
  expect(() => priceLine({ ...input, shelf: -1 })).toThrow();
  expect(() => priceLine({ ...input, qty: 1.5 })).toThrow();
});
test("arithmetic uses cents and rewards exclude shipping", () => {
  expect(priceLine({ ...input, rewardRate: 0.1 }).cashback).toBe(32);
  expect(priceLine({ ...input, rewardRate: 0.1, includeRewards: false }).cashback).toBe(32);
  expect(priceLine({ ...input, shelf: 0.1, qty: 3, coupon: 0, shipping: 0, giftValue: 0 }).cashTotal).toBe(0.3);
});
