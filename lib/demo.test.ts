import { expect, test } from "vitest";
import { demoText } from "@/lib/demo";

test("the walkthrough names every replay and the extra paths", async () => {
  const text = await demoText();
  for (const name of ["happy", "clarify_timeout", "expired_mandate", "insufficient_budget", "user_injection", "poisoned_listing", "agent_surcharge", "omitted_shipping", "price_rollback", "failed_negotiation", "timeout_after_pay", "timeout_before_pay", "counter inside the mandate", "counter over the limit", "counter instruction", "card declined, wallet books", "card discount, then wallet asks", "named card, then the next card asks", "auto pays a unique winner", "tie asks", "flipped signature", "points is not a tender"]) {
    expect(text, name).toContain(name);
  }
  expect(text).toContain("shopper → merchant");
  expect(text).toContain("shopper → mandate");
  expect(text).toContain("shopper → auditor");
  expect(text).toContain("credentials_ok");
  expect(text).toContain("Replay overspend count: 0");
  expect(text).toContain("Mock wallet payment succeeded");
  expect(text).toContain("card discount");
  expect(text).toContain("cash=260");
  expect(text).toContain("cash=300");
  expect(text).toContain("same cash");
  const named = text.slice(text.indexOf("named card, then the next card asks"));
  expect(named).toContain("cash=260");
  expect(named.indexOf("cash=260")).toBeLessThan(named.indexOf("cash=290"));
  expect(named).toContain("tender=hsbc-visa");
  expect(text).toContain("Replay overspend count: 0");
  if (process.env.SCOUT_DEMO === "1") console.log(`\n${text}`);
});
