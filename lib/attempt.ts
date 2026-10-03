import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { loadCatalog, CATEGORY_IDS, type Offer } from "@/lib/catalog";
import { parseIntent, type Goal } from "@/lib/intent";
import { checkMandate, type Mandate } from "@/lib/mandate";
import { checkAllocations } from "@/lib/allocation";
import { rankOffers, resolveWeights, DEFAULT_WEIGHTS, type RankedOffer, type Weights } from "@/lib/rank";
import { createQuote, checkQuote, quoteChanged, searchDeadline, clarifyDeadline, type Quote } from "@/lib/quote";
import { negotiate, releaseCoupon, type CouponState } from "@/lib/negotiate";
import { historySkus, recentSkus, spent7d, spentShare, spentRequest, receipt } from "@/lib/ledger";
import { mockPay, type PayContext } from "@/lib/pay";
import { newTrace, log, type Trace } from "@/lib/trace";

export type AttemptInput = { userId: number; requestId: string; text: string; goals: Goal[]; goalId: string;
  shares: Record<string, number | null>; budget: number; partialAccepted: boolean; mandate: Mandate;
  merchantId?: string; weights?: Weights; preferencesAccepted?: boolean };
export type Attempt = { id: string; input: AttemptInput; trace: Trace; status: "offers" | "quote" | "clarify" | "terminate" | "paid";
  issue: "list" | "allocation" | "mandate" | "weights" | "tie" | "repeat" | "price" | "pay" | null;
  reason: string; offers: RankedOffer[]; selected: Offer | null; quote: Quote | null;
  quoteVersion: number; coupon: CouponState; clarifyExpiresAt: number | null; idempotencyKey: string; repeatedAccepted: boolean };
export type AttemptContext = { database: DatabaseSync; now: () => number; vaultId: string; addressId: string;
  catalog?: Offer[]; lookup?: (sku: string) => Offer | undefined; paySimulation?: PayContext["simulation"]; authorize?: () => void };
export type AttemptEvent = { type: "select"; skuId: string } | { type: "confirm"; version: number } |
  { type: "price_change"; cashTotal: number } | { type: "accept_repeat" } | { type: "retry" } | { type: "decline" } | { type: "cancel" } | { type: "tick" };

function stop(a: Attempt, reason: string, now: number) {
  a.status = "terminate"; a.issue = null; a.reason = reason; a.coupon = releaseCoupon(); a.clarifyExpiresAt = null;
  log(a.trace, "stop", "terminate_release", reason, { coupon: a.coupon }, now);
  return a;
}
function clarify(a: Attempt, issue: Attempt["issue"], reason: string, now: number) {
  a.status = "clarify"; a.issue = issue; a.reason = reason; a.clarifyExpiresAt = clarifyDeadline(now);
  log(a.trace, "clarify", issue ?? "clarify", reason, { deadline: a.clarifyExpiresAt }, now);
  return a;
}
function remaining(a: Attempt, ctx: AttemptContext) {
  return { rolling: a.input.mandate.rolling7d - spent7d(a.input.userId, ctx.now(), ctx.database),
    share: (a.input.shares[a.input.goalId] ?? 0) - spentShare(a.input.userId, a.input.requestId, a.input.goalId, ctx.database) };
}
function prepare(a: Attempt, offer: Offer, ctx: AttemptContext) {
  const now = ctx.now();
  a.coupon = releaseCoupon(); a.selected = offer; a.quote = null;
  const current = ctx.lookup?.(offer.sku_id) ?? (ctx.catalog ? ctx.catalog.find(o => o.sku_id === offer.sku_id) : offer);
  const result = negotiate(offer, current);
  a.coupon = result.coupon;
  log(a.trace, "negotiate", result.status, result.reason, { coupon: a.coupon, shelf: offer.shelf, shipping: offer.shipping ?? null }, now);
  if (result.status === "rejected") { a.status = "offers"; a.reason = result.reason; return a; }
  a.quote = createQuote(offer, a.input.goals.find(g => g.id === a.input.goalId)!.qty!, a.input.mandate, now);
  a.quoteVersion += 1;
  const budget = remaining(a, ctx);
  const gate = checkQuote(a.quote, a.input.mandate, budget.share, budget.rolling, now);
  log(a.trace, "quote", "cash_gate", gate.reason, { cash: a.quote.cashTotal, line: a.quote.items[0].lineTotal, shipping: a.quote.shipping, effective: a.quote.effectiveCost, share: budget.share, rolling: budget.rolling }, now);
  if (gate.status !== "ready") return stop(a, gate.reason, now);
  if (!a.repeatedAccepted && recentSkus(a.input.userId, now, ctx.database).includes(offer.sku_id)) return clarify(a, "repeat", "Same SKU purchased within 72 hours. Confirm this is intentional.", now);
  a.status = "quote"; a.issue = null; a.clarifyExpiresAt = null; a.reason = "Review the final quote before mock payment";
  return a;
}

