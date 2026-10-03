import { expect, test } from "vitest";
import { runHarness } from "@/lib/harness";

test("replays happy and abnormal flows and reports zero overspends", async () => {
  const result = await runHarness();
  console.log(`Replay scenarios: ${result.outcomes.length}; overspend count: ${result.overspends}`);
  expect(result.outcomes.length).toBeGreaterThanOrEqual(11);
  for (const outcome of result.outcomes) expect(outcome.status, outcome.name).toBe(outcome.expected);
  expect(result.overspends).toBe(0);
  expect(result.outcomes.find(o => o.name === "poisoned_listing")?.rules).toContain("listing_injection");
  expect(result.outcomes.find(o => o.name === "agent_surcharge")?.rules).toContain("agent_surcharge");
  expect(result.outcomes.find(o => o.name === "omitted_shipping")?.rules).toContain("shipping_missing");
  expect(result.outcomes.find(o => o.name === "price_rollback")?.coupon).toBe("unused");
  expect(result.outcomes.filter(o => o.status === "paid").length).toBeGreaterThan(0);
});
