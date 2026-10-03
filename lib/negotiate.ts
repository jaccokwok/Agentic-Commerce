import type { Offer } from "@/lib/catalog";

export type CouponBook = { held: Set<string> };

export function createCouponBook(): CouponBook {
  return { held: new Set() };
}

export function releaseCoupon(skuId: string, coupons: CouponBook) {
  coupons.held.delete(skuId);
}

export function negotiate(
  offer: Offer,
  coupons: CouponBook,
): { ok: true } | { ok: false; reason: "out_of_stock" | "coupon_gone" | "price_mismatch" } {
  if (offer.in_stock === false) return { ok: false, reason: "out_of_stock" };
  if (offer.coupon > 0 && offer.coupon_available === false) {
    return { ok: false, reason: "coupon_gone" };
  }
  if (offer.shelf !== offer.human_price) return { ok: false, reason: "price_mismatch" };
  if (offer.coupon > 0) {
    if (coupons.held.has(offer.sku_id)) return { ok: false, reason: "coupon_gone" };
    coupons.held.add(offer.sku_id);
  }
  return { ok: true };
}