export function runAttempt(input: AttemptInput, ctx: AttemptContext): Attempt {
  const started = ctx.now();
  const a: Attempt = { id: randomUUID(), input, trace: newTrace(), status: "offers", issue: null, reason: "", offers: [], selected: null,
    quote: null, quoteVersion: 0, coupon: "unused", clarifyExpiresAt: null, idempotencyKey: randomUUID(), repeatedAccepted: false };
  const parsed = parseIntent(input.text);
  log(a.trace, "parse", "typed_intent", parsed.reason, { goals: parsed.goals.length, budgetHint: parsed.budgetHint }, started);
  if (parsed.status === "terminate") return stop(a, parsed.reason, started);
  const mandate = checkMandate(input.mandate, started);
  log(a.trace, "mandate", "mandate_valid", mandate.reason, { perItem: input.mandate.perItem, perOrder: input.mandate.perOrder, rolling7d: input.mandate.rolling7d }, started);
  if (mandate.status !== "ready") return stop(a, mandate.reason, started);
  const goal = input.goals.find(g => g.id === input.goalId);
  if (!goal || !input.goals.length || new Set(input.goals.map(g => g.id)).size !== input.goals.length || input.goals.some(g => !CATEGORY_IDS.includes(g.categoryId) || g.id !== g.categoryId || !Number.isSafeInteger(g.qty) || (g.qty ?? 0) < 1 || (g.qty ?? 0) > 10000)) return clarify(a, "list", "Set a positive whole quantity for every catalogue goal", started);
  const conflict = checkMandate(input.mandate, started, { categoryId: goal.categoryId, merchantId: input.merchantId,
    budgetHint: input.goals.length === 1 ? parsed.budgetHint : null });
  if (conflict.status === "clarify") return clarify(a, "mandate", conflict.reason, started);
  if (input.goals.length > 1 && !input.partialAccepted) return clarify(a, "allocation", "Accept possible partial completion of separate sub-requests", started);
  if (Object.keys(input.shares).length !== input.goals.length || input.goals.some(g => !(g.id in input.shares))) return clarify(a, "allocation", "Each goal needs its own fixed share", started);
  const allocation = checkAllocations(input.shares, input.budget, input.mandate.rolling7d - spent7d(input.userId, started, ctx.database) + spentRequest(input.userId, input.requestId, ctx.database));
  log(a.trace, "allocation", "shared_request", allocation.reason, { budget: input.budget, reserved: allocation.reserved }, started);
  if (allocation.status === "terminate") return stop(a, allocation.reason, started);
  if (allocation.status === "clarify") return clarify(a, "allocation", allocation.reason, started);
  const explicit = input.weights ?? (input.mandate.paymentObjective === "lowest_cash" ? { relevance: 0.2, cash: 0.6, rating: 0.1, purchases: 0.05, history: 0.05 } : DEFAULT_WEIGHTS);
  const preferences = resolveWeights(input.preferencesAccepted ? "" : input.text, explicit);
  if (preferences.status === "terminate") return stop(a, preferences.reason, started);
  if (preferences.status === "clarify") return clarify(a, "weights", preferences.reason, started);
  const catalog = loadCatalog(ctx.catalog);
  for (const drop of catalog.dropped) log(a.trace, "search", drop.rule, drop.reason, { sku: drop.sku_id }, ctx.now());
  const limits = remaining(a, ctx);
  const eligible = catalog.offers.filter(o => {
    if (input.merchantId && o.merchant_id !== input.merchantId) return false;
    const gate = checkQuote(createQuote(o, goal.qty!, input.mandate, ctx.now()), input.mandate, limits.share, limits.rolling, ctx.now());
    if (gate.status !== "ready") log(a.trace, "search", "offer_limit", gate.reason, { sku: o.sku_id }, ctx.now());
    return gate.status === "ready";
  });
  if (ctx.now() >= searchDeadline(started, input.mandate)) return stop(a, "Search timeout before charge", ctx.now());
  log(a.trace, "search", "catalog_only", "Searched fixed mock catalogue; no network model", { clean: catalog.offers.length, eligible: eligible.length, timeout: searchDeadline(started, input.mandate) }, ctx.now());
  const ranked = rankOffers(eligible, goal, input.mandate, historySkus(input.userId, ctx.database), preferences.weights);
  a.offers = ranked.offers;
  log(a.trace, "rank", "one_merchant_top3", ranked.reason, { offers: a.offers.length, topScore: a.offers[0]?.score ?? null }, ctx.now());
  if (ranked.status === "terminate") return stop(a, ranked.reason, ctx.now());
  if (ranked.status === "clarify") return clarify(a, "tie", ranked.reason, ctx.now());
  for (const choice of a.offers) {
    prepare(a, choice.offer, ctx);
    if (a.status !== "offers") break;
  }
  if (a.status === "offers") return stop(a, "All catalogue negotiations rejected", ctx.now());
  if (a.status === "quote" && input.mandate.confirmMode === "auto") return advanceAttempt(a, { type: "confirm", version: a.quoteVersion }, ctx);
  return a;
}

