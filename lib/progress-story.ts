import { maskId } from "@/lib/mask-id";
import type { TraceRow } from "@/lib/trace";

const ROLE = { shopper: "Shopper", mandate: "Mandate", merchant: "Merchant", auditor: "Auditor", payer: "Payer" } as const;

function reply(row: TraceRow): boolean {
  return row.from !== undefined && row.from !== "shopper";
}

function lineFor(row: TraceRow, seen: { scored: boolean; limited: boolean; dropped: boolean }): string | null {
  const rule = row.ruleId;
  if (rule === "typed_intent") return "Shopper turns the sentence into catalogue items.";
  if (rule === "validate_form" && reply(row)) return row.numbers.status === "ready" ? "Mandate accepts the saved limits." : "Mandate rejects the saved limits.";
  if (rule === "request_conflict" && reply(row)) return row.numbers.status === "ready" ? "Mandate accepts this request." : typeof row.numbers.reason === "string" && row.numbers.reason ? `Mandate: ${row.numbers.reason}` : "Mandate says this request conflicts with the limits.";
  if (rule === "still_valid" && reply(row)) return row.numbers.status === "ready" ? "Mandate rechecks the limits and they still hold." : "Mandate finds the limits no longer hold.";
  if (rule === "shared_request") return "Shopper reserves the budget share for this item.";
  if (rule === "filter_limits" && reply(row)) return "Mandate checks which offers fit the limits.";
  if (rule === "offer_limit") return seen.limited ? null : "Mandate sets aside offers that break a limit.";
  if (rule === "catalog_only") return "Shopper searches the fixed catalogue.";
  if (rule === "filter_catalog" && reply(row)) return "Auditor keeps the catalogue rows that pass.";
  if (rule === "listing_injection" || rule === "agent_surcharge" || rule === "shipping_missing" || rule === "invalid_offer") return seen.dropped ? null : "Auditor drops a listing that fails the rules.";
  if (rule === "weights") return "Shopper decides how to compare the offers.";
  if (rule === "scored") return seen.scored ? null : "Shopper scores the offers.";
  if (rule === "max_qty") return row.reason;
  if (rule === "one_merchant_top3") return row.reason.includes("saved comparison") || !row.numbers.winner ? row.reason : `Shopper leads with ${maskId(String(row.numbers.winner))}.`;
  if (row.from === "merchant") {
    if (rule === "accepted" || row.numbers.status === "accepted") return "Merchant accepts the catalogue price.";
    if (rule === "counter" || row.numbers.status === "counter") return "Merchant sends one counter-offer.";
    if (rule === "rejected" || row.numbers.status === "rejected") return "Merchant rejects this offer.";
    return "Merchant answers the price request.";
  }
  if (rule === "negotiate" && row.from === "shopper") return "Shopper asks the merchant for a price.";
  if ((rule === "text_ok" || rule === "review_text") && row.from === "auditor") return row.numbers.veto ? "Auditor rejects the counter text." : "Auditor accepts the counter text.";
  if (rule === "cash_gate" && reply(row)) return row.numbers.status === "ready" ? `Mandate allows the cash of ${row.numbers.cash}.` : "Mandate refuses this cash.";
  if (rule === "credentials_ok") return "Auditor accepts the payment authorization.";
  if (rule === "credentials_bad") return "Auditor rejects the payment authorization.";
  if (rule === "pay_refused") return "Payer refuses to charge before the auditor accepts.";
  if (row.from === "payer") return row.numbers.status === "paid" ? "Payer books the mock payment." : "Payer holds the payment for another try.";
  if (row.step === "clarify" && rule === "tie") return "Shopper finds a tie and asks you to choose.";
  if (row.step === "clarify" && rule === "price") return "Shopper asks you to accept the new price.";
  if (row.step === "clarify" && rule === "repeat") return "Shopper asks you to confirm buying this again.";
  if (row.step === "clarify" && rule === "weights") return "Shopper asks you to keep the mandate comparison.";
  if (row.step === "clarify" && rule === "pay") return "Payer asks for the same payment to be retried.";
  if (row.step === "clarify") return "Shopper pauses and asks you to continue.";
  if (row.step === "stop") return "Shopper stops this attempt.";
  if (rule === "release_coupon") return "Shopper releases the reserved coupon.";
  if (rule === "card_reprice") return "Shopper prices the next tender after the card is declined.";
  if (rule === "accept_repeat") return "Shopper records that this repeat is intentional.";
  return null;
}

export function progressStory(rows: TraceRow[], status?: string | null): string[] {
  const lines: string[] = [];
  const seen = { scored: false, limited: false, dropped: false };
  for (const row of rows) {
    const line = lineFor(row, seen);
    if (row.ruleId === "scored") seen.scored = true;
    if (row.ruleId === "offer_limit") seen.limited = true;
    if (row.ruleId === "listing_injection" || row.ruleId === "agent_surcharge" || row.ruleId === "shipping_missing" || row.ruleId === "invalid_offer") seen.dropped = true;
    if (line && line !== lines.at(-1)) lines.push(line);
  }
  if (status === "quote") lines.push("Shopper is waiting for you to confirm the quote.");
  if (status === "paid" && !lines.some((line) => line.startsWith("Payer books"))) lines.push("Payer books the mock payment.");
  return lines;
}
