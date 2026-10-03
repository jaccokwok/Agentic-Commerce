import { loadCatalog } from "@/lib/catalog";
import { defaultMandate, type Mandate } from "@/lib/mandate";
import { createCouponBook } from "@/lib/negotiate";
import { memoryPayStore } from "@/lib/pay";
import { executeShop, offersForScene, type ShopCall } from "@/lib/shop";
import { expect, test } from "vitest";

const now = Date.parse("2026-06-01T00:00:00.000Z");

function mandate(patch: Partial<Mandate> = {}): Mandate {
  return {
    ...defaultMandate(),
    perItemLimit: 250,
    perOrderLimit: 400,
    rolling7d: 1000,
    ...patch,
  };
}

function call(patch: Partial<ShopCall> = {}): ShopCall {
  return {
    text: "party items for 8, red balloons, budget 350",
    mandate: mandate(),
    quantities: { balloons: 1, snacks: 1 },
    shares: { balloons: 200, snacks: 150 },
    requestBudget: 350,
    goalId: "balloons",
    ...patch,
  };
}

function ctx(coupons = createCouponBook()) {
  return {
    now,
    spent7d: 0,
    recentSkuIds: [] as string[],
    vaultId: "vault_1",
    addressId: "addr_1",
    coupons,
    payStore: memoryPayStore(),
    catalog: loadCatalog(),
  };
}

test("the demo balloon search returns three offers from one merchant", () => {
  const result = executeShop(call(), ctx());
  expect(result.status).toBe("ready");
  expect(result.offers).toHaveLength(3);
  expect(new Set(result.offers.map((row) => row.offer.merchant_id))).toEqual(new Set(["pdd-shop-3"]));
  expect(result.offers[0].offer.sku_id).toBe("pdd-balloon");
  expect(result.offers[0].weights).toMatchObject({ relevance: 0.35, cash: 0.25 });
  expect(result.traceId).toMatch(/^trace_/);
  expect(result.booked).toBe(false);
});

test("the tied balloon pair asks and does not pay", () => {
  const result = executeShop(call({ scene: "tie" }), ctx());
  expect(result.status).toBe("clarify");
  expect(result.reason).toBe("tie");
  expect(result.offers.map((row) => row.offer.sku_id).sort()).toEqual(["balloon-a", "balloon-b"]);
  expect(result.quote).toBeNull();
});

test("a cash move from 340 to 360 asks, and decline releases the coupon", () => {
  const coupons = createCouponBook();
  const held = ctx(coupons);
  const first = executeShop(call({ scene: "move" }), held);
  expect(first.status).toBe("ready");
  expect(first.quote?.cashTotal).toBe(340);
  expect(coupons.held.has("move-340")).toBe(true);

  const bumped = executeShop(
    call({ scene: "moved", previousCash: 340, selectedSku: "move-340" }),
    held,
  );
  expect(bumped.reason).toBe("price_change");
  expect(bumped.quote?.cashTotal).toBe(360);
  expect(bumped.quote?.voided).toBe(true);

  const declined = executeShop(call({ decline: true, selectedSku: "move-340" }), held);
  expect(declined.status).toBe("rolled_back");
  expect(coupons.held.has("move-340")).toBe(false);
});

test("confirming cash 410 against a 400 per-order limit is rejected", () => {
  const result = executeShop(call({ scene: "over", confirm: true }), ctx());
  expect(result.status).toBe("terminate");
  expect(result.reason).toBe("insufficient_budget");
  expect(result.quote?.cashTotal).toBe(410);
  expect(result.booked).toBe(false);
});

test("an injected clarify clock terminates without sleeping", () => {
  const result = executeShop(call({ clarifyAskedAt: now - 121_000 }), ctx());
  expect(result.reason).toBe("clarify_timeout");
  expect(offersForScene("tie", loadCatalog()).map((offer) => offer.sku_id).sort()).toEqual([
    "balloon-a",
    "balloon-b",
  ]);
});
