import type { DatabaseSync } from "node:sqlite";
import { negotiate } from "@/lib/negotiate";
import { checkQuote, createQuote } from "@/lib/quote";
import { checkMandate } from "@/lib/mandate";
import { issueIntent, issuePayment, verifyPair } from "@/lib/credential";
import { mockPay, type PayContext, type PayInput } from "@/lib/pay";
import type { Agent, AgentMessage } from "@/lib/message";
import { speak } from "@/lib/complete";
import { hasInjection, loadCatalog, type Offer } from "@/lib/catalog";
import type { Mandate } from "@/lib/mandate";
import type { Quote } from "@/lib/quote";

function reply(message: AgentMessage, type: string, body: Record<string, unknown>): AgentMessage {
  return { traceId: message.traceId, from: message.to, to: message.from, type, body };
}

async function finish(message: AgentMessage, type: string, body: Record<string, unknown>): Promise<AgentMessage> {
  const facts: Record<string, unknown> = { type };
  for (const key of ["status", "reason", "cash", "coupon", "sku", "ok", "shelf", "shipping", "veto"]) {
    const value = body[key];
    if (value === null || typeof value === "number" || typeof value === "string" || typeof value === "boolean") facts[key] = value;
  }
  if (typeof body.cardOff === "number" && body.cardOff > 0) facts.cardOff = body.cardOff;
  if (typeof body.tender === "string" && body.tender) facts.tender = body.tender;
  const explanation = await speak(message.to, facts);
  return reply(message, type, explanation ? { ...body, explanation } : body);
}

export const websiteHits: string[] = [];
const WEBSITES = ["taobao", "hktvmall", "pinduoduo"] as const;

function stockReply(message: AgentMessage, selected: Offer): Promise<AgentMessage> {
  return finish(message, "out_of_stock", { status: "rejected", coupon: "unused", reason: "out_of_stock", shelf: selected.shelf, shipping: selected.shipping ?? null, offer: null });
}

export const merchantAgent: Agent = {
  role: "merchant",
  async handle(message) {
    const { selected, current } = message.body as { selected: Offer; current: Offer };
    const platform = selected?.platform_id;
    if (!selected || !current || !WEBSITES.includes(platform as typeof WEBSITES[number])) {
      return finish(message, "out_of_stock", { status: "rejected", coupon: "unused", reason: "out_of_stock", shelf: selected?.shelf ?? null, shipping: selected?.shipping ?? null, offer: null });
    }
    websiteHits.push(platform);
    if (current.platform_id !== platform) return stockReply(message, selected);
    const result = negotiate(selected, current);
    const countered = result.status === "counter" ? result.offer : null;
    return finish(message, result.status, { status: result.status, coupon: result.coupon, reason: result.reason, shelf: countered?.shelf ?? selected.shelf, shipping: countered?.shipping ?? selected.shipping ?? null, offer: countered });
  },
};

export const mandateAgent: Agent = {
  role: "mandate",
  async handle(message) {
    if (message.type === "validate_form" || message.type === "still_valid") {
      const gate = checkMandate(message.body.mandate as Mandate, Number(message.body.now));
      return finish(message, message.type, { status: gate.status, reason: gate.reason });
    }
    if (message.type === "request_conflict") {
      const gate = checkMandate(message.body.mandate as Mandate, Number(message.body.now), message.body.request as { budgetHint?: number | null; categoryId?: string; merchantId?: string });
      return finish(message, "request_conflict", { status: gate.status, reason: gate.reason });
    }
    if (message.type === "filter_limits") {
      const { offers, qty, mandate, share, rolling, now } = message.body as { offers: Offer[]; qty: number; mandate: Mandate; share: number; rolling: number; now: number };
      const rejected = offers.flatMap(offer => {
        const gate = checkQuote(createQuote(offer, qty, mandate, now), mandate, share, rolling, now);
        return gate.status === "ready" ? [] : [{ sku: offer.sku_id, reason: gate.reason }];
      });
      return finish(message, "filter_limits", { rejected, allowed: offers.filter(offer => !rejected.some(row => row.sku === offer.sku_id)).map(offer => offer.sku_id) });
    }
    const { quote, mandate, share, rolling, now } = message.body as { quote: Quote; mandate: Mandate; share: number; rolling: number; now: number };
    const gate = checkQuote(quote, mandate, share, rolling, now);
      const card = quote.cardOff > 0 ? { cardOff: quote.cardOff, tender: quote.tender } : {};
      return finish(message, "cash_gate", { status: gate.status, reason: gate.reason, cash: quote.cashTotal, ...card });
  },
};

