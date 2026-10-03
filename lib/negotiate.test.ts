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
test("one counter may change shipping or the coupon and never the shelf", () => {
  const offer = rawOffers[0];
  const raised = negotiate(offer, { ...offer, counter: { shipping: (offer.shipping ?? 0) + 10, reason: "Shipping quote revised" } });
  expect(raised.status).toBe("counter");
  if (raised.status === "counter") {
    expect(raised.coupon).toBe("unused");
    expect(raised.offer.shipping).toBe((offer.shipping ?? 0) + 10);
    expect(raised.offer.shelf).toBe(offer.shelf);
    expect(raised.offer.counter).toBeUndefined();
  }
  expect(negotiate(offer, { ...offer, counter: { coupon: 5, reason: "Coupon revised" } })).toMatchObject({ status: "counter", coupon: "unused" });
  expect(negotiate(offer, { ...offer, counter: { reason: "No new term" } })).toMatchObject({ status: "rejected", coupon: "unused" });
  expect(negotiate(offer, { ...offer, shipping: undefined, counter: { coupon: 1, reason: "Drop shipping" } })).toMatchObject({ status: "rejected", coupon: "unused" });
});
