import type { Offer } from "@/lib/catalog";
import type { Goal } from "@/lib/intent";
import { allows, askedMixes, type Mandate, type PaymentObjective } from "@/lib/mandate";
import { toHKD } from "@/lib/fx";
import { PAY_TENDERS, priceLine, type PayTender } from "@/lib/money";

export const DEFAULT_WEIGHTS = { relevance: 0.35, cash: 0.25, rating: 0.15, purchases: 0.10, history: 0.15 };
export type Weights = typeof DEFAULT_WEIGHTS;
export const OBJECTIVE_WEIGHTS: Record<PaymentObjective, Weights> = {
  balanced: DEFAULT_WEIGHTS,
  lowest_cash: { relevance: 0.2, cash: 0.6, rating: 0.1, purchases: 0.05, history: 0.05 },
  relevance: { relevance: 0.6, cash: 0.2, rating: 0.1, purchases: 0.05, history: 0.05 },
  rating: { relevance: 0.2, cash: 0.1, rating: 0.6, purchases: 0.05, history: 0.05 },
  popular: { relevance: 0.2, cash: 0.1, rating: 0.05, purchases: 0.6, history: 0.05 },
  familiar: { relevance: 0.2, cash: 0.1, rating: 0.05, purchases: 0.05, history: 0.6 },
};
export function weightsFor(objective: PaymentObjective): Weights {
  return OBJECTIVE_WEIGHTS[objective];
}
export type RankedOffer = { offer: Offer; money: ReturnType<typeof priceLine>; tender: PayTender; score: number; weights: Weights; breakdown: Weights; rewardBonus: number };
function payableTenders(m: Mandate): PayTender[] {
  const listed = m.tenders.length ? m.tenders : ["card"];
  return listed.filter((tender): tender is PayTender => (PAY_TENDERS as readonly string[]).includes(tender));
}
function sameWeights(a: Weights, b: Weights) {
  return (Object.keys(a) as (keyof Weights)[]).every(key => a[key] === b[key]);
}
function shareLine(weights: Weights) {
  return `relevance ${weights.relevance}, cash ${weights.cash}, rating ${weights.rating}, purchases ${weights.purchases}, history ${weights.history}`;
}
export function resolveWeights(text: string, explicit?: Weights) {
  const asked = askedMixes(text);
  const named = asked.length === 1 ? OBJECTIVE_WEIGHTS[asked[0].objective] : DEFAULT_WEIGHTS;
  const weights = explicit ?? named;
  const invalid = Object.values(weights).some((n) => !Number.isFinite(n) || n < 0);
  const saved = shareLine(weights);
  const labels = asked.map(row => row.label).join(" and ");
  const conflict = asked.length > 1 || (asked.length === 1 && !sameWeights(weights, OBJECTIVE_WEIGHTS[asked[0].objective]));
  const reason = invalid ? "Weights must be finite and at least 0"
    : asked.length > 1 ? `The sentence asks for the ${labels} comparisons. The mandate comparison is ${saved}. Confirm to keep that comparison.`
    : conflict ? `The sentence asks for the ${labels} comparison. The mandate comparison is ${saved}. Confirm to keep that comparison.`
    : "Ranking weights resolved";
  return { status: invalid ? "terminate" as const : conflict ? "clarify" as const : "ready" as const, weights, reason };
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
function rankPool(candidates: Offer[], goal: Goal, m: Mandate, history: string[], weights: Weights) {
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
  const choice = tied ? `Equal scores for ${scored[0].offer.name} and ${scored[1].offer.name}. Choose one.` : "Top offers for one goal and one merchant";
  return { status: !top.length ? "terminate" as const : tied ? "clarify" as const : "ready" as const, offers: top, compared, choice };
}
export function rankOffers(offers: Offer[], goal: Goal, m: Mandate, history: string[], weights = DEFAULT_WEIGHTS) {
  const category = offers.filter(o => o.category_id === goal.categoryId && allows(m, o.merchant_id, o.category_id, o.platform_id));
  const strict = category.filter(o => (!goal.brand || o.brand.toLowerCase() === goal.brand.toLowerCase()) && (!goal.appearance || o.appearance === goal.appearance));
  const relaxed = !strict.length && category.length > 0;
  const ranked = rankPool(relaxed ? category : strict, goal, m, history, weights);
  if (!ranked.offers.length) return { status: "terminate" as const, offers: [], compared: [], reason: `The mandate limits left no ${goal.label.toLowerCase()} to rank.` };
  const named = [goal.appearance, goal.brand].filter(Boolean).join(" ");
  const fallback = `No ${named} ${goal.label.toLowerCase()} are in the catalogue. Ranked all ${goal.label.toLowerCase()} with the saved comparison.`;
  const reason = relaxed ? ranked.status === "clarify" ? `${fallback} ${ranked.choice}` : fallback : ranked.choice;
  return { status: ranked.status, offers: ranked.offers, compared: ranked.compared, reason };
}
