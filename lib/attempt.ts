import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { CATEGORY_IDS, type Offer } from "@/lib/catalog";
import { parseIntent, intentFromDraft, statedQuantity, wantsAsMany, type Goal, type Intent } from "@/lib/intent";
import { complete, proposeTurn } from "@/lib/complete";
import { allows, type Mandate } from "@/lib/mandate";
import { checkAllocations } from "@/lib/allocation";
import { rankOffers, resolveWeights, weightsFor, type RankedOffer, type Weights } from "@/lib/rank";
import { createQuote, checkQuote, fitQuantity, quoteChanged, searchDeadline, clarifyDeadline, allowedTenders, type Quote } from "@/lib/quote";
import { releaseCoupon, type CouponState } from "@/lib/negotiate";
import { historySkus, recentSkus, spent7d, spentShare, spentRequest, receipt } from "@/lib/ledger";
import type { PayContext } from "@/lib/pay";
import { newTrace, log, type Trace } from "@/lib/trace";
import { deliver, type AgentMessage } from "@/lib/message";
import { shopperTurn, type OfferCursor } from "@/lib/agents";

export type AttemptInput = { userId: number; requestId: string; text: string; goals: Goal[]; goalId: string;
  shares: Record<string, number | null>; budget: number; partialAccepted: boolean; mandate: Mandate;
  merchantId?: string; weights?: Weights; preferencesAccepted?: boolean };
export type Attempt = { id: string; input: AttemptInput; trace: Trace; status: "offers" | "quote" | "clarify" | "terminate" | "paid";
  issue: "list" | "allocation" | "mandate" | "weights" | "tie" | "repeat" | "price" | "pay" | null;
  reason: string; offers: RankedOffer[]; selected: Offer | null; quote: Quote | null;
  quoteVersion: number; coupon: CouponState; clarifyExpiresAt: number | null; idempotencyKey: string; repeatedAccepted: boolean; declinedTender?: string | null };
export type AttemptContext = { database: DatabaseSync; now: () => number; vaultId: string; addressId: string;
  catalog?: Offer[]; lookup?: (sku: string) => Offer | undefined; paySimulation?: PayContext["simulation"]; authorize?: () => void; flipCredential?: boolean;
  draft?: (sentence: string) => unknown | Promise<unknown> };
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
function poolReason(label: string, rejected: { sku: string; reason: string }[], candidates: Offer[], categoryId: string, fallback: string): string {
  const told = [...new Set(rejected.filter(row => candidates.find(offer => offer.sku_id === row.sku)?.category_id === categoryId).map(row => row.reason))];
  if (!told.length || told.some(reason => !reason.includes("not allowed by the mandate"))) return fallback;
  const list = told.map(reason => reason.match(/Allow list: ([^.]+)\./)?.[1]).find(Boolean);
  return list && told.every(reason => reason.includes("Allow list:")) ? `No ${label.toLowerCase()} match the allow list (${list}).` : told[0];
}
function skip(a: Attempt, reason: string) {
  a.coupon = releaseCoupon(); a.status = "offers"; a.quote = null; a.reason = reason;
  return a;
}
async function readSentence(text: string, ctx: AttemptContext): Promise<Intent> {
  if (!process.env.SCOUT_LLM) return parseIntent(text);
  try {
    const raw = ctx.draft ? await ctx.draft(text) : await complete(text);
    return intentFromDraft(raw);
  } catch {
    return { status: "clarify", goals: [], budgetHint: null, reason: "Model draft was not catalogue JSON" };
  }
}

async function filterCatalog(a: Attempt, rows: Offer[] | undefined, now: number) {
  const reply = await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "auditor", type: "filter_catalog", body: { rows } }, now, "search");
  const result = reply.body as { kept: Offer[]; dropped: { sku_id: string; rule: string; reason: string }[] };
  for (const drop of result.dropped) log(a.trace, "search", drop.rule, drop.reason, { sku: drop.sku_id }, now);
  return result;
}

