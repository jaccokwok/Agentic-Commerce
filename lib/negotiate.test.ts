import { sampleOffer } from "@/lib/catalog";
import { createCouponBook, negotiate, releaseCoupon } from "@/lib/negotiate";
import { expect, test } from "vitest";

test("accept reserves a coupon", () => {
  const coupons = createCouponBook();
  const offer = sampleOffer({ sku_id: "snack", coupon: 10, category_id: "snacks" });
  expect(negotiate(offer, coupons)).toEqual({ ok: true });
  expect(coupons.held.has("snack")).toBe(true);
});

test("a missing coupon, a stock-out, or a moved shelf rejects and holds nothing", () => {
  const coupons = createCouponBook();
  expect(
    negotiate(sampleOffer({ sku_id: "a", coupon: 10, coupon_available: false }), coupons),
  ).toEqual({ ok: false, reason: "coupon_gone" });
  expect(negotiate(sampleOffer({ sku_id: "b", in_stock: false }), coupons)).toEqual({
    ok: false,
    reason: "out_of_stock",
  });
  expect(negotiate(sampleOffer({ sku_id: "c", shelf: 90, human_price: 120 }), coupons)).toEqual({
    ok: false,
    reason: "price_mismatch",
  });
  expect(coupons.held.size).toBe(0);
});

test("release returns the coupon to unused", () => {
  const coupons = createCouponBook();
  const offer = sampleOffer({ sku_id: "snack", coupon: 10 });
  negotiate(offer, coupons);
  releaseCoupon("snack", coupons);
  expect(coupons.held.has("snack")).toBe(false);
});
