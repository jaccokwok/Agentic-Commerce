import { expect, test } from "vitest";
import { demoText } from "@/lib/demo";

test("the walkthrough names every replay and the extra paths", async () => {
  const text = await demoText();
  for (const name of ["happy", "clarify_timeout", "expired_mandate", "insufficient_budget", "user_injection", "poisoned_listing", "agent_surcharge", "omitted_shipping", "price_rollback", "refund_no_restore", "failed_negotiation", "timeout_after_pay", "timeout_before_pay", "counter inside the mandate", "counter over the limit", "counter instruction", "card declined, wallet books", "auto pays a unique winner", "tie asks", "flipped signature", "points is not a tender"]) {
    expect(text, name).toContain(name);
  }
  expect(text).toContain("shopper → merchant");
  expect(text).toContain("shopper → mandate");
  expect(text).toContain("shopper → auditor");
  expect(text).toContain("credentials_ok");
  expect(text).toContain("Replay overspend count: 0");
  expect(text).toContain("Mock wallet payment succeeded");
  if (process.env.SCOUT_DEMO === "1") console.log(`\n${text}`);
});
