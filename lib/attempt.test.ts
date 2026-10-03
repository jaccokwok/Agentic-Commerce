import { afterEach, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "@/lib/db";
import { runAttempt, advanceAttempt, type AttemptContext, type AttemptInput } from "@/lib/attempt";
import { defaultMandate } from "@/lib/mandate";
import { parseIntent } from "@/lib/intent";
import { rawOffers } from "@/lib/catalog";
import { spent7d } from "@/lib/ledger";

const databases: DatabaseSync[] = [];
function setup() {
  const database = new DatabaseSync(":memory:"); initializeSchema(database); databases.push(database);
  const ctx: AttemptContext = { database, now: () => 1000, vaultId: "vault_test", addressId: "address_test" };
  const input: AttemptInput = { userId: 1, requestId: "request", text: "red balloons budget 350", goals: [{ ...parseIntent("red balloons").goals[0], qty: 1 }], goalId: "balloons", shares: { balloons: 350 }, budget: 350, partialAccepted: false, mandate: defaultMandate() };
  return { ctx, input };
}
afterEach(() => databases.splice(0).forEach(d => d.close()));
test("one trace covers every step; selecting never pays and manual confirm books", () => {
  const { ctx, input } = setup();
  const attempt = runAttempt(input, ctx);
  expect(attempt.status).toBe("quote");
  advanceAttempt(attempt, { type: "select", skuId: attempt.offers[1].offer.sku_id }, ctx);
  expect(spent7d(1, 1000, ctx.database)).toBe(0);
  advanceAttempt(attempt, { type: "confirm", version: attempt.quoteVersion }, ctx);
  expect(attempt.status).toBe("paid");
  expect(attempt.trace.rows.map(r => r.step)).toEqual(expect.arrayContaining(["parse", "mandate", "search", "rank", "negotiate", "quote", "pay"]));
  expect(new Set(attempt.trace.rows.map(r => r.role))).toEqual(new Set(["shopper", "mandate", "merchant", "auditor", "payer"]));
  expect(attempt.trace.rows.every(r => r.ruleId && r.numbers && r.role)).toBe(true);
});
test("tie and repeated SKU require clarification, expiry and rollback release coupons", () => {
  const { ctx, input } = setup();
  const tie = runAttempt({ ...input, merchantId: "tie-shop", mandate: { ...input.mandate, confirmMode: "auto" } }, ctx);
  expect(tie.issue).toBe("tie");
  advanceAttempt(tie, { type: "tick" }, { ...ctx, now: () => 121000 });
  expect(tie.status).toBe("terminate");
  expect(tie.coupon).toBe("unused");
  const attempt = runAttempt(input, ctx);
  advanceAttempt(attempt, { type: "confirm", version: attempt.quoteVersion }, ctx);
  const repeated = runAttempt({ ...input, requestId: "another" }, ctx);
  expect(repeated.issue).toBe("repeat");
  advanceAttempt(repeated, { type: "decline" }, ctx);
  expect(repeated.coupon).toBe("unused");
});
test("price change invalidates confirm; decline resets coupon; 410 cannot be accepted", () => {
  const { ctx, input } = setup();
  const snackInput = { ...input, text: "snacks budget 350", goals: [{ ...parseIntent("snacks").goals[0], qty: 1 }], goalId: "snacks", shares: { snacks: 400 }, budget: 400, merchantId: "demo-shop" };
  const attempt = runAttempt(snackInput, ctx);
  expect(attempt.quote?.cashTotal).toBe(340);
  const version = attempt.quoteVersion;
  advanceAttempt(attempt, { type: "price_change", cashTotal: 360 }, ctx);
  expect(attempt.status).toBe("clarify");
  advanceAttempt(attempt, { type: "confirm", version }, ctx);
  expect(spent7d(1, 1000, ctx.database)).toBe(0);
  advanceAttempt(attempt, { type: "decline" }, ctx);
  expect(attempt.coupon).toBe("unused");
  const blocked = runAttempt(snackInput, ctx);
  advanceAttempt(blocked, { type: "price_change", cashTotal: 410 }, ctx);
  advanceAttempt(blocked, { type: "confirm", version: blocked.quoteVersion }, ctx);
  expect(blocked.status).toBe("terminate");
});
test("failed negotiation falls back; search clock is injected; auto requires unique winner", () => {
  const { ctx, input } = setup();
  const catalog = rawOffers.map(o => o.sku_id === "party-shop-balloons-1" ? { ...o, stock: false } : o);
  expect(runAttempt(input, { ...ctx, catalog }).status).toBe("quote");
  let calls = 0;
  expect(runAttempt(input, { ...ctx, now: () => calls++ ? 16001 : 1000 }).status).toBe("terminate");
  const auto = runAttempt({ ...input, mandate: { ...input.mandate, confirmMode: "auto" } }, ctx);
  expect(auto.status).toBe("paid");
});
test("current catalogue terms invalidate a confirm, unresolved pay retry clarifies", () => {
  const { ctx, input } = setup();
  const a = runAttempt(input, ctx);
  const changed = { ...a.selected!, shipping: a.selected!.shipping! + 1 };
  advanceAttempt(a, { type: "confirm", version: a.quoteVersion }, { ...ctx, lookup: () => changed });
  expect(a.issue).toBe("price");
  expect(spent7d(1, 1000, ctx.database)).toBe(0);
  const unresolved = runAttempt(input, ctx);
  advanceAttempt(unresolved, { type: "confirm", version: unresolved.quoteVersion }, { ...ctx, paySimulation: "retry_failed" });
  expect(unresolved.issue).toBe("pay");
  advanceAttempt(unresolved, { type: "tick" }, { ...ctx, now: () => 121000 });
  expect(unresolved.status).toBe("terminate");
  expect(unresolved.coupon).toBe("unused");
});
test("declining mandate conflict terminates; latest authorization is checked inside booking", () => {
  const { ctx, input } = setup();
  const conflict = runAttempt({ ...input, text: "balloons budget 500" }, ctx);
  expect(conflict.issue).toBe("mandate");
  advanceAttempt(conflict, { type: "decline" }, ctx);
  expect(conflict.status).toBe("terminate");
  const a = runAttempt(input, ctx);
  advanceAttempt(a, { type: "confirm", version: a.quoteVersion }, { ...ctx, authorize: () => { throw new Error("Revoked before booking"); } });
  expect(a.status).toBe("terminate");
  expect(spent7d(1, 1000, ctx.database)).toBe(0);
});
