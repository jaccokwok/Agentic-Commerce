import { expect, test } from "vitest";
import { confirmMockPurchase, runMockShoppingRequest } from "@/lib/agents";

test("shops matching marketplace offers within the requested budget", () => {
  const result = runMockShoppingRequest("red balloons under 350");

  expect(result.budget).toBe(350);
  expect(result.offers.length).toBeGreaterThan(0);
  expect(result.offers.every(offer => /balloon/i.test(offer.name) && offer.price <= 350)).toBe(true);
  expect(new Set(result.offers.map(offer => offer.platform)).size).toBeGreaterThan(1);
  expect(result.steps.map(step => step.role)).toEqual(["shopper", "mandate", "auditor", "shopper", "merchant", "payer"]);
  expect(confirmMockPurchase(result.selected!).status).toBe("paid");
});

test("stops a budget hint above the mandate limit", () => {
  const result = runMockShoppingRequest("red balloons under 5k");

  expect(result.offers).toEqual([]);
  expect(result.steps.find(step => step.role === "mandate")?.status).toBe("blocked");
});

test("returns no offer for an unknown request", () => {
  const result = runMockShoppingRequest("a moon rock under 5k");

  expect(result.selected).toBeNull();
  expect(result.offers).toEqual([]);
  expect(confirmMockPurchase(null).status).toBe("unavailable");
});

test("confirmation must fit the user's mandate and the default order cap", () => {
  const selected = runMockShoppingRequest("red balloons under 350").selected!;

  expect(confirmMockPurchase(selected, selected.price - 1).status).toBe("mandate_blocked");
  expect(confirmMockPurchase(selected, 401).status).toBe("mandate_blocked");
  expect(confirmMockPurchase(selected, selected.price).status).toBe("paid");
});