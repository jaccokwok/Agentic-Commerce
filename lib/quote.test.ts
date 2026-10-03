import { expect, test } from "vitest";
import { createQuote, checkQuote, quoteChanged, searchDeadline, clarifyDeadline } from "@/lib/quote";
import { defaultMandate } from "@/lib/mandate";
import { rawOffers } from "@/lib/catalog";

const m = { ...defaultMandate(), perItem: 500 };
const offer = { ...rawOffers[0], shelf: 200, human_price: 200, agent_price: 200, coupon: 80, shipping: 30 };
const quote = createQuote(offer, 2, m, 1000);
test("quote freezes cash, items, currency, tender, reward terms and both clocks", () => {
  expect(quote).toMatchObject({ cashTotal: 350, shipping: 30, currency: "HKD", tender: "card", mandateExpiresAt: null });
  expect(quote.items[0]).toMatchObject({ qty: 2, lineTotal: 400 });
  expect(quote.expiresAt).toBeGreaterThan(1000);
  expect(searchDeadline(1000, { ...m, maxSearchSeconds: 5 })).toBe(6000);
  expect(searchDeadline(1000, { ...m, maxSearchSeconds: 30 })).toBe(16000);
  expect(clarifyDeadline(1000)).toBe(121000);
});
test("any material term change voids confirmation", () => {
  for (const changed of [ { ...quote, cashTotal: 360 }, { ...quote, shipping: 40 }, { ...quote, currency: "USD" },
    { ...quote, tender: "wallet" }, { ...quote, reward: { ...quote.reward, terms: "changed" } },
    { ...quote, items: [{ ...quote.items[0], qty: 3 }] } ]) expect(quoteChanged(quote, changed)).toBe(true);
  expect(quoteChanged(quote, structuredClone(quote))).toBe(false);
});
test("cash cannot exceed order, share or remaining budget; per-item checks pre-coupon line", () => {
  expect(checkQuote(quote, m, 350, 350, 1000).status).toBe("ready");
  for (const limits of [{ m: { ...m, perOrder: 340 }, share: 500, remaining: 500 }, { m, share: 340, remaining: 500 },
    { m, share: 500, remaining: 340 }, { m: { ...m, perItem: 350 }, share: 500, remaining: 500 }]) {
    expect(checkQuote(quote, limits.m, limits.share, limits.remaining, 1000).status).toBe("terminate");
  }
  expect(checkQuote(quote, m, 500, 500, quote.expiresAt).status).toBe("terminate");
});
