import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TraceLog from "@/components/trace-log";
import { maskId } from "@/lib/mask-id";
import { formatRow, log, newTrace, roleFor, type Trace } from "@/lib/trace";

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
test("a ranking line shows the sku, the cash, the tender, and the score parts", () => {
  const line = formatRow({ role: "shopper", step: "rank", ruleId: "scored", reason: "hktv-card", at: 1, numbers: {
    sku: "hktv-card", cash: 260, tender: "hsbc-visa", score: 0.6033,
    parts: "relevance 0.3500, cash 0.0333, rating 0.1200, purchases 0.1000, history 0.0000, reward 0.0000",
  } });
  expect(line).toContain("sku=hktv-card");
  expect(line).toContain("cash=260");
  expect(line).toContain("tender=hsbc-visa");
  expect(line).toContain("score=0.6033");
  expect(line).toContain("relevance 0.3500");
});
test("the decision log shows the trace id and each fact on its own line", () => {
  const trace: Trace = { id: "trace-1", rows: [{ role: "shopper", step: "rank", ruleId: "scored", reason: "hktv-card", at: 1, numbers: { sku: "hktv-card", cash: 260, tender: "hsbc-visa", score: 0.6 } }] };
  const html = renderToStaticMarkup(createElement(TraceLog, { trace }));
  expect(html).toContain(maskId("trace-1"));
  expect(html).toContain(maskId("hktv-card"));
  expect(html).not.toContain("trace-1");
  expect(html).not.toContain("hktv-card");
  expect(html).toContain("cash");
  expect(html).toContain("260");
  expect(html).toContain("hsbc-visa");
});
test("a running trace is appended to the log file with its id", () => {
  mkdirSync(join(process.cwd(), "logs"), { recursive: true });
  const dir = mkdtempSync(join(process.cwd(), "logs", "scout-test-"));
  const file = join(dir, "scout.log");
  const previousTrace = process.env.SCOUT_TRACE;
  const previousLog = process.env.SCOUT_LOG;
  process.env.SCOUT_TRACE = "1";
  process.env.SCOUT_LOG = file;
  try {
    const trace = newTrace();
    log(trace, "rank", "scored", "hktv-card", { sku: "hktv-card", cash: 260, tender: "hsbc-visa" }, 1000);
    const text = readFileSync(file, "utf8");
    expect(text).toContain(trace.id);
    expect(text).toContain("sku=hktv-card");
    expect(text).toContain("cash=260");
    expect(text).toContain("tender=hsbc-visa");
  } finally {
    if (previousTrace === undefined) delete process.env.SCOUT_TRACE; else process.env.SCOUT_TRACE = previousTrace;
    if (previousLog === undefined) delete process.env.SCOUT_LOG; else process.env.SCOUT_LOG = previousLog;
    rmSync(dir, { recursive: true, force: true });
  }
});
