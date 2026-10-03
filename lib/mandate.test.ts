import { applyPreference, defaultMandate, merchantAllowed, validateMandate } from "@/lib/mandate";
import { expect, test } from "vitest";

const now = Date.parse("2026-06-01T00:00:00.000Z");

function ready() {
  return {
    ...defaultMandate(),
    perItemLimit: 250,
    perOrderLimit: 400,
    rolling7d: 1000,
  };
}

test("an unset mandate uses the release defaults", () => {
  const mandate = defaultMandate();
  expect(mandate.confirmMode).toBe("manual");
  expect(mandate.oneMerchantPerOrder).toBe(true);
  expect(mandate.includeRewards).toBe(true);
  expect(mandate.expiresAt).toBeNull();
  expect(mandate.revoked).toBe(false);
});

test("an empty merchant allow list means everyone except the deny list", () => {
  const mandate = ready();
  expect(merchantAllowed(mandate, "hktv-m1")).toBe(true);
  expect(merchantAllowed({ ...mandate, merchantDeny: ["hktv-m1"] }, "hktv-m1")).toBe(false);
  expect(
    merchantAllowed({ ...mandate, merchantAllow: ["tb-shop-9"] }, "hktv-m1"),
  ).toBe(false);
});

test("an unknown category invalidates the mandate", () => {
  const result = validateMandate({ ...ready(), categoryAllow: ["spaceships"] }, now);
  expect(result).toEqual({ ok: false, reason: "invalid" });
});

test("expired and revoked mandates terminate", () => {
  expect(validateMandate({ ...ready(), expiresAt: now - 1 }, now)).toEqual({
    ok: false,
    reason: "expired",
  });
  expect(validateMandate({ ...ready(), revoked: true }, now)).toEqual({
    ok: false,
    reason: "revoked",
  });
});

test("a preference cannot raise a limit", () => {
  const mandate = ready();
  const raised = applyPreference(mandate, { perOrderLimit: 900 });
  expect(raised.action).toBe("clarify");
  expect(raised.mandate.perOrderLimit).toBe(400);
  const tighter = applyPreference(mandate, { perOrderLimit: 300 });
  expect(tighter.action).toBe("ok");
  expect(tighter.mandate.perOrderLimit).toBe(300);
});
