import { defaultMandate } from "@/lib/mandate";
import { buildQuote, confirmDecision, markPriceChange, searchTimeoutSec } from "@/lib/quote";
import { expect, test } from "vitest";

const now = Date.parse("2026-06-01T00:00:00.000Z");

function mandate() {
  return { ...defaultMandate(), perItemLimit: 250, perOrderLimit: 400, rolling7d: 1000 };
}

function quote(cash = 200, line = 180) {
  return buildQuote({
    skuId: "balloon-cheap",
    lineTotal: line,
    merchandise: line,
    shipping: cash - line,
    cashTotal: cash,
    effectiveCost: cash,
    includeRewards: true,
    rateAsOf: "2026-01-01T00:00:00.000Z",
    mandate: mandate(),
    now,
  });
}

test("search is 15 seconds unless the mandate is stricter", () => {
  expect(searchTimeoutSec(30)).toBe(15);
  expect(searchTimeoutSec(8)).toBe(8);
});

test("a quote carries both expiry clocks", () => {
  const row = quote();
  expect(row.clarifyTimeoutSec).toBe(120);
  expect(row.quoteExpiresAt).toBeGreaterThan(now);
  expect(row.mandateExpiresAt).toBeNull();
  expect(row.currency).toBe("HKD");
  expect(row.tender).toBe("card");
});

test("a new cash total voids the confirm", () => {
  const next = markPriceChange(quote(340), 360);
  expect(next.voided).toBe(true);
  expect(confirmDecision(next, mandate(), 0, null, now)).toEqual({
    action: "clarify",
    reason: "price_change",
  });
});

test("confirm cannot override a spending limit", () => {
  expect(confirmDecision(quote(410, 200), mandate(), 0, null, now)).toEqual({
    action: "terminate",
    reason: "insufficient_budget",
  });
  expect(confirmDecision(quote(200, 400), mandate(), 0, null, now)).toEqual({
    action: "terminate",
    reason: "insufficient_budget",
  });
  expect(confirmDecision(quote(200, 180), mandate(), 900, null, now)).toEqual({
    action: "terminate",
    reason: "insufficient_budget",
  });
});

test("an unchanged quote inside the limits can be confirmed", () => {
  expect(confirmDecision(quote(200, 180), mandate(), 0, null, now)).toEqual({ action: "ok" });
});
