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
const card = { shelf: 280, qty: 1, coupon: 0, shipping: 20, giftValue: 0, includeRewards: false, rewardRate: 0.1,
  tender: "card" as const, cardRule: { tender: "card" as const, minMerchandise: 250, off: 40 } };
test("a card discount lowers cash only after the merchandise minimum", () => {
  expect(priceLine(card)).toMatchObject({ lineTotal: 280, merchandise: 280, cardOff: 40, cashTotal: 260, cashback: 28 });
  expect(priceLine({ ...card, shelf: 240 }).cardOff).toBe(0);
  expect(priceLine({ ...card, shelf: 240 }).cashTotal).toBe(260);
  expect(priceLine({ ...card, tender: "wallet" })).toMatchObject({ cardOff: 0, cashTotal: 300 });
  expect(priceLine({ ...card, cardRule: undefined })).toMatchObject({ cardOff: 0, cashTotal: 300 });
  expect(priceLine({ ...card, cardRule: { tender: "card", minMerchandise: 250, off: 300 } })).toMatchObject({ cardOff: 0, cashTotal: 300 });
});
const hsbc = { shelf: 280, qty: 1, coupon: 0, shipping: 20, giftValue: 0, includeRewards: false,
  tender: "hsbc-visa" as const, cardRule: { tender: "hsbc-visa" as const, minMerchandise: 250, off: 40 } };
test("a named card discount applies only to that card", () => {
  expect(priceLine(hsbc)).toMatchObject({ cardOff: 40, cashTotal: 260 });
  expect(priceLine({ ...hsbc, tender: "citi-mastercard" })).toMatchObject({ cardOff: 0, cashTotal: 300 });
  expect(priceLine({ ...hsbc, tender: "wallet" })).toMatchObject({ cardOff: 0, cashTotal: 300 });
});
