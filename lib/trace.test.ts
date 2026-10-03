import { expect, test } from "vitest";
import { roleFor } from "@/lib/trace";

test("each step belongs to one role, and a bad listing stays with the auditor", () => {
  expect(roleFor("parse", "typed_intent")).toBe("shopper");
  expect(roleFor("rank", "one_merchant_top3")).toBe("shopper");
  expect(roleFor("mandate", "mandate_valid")).toBe("mandate");
  expect(roleFor("search", "offer_limit")).toBe("mandate");
  expect(roleFor("quote", "cash_gate")).toBe("mandate");
  expect(roleFor("negotiate", "accepted")).toBe("merchant");
  expect(roleFor("search", "listing_injection")).toBe("auditor");
  expect(roleFor("search", "agent_surcharge")).toBe("auditor");
  expect(roleFor("search", "shipping_missing")).toBe("auditor");
  expect(roleFor("search", "invalid_offer")).toBe("auditor");
  expect(roleFor("audit", "credentials_ok")).toBe("auditor");
  expect(roleFor("audit", "credentials_bad")).toBe("auditor");
  expect(roleFor("pay", "mock_refs_idempotency")).toBe("payer");
});
