import type { Offer } from "@/lib/catalog";
export type CouponState = "unused" | "reserved" | "spent";
const PLATFORMS = new Set(["taobao", "hktvmall", "pinduoduo"]);
export function releaseCoupon(): CouponState { return "unused"; }

function reject(reason: string) {
  return { status: "rejected" as const, coupon: releaseCoupon(), reason };
}

function withCounter(row: Offer): Offer | null {
  const counter = row.counter;
  if (!counter || (counter.shipping === undefined && counter.coupon === undefined)) return null;
  if (counter.shipping !== undefined && (!Number.isFinite(counter.shipping) || counter.shipping < 0)) return null;
  if (counter.coupon !== undefined && (!Number.isFinite(counter.coupon) || counter.coupon < 0)) return null;
  const shipping = counter.shipping ?? row.shipping;
  if (shipping === undefined) return null;
  const next = { ...row, shipping, coupon: counter.coupon ?? row.coupon };
  delete next.counter;
  return next;
}

export function negotiate(selected: Offer, current: Offer | undefined, couponGone = false) {
  if (!current || !current.stock || !PLATFORMS.has(current.platform_id) || current.platform_id !== selected.platform_id) return reject("out_of_stock");
  if (couponGone) return reject("coupon_gone");
  if (selected.shelf !== current.shelf || selected.coupon !== current.coupon || selected.shipping !== current.shipping || selected.currency !== current.currency) return reject("price_mismatch");
  const countered = withCounter(current);
  if (current.counter) {
    if (!countered) return reject("price_mismatch");
    return { status: "counter" as const, coupon: releaseCoupon(), reason: current.counter.reason, offer: countered };
  }
  return { status: "accepted" as const, coupon: "reserved" as const, reason: "Catalogue accepted quoted terms" };
}
