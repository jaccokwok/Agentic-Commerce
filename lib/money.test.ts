import { priceLine } from "@/lib/money";
import { FX_AS_OF } from "@/lib/fx";
import { expect, test } from "vitest";

const worked = {
  shelf: 200,
  qty: 2,
  coupon: 80,
  shipping: 30,
  giftValue: 100,
  currency: "HKD",
};

test("worked example keeps cash at 350 and scores the gift at half", () => {
  const row = priceLine({ ...worked, includeRewards: true });
  expect(row.ok).toBe(true);
  if (!row.ok) return;
  expect(row.lineTotal).toBe(400);
  expect(row.merchandise).toBe(320);
  expect(row.cashTotal).toBe(350);
  expect(row.effectiveCost).toBe(300);
  expect(row.rateAsOf).toBe(FX_AS_OF);
});

test("per item sees the line before the coupon", () => {
  const row = priceLine({ ...worked, includeRewards: true });
  if (!row.ok) throw new Error("expected a price");
  expect(row.lineTotal).toBe(400);
  expect(row.lineTotal).toBeGreaterThan(row.merchandise);
});

test("rewards off leaves effective cost equal to cash", () => {
  const row = priceLine({ ...worked, includeRewards: false });
  if (!row.ok) throw new Error("expected a price");
  expect(row.effectiveCost).toBe(row.cashTotal);
  expect(row.cashTotal).toBe(350);
});

test("missing shipping is rejected", () => {
  expect(priceLine({ ...worked, shipping: null, includeRewards: true }).ok).toBe(
    false,
  );
});

test("a CNY shelf is converted before the cash steps", () => {
  const row = priceLine({
    shelf: 100,
    qty: 1,
    coupon: 0,
    shipping: 10,
    giftValue: 0,
    includeRewards: false,
    currency: "CNY",
  });
  if (!row.ok) throw new Error("expected a price");
  expect(row.lineTotal).toBe(110);
  expect(row.cashTotal).toBe(121);
  expect(row.rateAsOf).toBe(FX_AS_OF);
});