export const auditorAgent: Agent = {
  role: "auditor",
  async handle(message) {
    if (message.type === "filter_catalog") {
      const audited = loadCatalog(message.body.rows as Offer[] | undefined);
      return finish(message, "filter_catalog", { kept: audited.offers, dropped: audited.dropped, clean: audited.offers.length });
    }
    if (message.type === "review_text") {
      const reason = String(message.body.reason ?? "");
      const veto = hasInjection(reason);
      return finish(message, veto ? "listing_injection" : "text_ok", { veto, reason, sku: (message.body.sku as string | undefined) ?? null });
    }
    const { did, mandate, quote, flip } = message.body as { did: string; mandate: Mandate; quote: Quote; flip?: boolean };
    const intent = issueIntent(did, mandate);
    let payment = issuePayment(intent, quote);
    if (flip) {
      const chars = payment.signature.split("");
      chars[0] = chars[0] === "0" ? "1" : "0";
      payment = { ...payment, signature: chars.join("") };
    }
    const verdict = verifyPair(intent, payment, did, mandate, quote);
    return finish(message, verdict.ok ? "credentials_ok" : "credentials_bad", { ok: verdict.ok, reason: verdict.reason, cash: quote.cashTotal, merchant: quote.merchantId });
  },
};

export function agentFor(to: AgentMessage["to"], database?: DatabaseSync): Agent {
  if (to === "merchant") return merchantAgent;
  if (to === "mandate") return mandateAgent;
  if (to === "auditor") return auditorAgent;
  if (to === "payer") {
    if (!database) throw new Error("Payer has no ledger");
    return payerAgent(database);
  }
  throw new Error(`No agent for ${to}`);
}

export type OfferCursor = {
  offers: Offer[];
  current: (Offer | undefined)[];
  index: number;
  phase: "negotiate" | "review" | "gate";
  merchant: "accepted" | "counter";
  priced: Offer | null;
  quote: Quote | null;
  reason: string;
};

export type ShopperTurn =
  | { kind: "send"; step: string; to: "merchant" | "auditor" | "mandate"; type: string; body: Record<string, unknown>; quote?: Quote; offer?: Offer }
  | { kind: "stop"; reason: string }
  | { kind: "exhausted"; reason: string }
  | { kind: "quote"; priced: Offer; quote: Quote };

function negotiateTurn(cursor: OfferCursor): ShopperTurn {
  while (cursor.index < cursor.offers.length && !cursor.current[cursor.index]) {
    cursor.reason = "Current catalogue offer rejected";
    cursor.index += 1;
  }
  const offer = cursor.offers[cursor.index];
  const current = cursor.current[cursor.index];
  if (!offer || !current) return { kind: "exhausted", reason: cursor.reason };
  cursor.phase = "negotiate";
  cursor.merchant = "accepted";
  cursor.priced = offer;
  return { kind: "send", step: "negotiate", to: "merchant", type: "negotiate", offer, body: { selected: offer, current, platform_id: offer.platform_id, shelf: offer.shelf, shipping: offer.shipping ?? null } };
}

function gateTurn(cursor: OfferCursor, priced: Offer, facts: { mandate: Mandate; qty: number; share: number; rolling: number; now: number }): ShopperTurn {
  const quote = createQuote(priced, facts.qty, facts.mandate, facts.now);
  cursor.phase = "gate";
  cursor.priced = priced;
  cursor.quote = quote;
  const card = quote.cardOff > 0 ? { cardOff: quote.cardOff, tender: quote.tender } : {};
  return { kind: "send", step: "quote", to: "mandate", type: "check_cash", quote, body: { quote, mandate: facts.mandate, share: facts.share, rolling: facts.rolling, now: facts.now, cash: quote.cashTotal, ...card } };
}

export function shopperTurn(cursor: OfferCursor, last: AgentMessage | null, facts: { mandate: Mandate; qty: number; share: number; rolling: number; now: number }): ShopperTurn {
  if (!last) return negotiateTurn(cursor);
  if (cursor.phase === "negotiate") {
    const body = last.body as { status?: string; reason?: string; offer?: Offer | null };
    if (body.status === "rejected") { cursor.reason = body.reason ?? "rejected"; cursor.index += 1; return negotiateTurn(cursor); }
    if (body.status === "counter") {
      cursor.phase = "review";
      cursor.merchant = "counter";
      cursor.priced = body.offer ?? cursor.offers[cursor.index];
      return { kind: "send", step: "search", to: "auditor", type: "review_text", body: { reason: body.reason ?? "", sku: cursor.offers[cursor.index].sku_id } };
    }
    return gateTurn(cursor, cursor.offers[cursor.index], facts);
  }
  if (cursor.phase === "review") {
    if (last.body.veto) { cursor.reason = "Auditor vetoed the counter"; cursor.index += 1; return negotiateTurn(cursor); }
    return gateTurn(cursor, cursor.priced ?? cursor.offers[cursor.index], facts);
  }
  const gate = last.body as { status?: string; reason?: string };
  if (gate.status !== "ready") {
    if (cursor.merchant === "counter") { cursor.reason = gate.reason ?? "Cash gate refused"; cursor.index += 1; return negotiateTurn(cursor); }
    return { kind: "stop", reason: String(gate.reason ?? "Cash gate refused") };
  }
  return { kind: "quote", priced: cursor.priced!, quote: cursor.quote! };
}

function payerAgent(database: DatabaseSync): Agent {
  return {
    role: "payer",
    async handle(message) {
      const { input, context, ruleId } = message.body as { input: PayInput; context: PayContext; ruleId: string };
      const result = mockPay(input, context, database);
      return finish(message, ruleId, { status: result.status, reason: result.reason, cash: input.amount, tender: input.tender, idempotencyKey: input.idempotencyKey });
    },
  };
}
