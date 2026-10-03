import { checkShares, withinShare } from "@/lib/allocation";
import { classifyOffers, type Offer } from "@/lib/catalog";
import { parseIntent } from "@/lib/intent";
import { validateMandate, type Mandate } from "@/lib/mandate";
import { priceLine } from "@/lib/money";
import { createCouponBook, negotiate, releaseCoupon, type CouponBook } from "@/lib/negotiate";
import { charge, memoryPayStore, type PayMemory } from "@/lib/pay";
import { buildQuote, confirmDecision, searchTimeoutSec, type Quote } from "@/lib/quote";
import { inferWeights, rankOffers, resolveWeights, type RankedOffer, type Weights } from "@/lib/rank";
import { createTrace, type TraceRow } from "@/lib/trace";

export type AttemptInput = {
  text: string;
  mandate: Mandate;
  now: number;
  startedAt: number;
  clarifyAskedAt?: number;
  offers: Offer[];
  purchasedSkuIds?: string[];
  recentSkuIds?: string[];
  spent7d?: number;
  formWeights?: Partial<Weights>;
  quantities?: Record<string, number>;
  shares?: Record<string, number | null>;
  requestBudget?: number | null;
  goalId?: string;
  selectedSku?: string;
  confirm?: boolean;
  previousCash?: number;
  payPhase?: "ok" | "timeout_before" | "timeout_after";
  idempotencyKey?: string;
  payStore?: PayMemory;
  coupons?: CouponBook;
  vaultId?: string;
  addressId?: string;
  decline?: boolean;
};

export type AttemptResult = {
  status: "clarify" | "terminate" | "ready" | "paid" | "rolled_back";
  reason: string;
  traceId: string;
  trace: TraceRow[];
  offers: RankedOffer[];
  quote: Quote | null;
  booked: boolean;
};

function finish(
  trace: ReturnType<typeof createTrace>,
  status: AttemptResult["status"],
  reason: string,
  offers: RankedOffer[] = [],
  quote: Quote | null = null,
  booked = false,
): AttemptResult {
  return { status, reason, traceId: trace.id, trace: trace.rows, offers, quote, booked };
}

