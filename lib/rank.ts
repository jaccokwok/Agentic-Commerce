import type { Offer } from "@/lib/catalog";
import type { Mandate } from "@/lib/mandate";
import { categoryAllowed, merchantAllowed } from "@/lib/mandate";
import { priceLine } from "@/lib/money";

export const DEFAULT_WEIGHTS = {
  relevance: 0.35,
  cash: 0.25,
  rating: 0.15,
  purchaseCount: 0.1,
  history: 0.15,
};

export type Weights = typeof DEFAULT_WEIGHTS;

export type RankedOffer = {
  offer: Offer;
  score: number;
  lineTotal: number;
  merchandise: number;
  shipping: number;
  cashTotal: number;
  effectiveCost: number;
  weights: Weights;
  parts: Weights;
};

const KEYS = Object.keys(DEFAULT_WEIGHTS) as (keyof Weights)[];

export function inferWeights(text: string): Partial<Weights> {
  const patch: Partial<Weights> = {};
  if (/cheapest|lowest price/i.test(text)) patch.cash = 0.5;
  if (/highest rated|best rating/i.test(text)) patch.rating = 0.5;
  return patch;
}

export function resolveWeights(
  form: Partial<Weights>,
  inferred: Partial<Weights>,
): { ok: true; weights: Weights } | { ok: false; reason: "weight_conflict" } {
  const weights = { ...DEFAULT_WEIGHTS };
  for (const key of KEYS) {
    const chosen = form[key];
    const guessed = inferred[key];
    if (chosen !== undefined && guessed !== undefined && chosen !== guessed) {
      return { ok: false, reason: "weight_conflict" };
    }
    weights[key] = chosen ?? guessed ?? weights[key];
  }
  return { ok: true, weights };
}

function unit(values: number[], higherBetter: boolean): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((value) => {
    if (max === min) return 1;
    const ratio = (value - min) / (max - min);
    return higherBetter ? ratio : 1 - ratio;
  });
}

export function rankOffers(input: {
  offers: Offer[];
  goalId: string;
  qty: number;
  mandate: Mandate;
  purchasedSkuIds: string[];
  weights: Weights;
}): { offers: RankedOffer[]; tie: boolean } {
  const pool = input.offers.filter(
    (offer) =>
      offer.category_id === input.goalId &&
      merchantAllowed(input.mandate, offer.merchant_id) &&
      categoryAllowed(input.mandate, offer.category_id),
  );

  const priced = pool.flatMap((offer) => {
    const price = priceLine({
      shelf: offer.shelf,
      qty: input.qty,
      coupon: offer.coupon,
      shipping: offer.shipping,
      giftValue: offer.reward,
      includeRewards: input.mandate.includeRewards,
      currency: offer.currency,
    });
    if (!price.ok || offer.shipping === null) return [];
    return [{ offer, price }];
  });

  if (priced.length === 0) return { offers: [], tie: false };

  const relevance = unit(priced.map(() => 1), true);
  const cash = unit(
    priced.map((row) => row.price.effectiveCost),
    false,
  );
  const rating = unit(
    priced.map((row) => row.offer.rating),
    true,
  );
  const purchaseCount = unit(
    priced.map((row) => row.offer.purchase_count),
    true,
  );
  const history = unit(
    priced.map((row) => (input.purchasedSkuIds.includes(row.offer.sku_id) ? 1 : 0)),
    true,
  );

  const ranked: RankedOffer[] = priced.map((row, index) => {
    const parts = {
      relevance: relevance[index],
      cash: cash[index],
      rating: rating[index],
      purchaseCount: purchaseCount[index],
      history: history[index],
    };
    const score = KEYS.reduce((sum, key) => sum + input.weights[key] * parts[key], 0);
    return {
      offer: row.offer,
      score,
      lineTotal: row.price.lineTotal,
      merchandise: row.price.merchandise,
      shipping: row.price.cashTotal - row.price.merchandise,
      cashTotal: row.price.cashTotal,
      effectiveCost: row.price.effectiveCost,
      weights: input.weights,
      parts,
    };
  });

  ranked.sort((a, b) => b.score - a.score || a.offer.sku_id.localeCompare(b.offer.sku_id));
  const best = ranked[0].score;
  const leaders = ranked.filter((row) => Math.abs(row.score - best) < 1e-9);
  const merchants = new Set(leaders.map((row) => row.offer.merchant_id));
  if (merchants.size > 1) return { offers: leaders, tie: true };

  const merchant = leaders[0].offer.merchant_id;
  const top = ranked.filter((row) => row.offer.merchant_id === merchant).slice(0, 3);
  const tie = top.length > 1 && Math.abs(top[0].score - top[1].score) < 1e-9;
  return { offers: top, tie };
}