function liveRow(offer: Offer, ctx: AttemptContext) {
  if (ctx.lookup) return ctx.lookup(offer.sku_id);
  if (ctx.catalog) return ctx.catalog.find(row => row.sku_id === offer.sku_id);
  return offer;
}

async function bargain(a: Attempt, offers: Offer[], ctx: AttemptContext, whenEmpty: "stop" | "leave"): Promise<Attempt> {
  const now = ctx.now();
  const goal = a.input.goals.find(g => g.id === a.input.goalId)!;
  const budget = remaining(a, ctx);
  const cursor: OfferCursor = { offers, current: offers.map(offer => liveRow(offer, ctx)), index: 0, phase: "negotiate", merchant: "accepted", priced: null, quote: null, reason: "" };
  let last: AgentMessage | null = null;
  for (let guard = 0; guard < offers.length * 4 + 1; guard += 1) {
    const turn = shopperTurn(cursor, last, { mandate: a.input.mandate, qty: goal.qty!, share: budget.share, rolling: budget.rolling, now });
    await judgeTurn(a, turn, now, last?.type ?? null);
    if (turn.kind === "send") {
      if (turn.type === "negotiate") { a.coupon = releaseCoupon(); a.quote = null; a.selected = turn.offer ?? null; }
      if (turn.type === "check_cash" && turn.quote) { a.quote = turn.quote; a.quoteVersion += 1; }
      last = await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: turn.to, type: turn.type, body: turn.body }, now, turn.step);
      continue;
    }
    if (turn.kind === "stop") return stop(a, turn.reason, now);
    if (turn.kind === "exhausted") return whenEmpty === "stop" ? stop(a, "All catalogue negotiations rejected", now) : skip(a, turn.reason || "Current catalogue offer rejected");
    a.selected = turn.priced; a.coupon = "reserved"; a.quote = turn.quote;
    if (!a.repeatedAccepted && recentSkus(a.input.userId, now, ctx.database).includes(offers[cursor.index].sku_id)) return clarify(a, "repeat", "Same SKU purchased within 72 hours. Confirm this is intentional.", now);
    a.status = "quote"; a.issue = null; a.clarifyExpiresAt = null; a.reason = "Review the final quote before mock payment";
    return a;
  }
  return stop(a, "All catalogue negotiations rejected", now);
}

const LEGAL_TURN = new Set(["negotiate", "review_text", "filter_catalog", "check_cash", "validate_form", "still_valid", "request_conflict", "filter_limits", "stop"]);

function readProposal(raw: unknown) {
  let value = raw;
  if (typeof raw === "string") {
    try { value = JSON.parse(raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "")); } catch { return { to: "", type: "" }; }
  }
  if (!value || typeof value !== "object") return { to: "", type: "" };
  const row = value as { to?: unknown; type?: unknown };
  return { to: typeof row.to === "string" ? row.to : "", type: typeof row.type === "string" ? row.type : "" };
}

async function judgeTurn(a: Attempt, turn: { kind: string; to?: string; type?: string }, now: number, lastType: string | null) {
  if (!process.env.SCOUT_LLM) return;
  const codeTo = turn.kind === "send" ? String(turn.to) : "shopper";
  const codeType = turn.kind === "send" ? String(turn.type) : "stop";
  let proposed = { to: "", type: "" };
  try { proposed = readProposal(await proposeTurn({ kind: turn.kind, lastType })); } catch { proposed = { to: "", type: "" }; }
  const forbidden = proposed.to === "payer" || proposed.type === "charge" || proposed.type === "retry";
  const closed = LEGAL_TURN.has(proposed.type) && (proposed.type === "stop" || proposed.to === "merchant" || proposed.to === "mandate" || proposed.to === "auditor");
  const match = !forbidden && closed && proposed.type === codeType && (codeType === "stop" || proposed.to === codeTo);
  log(a.trace, "turn", match ? "model_turn_ok" : "model_turn_rejected", match ? "Shopper proposal matched the next message" : "Shopper proposal refused; the tool message was sent", { proposedTo: proposed.to, proposedType: proposed.type, codeTo, codeType }, now);
}

