import { createHmac, timingSafeEqual } from "node:crypto";
import type { Mandate } from "@/lib/mandate";
import { quoteFingerprint, type Quote } from "@/lib/quote";

const KEY = "scout-demo-hmac-v1";
export type Slip = { body: string; signature: string };

function mac(body: string) {
  return createHmac("sha256", KEY).update(body).digest("hex");
}
function sign(body: unknown): Slip {
  const text = JSON.stringify(body);
  return { body: text, signature: mac(text) };
}
function signed(slip: Slip) {
  const expected = mac(slip.body);
  if (expected.length !== slip.signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(slip.signature));
}

export function issueIntent(did: string, mandate: Mandate): Slip {
  return sign({ did, perItem: mandate.perItem, perOrder: mandate.perOrder, rolling7d: mandate.rolling7d, tenders: mandate.tenders, confirmMode: mandate.confirmMode, expiresAt: mandate.expiresAt });
}
export function issuePayment(intent: Slip, quote: Quote): Slip {
  return sign({ intentSignature: intent.signature, quoteHash: quoteFingerprint(quote), cash: quote.cashTotal, tender: quote.tender, merchantId: quote.merchantId });
}
export function verifyPair(intent: Slip, payment: Slip, did: string, mandate: Mandate, quote: Quote) {
  if (!signed(intent) || !signed(payment)) return { ok: false, reason: "Signature does not match" };
  const intentBody = JSON.parse(intent.body) as Record<string, unknown>;
  const paymentBody = JSON.parse(payment.body) as { intentSignature: string; quoteHash: string; cash: number; tender: string; merchantId: string };
  if (JSON.stringify(intentBody) !== issueIntent(did, mandate).body) return { ok: false, reason: "Intent does not match the mandate" };
  if (paymentBody.intentSignature !== intent.signature || paymentBody.quoteHash !== quoteFingerprint(quote) || paymentBody.cash !== quote.cashTotal || paymentBody.tender !== quote.tender || paymentBody.merchantId !== quote.merchantId) {
    return { ok: false, reason: "Payment slip does not match the quote" };
  }
  return { ok: true, reason: "Auditor verified the intent and the payment slip" };
}
