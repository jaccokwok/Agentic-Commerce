import { expect, test } from "vitest";
import { createQuote, checkQuote, quoteChanged, searchDeadline, clarifyDeadline, allowedTenders } from "@/lib/quote";
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
  const wallet = createQuote(offer, 2, { ...m, tenders: ["wallet"] }, 1000);
  expect(wallet.tender).toBe("wallet");
  expect(checkQuote(wallet, { ...m, tenders: ["wallet"] }, 500, 500, 1000).status).toBe("ready");
  expect(allowedTenders({ ...m, tenders: [] })).toEqual(["card"]);
  expect(allowedTenders({ ...m, tenders: ["points"] })).toEqual([]);
  expect(allowedTenders({ ...m, tenders: ["hsbc-visa", "citi-mastercard", "wallet"] })).toEqual(["hsbc-visa", "citi-mastercard", "wallet"]);
  const named = { ...offer, shelf: 280, human_price: 280, agent_price: 280, coupon: 0, shipping: 20, cardRules: [
    { tender: "hsbc-visa" as const, minMerchandise: 250, off: 40 },
    { tender: "citi-mastercard" as const, minMerchandise: 250, off: 10 },
  ] };
  const namedQuote = createQuote(named, 1, { ...m, tenders: ["hsbc-visa", "citi-mastercard", "wallet"] }, 1000);
  expect(namedQuote).toMatchObject({ tender: "hsbc-visa", cardOff: 40, cardMinimum: 250, cashTotal: 260 });
  expect(checkQuote(namedQuote, { ...m, tenders: ["hsbc-visa", "citi-mastercard", "wallet"] }, 500, 500, 1000).status).toBe("ready");
  const cardOffer = { ...offer, shelf: 280, human_price: 280, agent_price: 280, coupon: 0, shipping: 20, cardRule: { tender: "card" as const, minMerchandise: 250, off: 40 } };
  const cardQuote = createQuote(cardOffer, 1, m, 1000);
  expect(cardQuote).toMatchObject({ tender: "card", merchandise: 280, cardOff: 40, cardMinimum: 250, cashTotal: 260 });
  expect(checkQuote(cardQuote, m, 500, 500, 1000).status).toBe("ready");
  expect(checkQuote({ ...cardQuote, cashTotal: 300 }, m, 500, 500, 1000).status).toBe("terminate");
  expect(quoteChanged(cardQuote, { ...cardQuote, tender: "wallet", cardOff: 0, cashTotal: 300 })).toBe(true);
  expect(createQuote(cardOffer, 1, { ...m, tenders: ["wallet"] }, 1000)).toMatchObject({ tender: "wallet", cardOff: 0, cashTotal: 300 });
});