export function runAttempt(input: AttemptInput): AttemptResult {
  const trace = createTrace();
  const coupons = input.coupons ?? createCouponBook();
  const spent7d = input.spent7d ?? 0;
  const clarifyMs = 120_000;

  if (
    input.clarifyAskedAt !== undefined &&
    input.now - input.clarifyAskedAt > clarifyMs
  ) {
    trace.add("clarify", "clarify_timeout", "No reply before 120 seconds");
    return finish(trace, "terminate", "clarify_timeout");
  }

  const searchMs = searchTimeoutSec(input.mandate.maxSearchTimeSec) * 1000;
  if (input.now - input.startedAt > searchMs) {
    trace.add("search", "search_timeout", "Search exceeded the mandate cap");
    return finish(trace, "terminate", "search_timeout");
  }

  const mandateCheck = validateMandate(input.mandate, input.now);
  trace.add("mandate", mandateCheck.ok ? "mandate_ok" : mandateCheck.reason, "Checked expiry and limits");
  if (!mandateCheck.ok) return finish(trace, "terminate", mandateCheck.reason);

  const intent = parseIntent(input.text);
  trace.add("parse", intent.ok ? "parsed" : intent.reason, input.text);
  if (!intent.ok) return finish(trace, "terminate", intent.reason);

  if (
    intent.budgetHint !== null &&
    input.mandate.perOrderLimit !== null &&
    intent.budgetHint > input.mandate.perOrderLimit
  ) {
    trace.add("mandate", "mandate_conflict", `Hint ${intent.budgetHint} is above per-order`);
    return finish(trace, "clarify", "mandate_conflict");
  }

  const weights = resolveWeights(input.formWeights ?? {}, inferWeights(input.text));
  if (!weights.ok) {
    trace.add("rank", "weight_conflict", "Form weight disagrees with the prompt");
    return finish(trace, "clarify", "weight_conflict");
  }

  const goal =
    intent.goals.find((item) => item.id === input.goalId) ??
    (intent.goals.length === 1 ? intent.goals[0] : undefined);

  if (intent.goals.length > 1) {
    const shareCheck = checkShares(
      intent.goals.map((item) => item.id),
      input.shares ?? {},
      input.requestBudget ?? Number.NaN,
      (input.mandate.rolling7d ?? 0) - spent7d,
    );
    if (!shareCheck.ok || !goal) {
      trace.add("parse", "assign_shares", "Quantities of money for each goal are blank");
      return finish(trace, "clarify", "assign_shares");
    }
  }

  if (!goal) {
    trace.add("parse", "invalid_input", "No goal selected");
    return finish(trace, "terminate", "invalid_input");
  }

  const qty = input.quantities?.[goal.id];
  if (qty === undefined) {
    trace.add("parse", "blank_qty", `${goal.label} has no quantity`);
    return finish(trace, "clarify", "blank_qty");
  }

  if (input.decline && input.selectedSku) {
    releaseCoupon(input.selectedSku, coupons);
    trace.add("quote", "price_declined", "User declined the new cash total");
    return finish(trace, "rolled_back", "price_declined");
  }

  const classified = classifyOffers(input.offers);
  trace.add(
    "search",
    "catalog_filter",
    `Kept ${classified.kept.length}, dropped ${classified.dropped.map((row) => row.sku_id).join(",") || "none"}`,
  );

  const ranked = rankOffers({
    offers: classified.kept,
    goalId: goal.id,
    qty,
    mandate: input.mandate,
    purchasedSkuIds: input.purchasedSkuIds ?? [],
    weights: weights.weights,
  });
  trace.add(
    "rank",
    ranked.tie ? "tie" : "ranked",
    ranked.offers.map((row) => `${row.offer.sku_id}:${row.score.toFixed(3)}`).join(", ") || "none",
  );

  if (ranked.offers.length === 0) {
    const reason = classified.dropped.every((row) => row.reason === "missing_shipping")
      ? "missing_shipping"
      : "no_offers";
    return finish(trace, "terminate", reason);
  }

  if (ranked.tie && !input.selectedSku) {
    return finish(trace, "clarify", "tie", ranked.offers);
  }

  const chosen =
    ranked.offers.find((row) => row.offer.sku_id === input.selectedSku) ?? ranked.offers[0];

  if ((input.recentSkuIds ?? []).includes(chosen.offer.sku_id)) {
    trace.add("rank", "repeat_purchase", `${chosen.offer.sku_id} was bought within 72 hours`);
    return finish(trace, "clarify", "repeat_purchase", ranked.offers);
  }

  const alreadyHeld = chosen.offer.coupon > 0 && coupons.held.has(chosen.offer.sku_id);
  if (!alreadyHeld) {
    const deal = negotiate(chosen.offer, coupons);
    trace.add("negotiate", deal.ok ? "accept" : deal.reason, chosen.offer.sku_id);
    if (!deal.ok) {
      return finish(trace, "clarify", deal.reason, ranked.offers.filter((row) => row !== chosen));
    }
  } else {
    trace.add("negotiate", "accept", "Coupon already reserved");
  }

  const priced = priceLine({
    shelf: chosen.offer.shelf,
    qty,
    coupon: chosen.offer.coupon,
    shipping: chosen.offer.shipping,
    giftValue: chosen.offer.reward,
    includeRewards: input.mandate.includeRewards,
    currency: chosen.offer.currency,
  });
  if (!priced.ok) {
    releaseCoupon(chosen.offer.sku_id, coupons);
    return finish(trace, "terminate", priced.reason, ranked.offers);
  }

  let quote = buildQuote({
    skuId: chosen.offer.sku_id,
    lineTotal: priced.lineTotal,
    merchandise: priced.merchandise,
    shipping: priced.cashTotal - priced.merchandise,
    cashTotal: priced.cashTotal,
    effectiveCost: priced.effectiveCost,
    includeRewards: input.mandate.includeRewards,
    rateAsOf: priced.rateAsOf,
    mandate: input.mandate,
    now: input.now,
  });

  if (input.previousCash !== undefined && input.previousCash !== quote.cashTotal) {
    quote = { ...quote, voided: true };
    trace.add("quote", "price_change", `${input.previousCash} -> ${quote.cashTotal}`);
    return finish(trace, "clarify", "price_change", ranked.offers, quote);
  }

  const share =
    intent.goals.length > 1
      ? (input.shares?.[goal.id] ?? null)
      : intent.budgetHint;
  if (share !== null && !withinShare(goal.id, quote.cashTotal, { [goal.id]: share })) {
    releaseCoupon(chosen.offer.sku_id, coupons);
    trace.add("quote", "insufficient_budget", `Cash ${quote.cashTotal} exceeds the goal share`);
    return finish(trace, "terminate", "insufficient_budget", ranked.offers, quote);
  }

  const decision = confirmDecision(quote, input.mandate, spent7d, null, input.now);
  trace.add("quote", decision.action === "ok" ? "quote_ok" : decision.reason, priced.reason);
  if (decision.action === "terminate") {
    releaseCoupon(chosen.offer.sku_id, coupons);
    return finish(trace, "terminate", decision.reason, ranked.offers, quote);
  }
  if (decision.action === "clarify") {
    return finish(trace, "clarify", decision.reason, ranked.offers, quote);
  }

  if (input.mandate.confirmMode === "manual" && !input.confirm) {
    return finish(trace, "ready", "await_confirm", ranked.offers, quote);
  }

  const receipt = charge(
    {
      vaultId: input.vaultId ?? "",
      addressId: input.addressId ?? "",
      amount: quote.cashTotal,
      currency: "HKD",
      expiresAt: quote.quoteExpiresAt,
      tender: "card",
      allowedTenders: input.mandate.tenders,
      idempotencyKey: input.idempotencyKey ?? `pay_${quote.skuId}_${quote.cashTotal}`,
      phase: input.payPhase ?? "ok",
    },
    input.payStore ?? memoryPayStore(),
  );
  trace.add("pay", receipt.status === "paid" ? "paid" : receipt.reason, `first=${receipt.first}`);

  if (receipt.status !== "paid") {
    releaseCoupon(chosen.offer.sku_id, coupons);
    return finish(trace, "terminate", receipt.reason, ranked.offers, quote);
  }

  return finish(trace, "paid", "paid", ranked.offers, quote, receipt.first);
}
