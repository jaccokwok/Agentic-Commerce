import { FX_AS_OF, toHkd } from "@/lib/fx";

export type PriceInput = {
  shelf: number;
  qty: number;
  coupon: number;
  shipping: number | null;
  giftValue: number;
  includeRewards: boolean;
  currency: string;
};

export type PriceOk = {
  ok: true;
  lineTotal: number;
  merchandise: number;
  cashTotal: number;
  effectiveCost: number;
  rateAsOf: string;
  reason: string;
};

export type PriceFail = {
  ok: false;
  reason: "missing_shipping" | "unknown_currency";
};

/** Five cash steps. The gift lowers effective cost only. It never changes cash. */
export function priceLine(input: PriceInput): PriceOk | PriceFail {
  if (input.shipping === null) {
    return { ok: false, reason: "missing_shipping" };
  }

  const shelf = toHkd(input.shelf, input.currency);
  const coupon = toHkd(input.coupon, input.currency);
  const shipping = toHkd(input.shipping, input.currency);
  const gift = toHkd(input.giftValue, input.currency);
  if ("error" in shelf) return { ok: false, reason: shelf.error };
  if ("error" in coupon) return { ok: false, reason: coupon.error };
  if ("error" in shipping) return { ok: false, reason: shipping.error };
  if ("error" in gift) return { ok: false, reason: gift.error };

  const lineTotal = shelf.hkd * input.qty;
  const merchandise = Math.max(0, lineTotal - coupon.hkd);
  const cashTotal = merchandise + shipping.hkd;
  const credit = input.includeRewards ? gift.hkd * 0.5 : 0;

  return {
    ok: true,
    lineTotal,
    merchandise,
    cashTotal,
    effectiveCost: cashTotal - credit,
    rateAsOf: FX_AS_OF,
    reason: `line ${lineTotal} before coupon, merchandise ${merchandise}, shipping ${shipping.hkd}, cash ${cashTotal}, reward credit ${credit}`,
  };
}
