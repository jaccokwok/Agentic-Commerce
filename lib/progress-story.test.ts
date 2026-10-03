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
