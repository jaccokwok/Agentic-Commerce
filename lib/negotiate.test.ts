import { expect, test } from "vitest";
import { negotiate, releaseCoupon } from "@/lib/negotiate";
import { rawOffers } from "@/lib/catalog";

test("one catalogue accept reserves coupon; each rejection releases it", () => {
  const offer = rawOffers[0];
  expect(negotiate(offer, offer)).toMatchObject({ status: "accepted", coupon: "reserved" });
  for (const [current, gone, reason] of [[{ ...offer, stock: false }, false, "out_of_stock"], [offer, true, "coupon_gone"], [{ ...offer, shelf: 999 }, false, "price_mismatch"]] as const) {
    expect(negotiate(offer, current, gone)).toMatchObject({ status: "rejected", coupon: "unused", reason });
  }
  expect(releaseCoupon()).toBe("unused");
});
