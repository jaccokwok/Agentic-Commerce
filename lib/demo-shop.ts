import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb, type UserRow } from "@/lib/db";
import { DEMO_CATALOG, type DemoProduct } from "@/lib/demo-catalog";
import { understandShopping, validateIntent, type ShoppingIntent } from "@/lib/shopper-ai";
import { cents } from "@/lib/money";
import { defaultMandate } from "@/lib/mandate";
import { mockPay } from "@/lib/pay";
import { spent7d, receipt } from "@/lib/ledger";

export type DemoAuthorization = { id: string; address: string; expiresAt: number; limit: number; weekly: number; tender: "card" };
export type Role = "shopper" | "mandate" | "auditor" | "merchant" | "payer";
export type RoleRecord = { from: Role; to: Role; status: "running" | "passed" | "paused" | "failed"; summary: string; request: object; result: object; at: number };
export type BasketQuote = { merchants: { name: string; items: { productId: string; name: string; qty: number; unit: number; line: number }[]; merchandise: number; shipping: number }[]; total: number; currency: "HKD"; expiresAt: number };
export type DemoRequest = { source: "fixture" | "ai"; id: string; userId: number; authId: string; text: string; intent: ShoppingIntent | null; status: "understanding" | "clarify" | "budget" | "stock" | "blocked" | "quote" | "paid" | "error" | "cancelled"; reason: string; lines: { productId: string; qty: number }[]; shares: Record<string, number> | null; budget: number | null; quote: BasketQuote | null; version: number; records: RoleRecord[]; alternatives: { productId: string; replacementId: string; name: string }[]; orderId: string | null; clarifyUntil: number; };
export type DemoContext = { db: DatabaseSync; now: () => number; understand: typeof understandShopping; source?: "fixture" | "ai"; catalog?: DemoProduct[]; simulation?: "failed" };
export type DemoEvent = { type: "confirm"; version: number } | { type: "quantity"; productId: string; qty: number } | { type: "budget" } | { type: "substitute" } | { type: "shares"; shares: Record<string, number> } | { type: "cancel" };
export const demoContext = (): DemoContext => ({ db: getDb(), now: () => Date.now(), understand: understandShopping, source: process.env.SCOUT_AI_MODEL === "browser-fixture" ? "fixture" : "ai" });

