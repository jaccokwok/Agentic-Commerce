import { runReplays } from "@/lib/harness";
import { expect, test } from "vitest";

test("replays report zero overspends", () => {
  const report = runReplays();
  expect(report.overspendCount).toBe(0);
  for (const row of report.rows) {
    expect(row.status, row.id).toBe(row.expect);
  }
  expect(report.rows.map((row) => row.id)).toContain("pass");
  expect(report.rows.map((row) => row.id)).toContain("user_injection");
});
