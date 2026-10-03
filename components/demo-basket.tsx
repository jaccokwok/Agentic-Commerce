"use client";
import { useState } from "react";
import type { DemoRequest, DemoEvent, Role } from "@/lib/demo-shop";
import { DEMO_CATALOG } from "@/lib/demo-catalog";

export function DemoRoles({ request, busy }: { request: DemoRequest | null; busy: boolean }) {
  const roles: Role[] = ["shopper", "mandate", "auditor", "merchant", "payer"];
  return <section className="shop-panel"><h2>角色协作</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-live="polite" aria-busy={busy}>
    {roles.map(role => { const last = request?.records.filter(r => r.to === role).at(-1); const status = last ? ({ running: "处理中", passed: "已检查", paused: "已暂停", failed: "失败" }[last.status]) : "等待";
      return <div key={role} className="shop-list-row"><p className="font-semibold">{role}</p><p className="shop-muted">{status}</p></div>; })}
  </div><details className="mt-4"><summary>展开简短记录（{request?.records.length ?? 0}）</summary>
    <ol className="mt-3 space-y-3">{request?.records.map((r, i) => <li key={i} className="shop-list-row"><p className="shop-muted">{r.from} → {r.to}</p><p className="text-sm">{r.summary}</p><details className="mt-2 text-xs"><summary>查看结构化请求与结果</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify({ request: r.request, result: r.result }, null, 2)}</pre></details></li>)}</ol>
    {!request && <p className="shop-muted mt-3">提交需求后显示实际检查记录。</p>}
  </details></section>;
}
function Quantity({ id, qty, disabled, onSave }: { id: string; qty: number; disabled: boolean; onSave: (qty: number) => void }) {
  const [value, setValue] = useState(qty);
  return <div className="flex flex-wrap items-end gap-2"><label>数量<input aria-label={`${id} 数量`} type="number" min={1} max={1000} value={value} onChange={e => setValue(Number(e.target.value))} disabled={disabled} /></label><button className="shop-secondary" disabled={disabled || value === qty || !Number.isInteger(value) || value < 1 || value > 1000} onClick={() => onSave(value)}>更新报价</button></div>;
}
function Shares({ request, busy, act }: { request: DemoRequest; busy: boolean; act: (event: DemoEvent) => void }) {
  const [shares, setShares] = useState<Record<string, number>>({});
  return <form className="mt-4" onSubmit={e => { e.preventDefault(); act({ type: "shares", shares }); }}><div className="shop-fields">{request.lines.map(l => { const p = DEMO_CATALOG.find(p => p.id === l.productId)!; return <label key={p.category}>{p.name} 预算份额（HKD，含分摊运费）<input type="number" required min="0.01" step="0.01" disabled={busy} value={shares[p.category] ?? ""} onChange={e => setShares({ ...shares, [p.category]: Number(e.target.value) })} /></label>; })}</div><button className="shop-primary mt-3" disabled={busy}>确认份额并继续（不付款）</button></form>;
}
export default function DemoBasket({ request: s, busy, act }: { request: DemoRequest; busy: boolean; act: (event: DemoEvent) => void }) {
  return <section className="shop-panel"><h2>3. 确认完整报价</h2>
    <p className="mt-3" role="status">{s.reason}</p>
    {s.status === "clarify" && s.quote && <Shares request={s} busy={busy} act={act} />}
    {s.shares && <p className="shop-muted mt-3">预算份额（含运费）：{Object.entries(s.shares).map(([key, value]) => `${key} HK$${value.toFixed(2)}`).join(" · ")}</p>}
    {s.status === "budget" && <button className="shop-primary mt-3" disabled={busy} onClick={() => act({ type: "budget" })}>同意提高本次预算（不付款）</button>}
    {s.status === "stock" && <div className="mt-3"><p className="shop-muted">整篮未付款。替代建议：</p>{s.alternatives.map(a => <p key={a.productId}>{a.name}</p>)}{s.alternatives.length > 0 ? <button className="shop-secondary mt-2" disabled={busy} onClick={() => act({ type: "substitute" })}>接受替代并重新报价</button> : <p>没有满足偏好的替代品，请修改需求。</p>}</div>}
    {s.quote && <><p className="shop-muted mt-3">币种 HKD · 报价版本 {s.version} · 有效至 {new Date(s.quote.expiresAt).toLocaleTimeString("zh-HK", { timeZone: "Asia/Hong_Kong" })}（香港时间）</p>
      <div className="mt-4 space-y-3">{s.quote.merchants.map(m => <div className="shop-list-row" key={m.name}><h3>{m.name}</h3><div className="mt-3 space-y-3">{m.items.map(item => <div key={item.productId} className="flex flex-wrap justify-between gap-3"><div><p>{item.name}</p><p className="shop-muted">HK${item.unit.toFixed(2)} × {item.qty} = HK${item.line.toFixed(2)}</p></div>{!["paid", "cancelled", "error", "understanding"].includes(s.status) && <Quantity key={`${item.productId}-${s.version}`} id={item.productId} qty={item.qty} disabled={busy} onSave={qty => act({ type: "quantity", productId: item.productId, qty })} />}</div>)}</div><p className="mt-3 text-sm">商品 HK${m.merchandise.toFixed(2)} · 运费 HK${m.shipping.toFixed(2)}</p></div>)}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-300 pt-4"><p className="text-xl font-semibold">整篮合计 HK${s.quote.total.toFixed(2)}</p>{s.status === "quote" && <button className="shop-primary" disabled={busy} onClick={() => act({ type: "confirm", version: s.version })}>确认整篮并模拟支付</button>}</div>
    </>}
    {s.status === "paid" && <div className="mt-4"><p className="font-semibold">模拟购买成功</p><p className="shop-muted break-all">订单编号：{s.orderId}</p>{s.quote?.merchants.map((m, i) => <p key={m.name} className="shop-muted break-all">{m.name} 分商家订单：{s.orderId}-{i + 1}</p>)}</div>}
    {!["paid", "cancelled"].includes(s.status) && <button className="shop-secondary mt-4" disabled={busy} onClick={() => act({ type: "cancel" })}>取消整篮</button>}
  </section>;
}
