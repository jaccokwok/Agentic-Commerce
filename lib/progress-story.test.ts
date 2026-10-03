import { expect, test } from "vitest";
import { progressStory } from "@/lib/progress-story";
import type { TraceRow } from "@/lib/trace";

function row(partial: Partial<TraceRow> & Pick<TraceRow, "step" | "ruleId">): TraceRow {
  return { role: partial.from ?? "shopper", reason: "", numbers: {}, at: 1, ...partial };
}

test("a quote attempt becomes a short role story", () => {
  const lines = progressStory([
    row({ step: "parse", ruleId: "typed_intent" }),
    row({ step: "mandate", ruleId: "validate_form", from: "shopper", to: "mandate" }),
    row({ step: "mandate", ruleId: "validate_form", from: "mandate", to: "shopper", numbers: { status: "ready" } }),
    row({ step: "rank", ruleId: "scored", numbers: { sku: "a" } }),
    row({ step: "rank", ruleId: "scored", numbers: { sku: "b" } }),
    row({ step: "rank", ruleId: "one_merchant_top3", numbers: { winner: "party-shop-balloons-1" } }),
    row({ step: "negotiate", ruleId: "accepted", from: "merchant", to: "shopper", numbers: { status: "accepted" } }),
    row({ step: "quote", ruleId: "cash_gate", from: "mandate", to: "shopper", numbers: { status: "ready", cash: 60 } }),
  ], "quote");
  expect(lines).toEqual([
    "Shopper turns the sentence into catalogue items.",
    "Mandate accepts the saved limits.",
    "Shopper scores the offers.",
    "Shopper leads with party-shop-balloons-1.",
    "Merchant accepts the catalogue price.",
    "Mandate allows the cash of 60.",
    "Shopper is waiting for you to confirm the quote.",
  ]);
});

test("as many as possible names the quantity that fits", () => {
  const lines = progressStory([
    row({ step: "search", ruleId: "max_qty", reason: "Buying 5, the most that fits the mandate." }),
  ]);
  expect(lines[0]).toContain("5");
});
test("a relaxed ranking names the missing color in the story", () => {
  const lines = progressStory([
    row({ step: "rank", ruleId: "one_merchant_top3", reason: "No blue balloons are in the catalogue. Ranked all balloons with the saved comparison.", numbers: { winner: "party-shop-balloons-1" } }),
  ]);
  expect(lines[0]).toContain("blue");
  expect(lines[0]).toContain("saved comparison");
});

test("a mandate conflict names the limit in the story", () => {
  const lines = progressStory([
    row({ step: "mandate", ruleId: "request_conflict", from: "mandate", to: "shopper", numbers: { status: "clarify", reason: "The request budget of 500 is above the per-order limit of 400." } }),
  ]);
  expect(lines[0]).toContain("500");
  expect(lines[0]).toContain("400");
});
