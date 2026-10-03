import { sampleOffer } from "@/lib/catalog";
import { defaultMandate } from "@/lib/mandate";
import { DEFAULT_WEIGHTS, inferWeights, rankOffers, resolveWeights } from "@/lib/rank";
import { expect, test } from "vitest";

function mandate() {
  return { ...defaultMandate(), perItemLimit: 500, perOrderLimit: 500, rolling7d: 2000 };
}

function pair(sku: string, shelf: number) {
  return sampleOffer({
    sku_id: sku,
    shelf,
    human_price: shelf,
    agent_price: shelf,
    shipping: 10,
    rating: 4,
    purchase_count: 10,
  });
}

test("default weights are the published split", () => {
  expect(DEFAULT_WEIGHTS).toEqual({
    relevance: 0.35,
    cash: 0.25,
    rating: 0.15,
    purchaseCount: 0.1,
    history: 0.15,
  });
});

test("an explicit weight overrides an absent inference", () => {
  const resolved = resolveWeights({ cash: 0.5 }, {});
  expect(resolved.ok).toBe(true);
  if (!resolved.ok) return;
  expect(resolved.weights.cash).toBe(0.5);
  expect(resolved.weights.relevance).toBe(0.35);
});

test("a form weight that disagrees with the prompt clarifies", () => {
  expect(resolveWeights({ cash: 0.2 }, inferWeights("cheapest balloons"))).toEqual({
    ok: false,
    reason: "weight_conflict",
  });
});

test("equal offers tie and a purchase history breaks the tie", () => {
  const offers = [pair("a", 100), pair("b", 100)];
  const tied = rankOffers({
    offers,
    goalId: "balloons",
    qty: 1,
    mandate: mandate(),
    purchasedSkuIds: [],
    weights: DEFAULT_WEIGHTS,
  });
  expect(tied.tie).toBe(true);
  expect(new Set(tied.offers.map((row) => row.offer.merchant_id)).size).toBe(1);

  const boosted = rankOffers({
    offers,
    goalId: "balloons",
    qty: 1,
    mandate: mandate(),
    purchasedSkuIds: ["b"],
    weights: DEFAULT_WEIGHTS,
  });
  expect(boosted.tie).toBe(false);
  expect(boosted.offers[0].offer.sku_id).toBe("b");
  expect(boosted.offers[0].weights).toEqual(DEFAULT_WEIGHTS);
});

test("the lower cash total ranks first", () => {
  const ranked = rankOffers({
    offers: [pair("dear", 150), pair("cheap", 80)],
    goalId: "balloons",
    qty: 1,
    mandate: mandate(),
    purchasedSkuIds: [],
    weights: DEFAULT_WEIGHTS,
  });
  expect(ranked.tie).toBe(false);
  expect(ranked.offers[0].offer.sku_id).toBe("cheap");
  expect(ranked.offers[0].cashTotal).toBeLessThan(ranked.offers[1].cashTotal);
  expect(ranked.offers.length).toBeLessThanOrEqual(3);
});
