import type { Mandate } from "@/lib/mandate";

export const CLARIFY_TIMEOUT_SEC = 120;
export const SEARCH_TIMEOUT_SEC = 15;
export const QUOTE_TTL_MS = 10 * 60 * 1000;

export type Quote = {
  skuId: string;
  lineTotal: number;
  merchandise: number;
  shipping: number;
  cashTotal: number;
  effectiveCost: number;
  currency: "HKD";
  tender: "card";
  includeRewards: boolean;
  rateAsOf: string;
  searchTimeoutSec: number;
  clarifyTimeoutSec: number;
  quoteExpiresAt: number;
  mandateExpiresAt: number | null;
  voided: boolean;
};

export function searchTimeoutSec(mandateMax: number): number {
  return Math.min(SEARCH_TIMEOUT_SEC, mandateMax);
}

export function buildQuote(input: {
  skuId: string;
  lineTotal: number;
  merchandise: number;
  shipping: number;
  cashTotal: number;
  effectiveCost: number;
  includeRewards: boolean;
  rateAsOf: string;
  mandate: Mandate;
  now: number;
}): Quote {
  return {
    skuId: input.skuId,
    lineTotal: input.lineTotal,
    merchandise: input.merchandise,
    shipping: input.shipping,
    cashTotal: input.cashTotal,
    effectiveCost: input.effectiveCost,
    currency: "HKD",
    tender: "card",
    includeRewards: input.includeRewards,
    rateAsOf: input.rateAsOf,
    searchTimeoutSec: searchTimeoutSec(input.mandate.maxSearchTimeSec),
    clarifyTimeoutSec: CLARIFY_TIMEOUT_SEC,
    quoteExpiresAt: input.now + QUOTE_TTL_MS,
    mandateExpiresAt: input.mandate.expiresAt,
    voided: false,
  };
}

export function markPriceChange(quote: Quote, cashTotal: number): Quote {
  if (cashTotal === quote.cashTotal) return quote;
  return { ...quote, cashTotal, voided: true };
}

export function confirmDecision(
  quote: Quote,
  mandate: Mandate,
  spent7d: number,
  share: number | null,
  now: number,
): { action: "ok" } | { action: "terminate"; reason: string } | { action: "clarify"; reason: "price_change" } {
  if (quote.voided) return { action: "clarify", reason: "price_change" };
  if (quote.mandateExpiresAt !== null && now >= quote.mandateExpiresAt) {
    return { action: "terminate", reason: "expired" };
  }
  if (now >= quote.quoteExpiresAt) return { action: "terminate", reason: "quote_expired" };
  if (mandate.perItemLimit === null || mandate.perOrderLimit === null || mandate.rolling7d === null) {
    return { action: "terminate", reason: "invalid" };
  }
  if (
    quote.lineTotal > mandate.perItemLimit ||
    quote.cashTotal > mandate.perOrderLimit ||
    (share !== null && quote.cashTotal > share) ||
    spent7d + quote.cashTotal > mandate.rolling7d
  ) {
    return { action: "terminate", reason: "insufficient_budget" };
  }
  return { action: "ok" };
}
