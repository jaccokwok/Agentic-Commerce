"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { requestAction, searchAction, attemptAction, spendingAction } from "@/app/actions/shop";
import { parseIntent, type Goal } from "@/lib/intent";
import { newAllocations, checkAllocations } from "@/lib/allocation";
import { defaultMandate, type Mandate } from "@/lib/mandate";
import type { RequestDraft } from "@/lib/shop-service";
import type { Attempt, AttemptEvent } from "@/lib/attempt";
import MandateForm from "@/components/mandate-form";
import ShoppingList from "@/components/shopping-list";
import OfferList from "@/components/offer-list";
import QuoteReview from "@/components/quote-review";
import TraceLog from "@/components/trace-log";

export default function SearchSection({ signedIn, initialMandate, initialSpent }: { signedIn: boolean; initialMandate?: Mandate; initialSpent: number }) {
  const [mandate, setMandate] = useState(initialMandate ?? defaultMandate());
  const [confirmed, setConfirmed] = useState(false);
  const [query, setQuery] = useState("party items for 8, red balloons, budget 350");
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [spent, setSpent] = useState(initialSpent);
  const [merchant, setMerchant] = useState("");
  const [message, setMessage] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  async function receive(next: Attempt) {
    setAttempt(next);
    if (next.status === "paid") { const stats = await spendingAction(); if (stats.data !== null) setSpent(stats.data); }
  }
  function act(event: AttemptEvent) {
    if (!attempt) return;
    startTransition(async () => {
      try { const result = await attemptAction(attempt.id, event); if (result.data) await receive(result.data); else setMessage(result.error ?? "Action failed"); }
      catch { setMessage("Connection failed. Retry the existing attempt; a payment retry uses the same reference."); }
    });
  }
  function invalidate() {
    setRequestId(null); setReviewOpen(false);
    if (attempt && !["paid", "terminate"].includes(attempt.status)) {
      const id = attempt.id;
      startTransition(async () => {
        try { const result = await attemptAction(id, { type: "cancel" }); if (result.error) setMessage(result.error); }
        catch { setMessage("Could not cancel the previous attempt. It must pass expiry and budget checks before any payment."); }
      });
    }
    setAttempt(null);
  }
  function search(goal: Goal, preferencesAccepted = false) {
    if (!draft || !confirmed) return;
    setMessage(""); setReviewOpen(false);
    startTransition(async () => {
      try {
        let id = requestId;
        if (!id) { const result = await requestAction(draft); if (!result.data) { setMessage(result.error ?? "Invalid request"); return; } id = result.data.id; setRequestId(id); }
        if (attempt && !["paid", "terminate"].includes(attempt.status)) await attemptAction(attempt.id, { type: "cancel" });
        const result = await searchAction(id, goal.id, merchant || undefined, preferencesAccepted);
        if (result.data) await receive(result.data); else setMessage(result.error ?? "Search failed");
      } catch { setMessage("Connection failed. Search did not complete; check the existing attempt before retrying."); }
    });
  }
  useEffect(() => {
    if (!attempt || ["paid", "terminate", "offers"].includes(attempt.status)) return;
    const deadline = Math.min(attempt.clarifyExpiresAt ?? Infinity, attempt.quote?.expiresAt ?? Infinity, attempt.input.mandate.expiresAt ?? Infinity);
    if (!Number.isFinite(deadline)) return;
    const timer = setTimeout(() => startTransition(async () => {
      try { const result = await attemptAction(attempt.id, { type: "tick" }); if (result.data) setAttempt(result.data); else setMessage(result.error ?? "Could not check expiry"); }
      catch { setMessage("Connection failed while checking expiry. Server will check it again before payment."); }
    }), Math.max(0, deadline - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [attempt]);

  const ready = draft !== null && draft.goals.every(g => Number.isSafeInteger(g.qty) && (g.qty ?? 0) > 0) &&
    checkAllocations(draft.shares, draft.budget, mandate.rolling7d).status === "ready" && (draft.goals.length < 2 || draft.partialAccepted);
  const locked = busy || (attempt !== null && ["quote", "clarify"].includes(attempt.status));
  return <div className="my-8 w-full max-w-5xl space-y-5">
    {!signedIn && <p className="shop-panel">You can edit the demo here. <Link className="underline font-semibold" href="/login?next=/">Sign in</Link> or <Link className="underline font-semibold" href="/register?next=/">create an account</Link> to confirm authorization and use mock checkout.</p>}
    <MandateForm initial={initialMandate} disabled={busy} onConfirmed={m => { setMandate(m); setConfirmed(!m.revoked); invalidate(); }} onDirty={() => { setConfirmed(false); invalidate(); }} />
    <section className="shop-panel">
      <div className="flex flex-wrap justify-between gap-3"><h2>2. Prepare your shopping list</h2><p className="shop-muted">Spent in 168h: HKD {spent.toFixed(2)} · Remaining: HKD {Math.max(0, mandate.rolling7d - spent).toFixed(2)}</p></div>
      <p className="shop-muted mt-2">Mock catalogue: snacks and balloons. No guest count or quantity is assumed.</p>
      <label className="mt-4 block">What do you need?<textarea value={query} maxLength={2000} disabled={busy} onChange={e => { setQuery(e.target.value); invalidate(); setDraft(null); }} /></label>
      <div className="mt-3 flex flex-wrap gap-3"><button className="shop-primary" disabled={busy} onClick={() => {
        invalidate(); const parsed = parseIntent(query); setMessage(parsed.reason);
        setDraft(parsed.goals.length ? { text: query, goals: parsed.goals, budget: parsed.budgetHint ?? Math.min(350, mandate.perOrder), shares: newAllocations(parsed.goals.map(g => g.id)), partialAccepted: false } : null);
      }}>Create editable list</button>
      {["red balloons budget 350", "snacks budget 400"].map(text => <button key={text} className="shop-secondary" disabled={busy} onClick={() => { invalidate(); setQuery(text); setDraft(null); }}>{text}</button>)}</div>
      <p className="shop-muted mt-3">{confirmed ? "Mandate confirmed." : "Confirm the mandate before searching."} Refunds do not restore the rolling 168-hour budget.</p>
      {draft && <ShoppingList draft={draft} disabled={locked} ready={ready} confirmed={confirmed && signedIn} merchant={merchant} onMerchant={value => { invalidate(); setMerchant(value); }}
        onChange={next => { invalidate(); setDraft(next); }} onSearch={goal => search(goal)} />}
    </section>
    {busy && <p role="status">Working on your request…</p>}
    {message && <p role="status" className="shop-panel">{message}</p>}
    {attempt && <>
      <OfferList attempt={attempt} disabled={busy} onSelect={skuId => act({ type: "select", skuId })} />
      <QuoteReview attempt={attempt} busy={busy} reviewOpen={reviewOpen} onReview={setReviewOpen} onEvent={act}
        onPreferences={() => { const goal = draft?.goals.find(g => g.id === attempt.input.goalId); if (goal) search(goal, true); }} />
      <TraceLog trace={attempt.trace} />
    </>}
  </div>;
}
