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
test("one cash override does not have to sum to 1", () => {
  const explicit = { ...DEFAULT_WEIGHTS, cash: 0.5 };
  expect(resolveWeights("red balloons", explicit)).toMatchObject({ status: "ready", weights: explicit });
  expect(resolveWeights("cheapest balloons", explicit)).toMatchObject({ status: "clarify", weights: explicit });
});
test("a card discount can change the winning seller", () => {
  const base = loadCatalog().offers.find(o => o.category_id === "balloons" && o.appearance === "red");
  if (!base) throw new Error("missing balloon");
  const row = (sku_id: string, merchant_id: string, shelf: number, cardRule?: { tender: "card"; minMerchandise: number; off: number }) => ({
    ...base, sku_id, merchant_id, platform_id: merchant_id, shelf, human_price: shelf, agent_price: shelf, coupon: 0, shipping: 20,
    rating: 5, purchase_count: 10, reward: { gift: 0, rate: 0, terms: "none" }, cardRule,
  });
  const hktv = row("hktv-card", "hktv-shop", 280, { tender: "card", minMerchandise: 250, off: 40 });
  const taobao = row("taobao-plain", "taobao-shop", 250);
  const card = rankOffers([hktv, taobao], goal, defaultMandate(), []);
  expect(card.offers[0]).toMatchObject({ tender: "card", offer: { merchant_id: "hktv-shop" }, money: { cardOff: 40, cashTotal: 260 } });
  expect(card.offers.every(o => o.offer.merchant_id === "hktv-shop")).toBe(true);
  const wallet = rankOffers([hktv, taobao], goal, { ...defaultMandate(), tenders: ["wallet"] }, []);
  expect(wallet.offers[0]).toMatchObject({ tender: "wallet", offer: { merchant_id: "taobao-shop" }, money: { cashTotal: 270 } });
  expect(rankOffers([hktv, { ...hktv, sku_id: "hktv-tie", merchant_id: "other-shop" }], goal, defaultMandate(), []).status).toBe("clarify");
});
test("the cheapest named card wins when the form lists it", () => {
  const base = loadCatalog().offers.find(o => o.category_id === "balloons" && o.appearance === "red");
  if (!base) throw new Error("missing balloon");
  const offer = { ...base, sku_id: "named-cards", merchant_id: "hktv-shop", shelf: 280, human_price: 280, agent_price: 280, coupon: 0, shipping: 20,
    rating: 5, purchase_count: 10, reward: { gift: 0, rate: 0, terms: "none" },
    cardRules: [
      { tender: "hsbc-visa" as const, minMerchandise: 250, off: 40 },
      { tender: "citi-mastercard" as const, minMerchandise: 250, off: 10 },
    ] };
  const mandate = { ...defaultMandate(), perItem: 500, tenders: ["hsbc-visa", "citi-mastercard", "wallet"] };
  expect(rankOffers([offer], goal, mandate, []).offers[0]).toMatchObject({ tender: "hsbc-visa", money: { cardOff: 40, cashTotal: 260 } });
  expect(rankOffers([offer], goal, { ...mandate, tenders: ["citi-mastercard", "wallet"] }, []).offers[0]).toMatchObject({ tender: "citi-mastercard", money: { cardOff: 10, cashTotal: 290 } });
});
test("equal best scores across merchants also pause automatic selection", () => {
  const offer = loadCatalog().offers[0];
  expect(rankOffers([offer, { ...offer, merchant_id: "another", sku_id: "another-sku" }], goal, defaultMandate(), []).status).toBe("clarify");
});
