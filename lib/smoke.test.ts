import { expect, test } from "vitest";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/jwt";

test("the library alias resolves", () => {
  expect(SESSION_MAX_AGE_SECONDS).toBe(604800);
});
