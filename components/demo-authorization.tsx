"use client";
import { useState } from "react";
import { demoAuthorizeAction } from "@/app/actions/demo";
import type { DemoAuthorization } from "@/lib/demo-shop";

export default function DemoAuthorizationForm({ initial, disabled, onSaved }: { initial: DemoAuthorization | null; disabled: boolean; onSaved: (a: DemoAuthorization) => void }) {
  const [address, setAddress] = useState(initial?.address ?? "");
  const [limit, setLimit] = useState(initial?.limit ?? 1500);
  const [weekly, setWeekly] = useState(initial?.weekly ?? 5000);
  const [hours, setHours] = useState(24);
  const [editing, setEditing] = useState(!initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <section className="shop-panel">
    <h2>1. 首次授权</h2>
    <p className="shop-muted mt-2">每次付款前确认 · 单次购物上限 HK${limit.toFixed(2)} · 演示卡，无真实扣款</p>
    {!editing && initial ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="shop-muted">{initial.address} · 有效至 {new Date(initial.expiresAt).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })}（香港时间） · 周额度 HK${initial.weekly}</p><button className="shop-secondary" disabled={disabled} onClick={() => setEditing(true)}>更新授权</button></div> :
      <form className="mt-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError("");
        try { const r = await demoAuthorizeAction({ address, hours, limit, weekly, tender: "card" }); if (r.data) { onSaved(r.data); setEditing(false); } else setError(r.error ?? "授权失败。"); }
        catch { setError("连接失败，请重试授权。"); } finally { setBusy(false); }
      }}><fieldset disabled={disabled || busy}>
        <div className="shop-fields">
          <label>配送地址（演示）<input required minLength={3} maxLength={300} value={address} placeholder="香港九龙演示地址" onChange={e => setAddress(e.target.value)} /></label>
          <label>付款方式<select defaultValue="card"><option value="card">演示卡 · 模拟付款</option></select></label>
          <label>授权有效期<select value={hours} onChange={e => setHours(Number(e.target.value))}><option value={1}>1 小时</option><option value={24}>24 小时（默认）</option><option value={168}>7 天</option></select></label>
          <label>单次购物上限（HKD）<input required type="number" min="0.01" max="100000" step="0.01" value={limit} onChange={e => setLimit(Number(e.target.value))} /></label>
        </div>
        <details className="mt-4"><summary>周额度 · 默认 HK$5,000</summary><label className="mt-2 block">滚动 168 小时上限（HKD）<input required type="number" min="0.01" max="100000" step="0.01" value={weekly} onChange={e => setWeekly(Number(e.target.value))} /></label><p className="shop-muted">退款不自动恢复周额度；整篮金额包含各商家运费。</p></details>
        <button className="shop-primary mt-4" type="submit">{busy ? "保存中…" : "确认授权"}</button>
      </fieldset></form>}
    {error && <p className="shop-error mt-3" role="alert">{error}</p>}
  </section>;
}
