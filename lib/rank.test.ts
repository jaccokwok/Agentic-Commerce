import { expect, test } from "vitest";
import { rankOffers, resolveWeights, DEFAULT_WEIGHTS } from "@/lib/rank";
import { loadCatalog } from "@/lib/catalog";
import { defaultMandate } from "@/lib/mandate";
import { parseIntent } from "@/lib/intent";

const goal = { ...parseIntent("red balloons").goals[0], qty: 1 };
test("top three share one merchant, show default weights and use cash independently", () => {
  const ranked = rankOffers(loadCatalog().offers, goal, defaultMandate(), []);
  expect(ranked.offers).toHaveLength(3);
  expect(new Set(ranked.offers.map(o => o.offer.merchant_id)).size).toBe(1);
  expect(ranked.offers[0].weights).toEqual(DEFAULT_WEIGHTS);
  const offer = { ...loadCatalog().offers[0], reward: { gift: 100, rate: 0.02, terms: "gift" } };
  const on = rankOffers([offer], goal, defaultMandate(), []).offers[0];
  const off = rankOffers([offer], goal, { ...defaultMandate(), includeRewards: false }, []).offers[0];
  expect(on.money.cashTotal).toBe(off.money.cashTotal);
  expect(on.breakdown.cash).toBe(off.breakdown.cash);
  expect(on.money.effectiveCost).toBe(off.money.effectiveCost - 50);
});
test("history raises score, an exact tie clarifies", () => {
  const one = loadCatalog().offers[0];
  expect(rankOffers([one], goal, defaultMandate(), [one.sku_id]).offers[0].score).toBeGreaterThan(rankOffers([one], goal, defaultMandate(), []).offers[0].score);
  expect(rankOffers(loadCatalog().offers.filter(o => o.merchant_id === "tie-shop"), goal, defaultMandate(), []).status).toBe("clarify");
});
test("explicit weights override inferred values but contradictions require clarification", () => {
  const explicit = { ...DEFAULT_WEIGHTS };
  expect(resolveWeights("cheapest", explicit)).toMatchObject({ status: "clarify", weights: explicit });
  expect(resolveWeights("", explicit).status).toBe("ready");
});
test("equal best scores across merchants also pause automatic selection", () => {
  const offer = loadCatalog().offers[0];
  expect(rankOffers([offer, { ...offer, merchant_id: "another", sku_id: "another-sku" }], goal, defaultMandate(), []).status).toBe("clarify");
});
