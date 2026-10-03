import type { Offer } from "@/lib/catalog";
import type { Goal } from "@/lib/intent";
import { allows, type Mandate } from "@/lib/mandate";
import { toHKD } from "@/lib/fx";
import { priceLine } from "@/lib/money";

export const DEFAULT_WEIGHTS = { relevance: 0.35, cash: 0.25, rating: 0.15, purchases: 0.10, history: 0.15 };
export type Weights = typeof DEFAULT_WEIGHTS;
export type RankedOffer = { offer: Offer; money: ReturnType<typeof priceLine>; score: number; weights: Weights; breakdown: Weights; rewardBonus: number };
export function resolveWeights(text: string, explicit?: Weights) {
  const inferred = /cheapest|lowest\s*cash|最便宜|最低现金/i.test(text) ? { relevance: 0.2, cash: 0.6, rating: 0.1, purchases: 0.05, history: 0.05 } : DEFAULT_WEIGHTS;
  const weights = explicit ?? inferred;
  const invalid = Object.values(weights).some(n => !Number.isFinite(n) || n < 0) || Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 1) > 0.000001;
  const conflict = explicit && inferred !== DEFAULT_WEIGHTS && Object.keys(inferred).some(k => explicit[k as keyof Weights] !== inferred[k as keyof Weights]);
  return { status: invalid ? "terminate" as const : conflict ? "clarify" as const : "ready" as const, weights,
    reason: invalid ? "Weights must be non-negative and sum to 1" : conflict ? "Explicit weights take precedence; confirm conflicting preference before continuing" : "Ranking weights resolved" };
}
export function offerMoney(offer: Offer, qty: number, includeRewards: boolean) {
  return priceLine({ shelf: toHKD(offer.shelf, offer.currency).amount, qty,
    coupon: toHKD(offer.coupon, offer.currency).amount,
    shipping: offer.shipping === undefined ? NaN : toHKD(offer.shipping, offer.currency).amount,
    giftValue: toHKD(offer.reward.gift, offer.currency).amount, includeRewards, rewardRate: offer.reward.rate });
}
export function rankOffers(offers: Offer[], goal: Goal, m: Mandate, history: string[], weights = DEFAULT_WEIGHTS) {
  const candidates = offers.filter(o => o.category_id === goal.categoryId && allows(m, o.merchant_id, o.category_id) &&
    (!goal.brand || o.brand.toLowerCase() === goal.brand.toLowerCase()) && (!goal.appearance || o.appearance === goal.appearance));
  const priced = candidates.map(offer => ({ offer, money: offerMoney(offer, goal.qty ?? 1, m.includeRewards) }));
  const maxCash = Math.max(1, ...priced.map(o => o.money.cashTotal));
  const maxPurchases = Math.max(1, ...priced.map(o => o.offer.purchase_count));
  const scored: RankedOffer[] = priced.map(({ offer, money }) => {
    const breakdown = { relevance: weights.relevance, cash: weights.cash * (1 - money.cashTotal / maxCash),
      rating: weights.rating * offer.rating / 5, purchases: weights.purchases * offer.purchase_count / maxPurchases,
      history: history.includes(offer.sku_id) ? weights.history : 0 };
    const rewardBonus = m.includeRewards ? weights.cash * (money.cashTotal - money.effectiveCost) / maxCash : 0;
    return { offer, money, breakdown, weights, rewardBonus, score: Object.values(breakdown).reduce((a, b) => a + b, 0) + rewardBonus };
  }).sort((a, b) => b.score - a.score || a.offer.sku_id.localeCompare(b.offer.sku_id));
  const merchant = scored[0]?.offer.merchant_id;
  const top = scored.filter(o => o.offer.merchant_id === merchant).slice(0, 3);
  const tied = scored.length > 1 && Math.abs(scored[0].score - scored[1].score) < 1e-10;
  return { status: !top.length ? "terminate" as const : tied ? "clarify" as const : "ready" as const, offers: top,
    reason: !top.length ? "No clean matching offers" : tied ? "Equal highest scores: choose an offer" : "Top offers for one goal and one merchant" };
}
