import { expect, test } from "vitest";
import { createQuote } from "@/lib/quote";
import { defaultMandate } from "@/lib/mandate";
import { rawOffers } from "@/lib/catalog";
import { issueIntent, issuePayment, verifyPair } from "@/lib/credential";

const mandate = defaultMandate();
const quote = createQuote(rawOffers[0], 1, mandate, 1000);
const did = "did:mock:1";

test("a valid pair passes, and a flipped bit, a swapped merchant, or a changed cash total does not", () => {
  const intent = issueIntent(did, mandate);
  const payment = issuePayment(intent, quote);
  expect(verifyPair(intent, payment, did, mandate, quote).ok).toBe(true);
  const flipped = payment.signature.split("");
  flipped[0] = flipped[0] === "0" ? "1" : "0";
  expect(verifyPair(intent, { ...payment, signature: flipped.join("") }, did, mandate, quote).ok).toBe(false);
  const body = JSON.parse(payment.body);
  expect(verifyPair(intent, issuePayment(intent, { ...quote, merchantId: "other-shop" }), did, mandate, quote).ok).toBe(false);
  expect(verifyPair(intent, issuePayment(intent, { ...quote, cashTotal: body.cash + 1 }), did, mandate, quote).ok).toBe(false);
});