export async function runAttempt(input: AttemptInput, ctx: AttemptContext): Promise<Attempt> {
  const started = ctx.now();
  const a: Attempt = { id: randomUUID(), input, trace: newTrace(), status: "offers", issue: null, reason: "", offers: [], selected: null,
    quote: null, quoteVersion: 0, coupon: "unused", clarifyExpiresAt: null, idempotencyKey: randomUUID(), repeatedAccepted: false };
  const parsed = await readSentence(input.text, ctx);
  log(a.trace, "parse", "typed_intent", parsed.reason, { goals: parsed.goals.length, budgetHint: parsed.budgetHint }, started);
  if (parsed.status === "terminate") return stop(a, parsed.reason, started);
  if (process.env.SCOUT_LLM && parsed.status !== "ready") return clarify(a, "list", parsed.reason, started);
  const mandate = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "mandate", type: "validate_form", body: { mandate: input.mandate, now: started } }, started, "mandate")).body as { status: "ready" | "clarify" | "terminate"; reason: string };
  if (mandate.status !== "ready") return stop(a, mandate.reason, started);
  const goal = input.goals.find(g => g.id === input.goalId);
  if (!goal || !input.goals.length || new Set(input.goals.map(g => g.id)).size !== input.goals.length || input.goals.some(g => !CATEGORY_IDS.includes(g.categoryId) || g.id !== g.categoryId || !Number.isSafeInteger(g.qty) || (g.qty ?? 0) < 1 || (g.qty ?? 0) > 10000)) return clarify(a, "list", "Set a positive whole quantity for every catalogue goal", started);
  const conflict = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "mandate", type: "request_conflict", body: { mandate: input.mandate, now: started, request: { categoryId: goal.categoryId, merchantId: input.merchantId, budgetHint: input.goals.length === 1 ? parsed.budgetHint : null } } }, started, "mandate")).body as { status: "ready" | "clarify" | "terminate"; reason: string };
  if (conflict.status === "clarify") return clarify(a, "mandate", conflict.reason, started);
  if (conflict.status === "terminate") return stop(a, conflict.reason, started);
  if (input.goals.length > 1 && !input.partialAccepted) return clarify(a, "allocation", "Accept possible partial completion of separate sub-requests", started);
  if (Object.keys(input.shares).length !== input.goals.length || input.goals.some(g => !(g.id in input.shares))) return clarify(a, "allocation", "Each goal needs its own fixed share", started);
  const allocation = checkAllocations(input.shares, input.budget, input.mandate.rolling7d - spent7d(input.userId, started, ctx.database) + spentRequest(input.userId, input.requestId, ctx.database));
  log(a.trace, "allocation", "shared_request", allocation.reason, { budget: input.budget, reserved: allocation.reserved }, started);
  if (allocation.status === "terminate") return stop(a, allocation.reason, started);
  if (allocation.status === "clarify") return clarify(a, "allocation", allocation.reason, started);
  const explicit = input.weights ?? weightsFor(input.mandate.paymentObjective);
  const preferences = resolveWeights(input.preferencesAccepted ? "" : input.text, explicit);
  if (preferences.status === "terminate") return stop(a, preferences.reason, started);
  if (preferences.status === "clarify") return clarify(a, "weights", preferences.reason, started);
  const catalog = await filterCatalog(a, ctx.catalog, ctx.now());
  const limits = remaining(a, ctx);
  const candidates = catalog.kept.filter(o => !input.merchantId || o.merchant_id === input.merchantId);
  if (wantsAsMany(input.text) && statedQuantity(input.text) == null) {
    const room = candidates.filter(offer => offer.category_id === goal.categoryId && allows(input.mandate, offer.merchant_id, offer.category_id, offer.platform_id));
    const qty = room.reduce((max, offer) => Math.max(max, fitQuantity(offer, input.mandate, limits.share, limits.rolling, ctx.now())), 0);
    if (qty >= 1) {
      goal.qty = qty;
      log(a.trace, "search", "max_qty", `Buying ${qty}, the most that fits the mandate.`, { qty }, ctx.now());
    }
  }
  const limited = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "mandate", type: "filter_limits", body: { offers: candidates, qty: goal.qty, mandate: input.mandate, share: limits.share, rolling: limits.rolling, now: ctx.now() } }, ctx.now(), "search")).body as { rejected: { sku: string; reason: string }[]; allowed: string[] };
  for (const row of limited.rejected) log(a.trace, "search", "offer_limit", row.reason, { sku: row.sku }, ctx.now());
  const eligible = candidates.filter(o => limited.allowed.includes(o.sku_id));
  if (ctx.now() >= searchDeadline(started, input.mandate)) return stop(a, "Search timeout before charge", ctx.now());
  log(a.trace, "search", "catalog_only", "Searched fixed mock catalogue; no network model", { clean: catalog.kept.length, eligible: eligible.length, timeout: searchDeadline(started, input.mandate) }, ctx.now());
  const ranked = rankOffers(eligible, goal, input.mandate, historySkus(input.userId, ctx.database), preferences.weights);
  a.offers = ranked.offers;
  const w = preferences.weights;
  log(a.trace, "rank", "weights", "Shares used for this ranking", { weights: `relevance ${w.relevance}, cash ${w.cash}, rating ${w.rating}, purchases ${w.purchases}, history ${w.history}` }, ctx.now());
  for (const row of ranked.compared) log(a.trace, "rank", "scored", row.sku, { sku: row.sku, cash: row.cash, tender: row.tender, score: row.score, parts: row.parts }, ctx.now());
  const rankedReason = ranked.status === "terminate" ? poolReason(goal.label, limited.rejected, candidates, goal.categoryId, ranked.reason) : ranked.reason;
  log(a.trace, "rank", "one_merchant_top3", rankedReason, { offers: a.offers.length, topScore: a.offers[0]?.score ?? null, winner: a.offers[0]?.offer.sku_id ?? null }, ctx.now());
  if (ranked.status === "terminate") return stop(a, rankedReason, ctx.now());
  if (ranked.status === "clarify") return clarify(a, "tie", ranked.reason, ctx.now());
  await bargain(a, a.offers.map(choice => choice.offer), ctx, "stop");
  if (a.status === "quote" && input.mandate.confirmMode === "auto") return advanceAttempt(a, { type: "confirm", version: a.quoteVersion }, ctx);
  return a;
}

