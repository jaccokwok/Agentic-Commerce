import { FX_AS_OF, toHkd } from "@/lib/fx";
import { expect, test } from "vitest";

test("HKD is unchanged and stamped", () => {
  const row = toHkd(180, "HKD");
  expect(row).toEqual({ hkd: 180, asOf: FX_AS_OF });
});

test("CNY uses the fixed table", () => {
  const row = toHkd(100, "CNY");
  expect(row).toEqual({ hkd: 110, asOf: FX_AS_OF });
});

test("unknown currency fails", () => {
  expect(toHkd(1, "EUR")).toEqual({ error: "unknown_currency" });
});
