import type { Offer } from "@/lib/catalog";
import { checkMandate, allows, type Mandate, type Decision } from "@/lib/mandate";
import { offerMoney } from "@/lib/rank";
import { RATE_TIMESTAMP } from "@/lib/fx";

export type Quote = {
  items: { sku_id: string; name: string; qty: number; lineTotal: number }[];
  merchantId: string; platformId: string; categoryId: string; sourceCurrency: string; rateTimestamp: string;
  merchandise: number; cashTotal: number; effectiveCost: number; shipping: number; currency: string; tender: string;
  coupon: number; reward: { gift: number; rate: number; terms: string; cashback: number };
  expiresAt: number; mandateExpiresAt: number | null;
};
export function allowedTenders(m: Mandate) {
  const listed = m.tenders.length ? m.tenders : ["card"];
  return listed.filter(tender => tender === "card" || tender === "wallet");
}
export function searchDeadline(now: number, m: Mandate) { return now + Math.min(15, m.maxSearchSeconds) * 1000; }
export function clarifyDeadline(now: number) { return now + 120000; }
export function createQuote(offer: Offer, qty: number, m: Mandate, now: number): Quote {
  const money = offerMoney(offer, qty, m.includeRewards);
  return { items: [{ sku_id: offer.sku_id, name: offer.name, qty, lineTotal: money.lineTotal }],
    merchantId: offer.merchant_id, platformId: offer.platform_id, categoryId: offer.category_id, sourceCurrency: offer.currency,
    rateTimestamp: RATE_TIMESTAMP, merchandise: money.merchandise, cashTotal: money.cashTotal, effectiveCost: money.effectiveCost,
    shipping: money.shipping, currency: "HKD", tender: allowedTenders(m)[0] ?? "card", coupon: money.lineTotal - money.merchandise,
    reward: { ...offer.reward, cashback: money.cashback }, expiresAt: now + 120000, mandateExpiresAt: m.expiresAt };
}
export function quoteFingerprint(q: Quote) {
  return JSON.stringify({ items: q.items, merchant: q.merchantId, cash: q.cashTotal, shipping: q.shipping,
    currency: q.currency, sourceCurrency: q.sourceCurrency, tender: q.tender, reward: q.reward, coupon: q.coupon, merchandise: q.merchandise });
}
export function quoteChanged(a: Quote, b: Quote) {
  return quoteFingerprint(a) !== quoteFingerprint(b);
}
export function checkQuote(q: Quote, m: Mandate, shareRemaining: number, rollingRemaining: number, now: number): Decision {
  const mandate = checkMandate(m, now);
  if (mandate.status !== "ready") return mandate;
  if (now >= q.expiresAt) return { status: "terminate", reason: "Quote expired" };
  if (q.tender !== "card" && q.tender !== "wallet") return { status: "terminate", reason: "Tender is not an allowed mock card or wallet" };
  if (!allowedTenders(m).includes(q.tender)) return { status: "terminate", reason: "Tender is not an allowed mock card or wallet" };
  if (!allows(m, q.merchantId, q.categoryId)) return { status: "terminate", reason: "Merchant or category is disallowed" };
  if (q.items.some(i => i.lineTotal > m.perItem) || q.cashTotal > m.perOrder || q.cashTotal > shareRemaining || q.cashTotal > rollingRemaining) {
    return { status: "terminate", reason: "Cash or pre-coupon line exceeds a mandatory spending limit" };
  }
  if (!Number.isFinite(q.cashTotal) || q.shipping < 0 || q.cashTotal !== Math.round((q.merchandise + q.shipping) * 100) / 100) return { status: "terminate", reason: "Invalid quote money" };
  return { status: "ready", reason: "Pre-coupon line, cash, goal share and 168-hour budget pass" };
}