async function pay(a: Attempt, ctx: AttemptContext) {
  const q = a.quote!;
  const verdict = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "auditor", type: "verify", body: { did: `did:mock:${a.input.userId}`, mandate: a.input.mandate, quote: q, flip: ctx.flipCredential === true, cash: q.cashTotal } }, ctx.now(), "audit")).body as { ok: boolean; reason: string };
  if (!verdict.ok) return stop(a, verdict.reason, ctx.now());
  const input = { vaultId: ctx.vaultId, addressId: ctx.addressId, amount: q.cashTotal, currency: q.currency,
    tender: q.tender, expiresAt: q.expiresAt, idempotencyKey: a.idempotencyKey };
  const context: PayContext = { userId: a.input.userId, requestId: a.input.requestId, goalId: a.input.goalId, traceId: a.trace.id,
    skus: q.items.map(i => i.sku_id), cashback: q.reward.cashback, mandate: a.input.mandate, now: ctx.now(),
    simulation: a.declinedTender && a.declinedTender !== q.tender ? undefined : ctx.paySimulation, cardOff: q.cardOff,
    guard: () => { ctx.authorize?.(); const limits = remaining(a, ctx); const gate = checkQuote(q, a.input.mandate, limits.share, limits.rolling, ctx.now()); if (gate.status !== "ready") throw new Error(gate.reason); } };
  let result = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "payer", type: "charge", body: { input, context, ruleId: "mock_refs_idempotency", cash: q.cashTotal, tender: q.tender, idempotencyKey: a.idempotencyKey } }, ctx.now(), "pay", ctx.database)).body as { status: "paid" | "clarify" | "terminate"; reason: string };
  if (result.status === "clarify" && q.cardOff > 0 && ctx.paySimulation === "card_declined") {
    const rest = allowedTenders(a.input.mandate).filter(tender => tender !== q.tender);
    if (!rest.length || !a.selected) return stop(a, "Card was declined before charge and no later tender booked", ctx.now());
    a.declinedTender = q.tender;
    const updated = createQuote(a.selected, q.items[0].qty, { ...a.input.mandate, tenders: rest }, ctx.now());
    updated.expiresAt = q.expiresAt;
    a.quote = updated; a.quoteVersion += 1;
    log(a.trace, "quote", "card_reprice", "Card discount does not apply to the next tender", { cash: updated.cashTotal, tender: updated.tender }, ctx.now());
    return clarify(a, "price", "Card discount does not apply to the next tender. Accept the new quote or roll back.", ctx.now());
  }
  if (result.status === "clarify") {
    result = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "payer", type: "retry", body: { input, context: { ...context, simulation: ctx.paySimulation === "retry_failed" ? "retry_failed" : undefined }, ruleId: "same_key_retry", cash: q.cashTotal, tender: q.tender, idempotencyKey: a.idempotencyKey } }, ctx.now(), "pay", ctx.database)).body as { status: "paid" | "clarify" | "terminate"; reason: string };
  }
  if (result.status === "paid") { a.status = "paid"; a.issue = null; a.clarifyExpiresAt = null; a.coupon = "spent"; a.reason = result.reason; return a; }
  if (result.status === "clarify") return clarify(a, "pay", result.reason, ctx.now());
  return stop(a, result.reason, ctx.now());
}

