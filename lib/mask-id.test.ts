import { expect, test } from "vitest";
import { maskId, maskIfId } from "@/lib/mask-id";

test("an id keeps a short prefix and suffix and hides the middle", () => {
  const vault = "vault_550e8400-e29b-41d4-a716-446655440000";
  expect(maskId(vault)).toBe(`vaul****${vault.slice(-4)}`);
  expect(maskId(vault)).not.toContain("550e8400");
  expect(maskId("did:mock:21")).toBe("di****21");
  expect(maskId("trace-1")).toBe("tr****-1");
  expect(maskIfId("sku", "party-shop-groceries-1")).toBe("part****es-1");
  expect(maskIfId("cash", "60")).toBe("60");
  expect(maskIfId("tender", "card")).toBe("card");
});
