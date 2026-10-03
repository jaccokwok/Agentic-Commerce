"use server";

import { getSessionUser } from "@/lib/auth";
import { loadCatalog } from "@/lib/catalog";
import { getUserById } from "@/lib/db";
import { bookPurchase, skusSince, spentSince } from "@/lib/ledger";
import { createCouponBook } from "@/lib/negotiate";
import { memoryPayStore } from "@/lib/pay";
import { executeShop, type ShopCall, type ShopView } from "@/lib/shop";

// ponytail: one process-wide coupon book and pay memory. A restart clears both.
const coupons = createCouponBook();
const payStore = memoryPayStore();

const signedOut: ShopView = {
  status: "signed_out",
  reason: "sign_in",
  traceId: "",
  trace: [],
  offers: [],
  quote: null,
  booked: false,
  couponHeld: false,
};

export async function runShop(input: ShopCall): Promise<ShopView> {
  const session = await getSessionUser();
  if (!session) return signedOut;
  const user = await getUserById(session.id);
  if (!user?.vault_ref || !user.address_ref) {
    return { ...signedOut, reason: "missing_refs" };
  }

  const now = Date.now();
  const view = executeShop(input, {
    now,
    spent7d: spentSince(user.id, new Date(now)),
    recentSkuIds: skusSince(user.id, new Date(now), 72),
    vaultId: user.vault_ref,
    addressId: user.address_ref,
    coupons,
    payStore,
    catalog: loadCatalog(),
  });

  if (view.booked && view.quote) {
    bookPurchase(user.id, view.quote.skuId, view.quote.cashTotal, new Date(now));
  }
  return view;
}
