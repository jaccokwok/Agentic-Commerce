import { checkShares, withinShare } from "@/lib/allocation";
import { expect, test } from "vitest";

test("blank shares block the split", () => {
  expect(checkShares(["snacks", "balloons"], { snacks: 100, balloons: null }, 350, 1000)).toEqual({
    ok: false,
    reason: "blank",
  });
});

test("assigned shares keep the unassigned remainder", () => {
  const result = checkShares(["snacks", "balloons"], { snacks: 100, balloons: 150 }, 350, 1000);
  expect(result).toEqual({ ok: true, remainder: 100 });
});

test("a goal cannot spend another goal's share", () => {
  const shares = { snacks: 100, balloons: 150 };
  expect(withinShare("balloons", 150, shares)).toBe(true);
  expect(withinShare("balloons", 160, shares)).toBe(false);
  expect(withinShare("snacks", 150, shares)).toBe(false);
});

test("shares cannot exceed the request budget or the rolling remainder", () => {
  expect(checkShares(["snacks"], { snacks: 400 }, 350, 1000)).toEqual({
    ok: false,
    reason: "over_request",
  });
  expect(checkShares(["snacks"], { snacks: 300 }, 350, 200)).toEqual({
    ok: false,
    reason: "over_rolling",
  });
});
