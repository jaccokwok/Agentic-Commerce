import type { Offer } from "@/lib/catalog";
export type CouponState = "unused" | "reserved" | "spent";
export function releaseCoupon(): CouponState { return "unused"; }
export function negotiate(selected: Offer, current: Offer | undefined, couponGone = false) {
  let reason = "";
  if (!current || !current.stock) reason = "out_of_stock";
  else if (couponGone) reason = "coupon_gone";
  else if (selected.shelf !== current.shelf || selected.coupon !== current.coupon || selected.shipping !== current.shipping || selected.currency !== current.currency) reason = "price_mismatch";
  return reason ? { status: "rejected" as const, coupon: releaseCoupon(), reason } : { status: "accepted" as const, coupon: "reserved" as const, reason: "Catalogue accepted quoted terms" };
}
