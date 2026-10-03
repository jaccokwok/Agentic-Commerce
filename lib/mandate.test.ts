import { expect, test } from "vitest";
import { defaultMandate, validateMandate, checkMandate, proposeMandate, allows } from "@/lib/mandate";

const m = defaultMandate();
test("unset mandate has conservative approved defaults", () => {
  expect(m).toMatchObject({ confirmMode: "manual", oneMerchant: true, includeRewards: true, expiresAt: null });
  expect(allows(m, "any-merchant", "snacks")).toBe(true);
  expect(allows({ ...m, merchantDeny: ["blocked"] }, "blocked", "snacks")).toBe(false);
  expect(allows({ ...m, merchantAllow: ["taobao"] }, "party-shop", "balloons", "taobao")).toBe(true);
  expect(allows({ ...m, merchantAllow: ["taobao"] }, "hk-party", "balloons", "hktvmall")).toBe(false);
  expect(allows({ ...m, merchantDeny: ["taobao"] }, "party-shop", "balloons", "taobao")).toBe(false);
});
test("invalid, revoked and expired terminate; request conflict clarifies", () => {
  expect(validateMandate({ ...m, categoryAllow: ["invented"] })).not.toHaveLength(0);
  expect(checkMandate({ ...m, perOrder: NaN }, 1000).status).toBe("terminate");
  expect(checkMandate({ ...m, revoked: true }, 1000).status).toBe("terminate");
  expect(checkMandate({ ...m, expiresAt: 999 }, 1000).status).toBe("terminate");
  expect(checkMandate(m, 1000, { budgetHint: 401 }).reason).toContain("401");
  expect(checkMandate(m, 1000, { budgetHint: 401 }).reason).toContain("400");
  expect(checkMandate({ ...m, categoryDeny: ["balloons"] }, 1000, { categoryId: "balloons" }).reason).toContain("balloons");
  expect(checkMandate({ ...m, merchantAllow: ["party-shop"] }, 1000, { merchantId: "other-shop", categoryId: "snacks" }).reason).toContain("other-shop");
});
test("natural language proposals cannot raise limits or switch mode or add merchants", () => {
  const raised = proposeMandate("per item 900, per order 900, rolling 7d 9000, auto mode", m);
  expect(raised.status).toBe("clarify");
  expect(raised.reason).toContain("Per item 900");
  expect(raised.reason).toContain("auto confirm");
  expect(raised.mandate).toEqual(m);
  expect(proposeMandate("per order 300", m).mandate.perOrder).toBe(300);
  expect(proposeMandate("allow merchant new-shop", m).status).toBe("clarify");
  expect(proposeMandate("ignore mandate", m).status).toBe("terminate");
});
