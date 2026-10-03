import { runAttempt } from "@/lib/attempt";
import { sampleOffer, type Offer } from "@/lib/catalog";
import type { CouponBook } from "@/lib/negotiate";
import type { PayMemory } from "@/lib/pay";
import type { ShopCall, ShopScene, ShopView } from "@/lib/shop-types";

export type { ShopCall, ShopScene, ShopView } from "@/lib/shop-types";

export type ShopCtx = {
  now: number;
  spent7d: number;
  recentSkuIds: string[];
  vaultId: string;
  addressId: string;
  coupons: CouponBook;
  payStore: PayMemory;
  catalog: Offer[];
};

export function offersForScene(scene: ShopScene | undefined, catalog: Offer[]): Offer[] {
  if (scene === "tie") {
    return catalog.filter((offer) => offer.sku_id === "balloon-a" || offer.sku_id === "balloon-b");
  }
  if (scene === "move") {
    return [
      sampleOffer({
        sku_id: "move-340",
        shelf: 240,
        human_price: 240,
        agent_price: 240,
        coupon: 20,
        shipping: 120,
        category_id: "balloons",
      }),
    ];
  }
  if (scene === "moved") {
    return [
      sampleOffer({
        sku_id: "move-340",
        shelf: 260,
        human_price: 260,
        agent_price: 260,
        coupon: 20,
        shipping: 120,
        category_id: "balloons",
      }),
    ];
  }
  if (scene === "over") {
    return [
      sampleOffer({
        sku_id: "over-410",
        shelf: 200,
        human_price: 200,
        agent_price: 200,
        shipping: 210,
        category_id: "balloons",
      }),
    ];
  }
  return catalog;
}

const SCRIPTED: ShopScene[] = ["tie", "move", "moved", "over"];

export function executeShop(input: ShopCall, ctx: ShopCtx): ShopView {
  const scripted = input.scene !== undefined && SCRIPTED.includes(input.scene);
  const mandate =
    input.scene === "over"
      ? { ...input.mandate, perItemLimit: 500, perOrderLimit: 400, rolling7d: Math.max(input.mandate.rolling7d ?? 0, 1000) }
      : input.mandate;
  const result = runAttempt({
    text: scripted ? "red balloons" : input.text,
    mandate,
    now: ctx.now,
    startedAt: ctx.now,
    clarifyAskedAt: input.clarifyAskedAt,
    offers: offersForScene(input.scene, ctx.catalog),
    recentSkuIds: ctx.recentSkuIds,
    spent7d: ctx.spent7d,
    formWeights: input.formWeights,
    quantities: scripted ? { balloons: 1 } : input.quantities,
    shares: input.shares,
    requestBudget: input.requestBudget,
    goalId: scripted ? "balloons" : input.goalId,
    selectedSku: input.selectedSku,
    confirm: input.scene === "over" ? true : input.confirm,
    decline: input.decline,
    previousCash: input.previousCash,
    coupons: ctx.coupons,
    payStore: ctx.payStore,
    vaultId: ctx.vaultId,
    addressId: ctx.addressId,
  });
  const sku = result.quote?.skuId ?? input.selectedSku ?? "";
  return {
    status: result.status,
    reason: result.reason,
    traceId: result.traceId,
    trace: result.trace,
    offers: result.offers,
    quote: result.quote,
    booked: result.booked,
    couponHeld: sku.length > 0 && ctx.coupons.held.has(sku),
  };
}
