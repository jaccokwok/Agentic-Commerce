export const CARD_TENDERS = ["card", "hsbc-visa", "citi-mastercard"] as const;
export const PAY_TENDERS = ["card", "hsbc-visa", "citi-mastercard", "wallet"] as const;
export type CardTender = typeof CARD_TENDERS[number];
export type PayTender = typeof PAY_TENDERS[number];

export function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100))) {
    throw new Error("Money must be a finite, non-negative amount");
  }
  return Math.round(value * 100);
}

export function priceLine(input: {
  shelf: number; qty: number; coupon: number; shipping: number;
  giftValue: number; includeRewards: boolean; rewardRate?: number;
  tender?: PayTender;
  cardRule?: { tender: CardTender; minMerchandise: number; off: number };
}) {
  if (!Number.isSafeInteger(input.qty) || input.qty < 1) throw new Error("Set a positive whole quantity");
  const line = cents(input.shelf) * input.qty;
  if (!Number.isSafeInteger(line)) throw new Error("Line total is too large");
  const merchandise = Math.max(0, line - cents(input.coupon));
  const shipping = cents(input.shipping);
  const gift = cents(input.giftValue);
  const rewardRate = input.rewardRate ?? 0;
  if (!Number.isFinite(rewardRate) || rewardRate < 0 || rewardRate > 1) throw new Error("Invalid reward rate");
  const rule = input.cardRule && input.tender === input.cardRule.tender ? input.cardRule : undefined;
  const published = rule ? cents(rule.off) : 0;
  const cardOff = rule && merchandise >= cents(rule.minMerchandise) && published <= merchandise ? published : 0;
  const cash = merchandise - cardOff + shipping;
  const effective = cash - (input.includeRewards ? Math.round(gift * 0.5) : 0);
  return {
    lineTotal: line / 100, merchandise: merchandise / 100, shipping: shipping / 100,
    cardOff: cardOff / 100, cashTotal: cash / 100, effectiveCost: effective / 100,
    cashback: Math.round(merchandise * rewardRate) / 100,
    reason: `Line ${line / 100}; merchandise ${merchandise / 100}; shipping ${shipping / 100}; card off ${cardOff / 100}; cash ${cash / 100}; reward never reduces cash.`,
  };
}
