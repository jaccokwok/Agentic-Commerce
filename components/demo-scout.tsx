"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { demoUnderstandAction, demoActAction, demoReadAction } from "@/app/actions/demo";
import type { DemoAuthorization, DemoRequest, DemoEvent } from "@/lib/demo-shop";
import DemoAuthorizationForm from "@/components/demo-authorization";
import DemoBasket, { DemoRoles } from "@/components/demo-basket";

export default function DemoScout({ signedIn, initial, fixtureMode }: { fixtureMode: boolean; signedIn: boolean; initial: { authorization: DemoAuthorization | null; request: DemoRequest | null; spent: number } | null }) {
  const [auth, setAuth] = useState(initial?.authorization ?? null);
  const [request, setRequest] = useState(initial?.request ?? null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [spent, setSpent] = useState(initial?.spent ?? 0);
  const [busy, startTransition] = useTransition();
  useEffect(() => {
    if (!busy || !signedIn) return;
    const timer = setInterval(async () => { try { const r = await demoReadAction(); if (r.data?.request?.status === "understanding") setRequest(r.data.request); } catch { setError("无法读取推进状态；最终操作结果会再次核对。"); } }, 1500);
    return () => clearInterval(timer);
  }, [busy, signedIn]);
  function understand(input: string, id?: string) {
    setError(""); startTransition(async () => { try { const r = await demoUnderstandAction(input, id); if (r.data) { setRequest(r.data); setReply(""); } else setError(r.error ?? "理解失败，请重试。"); } catch { setError("连接失败，请重试。尚未付款。"); } });
  }
  function act(event: DemoEvent) {
    if (!request) return; setError(""); startTransition(async () => { try {
      const r = await demoActAction(request.id, event); if (r.data) { setRequest(r.data); const stats = await demoReadAction(); if (stats.data) setSpent(stats.data.spent); } else setError(r.error ?? "操作失败。");
    } catch { setError("连接中断；可重试同一购物篮确认，服务端防止重复付款。"); } });
  }
  return <div className="my-8 w-full max-w-5xl space-y-5">
    {!signedIn && <p className="shop-panel">请先 <Link className="underline font-semibold" href="/login?next=/">登录</Link> 或 <Link className="underline font-semibold" href="/register?next=/">注册</Link>，保存授权与模拟订单。</p>}
    <DemoAuthorizationForm initial={auth} disabled={busy || !signedIn} onSaved={a => { setAuth(a); setRequest(null); }} />
    <section className="shop-panel"><h2>2. 输入购物需求</h2><p className="shop-muted mt-2">固定目录：牛奶、便携杯、零食、气球、派对餐具。Shopper {fixtureMode || request?.source === "fixture" ? "当前使用测试响应回放（不是真实 AI）" : "使用真实 AI"}；价格与付款由程序检查。</p>
      <p className="shop-muted">滚动 168 小时已付 HK${spent.toFixed(2)}{auth && ` · 剩余 HK$${Math.max(0, auth.weekly - spent).toFixed(2)}`}</p>
      <form className="mt-4" onSubmit={e => { e.preventDefault(); understand(text); }}><label>你需要什么？<textarea maxLength={2000} required value={text} onChange={e => setText(e.target.value)} placeholder="我要买牛奶" disabled={busy} /></label><div className="mt-3 flex flex-wrap gap-2"><button className="shop-primary" disabled={busy || !signedIn || !auth}>{busy ? "正在处理…" : "让 Scout 安排"}</button>{["我要买牛奶", "I need a portable cup around 100 HKD", "我要办派对，预算1000港币"].map(example => <button className="shop-secondary" type="button" key={example} disabled={busy} onClick={() => setText(example)}>{example}</button>)}</div></form>
      {request?.status === "clarify" && !request.quote && <form className="mt-4" onSubmit={e => { e.preventDefault(); understand(reply, request.id); }}><p>{request.reason}</p><label>补充说明<input required maxLength={2000} value={reply} onChange={e => setReply(e.target.value)} disabled={busy} /></label><button className="shop-primary mt-3" disabled={busy}>回复并继续</button></form>}
      {request?.status === "error" && <div className="mt-4"><p role="alert">{request.reason}</p><button className="shop-secondary mt-2" disabled={busy} onClick={() => understand(request.text, request.id)}>重试 Shopper</button></div>}
    </section>
    {error && <p className="shop-panel shop-error" role="alert">{error}</p>}
    <DemoRoles request={request} busy={busy} />
    {request && !["understanding", "error"].includes(request.status) && (request.status !== "clarify" || request.quote !== null) && <DemoBasket request={request} busy={busy} act={act} />}
  </div>;
}