export async function advanceAttempt(a: Attempt, event: AttemptEvent, ctx: AttemptContext): Promise<Attempt> {
  const now = ctx.now();
  if (a.status === "paid" || a.status === "terminate") return a;
  if (a.issue === "pay" && receipt(a.idempotencyKey, ctx.database)) return await pay(a, ctx);
  const still = (await deliver(a.trace, { traceId: a.trace.id, from: "shopper", to: "mandate", type: "still_valid", body: { mandate: a.input.mandate, now } }, now, "mandate")).body as { status: string; reason: string };
  if (still.status !== "ready") return stop(a, still.reason, now);
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
    return await bargain(a, [selected.offer], ctx, "leave");
  }
  if (event.type === "accept_repeat" && a.issue === "repeat") {
    a.repeatedAccepted = true; a.status = "quote"; a.issue = null; a.clarifyExpiresAt = null; a.reason = "Repeated purchase accepted; review and confirm quote";
    log(a.trace, "clarify", "accept_repeat", a.reason, { sku: a.quote?.items[0]?.sku_id ?? null }, now);
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
  if (event.type === "retry" && a.issue === "pay") return await pay(a, ctx);
  if (event.type === "confirm" && a.quote && (a.status === "quote" || a.issue === "price")) {
    if (event.version !== a.quoteVersion) return clarify(a, "price", "Stale confirmation. Review and accept the latest quote.", now);
    const current = ctx.lookup?.(a.selected!.sku_id);
    if (ctx.lookup && !current) return stop(a, "Offer no longer exists", now);
    if (current) {
      const checked = await filterCatalog(a, [current], now);
      if (!current.stock || checked.kept.length === 0) return stop(a, "Current catalogue offer rejected", now);
      const updated = createQuote(current, a.quote.items[0].qty, a.input.mandate, now);
      if (quoteChanged(a.quote, updated)) { updated.expiresAt = a.quote.expiresAt; a.quote = updated; a.selected = current; a.quoteVersion += 1; return clarify(a, "price", "Final catalogue terms changed. Previous confirmation is void.", now); }
    }
    return await pay(a, ctx);
  }
  return a;
}
