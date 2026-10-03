import type { Offer } from "@/lib/catalog";
import type { Goal } from "@/lib/intent";
import { allows, type Mandate } from "@/lib/mandate";
import { toHKD } from "@/lib/fx";
import { PAY_TENDERS, priceLine, type PayTender } from "@/lib/money";

export const DEFAULT_WEIGHTS = { relevance: 0.35, cash: 0.25, rating: 0.15, purchases: 0.10, history: 0.15 };
export type Weights = typeof DEFAULT_WEIGHTS;
export type RankedOffer = { offer: Offer; money: ReturnType<typeof priceLine>; tender: PayTender; score: number; weights: Weights; breakdown: Weights; rewardBonus: number };
function payableTenders(m: Mandate): PayTender[] {
  const listed = m.tenders.length ? m.tenders : ["card"];
  return listed.filter((tender): tender is PayTender => (PAY_TENDERS as readonly string[]).includes(tender));
}
export function resolveWeights(text: string, explicit?: Weights) {
  const inferred = /cheapest|lowest\s*cash|最便宜|最低现金/i.test(text) ? { relevance: 0.2, cash: 0.6, rating: 0.1, purchases: 0.05, history: 0.05 } : DEFAULT_WEIGHTS;
  const weights = explicit ?? inferred;
  const invalid = Object.values(weights).some((n) => !Number.isFinite(n) || n < 0);
  const conflict = explicit && inferred !== DEFAULT_WEIGHTS && Object.keys(inferred).some(k => explicit[k as keyof Weights] !== inferred[k as keyof Weights]);
  return { status: invalid ? "terminate" as const : conflict ? "clarify" as const : "ready" as const, weights,
    reason: invalid ? "Weights must be finite and at least 0" : conflict ? "Explicit weights take precedence; confirm conflicting preference before continuing" : "Ranking weights resolved" };
}
export function offerMoney(offer: Offer, qty: number, includeRewards: boolean, tender?: PayTender) {
  const rule = [...(offer.cardRule ? [offer.cardRule] : []), ...(offer.cardRules ?? [])].find(item => item.tender === tender);
  return priceLine({ shelf: toHKD(offer.shelf, offer.currency).amount, qty,
    coupon: toHKD(offer.coupon, offer.currency).amount,
    shipping: offer.shipping === undefined ? NaN : toHKD(offer.shipping, offer.currency).amount,
    giftValue: toHKD(offer.reward.gift, offer.currency).amount, includeRewards, rewardRate: offer.reward.rate, tender,
    cardRule: rule ? { tender: rule.tender, minMerchandise: toHKD(rule.minMerchandise, offer.currency).amount, off: toHKD(rule.off, offer.currency).amount } : undefined });
}
export function choosePrice(offer: Offer, qty: number, m: Mandate) {
  const tenders = payableTenders(m);
  const choices = (tenders.length ? tenders : ["card" as const]).map(tender => ({ tender, money: offerMoney(offer, qty, m.includeRewards, tenders.length ? tender : undefined) }));
  return choices.reduce((chosen, next) => next.money.cashTotal < chosen.money.cashTotal ? next : chosen);
}
export function rankOffers(offers: Offer[], goal: Goal, m: Mandate, history: string[], weights = DEFAULT_WEIGHTS) {
  const candidates = offers.filter(o => o.category_id === goal.categoryId && allows(m, o.merchant_id, o.category_id) &&
    (!goal.brand || o.brand.toLowerCase() === goal.brand.toLowerCase()) && (!goal.appearance || o.appearance === goal.appearance));
  const priced = candidates.map(offer => ({ offer, ...choosePrice(offer, goal.qty ?? 1, m) }));
  const maxCash = Math.max(1, ...priced.map(o => o.money.cashTotal));
  const maxPurchases = Math.max(1, ...priced.map(o => o.offer.purchase_count));
  const scored: RankedOffer[] = priced.map(({ offer, money, tender }) => {
    const breakdown = { relevance: weights.relevance, cash: weights.cash * (1 - money.cashTotal / maxCash),
      rating: weights.rating * offer.rating / 5, purchases: weights.purchases * offer.purchase_count / maxPurchases,
      history: history.includes(offer.sku_id) ? weights.history : 0 };
    const rewardBonus = m.includeRewards ? weights.cash * (money.cashTotal - money.effectiveCost) / maxCash : 0;
    return { offer, money, tender, breakdown, weights, rewardBonus, score: Object.values(breakdown).reduce((a, b) => a + b, 0) + rewardBonus };
  }).sort((a, b) => b.score - a.score || a.offer.sku_id.localeCompare(b.offer.sku_id));
  const merchant = scored[0]?.offer.merchant_id;
  const top = scored.filter(o => o.offer.merchant_id === merchant).slice(0, 3);
  const tied = scored.length > 1 && Math.abs(scored[0].score - scored[1].score) < 1e-10;
  const compared = scored.map(row => ({ sku: row.offer.sku_id, merchant: row.offer.merchant_id, cash: row.money.cashTotal, tender: row.tender, score: row.score,
    parts: `relevance ${row.breakdown.relevance.toFixed(4)}, cash ${row.breakdown.cash.toFixed(4)}, rating ${row.breakdown.rating.toFixed(4)}, purchases ${row.breakdown.purchases.toFixed(4)}, history ${row.breakdown.history.toFixed(4)}, reward ${row.rewardBonus.toFixed(4)}` }));
  return { status: !top.length ? "terminate" as const : tied ? "clarify" as const : "ready" as const, offers: top, compared,
    reason: !top.length ? "No clean matching offers" : tied ? "Equal highest scores: choose an offer" : "Top offers for one goal and one merchant" };
}