function pay(a: Attempt, ctx: AttemptContext) {
  const q = a.quote!;
  const input = { vaultId: ctx.vaultId, addressId: ctx.addressId, amount: q.cashTotal, currency: q.currency,
    tender: q.tender, expiresAt: q.expiresAt, idempotencyKey: a.idempotencyKey };
  const context: PayContext = { userId: a.input.userId, requestId: a.input.requestId, goalId: a.input.goalId, traceId: a.trace.id,
    skus: q.items.map(i => i.sku_id), cashback: q.reward.cashback, mandate: a.input.mandate, now: ctx.now(), simulation: ctx.paySimulation,
    guard: () => { ctx.authorize?.(); const limits = remaining(a, ctx); const gate = checkQuote(q, a.input.mandate, limits.share, limits.rolling, ctx.now()); if (gate.status !== "ready") throw new Error(gate.reason); } };
  let result = mockPay(input, context, ctx.database);
  log(a.trace, "pay", "mock_refs_idempotency", result.reason, { cash: q.cashTotal, key: a.idempotencyKey }, ctx.now());
  if (result.status === "clarify") {
    result = mockPay(input, { ...context, simulation: ctx.paySimulation === "retry_failed" ? "retry_failed" : undefined }, ctx.database);
    log(a.trace, "pay", "same_key_retry", result.reason, { key: a.idempotencyKey, cash: q.cashTotal }, ctx.now());
  }
  if (result.status === "paid") { a.status = "paid"; a.issue = null; a.clarifyExpiresAt = null; a.coupon = "spent"; a.reason = result.reason; return a; }
  if (result.status === "clarify") return clarify(a, "pay", result.reason, ctx.now());
  return stop(a, result.reason, ctx.now());
}

export function advanceAttempt(a: Attempt, event: AttemptEvent, ctx: AttemptContext): Attempt {
  const now = ctx.now();
  if (a.status === "paid" || a.status === "terminate") return a;
  if (a.issue === "pay" && receipt(a.idempotencyKey, ctx.database)) return pay(a, ctx);
  if (checkMandate(a.input.mandate, now).status !== "ready") return stop(a, "Mandate revoked or expired", now);
  if (a.clarifyExpiresAt !== null && now >= a.clarifyExpiresAt) return stop(a, "Clarification timeout", now);
  if (a.quote && now >= a.quote.expiresAt) return stop(a, "Quote expired", now);
  if (event.type === "cancel") return stop(a, "User cancelled the attempt", now);
  if (event.type === "tick") return a;
  if (event.type === "decline") {
    if (a.issue === "mandate" || a.issue === "weights" || a.issue === "list" || a.issue === "allocation") return stop(a, "User declined required clarification", now);
    a.coupon = releaseCoupon(); a.status = "offers"; a.issue = null; a.quote = null; a.selected = null; a.clarifyExpiresAt = null;
    a.reason = "Rolled back to selection; coupon is unused";
    log(a.trace, "rollback", "release_coupon", a.reason, { coupon: a.coupon }, now);
    return a;
  }
  if (event.type === "select") {
    if (a.status === "clarify" && a.issue !== "tie" && a.issue !== "price" && a.issue !== "repeat") return a;
    const selected = a.offers.find(o => o.offer.sku_id === event.skuId);
    if (!selected) return stop(a, "Offer is not part of this attempt", now);
    a.repeatedAccepted = false;
    return prepare(a, selected.offer, ctx);
  }
  if (event.type === "accept_repeat" && a.issue === "repeat") {
    a.repeatedAccepted = true; a.status = "quote"; a.issue = null; a.clarifyExpiresAt = null; a.reason = "Repeated purchase accepted; review and confirm quote";
    return a;
  }
  if (event.type === "price_change" && a.quote && a.selected) {
    if (![360, 410].includes(event.cashTotal) || a.selected.sku_id !== "price-demo") return a;
    const delta = event.cashTotal - a.quote.cashTotal;
    a.selected = { ...a.selected, shipping: (a.selected.shipping ?? 0) + delta };
    const updated = createQuote(a.selected, a.quote.items[0].qty, a.input.mandate, now);
    updated.expiresAt = a.quote.expiresAt;
    a.quote = updated; a.quoteVersion += 1;
    return clarify(a, "price", "Quote changed: previous confirmation is void. Accept the new quote or roll back.", now);
  }
  if (event.type === "retry" && a.issue === "pay") return pay(a, ctx);
  if (event.type === "confirm" && a.quote && (a.status === "quote" || a.issue === "price")) {
    if (event.version !== a.quoteVersion) return clarify(a, "price", "Stale confirmation. Review and accept the latest quote.", now);
    const current = ctx.lookup?.(a.selected!.sku_id);
    if (ctx.lookup && !current) return stop(a, "Offer no longer exists", now);
    if (current) {
      if (!current.stock || loadCatalog([current]).offers.length === 0) return stop(a, "Current catalogue offer rejected", now);
      const updated = createQuote(current, a.quote.items[0].qty, a.input.mandate, now);
      if (quoteChanged(a.quote, updated)) { updated.expiresAt = a.quote.expiresAt; a.quote = updated; a.selected = current; a.quoteVersion += 1; return clarify(a, "price", "Final catalogue terms changed. Previous confirmation is void.", now); }
    }
    return pay(a, ctx);
  }
  return a;
}
