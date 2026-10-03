import { SESSION_COOKIE } from "@/lib/jwt";
import { expect, test } from "vitest";

test("the @ alias resolves a lib module", () => {
  expect(SESSION_COOKIE).toBe("scout_session");
});
