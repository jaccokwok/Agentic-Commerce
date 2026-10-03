"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { demoUnderstandAction, demoActAction, demoReadAction } from "@/app/actions/demo";
import type { DemoAuthorization, DemoRequest, DemoEvent } from "@/lib/demo-shop";
import DemoAuthorizationForm from "@/components/demo-authorization";
import DemoBasket, { DemoRoles } from "@/components/demo-basket";
import FlowDialog from "@/components/flow-dialogs";

type Message = { speaker: "scout" | "user"; text: string };
const greeting: Message = { speaker: "scout", text: "你好，我是 Scout。告诉我想买什么，我会安排商品、检查预算，再请你确认完整报价。所有付款均为模拟。" };
function restoredMessages(request: DemoRequest | null): Message[] {
  if (!request) return [greeting];
  const inputs = request.records.filter(r => r.from === "shopper" && r.to === "shopper" && r.status === "running").map(r => String((r.request as { input: string }).input));
  return [greeting, ...inputs.map(text => ({ speaker: "user" as const, text })), { speaker: "scout", text: request.reason }];
}
function needsDialog(request: DemoRequest) {
  return !["understanding", "error", "cancelled", "paid"].includes(request.status) && (request.status !== "clarify" || request.quote !== null);
}

export default function DemoScout({ signedIn, initial, fixtureMode }: { fixtureMode: boolean; signedIn: boolean; initial: { authorization: DemoAuthorization | null; request: DemoRequest | null; spent: number } | null }) {
  const [auth, setAuth] = useState(initial?.authorization ?? null);
  const [request, setRequest] = useState(initial?.request ?? null);
  const [messages, setMessages] = useState(() => restoredMessages(initial?.request ?? null));
  const [text, setText] = useState("");
  const [pendingInput, setPendingInput] = useState("");
  const [error, setError] = useState("");
  const [spent, setSpent] = useState(initial?.spent ?? 0);
  const [dialog, setDialog] = useState<"authorization" | "basket" | "records" | null>(null);
  const [busy, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const clarifying = request?.status === "clarify" && !request.quote;
  const fixture = fixtureMode || request?.source === "fixture";

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages, busy]);
  useEffect(() => { if (!dialog) composer.current?.focus(); }, [dialog]);
  useEffect(() => {
    if (!busy || !signedIn) return;
    const timer = setInterval(async () => {
      try { const r = await demoReadAction(); if (r.data?.request?.status === "understanding") setRequest(r.data.request); }
      catch { setError("无法读取推进状态；最终操作结果会再次核对。"); }
    }, 1500);
    return () => clearInterval(timer);
  }, [busy, signedIn]);
  function append(speaker: Message["speaker"], text: string) { setMessages(previous => [...previous, { speaker, text }]); }
  function receive(next: DemoRequest) {
    setRequest(next); append("scout", next.reason); setDialog(needsDialog(next) ? "basket" : null);
  }
  function understand(input: string, id?: string) {
    setError(""); setText(""); append("user", input);
    startTransition(async () => {
      try { const r = await demoUnderstandAction(input, id); if (r.data) receive(r.data); else setError(r.error ?? "理解失败，请重试。"); }
      catch { setError("连接失败，请重试。尚未付款。"); }
    });
  }
  function act(event: DemoEvent) {
    if (!request) return; setError("");
    startTransition(async () => {
      try {
        const r = await demoActAction(request.id, event);
        if (r.data) { receive(r.data); const stats = await demoReadAction(); if (stats.data) setSpent(stats.data.spent); }
        else setError(r.error ?? "操作失败。");
      } catch { setError("连接中断；可重试同一购物篮确认，服务端防止重复付款。"); }
    });
  }
  function send() {
    if (!text.trim() || busy || !signedIn) return;
    if (!auth || auth.expiresAt <= Date.now()) { setPendingInput(text.trim()); setDialog("authorization"); return; }
    understand(text.trim(), clarifying ? request.id : undefined);
  }
  function closeDialog() { setDialog(null); setPendingInput(""); composer.current?.focus(); }
  function newConversation() {
    if (busy) return;
    setError(""); setDialog(null); setText(""); setPendingInput("");
    if (!request || ["paid", "cancelled"].includes(request.status)) { setRequest(null); setMessages([greeting]); return; }
    startTransition(async () => {
      try { const result = await demoActAction(request.id, { type: "cancel" }); if (result.error) { setError(result.error); return; } setRequest(null); setMessages([greeting]); }
      catch { setError("未能取消上一购物篮，请重试新对话。"); }
    });
  }
  return <section className="scout-chat shop-panel" aria-label="Scout 购物聊天窗口">
    <header className="scout-chat-header"><div><h1>购物对话</h1><p className="shop-muted">{fixture ? "测试响应回放 · 非真实 AI" : "告诉我需求，Scout 帮你安排"}</p></div>
      <div className="flex flex-wrap gap-2"><button className="shop-secondary" disabled={busy || !signedIn} onClick={() => { setPendingInput(""); setDialog("authorization"); }}>授权设置</button><button className="shop-secondary" disabled={busy} onClick={newConversation}>新对话</button></div>
    </header>
    <div className="scout-chat-history" role="log" aria-label="购物对话记录" aria-live="polite" aria-relevant="additions">
      {messages.map((m, index) => <div key={index} className={`scout-message scout-message-${m.speaker}`}><p className="scout-speaker">{m.speaker === "scout" ? "Scout" : "你"}</p><p>{m.text}</p></div>)}
      {!signedIn && <div className="scout-message scout-message-scout"><p>请先 <Link className="underline font-semibold" href="/login?next=/">登录</Link> 或 <Link className="underline font-semibold" href="/register?next=/">注册</Link>，保存授权与模拟订单。</p></div>}
      {request && <div className="scout-message scout-message-scout"><div className="flex flex-wrap gap-2">
        {request.quote && <button className="shop-secondary" disabled={busy} onClick={() => setDialog("basket")}>{request.status === "paid" ? "查看订单" : "查看完整报价"}</button>}
        {request.status === "blocked" && <button className="shop-secondary" disabled={busy} onClick={() => setDialog("authorization")}>更新授权</button>}
        {request.status === "error" && <button className="shop-secondary" disabled={busy} onClick={() => understand(request.text, request.id)}>重试 Shopper</button>}
        <button className="shop-secondary" disabled={busy} onClick={() => setDialog("records")}>查看角色记录</button>
      </div><p className="shop-muted mt-3" aria-label="角色推进状态">{["shopper", "mandate", "auditor", "merchant", "payer"].map(role => {
        const last = request.records.filter(r => r.to === role).at(-1);
        const state = last ? { running: "处理中", passed: "已检查", paused: "已暂停", failed: "失败" }[last.status] : "等待";
        return `${role}：${state}`;
      }).join(" · ")}</p>{request.status === "paid" && <p className="shop-muted mt-3 break-all">已付 HK${request.quote?.total.toFixed(2)} · 订单 {request.orderId}</p>}</div>}
      {busy && <div className="scout-message scout-message-scout" role="status">Scout 正在处理，请稍候…</div>}
      {error && <div className="scout-message scout-message-scout shop-error" role="alert">{error}</div>}
      <div ref={end} />
    </div>
    <form className="scout-composer" onSubmit={e => { e.preventDefault(); send(); }}>
      {!request && <div className="scout-suggestions">{["我要买牛奶", "I need a portable cup around 100 HKD", "我要办派对，预算1000港币"].map(example => <button className="shop-secondary" type="button" key={example} disabled={busy} onClick={() => { setText(example); composer.current?.focus(); }}>{example}</button>)}</div>}
      <label htmlFor="scout-query" className="sr-only">发送给 Scout 的消息</label><textarea id="scout-query" ref={composer} maxLength={2000} required value={text} onChange={e => setText(e.target.value)} placeholder={clarifying ? "回复 Scout 的问题…" : "告诉 Scout 你想买什么…"} disabled={busy} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
      <div className="scout-composer-footer"><p className="shop-muted">模拟目录 · HKD · 不真实扣款{auth && <span> · 周已付 HK${spent.toFixed(2)}</span>}</p><button className="shop-primary" disabled={busy || !signedIn || !text.trim()}>{busy ? "处理中…" : "发送"}</button></div>
    </form>
    {dialog === "authorization" && <FlowDialog title="确认购物授权" closeLabel="返回聊天" onClose={closeDialog}><DemoAuthorizationForm key={auth?.id ?? "new"} initial={auth} disabled={busy || !signedIn} onSaved={(a: DemoAuthorization) => { setAuth(a); setRequest(null); setDialog(null); append("scout", `授权已确认：每次付款前确认，单次上限 HK$${a.limit}，有效至 ${new Date(a.expiresAt).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong" })}（香港时间）。`); if (pendingInput) { understand(pendingInput); setPendingInput(""); } }} /></FlowDialog>}
    {dialog === "basket" && request && <FlowDialog title={request.status === "paid" ? "模拟购买订单" : "查看并确认购物篮"} closeLabel="返回聊天（不会付款）" onClose={closeDialog}><DemoBasket request={request} busy={busy} act={act} />{error && <p role="alert" className="shop-error mt-3">{error}</p>}</FlowDialog>}
    {dialog === "records" && <FlowDialog title="Scout 协作记录" closeLabel="返回聊天" onClose={closeDialog}><DemoRoles request={request} busy={busy} /></FlowDialog>}
  </section>;
}
