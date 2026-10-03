import type { Offer } from "@/lib/catalog";
import { checkMandate, allows, type Mandate, type Decision } from "@/lib/mandate";
import { PAY_TENDERS, type PayTender } from "@/lib/money";
import { choosePrice } from "@/lib/rank";
import { RATE_TIMESTAMP, toHKD } from "@/lib/fx";

export type Quote = {
  items: { sku_id: string; name: string; qty: number; lineTotal: number }[];
  merchantId: string; platformId: string; categoryId: string; sourceCurrency: string; rateTimestamp: string;
  merchandise: number; cashTotal: number; effectiveCost: number; shipping: number; currency: string; tender: string;
  cardOff: number; cardMinimum: number;
  coupon: number; reward: { gift: number; rate: number; terms: string; cashback: number };
  expiresAt: number; mandateExpiresAt: number | null;
};
export function allowedTenders(m: Mandate): PayTender[] {
  const listed = m.tenders.length ? m.tenders : ["card"];
  return listed.filter((tender): tender is PayTender => (PAY_TENDERS as readonly string[]).includes(tender));
}
export function searchDeadline(now: number, m: Mandate) { return now + Math.min(15, m.maxSearchSeconds) * 1000; }
export function clarifyDeadline(now: number) { return now + 120000; }
export function createQuote(offer: Offer, qty: number, m: Mandate, now: number): Quote {
  const priced = choosePrice(offer, qty, m);
  const money = priced.money;
  return { items: [{ sku_id: offer.sku_id, name: offer.name, qty, lineTotal: money.lineTotal }],
    merchantId: offer.merchant_id, platformId: offer.platform_id, categoryId: offer.category_id, sourceCurrency: offer.currency,
    rateTimestamp: RATE_TIMESTAMP, merchandise: money.merchandise, cashTotal: money.cashTotal, effectiveCost: money.effectiveCost,
    shipping: money.shipping, currency: "HKD", tender: priced.tender, cardOff: money.cardOff,
    cardMinimum: toHKD([...(offer.cardRule ? [offer.cardRule] : []), ...(offer.cardRules ?? [])].find(rule => rule.tender === priced.tender)?.minMerchandise ?? 0, offer.currency).amount,
    coupon: money.lineTotal - money.merchandise,
    reward: { ...offer.reward, cashback: money.cashback }, expiresAt: now + 120000, mandateExpiresAt: m.expiresAt };
}
export function quoteFingerprint(q: Quote) {
  return JSON.stringify({ items: q.items, merchant: q.merchantId, cash: q.cashTotal, shipping: q.shipping,
    currency: q.currency, sourceCurrency: q.sourceCurrency, tender: q.tender, reward: q.reward, coupon: q.coupon, merchandise: q.merchandise,
    cardOff: q.cardOff, cardMinimum: q.cardMinimum });
}
export function quoteChanged(a: Quote, b: Quote) {
  return quoteFingerprint(a) !== quoteFingerprint(b);
}
export function checkQuote(q: Quote, m: Mandate, shareRemaining: number, rollingRemaining: number, now: number): Decision {
  const mandate = checkMandate(m, now);
  if (mandate.status !== "ready") return mandate;
  if (now >= q.expiresAt) return { status: "terminate", reason: "Quote expired" };
  if (!(PAY_TENDERS as readonly string[]).includes(q.tender)) return { status: "terminate", reason: "Tender is not an allowed mock card or wallet" };
  if (!allowedTenders(m).includes(q.tender as PayTender)) return { status: "terminate", reason: "Tender is not an allowed mock card or wallet" };
  if (!allows(m, q.merchantId, q.categoryId, q.platformId)) {
    const named = q.platformId && q.platformId !== q.merchantId ? `${q.merchantId} (${q.platformId})` : q.merchantId;
    const categoryBlocked = m.categoryDeny.includes(q.categoryId) || (m.categoryAllow.length > 0 && !m.categoryAllow.includes(q.categoryId));
    const list = m.merchantAllow.length ? ` Allow list: ${m.merchantAllow.join(", ")}.` : "";
    return { status: "terminate", reason: categoryBlocked ? `Category ${q.categoryId} is not allowed by the mandate.` : `Merchant ${named} is not allowed by the mandate.${list}` };
  }
  if (q.items.some(i => i.lineTotal > m.perItem) || q.cashTotal > m.perOrder || q.cashTotal > shareRemaining || q.cashTotal > rollingRemaining) {
    return { status: "terminate", reason: "Cash or pre-coupon line exceeds a mandatory spending limit" };
  }
  const cardOff = q.cardOff ?? 0;
  if (!Number.isFinite(q.cashTotal) || q.shipping < 0 || cardOff < 0 || q.cashTotal !== Math.round((q.merchandise - cardOff + q.shipping) * 100) / 100) return { status: "terminate", reason: "Invalid quote money" };
  return { status: "ready", reason: "Pre-coupon line, cash, goal share and 168-hour budget pass" };
}
export function fitQuantity(offer: Offer, m: Mandate, share: number, rolling: number, now: number): number {
  const shelf = toHKD(offer.shelf, offer.currency).amount;
  if (!(shelf > 0)) return 0;
  const cap = Math.min(10000, Math.max(1, Math.floor(m.perItem / shelf)));
  let best = 0;
  for (let qty = 1; qty <= cap; qty++) {
    if (checkQuote(createQuote(offer, qty, m, now), m, share, rolling, now).status !== "ready") break;
    best = qty;
  }
  return best;
}
