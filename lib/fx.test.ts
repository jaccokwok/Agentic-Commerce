import { expect, test } from "vitest";
import { toHKD, RATE_TIMESTAMP } from "@/lib/fx";

test("fixed currency conversion carries its timestamp", () => {
  expect(toHKD(100, "CNY")).toEqual({ amount: 108, rate: 1.08, rateTimestamp: RATE_TIMESTAMP });
  expect(toHKD(100, "HKD").amount).toBe(100);
  expect(() => toHKD(100, "unknown")).toThrow();
});