function schema(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS demo_authorizations (user_id INTEGER PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS demo_requests (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS demo_merchant_orders (id TEXT PRIMARY KEY, basket_id TEXT NOT NULL, user_id INTEGER NOT NULL, merchant TEXT NOT NULL, payload TEXT NOT NULL);");
}
function user(userId: number, db: DatabaseSync) {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!u) throw new Error("请先登录再使用演示付款。"); return u;
}
function authorization(userId: number, db: DatabaseSync): DemoAuthorization | null {
  schema(db); const row = db.prepare("SELECT payload FROM demo_authorizations WHERE user_id = ?").get(userId);
  return row ? JSON.parse(String(row.payload)) : null;
}
function load(userId: number, id: string, db: DatabaseSync): DemoRequest {
  schema(db); const row = db.prepare("SELECT payload FROM demo_requests WHERE id = ? AND user_id = ?").get(id, userId);
  if (!row) throw new Error("找不到属于你的购物篮。"); return JSON.parse(String(row.payload));
}
function save(s: DemoRequest, ctx: DemoContext) {
  ctx.db.prepare("INSERT INTO demo_requests (id,user_id,payload,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload").run(s.id, s.userId, JSON.stringify(s), ctx.now()); return s;
}
function record(s: DemoRequest, ctx: DemoContext, from: Role, to: Role, status: RoleRecord["status"], summary: string, request: object, result: object) {
  s.records.push({ from, to, status, summary, request, result, at: ctx.now() });
}
export function readDemo(userId: number, db = getDb()) {
  user(userId, db); const auth = authorization(userId, db);
  const row = db.prepare("SELECT payload FROM demo_requests WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1").get(userId);
  return { authorization: auth, request: row ? JSON.parse(String(row.payload)) as DemoRequest : null, spent: spent7d(userId, Date.now(), db) };
}
export function authorizeDemo(userId: number, input: { address: string; hours: number; limit: number; weekly: number; tender: string }, now: number, db = getDb()): DemoAuthorization {
  user(userId, db); schema(db);
  if (!input || typeof input.address !== "string" || input.address.trim().length < 3 || input.address.length > 300 || input.tender !== "card" ||
    ![1, 24, 168].includes(input.hours) || ![input.limit, input.weekly].every(v => Number.isFinite(v) && v > 0 && v <= 100000)) throw new Error("请填写地址、有效期和正数额度；仅支持演示卡。");
  const auth: DemoAuthorization = { id: randomUUID(), address: input.address.trim(), expiresAt: now + input.hours * 3600000, limit: cents(input.limit) / 100, weekly: cents(input.weekly) / 100, tender: "card" };
  db.prepare("INSERT INTO demo_authorizations (user_id,payload) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload").run(userId, JSON.stringify(auth)); return auth;
}
function checkAuthorization(s: DemoRequest, ctx: DemoContext) {
  const a = authorization(s.userId, ctx.db);
  const valid = a && a.id === s.authId && ctx.now() < a.expiresAt;
  record(s, ctx, "shopper", "mandate", valid ? "passed" : "failed", valid ? "授权有效；整篮检查单次与周额度。" : "授权过期或已更新，请重新授权并提交需求。", { authorizationId: s.authId }, { valid, limit: a?.limit, weekly: a?.weekly });
  if (!valid) { s.status = "blocked"; s.reason = "授权过期或已更新，请重新授权并提交需求。"; return null; } return a;
}
function catalog(ctx: DemoContext) { return ctx.catalog ?? DEMO_CATALOG; }
function chooseProducts(s: DemoRequest, ctx: DemoContext) {
  const intent = s.intent!;
  if (intent.kind === "party") {
    if (intent.guests === null) { s.status = "clarify"; s.reason = "派对预计多少人？请回复人数，我会按包装数量安排商品和预算份额。"; return; }
    const extra = intent.goals.filter(g => !["snacks", "balloons", "tableware"].includes(g.category));
    intent.goals = [
      { category: "snacks", qty: Math.ceil(intent.guests / 4), preference: "" },
      { category: "balloons", qty: Math.ceil(intent.guests / 20), preference: intent.goals.find(g => g.category === "balloons")?.preference ?? "" },
      { category: "tableware", qty: Math.ceil(intent.guests / 10), preference: "" },
      ...extra,
    ];
  }
  if (intent.kind === "unsupported" || !intent.goals.length) { s.status = "clarify"; s.reason = "固定目录支持牛奶、便携杯、零食、气球和餐具。请修改需求。"; return; }
  if (intent.question || intent.goals.some(g => g.qty === null && !["milk", "cup"].includes(g.category))) {
    s.status = "clarify"; s.reason = intent.question ?? "需要多少包或套？请补充数量。"; return;
  }
  s.lines = [];
  for (const g of intent.goals) {
    const options = catalog(ctx).filter(p => p.category === g.category);
    const preference = g.preference.toLowerCase();
    const p = options.find(p => p.tags.some(t => preference.includes(t))) ?? (preference ? undefined : options[0]);
    if (!p) { s.status = "clarify"; s.reason = `目录内没有匹配「${g.preference}」的商品，请修改偏好。`; return; }
    s.lines.push({ productId: p.id, qty: g.qty ?? 1 });
  }
  prepareQuote(s, ctx);
}
function buildQuote(s: DemoRequest, ctx: DemoContext): BasketQuote {
  const merchants: BasketQuote["merchants"] = [];
  for (const line of s.lines) {
    const p = catalog(ctx).find(p => p.id === line.productId);
    if (!p || !Number.isSafeInteger(line.qty) || line.qty < 1 || line.qty > 1000 || !Number.isFinite(p.price) || p.price < 0 || !Number.isFinite(p.shipping) || p.shipping < 0) throw new Error("目录商品、数量或运费无效，整篮未付款。");
    let m = merchants.find(m => m.name === p.merchant);
    if (!m) { m = { name: p.merchant, items: [], merchandise: 0, shipping: p.shipping }; merchants.push(m); }
    m.items.push({ productId: p.id, name: p.name, qty: line.qty, unit: p.price, line: cents(p.price) * line.qty / 100 });
    m.merchandise = (cents(m.merchandise) + cents(p.price) * line.qty) / 100;
    m.shipping = Math.max(m.shipping, p.shipping);
  }
  return { merchants, total: merchants.reduce((sum, m) => sum + cents(m.merchandise) + cents(m.shipping), 0) / 100, currency: "HKD", expiresAt: ctx.now() + 5 * 60000 };
}
function categoryCosts(q: BasketQuote, ctx: DemoContext) {
  const costs: Record<string, number> = {};
  for (const m of q.merchants) {
    let delivery = cents(m.shipping);
    m.items.forEach((item, i) => {
      const category = catalog(ctx).find(p => p.id === item.productId)!.category;
      const share = i === m.items.length - 1 ? delivery : Math.floor(cents(m.shipping) / m.items.length);
      delivery -= share; costs[category] = (cents(costs[category] ?? 0) + cents(item.line) + share) / 100;
    });
  }
  return costs;
}
function autoShares(s: DemoRequest, q: BasketQuote, ctx: DemoContext, budget: number) {
  const costs = categoryCosts(q, ctx);
  let remainder = Math.max(0, cents(budget) - cents(q.total));
  const categories = Object.keys(costs); const reserve = remainder;
  const weightTotal = categories.reduce((sum, category) => sum + (category === "snacks" ? 3 : 1), 0);
  categories.forEach((category, i) => {
    const extra = i === categories.length - 1 ? remainder : Math.floor(reserve * (category === "snacks" ? 3 : 1) / weightTotal);
    remainder -= extra; costs[category] = (cents(costs[category]) + extra) / 100;
  });
  s.shares = costs;
  record(s, ctx, "shopper", "mandate", "passed", "按人数与包装数量安排派对商品，自动分配包含运费的预算份额。", { guests: s.intent!.guests, budget }, { shares: costs });
}
function prepareQuote(s: DemoRequest, ctx: DemoContext) {
  s.quote = null; s.version++; s.alternatives = [];
  const auth = checkAuthorization(s, ctx); if (!auth) return s;
  const q = buildQuote(s, ctx); s.quote = q;
  const unavailable = s.lines.filter(l => (catalog(ctx).find(p => p.id === l.productId)?.stock ?? 0) < l.qty);
  for (const l of unavailable) {
    const p = catalog(ctx).find(p => p.id === l.productId)!;
    const alt = catalog(ctx).find(other => other.id !== p.id && other.category === p.category && other.stock >= l.qty && p.tags.every(t => other.tags.includes(t)));
    if (alt) s.alternatives.push({ productId: p.id, replacementId: alt.id, name: alt.name });
  }
  record(s, ctx, "shopper", "merchant", unavailable.length ? "paused" : "passed", unavailable.length ? "商家报告缺货，暂停整篮。" : "各商家已提供商品金额、库存和运费。", { lines: s.lines }, { merchants: q.merchants, unavailable });
  if (unavailable.length) { s.status = "stock"; s.reason = "有商品缺货，整篮暂停；接受替代后会生成新报价，再确认付款。"; return s; }
  const remaining = auth.weekly - spent7d(s.userId, ctx.now(), ctx.db);
  const allowed = q.total <= auth.limit && q.total <= remaining;
  record(s, ctx, "merchant", "auditor", allowed ? "passed" : "paused", allowed ? "商品、各商家运费与整篮合计已核对。" : "整篮超出授权额度，不能付款。", { quote: q }, { cashTotal: q.total, limit: auth.limit, remaining });
  if (!allowed) { s.status = "blocked"; s.reason = `整篮 HK$${q.total} 超过单次授权 HK$${auth.limit} 或周剩余额度 HK$${Math.max(0, remaining)}。请修改数量或单独更新授权。`; return s; }
  if (s.budget !== null && q.total > s.budget) {
    s.status = "budget"; s.reason = `含运费报价 HK$${q.total}，超过本次预算 HK$${s.budget}。是否提高本次预算到 HK$${q.total}？这不会提高授权额度，也不会付款。`;
    record(s, ctx, "shopper", "mandate", "paused", "整篮超过本次预算，等待用户同意；授权未扩大。", { requestBudget: s.budget, total: q.total }, { needsConsent: true }); return s;
  }
  if (s.intent!.kind === "party") autoShares(s, q, ctx, s.budget ?? auth.limit);
  else if (s.lines.length > 1) {
    const costs = categoryCosts(q, ctx);
    if (!s.shares || Object.keys(s.shares).length !== Object.keys(costs).length || Object.entries(costs).some(([category, cost]) => !Number.isFinite(s.shares![category]) || s.shares![category] < cost) || Object.values(s.shares).reduce((a, b) => a + cents(b), 0) > cents(s.budget ?? auth.limit)) {
      s.status = "clarify"; s.reason = "请为每个商品目标分配包含运费的预算份额；不能借用其他目标的份额。"; return s;
    }
  }
  s.status = "quote"; s.reason = "请确认完整报价；只有下方明确确认才会模拟付款。"; return s;
}
export async function startDemo(userId: number, text: string, ctx: DemoContext, existingId?: string) {
  user(userId, ctx.db); const auth = authorization(userId, ctx.db);
  if (!auth || ctx.now() >= auth.expiresAt) throw new Error("请先确认有效授权。");
  if (typeof text !== "string" || !text.trim() || text.length > 2000) throw new Error("请填写 1–2000 字的购物需求。");
  const s: DemoRequest = existingId ? load(userId, existingId, ctx.db) : { source: ctx.source ?? "ai", id: randomUUID(), userId, authId: auth.id, text, intent: null, status: "understanding", reason: "Shopper AI 正在理解需求。", lines: [], shares: null, budget: null, quote: null, version: 0, records: [], alternatives: [], orderId: null, clarifyUntil: ctx.now() + 120000 };
  if (existingId && !["clarify", "error"].includes(s.status)) throw new Error("当前购物篮不能接续澄清。");
  if (existingId && ctx.now() >= s.clarifyUntil) { s.status = "cancelled"; s.reason = "追问已超时，整篮未付款。请重新提交需求。"; return save(s, ctx); }
  if (s.authId !== auth.id) throw new Error("授权已更新，请重新提交需求。");
  s.status = "understanding"; s.quote = null; s.text = text;
  record(s, ctx, "shopper", "shopper", "running", "Shopper 正在理解输入；尚未执行付款。", { input: text, previous: s.intent }, {}); save(s, ctx);
  try {
    const intent = validateIntent(await ctx.understand(text, s.intent ?? undefined));
    const current = load(userId, s.id, ctx.db);
    if (current.status !== "understanding") return current;
    s.intent = intent; s.budget = s.intent.budget;
    record(s, ctx, "shopper", "shopper", "passed", "Shopper 已提出结构化商品需求，由程序选择目录并检查。", { input: text }, { intent: s.intent });
    s.clarifyUntil = ctx.now() + 120000;
    if (!checkAuthorization(s, ctx)) return save(s, ctx);
    chooseProducts(s, ctx);
  } catch (error) {
    const current = load(userId, s.id, ctx.db); if (current.status !== "understanding") return current;
    s.status = "error"; s.reason = error instanceof Error ? error.message : "AI 理解失败，请重试。"; record(s, ctx, "shopper", "shopper", "failed", s.reason, {}, {});
  }
  return save(s, ctx);
}
export function actDemo(userId: number, id: string, event: DemoEvent, ctx: DemoContext) {
  const u = user(userId, ctx.db); const s = load(userId, id, ctx.db);
  const existing = receipt(s.id, ctx.db);
  if (existing) { s.status = "paid"; s.orderId = `SCOUT-${s.id}`; s.reason = "已核对同一笔模拟付款，没有重复记账。"; return save(s, ctx); }
  if (s.status === "paid") return s;
  if (!event || !["confirm", "quantity", "budget", "substitute", "shares", "cancel"].includes(event.type)) throw new Error("无效购物操作。");
  if (event.type === "cancel") { s.status = "cancelled"; s.quote = null; s.reason = "已取消，整篮未付款。"; return save(s, ctx); }
  if (["cancelled", "understanding", "error"].includes(s.status)) throw new Error("请重新提交需求。");
  const auth = checkAuthorization(s, ctx); if (!auth) return save(s, ctx);
  if (["budget", "stock", "clarify"].includes(s.status) && ctx.now() >= s.clarifyUntil) { s.status = "cancelled"; s.reason = "追问超时，整篮未付款。"; return save(s, ctx); }
  if (event.type === "quantity") {
    const line = s.lines.find(l => l.productId === event.productId);
    if (!line || !Number.isSafeInteger(event.qty) || event.qty < 1 || event.qty > 1000) throw new Error("数量必须是 1–1000 的整数。");
    line.qty = event.qty; prepareQuote(s, ctx); return save(s, ctx);
  }
  if (event.type === "budget") {
    if (s.status !== "budget" || !s.quote) throw new Error("没有待确认的预算变更。");
    s.budget = s.quote.total; record(s, ctx, "shopper", "mandate", "passed", "用户仅同意提高本次预算，仍须确认最终付款。", { proposedBudget: s.budget }, { approved: true });
    prepareQuote(s, ctx); return save(s, ctx);
  }
  if (event.type === "substitute") {
    if (s.status !== "stock" || !s.alternatives.length) throw new Error("没有可接受的替代商品。");
    s.lines = s.lines.map(l => ({ ...l, productId: s.alternatives.find(a => a.productId === l.productId)?.replacementId ?? l.productId }));
    prepareQuote(s, ctx); return save(s, ctx);
  }
  if (event.type === "shares") {
    if (!s.quote || s.lines.length < 2 || s.intent!.kind === "party" || !event.shares || typeof event.shares !== "object") throw new Error("当前需求无需手动分配预算。");
    const costs = categoryCosts(s.quote, ctx);
    if (Object.keys(event.shares).length !== Object.keys(costs).length || Object.entries(costs).some(([key, cost]) => !Number.isFinite(event.shares[key]) || event.shares[key] < cost) || Object.values(event.shares).reduce((a, b) => a + cents(b), 0) > cents(s.budget ?? auth.limit)) throw new Error("每项目份额须覆盖商品和运费，合计不能超过本次预算或授权。");
    s.shares = event.shares; prepareQuote(s, ctx); return save(s, ctx);
  }
  if (s.status !== "quote" || !s.quote) throw new Error("整篮尚未通过检查，不能付款。");
  if (event.version !== s.version) throw new Error("报价已更新，请确认最新完整报价。");
  if (ctx.now() >= s.quote.expiresAt) { prepareQuote(s, ctx); s.reason = "报价已过期，已生成新报价，请重新确认。"; return save(s, ctx); }
  const current = buildQuote(s, ctx);
  const { expiresAt: oldExpiry, ...old } = s.quote;
  const { expiresAt: newExpiry, ...latest } = current;
  if (JSON.stringify(old) !== JSON.stringify(latest) || oldExpiry <= ctx.now() || newExpiry <= ctx.now()) { prepareQuote(s, ctx); if (s.status === "quote") s.reason = "报价有变化，请重新确认最新完整报价。"; return save(s, ctx); }
  const version = s.version; prepareQuote(s, ctx); s.version = version;
  if (s.status !== "quote") return save(s, ctx);
  const mandate = { ...defaultMandate(), perItem: auth.limit, perOrder: auth.limit, rolling7d: auth.weekly, expiresAt: auth.expiresAt, oneMerchant: false };
  const paid = mockPay({ vaultId: u.vault_id, addressId: u.address_id, amount: s.quote!.total, currency: "HKD", tender: "card", expiresAt: s.quote!.expiresAt, idempotencyKey: s.id },
    { userId, requestId: s.id, goalId: "basket", traceId: s.id, skus: s.lines.map(l => l.productId), cashback: 0, mandate, now: ctx.now(), simulation: ctx.simulation,
      guard: () => {
        const a = authorization(userId, ctx.db); if (!a || a.id !== s.authId || ctx.now() >= a.expiresAt || s.quote!.total > a.limit || s.quote!.total + spent7d(userId, ctx.now(), ctx.db) > a.weekly) throw new Error("付款前授权或整篮额度检查未通过。");
        s.quote!.merchants.forEach((m, i) => ctx.db.prepare("INSERT INTO demo_merchant_orders (id,basket_id,user_id,merchant,payload) VALUES (?,?,?,?,?)").run(`SCOUT-${s.id}-${i + 1}`, s.id, userId, m.name, JSON.stringify(m)));
      } }, ctx.db);
  record(s, ctx, "auditor", "payer", paid.status === "paid" ? "passed" : "failed", paid.status === "paid" ? "整篮模拟付款成功，只记账一次。" : "模拟付款失败，未购买任何商品。", { quoteVersion: s.version, amount: s.quote!.total, currency: "HKD", key: s.id }, { status: paid.status });
  s.status = paid.status === "paid" ? "paid" : "error"; s.reason = paid.status === "paid" ? "模拟购买完成；没有真实扣款。" : paid.reason;
  if (receipt(s.id, ctx.db)) s.orderId = `SCOUT-${s.id}`;
  return save(s, ctx);
}
