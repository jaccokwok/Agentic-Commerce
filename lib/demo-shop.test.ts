import { afterEach, expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createUser, initializeSchema } from "@/lib/db";
import { authorizeDemo, startDemo, actDemo, readDemo } from "@/lib/demo-shop";
import { spent7d } from "@/lib/ledger";
import { cents } from "@/lib/money";
import type { ShoppingIntent } from "@/lib/shopper-ai";
import { DEMO_CATALOG } from "@/lib/demo-catalog";

const databases: DatabaseSync[] = [];
async function setup() {
  const db = new DatabaseSync(":memory:"); initializeSchema(db); databases.push(db);
  const user = await createUser("demo@example.com", "Demo", "test", db);
  authorizeDemo(user.id, { address: "香港演示地址", hours: 24, limit: 1500, weekly: 5000, tender: "card" }, 1000, db);
  return { db, user, ctx: { db, now: () => 1000, understand: async (): Promise<ShoppingIntent> => ({ kind: "products", goals: [{ category: "milk", qty: 1, preference: "" }], guests: null, budget: null, question: null }) } };
}
afterEach(() => databases.splice(0).forEach(d => d.close()));
test("milk quotes one box; no payment before final confirmation; repeat confirmation books once", async () => {
  const { user, ctx, db } = await setup();
  const s = await startDemo(user.id, "我要买牛奶", ctx);
  expect(s.status).toBe("quote"); expect(s.quote?.total).toBe(32); expect(spent7d(user.id, 1000, db)).toBe(0);
  const paid = actDemo(user.id, s.id, { type: "confirm", version: s.version }, ctx);
  expect(paid.status).toBe("paid"); expect(paid.orderId).toBeTruthy();
  expect(actDemo(user.id, s.id, { type: "confirm", version: s.version }, ctx).orderId).toBe(paid.orderId);
  expect(spent7d(user.id, 1000, db)).toBe(32);
  expect(readDemo(user.id, db).request?.status).toBe("paid");
});
test("quantity changes void old quote; ownership and authorization expiry checked on server", async () => {
  const { user, ctx, db } = await setup(); const s = await startDemo(user.id, "一盒奶", ctx);
  const changed = actDemo(user.id, s.id, { type: "quantity", productId: "milk", qty: 2 }, ctx);
  expect(changed.quote?.total).toBe(56);
  expect(() => actDemo(user.id, s.id, { type: "confirm", version: s.version }, ctx)).toThrow("报价已更新");
  expect(() => actDemo(999, s.id, { type: "confirm", version: changed.version }, ctx)).toThrow();
  expect(actDemo(user.id, s.id, { type: "confirm", version: changed.version }, { ...ctx, now: () => 1000 + 24 * 3600000 }).status).toBe("blocked");
  expect(spent7d(user.id, 1000, db)).toBe(0);
});
test("108 cup requires request-budget consent AND final payment; consent never overrides authorization", async () => {
  const { user, ctx, db } = await setup();
  const cup = { ...ctx, understand: async (): Promise<ShoppingIntent> => ({ kind: "products", goals: [{ category: "cup", qty: 1, preference: "portable" }], guests: null, budget: 100, question: null }) };
  const s = await startDemo(user.id, "a travel cup about HKD 100", cup);
  expect(s.status).toBe("budget"); expect(s.quote?.total).toBe(108);
  expect(() => actDemo(user.id, s.id, { type: "confirm", version: s.version }, cup)).toThrow();
  const consent = actDemo(user.id, s.id, { type: "budget" }, cup);
  expect(consent.status).toBe("quote"); expect(spent7d(user.id, 1000, db)).toBe(0);
  expect(actDemo(user.id, s.id, { type: "confirm", version: consent.version }, cup).status).toBe("paid");
  authorizeDemo(user.id, { address: "香港地址", hours: 24, limit: 100, weekly: 5000, tender: "card" }, 1000, db);
  const blocked = await startDemo(user.id, "a portable cup around 100", cup);
  expect(blocked.status).toBe("blocked"); expect(() => actDemo(user.id, blocked.id, { type: "budget" }, cup)).toThrow();
});
test("party asks guest count; continuation automatically allocates and pays one cross-merchant basket", async () => {
  const { user, ctx, db } = await setup();
  let calls = 0;
  const party = { ...ctx, understand: async (_text: string, previous?: ShoppingIntent): Promise<ShoppingIntent> => {
    calls++; if (calls === 2) expect(previous?.budget).toBe(1000);
    return { kind: "party", goals: [], guests: calls === 1 ? null : 12, budget: 1000, question: null };
  } };
  const s = await startDemo(user.id, "派对必备预算1000", party);
  expect(s.status).toBe("clarify"); expect(s.reason).toContain("人数");
  const q = await startDemo(user.id, "12人", party, s.id);
  expect(q.status).toBe("quote"); expect(q.quote?.merchants).toHaveLength(2); expect(q.quote?.total).toBe(388);
  expect(Object.values(q.shares!).reduce((a, b) => a + b, 0)).toBe(1000);
  expect(q.lines.find(l => l.productId === "snacks")?.qty).toBe(3);
  expect(spent7d(user.id, 1000, db)).toBe(0);
  const paid = actDemo(user.id, q.id, { type: "confirm", version: q.version }, party);
  expect(paid.status).toBe("paid"); expect(spent7d(user.id, 1000, db)).toBe(388);
  expect(db.prepare("SELECT COUNT(*) AS n FROM orders").get()?.n).toBe(1);
  expect(db.prepare("SELECT COUNT(*) AS n FROM demo_merchant_orders").get()?.n).toBe(2);
});
test("non-party multiple products require explicit shares including delivery", async () => {
  const { user, ctx } = await setup();
  const multi = { ...ctx, understand: async (): Promise<ShoppingIntent> => ({ kind: "products", goals: [{ category: "milk", qty: 1, preference: "" }, { category: "cup", qty: 1, preference: "" }], guests: null, budget: 200, question: null }) };
  const s = await startDemo(user.id, "milk and a cup", multi);
  expect(s.status).toBe("clarify"); expect(s.quote?.total).toBe(140);
  expect(() => actDemo(user.id, s.id, { type: "shares", shares: { milk: 32, cup: 100 } }, multi)).toThrow();
  const q = actDemo(user.id, s.id, { type: "shares", shares: { milk: 40, cup: 120 } }, multi);
  expect(q.status).toBe("quote");
});
test("one unavailable product pauses the ENTIRE basket; explicit substitute needs a new final confirmation", async () => {
  const { user, ctx, db } = await setup();
  const stock = { ...ctx, understand: async (): Promise<ShoppingIntent> => ({ kind: "products", goals: [{ category: "milk", qty: 1, preference: "无乳糖" }, { category: "cup", qty: 1, preference: "portable" }], guests: null, budget: 200, question: null }) };
  const s = await startDemo(user.id, "无乳糖奶和便携杯", stock);
  expect(s.status).toBe("stock"); expect(s.alternatives[0].replacementId).toBe("milk-lactose-alt");
  expect(() => actDemo(user.id, s.id, { type: "confirm", version: s.version }, stock)).toThrow();
  expect(spent7d(user.id, 1000, db)).toBe(0);
  const replacement = actDemo(user.id, s.id, { type: "substitute" }, stock);
  expect(replacement.version).toBeGreaterThan(s.version); expect(replacement.quote?.total).toBe(150);
  const quote = actDemo(user.id, s.id, { type: "shares", shares: { milk: 50, cup: 150 } }, stock);
  expect(spent7d(user.id, 1000, db)).toBe(0);
  expect(actDemo(user.id, s.id, { type: "confirm", version: quote.version }, stock).status).toBe("paid");
  expect(spent7d(user.id, 1000, db)).toBe(150);
});
test("inventory and price are rechecked at final confirmation; no partial purchase", async () => {
  const { user, ctx, db } = await setup(); const s = await startDemo(user.id, "牛奶", ctx);
  const price = { ...ctx, catalog: DEMO_CATALOG.map(p => p.id === "milk" ? { ...p, price: 25 } : p) };
  const revised = actDemo(user.id, s.id, { type: "confirm", version: s.version }, price);
  expect(revised.status).toBe("quote"); expect(revised.version).toBeGreaterThan(s.version); expect(revised.quote?.total).toBe(33);
  const missing = { ...price, catalog: price.catalog.map(p => p.id === "milk" ? { ...p, stock: 0 } : p) };
  expect(actDemo(user.id, s.id, { type: "confirm", version: revised.version }, missing).status).toBe("stock");
  expect(spent7d(user.id, 1000, db)).toBe(0);
});
test("quote expiry refreshes before paying; failure never shows successful order", async () => {
  const { user, ctx, db } = await setup(); const s = await startDemo(user.id, "牛奶", ctx);
  const expired = { ...ctx, now: () => 302000 };
  const refreshed = actDemo(user.id, s.id, { type: "confirm", version: s.version }, expired);
  expect(refreshed.status).toBe("quote"); expect(refreshed.version).toBeGreaterThan(s.version);
  expect(spent7d(user.id, 302000, db)).toBe(0);
  const failed = actDemo(user.id, s.id, { type: "confirm", version: refreshed.version }, { ...expired, simulation: "failed" });
  expect(failed.status).toBe("error"); expect(failed.orderId).toBeNull(); expect(spent7d(user.id, 302000, db)).toBe(0);
});
test("AI failure is retryable and never replaced with a hardcoded intent; ambiguous and unknown products clarify", async () => {
  const { user, ctx } = await setup();
  const failed = await startDemo(user.id, "milk", { ...ctx, understand: async () => { throw new Error("AI service offline"); } });
  expect(failed.status).toBe("error"); expect(failed.intent).toBeNull();
  expect((await startDemo(user.id, "milk", ctx, failed.id)).status).toBe("quote");
  const unsupported = await startDemo(user.id, "a laptop", { ...ctx, understand: async () => ({ kind: "unsupported", goals: [], guests: null, budget: null, question: null }) });
  expect(unsupported.status).toBe("clarify"); expect(unsupported.quote).toBeNull();
  const unknown = await startDemo(user.id, "special milk", { ...ctx, understand: async () => ({ kind: "products", goals: [{ category: "milk", qty: 1, preference: "unknown brand" }], guests: null, budget: null, question: null }) });
  expect(unknown.status).toBe("clarify"); expect(unknown.reason).toContain("偏好");
  const vague = await startDemo(user.id, "some snacks", { ...ctx, understand: async () => ({ kind: "products", goals: [{ category: "snacks", qty: null, preference: "" }], guests: null, budget: null, question: null }) });
  expect(vague.reason).toContain("数量");
});
test("combined weekly spend cannot bypass a limit with multiple baskets; reauthorization invalidates earlier quotes", async () => {
  const { user, ctx, db } = await setup();
  authorizeDemo(user.id, { address: "香港地址", hours: 24, limit: 1500, weekly: 50, tender: "card" }, 1000, db);
  const a = await startDemo(user.id, "milk", ctx); const b = await startDemo(user.id, "milk", ctx);
  expect(actDemo(user.id, a.id, { type: "confirm", version: a.version }, ctx).status).toBe("paid");
  expect(actDemo(user.id, b.id, { type: "confirm", version: b.version }, ctx).status).toBe("blocked");
  expect(spent7d(user.id, 1000, db)).toBe(32);
  authorizeDemo(user.id, { address: "香港地址", hours: 24, limit: 1500, weekly: 5000, tender: "card" }, 1000, db);
  expect(actDemo(user.id, b.id, { type: "quantity", productId: "milk", qty: 1 }, ctx).status).toBe("blocked");
});
test("unfinished clarifications time out; cancelled baskets cannot pay; invalid API values rejected", async () => {
  const { user, ctx, db } = await setup();
  expect(() => authorizeDemo(user.id, { address: "x", hours: 24, limit: -1, weekly: 5000, tender: "card" }, 1000, db)).toThrow();
  await expect(startDemo(user.id, "", ctx)).rejects.toThrow();
  const q = await startDemo(user.id, "milk", ctx);
  expect(() => actDemo(user.id, q.id, { type: "quantity", productId: "invented", qty: 1 }, ctx)).toThrow();
  expect(() => actDemo(user.id, q.id, { type: "quantity", productId: "milk", qty: 0 }, ctx)).toThrow();
  expect(() => actDemo(user.id, q.id, { type: "substitute" }, ctx)).toThrow();
  expect(() => actDemo(user.id, q.id, { type: "shares", shares: {} }, ctx)).toThrow();
  expect(actDemo(user.id, q.id, { type: "cancel" }, ctx).status).toBe("cancelled");
  expect(() => actDemo(user.id, q.id, { type: "confirm", version: q.version }, ctx)).toThrow();
  const party = { ...ctx, understand: async (): Promise<ShoppingIntent> => ({ kind: "party", goals: [], guests: null, budget: 1000, question: null }) };
  const clarify = await startDemo(user.id, "party", party);
  expect((await startDemo(user.id, "12 people", { ...party, now: () => 122000 }, clarify.id)).status).toBe("cancelled");
});
test("cancellation while AI is in flight cannot be overwritten by its late response", async () => {
  const { user, ctx, db } = await setup();
  let finish: (intent: ShoppingIntent) => void = () => { throw new Error("AI not started"); };
  const pending = startDemo(user.id, "milk", { ...ctx, understand: () => new Promise(resolve => { finish = resolve; }) });
  const active = readDemo(user.id, db).request!;
  expect(active.status).toBe("understanding");
  actDemo(user.id, active.id, { type: "cancel" }, ctx);
  finish({ kind: "products", goals: [{ category: "milk", qty: 1, preference: "" }], guests: null, budget: null, question: null });
  expect((await pending).status).toBe("cancelled"); expect(readDemo(user.id, db).request?.quote).toBeNull();
});
test("party preserves explicit extra goals and unresolved questions instead of silently dropping them", async () => {
  const { user, ctx } = await setup();
  const extra = { ...ctx, understand: async (): Promise<ShoppingIntent> => ({ kind: "party", goals: [{ category: "milk", qty: 2, preference: "低脂" }], guests: 12, budget: 1000, question: null }) };
  const q = await startDemo(user.id, "12人的派对，也要两盒低脂奶", extra);
  expect(q.lines).toContainEqual({ productId: "milk-low", qty: 2 });
  expect(q.quote?.total).toBe(440); expect(Object.values(q.shares!).reduce((a, b) => a + cents(b), 0)).toBe(100000);
  const unclear = await startDemo(user.id, "12人派对", { ...extra, understand: async () => ({ kind: "party", goals: [], guests: 12, budget: 1000, question: "需要哪种偏好？" }) });
  expect(unclear.status).toBe("clarify"); expect(unclear.quote).toBeNull();
});
