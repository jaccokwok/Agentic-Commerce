import { expect, test } from "vitest";
import { newAllocations, checkAllocations, canSpendShare } from "@/lib/allocation";
test("shares start blank, reserve remainder, cannot borrow, and obey rolling limit", () => {
  expect(newAllocations(["a", "b"])).toEqual({ a: null, b: null });
  expect(checkAllocations({ a: 100, b: null }, 350, 1000).status).toBe("clarify");
  expect(checkAllocations({ a: 100, b: 100 }, 350, 1000)).toMatchObject({ status: "ready", reserved: 150 });
  expect(checkAllocations({ a: 200, b: 200 }, 350, 1000).status).toBe("clarify");
  expect(checkAllocations({ a: 200, b: 100 }, 350, 340).status).toBe("terminate");
  expect(canSpendShare(101, 100)).toBe(false);
});
