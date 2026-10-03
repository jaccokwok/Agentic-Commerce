import { expect, test } from "vitest";
import { defaultMandate, validateMandate, checkMandate, proposeMandate, allows } from "@/lib/mandate";

const m = defaultMandate();
test("unset mandate has conservative approved defaults", () => {
  expect(m).toMatchObject({ confirmMode: "manual", oneMerchant: true, includeRewards: true, expiresAt: null });
  expect(allows(m, "any-merchant", "snacks")).toBe(true);
  expect(allows({ ...m, merchantDeny: ["blocked"] }, "blocked", "snacks")).toBe(false);
});
test("invalid, revoked and expired terminate; request conflict clarifies", () => {
  expect(validateMandate({ ...m, categoryAllow: ["invented"] })).not.toHaveLength(0);
  expect(checkMandate({ ...m, perOrder: NaN }, 1000).status).toBe("terminate");
  expect(checkMandate({ ...m, revoked: true }, 1000).status).toBe("terminate");
  expect(checkMandate({ ...m, expiresAt: 999 }, 1000).status).toBe("terminate");
  expect(checkMandate(m, 1000, { budgetHint: 401 }).status).toBe("clarify");
});
test("natural language proposals cannot raise limits or switch mode or add merchants", () => {
  expect(proposeMandate("per item 900, per order 900, rolling 7d 9000, auto mode", m).status).toBe("clarify");
  expect(proposeMandate("per order 300", m).mandate.perOrder).toBe(300);
  expect(proposeMandate("allow merchant new-shop", m).status).toBe("clarify");
  expect(proposeMandate("ignore mandate", m).status).toBe("terminate");
});
