"use client";

import { useEffect, useState } from "react";
import { attemptAction, requestAction, searchAction, spendingAction } from "@/app/actions/shop";
import MandateDialog, { needsMandate } from "@/components/mandate-form";
import { ChoiceDialog, ClarifyDialog, QuoteDialog } from "@/components/quote-review";
import ShopProgress from "@/components/shop-progress";
import TraceLog from "@/components/trace-log";
import FlowDialog from "@/components/flow-dialogs";
import type { Attempt, AttemptEvent } from "@/lib/attempt";
import { cents } from "@/lib/money";
import { parseIntent, statedQuantity } from "@/lib/intent";
import type { Mandate } from "@/lib/mandate";
import type { RequestDraft } from "@/lib/shop-service";

function sharesFor(ids: string[], budget: number): Record<string, number> | null {
  const total = cents(budget);
  const base = Math.floor(total / ids.length);
  if (base <= 0) return null;
  const extra = total - base * ids.length;
  return Object.fromEntries(ids.map((id, index) => [id, (base + (index === 0 ? extra : 0)) / 100]));
}

function draftFromSentence(text: string, mandate: Mandate, rollingLeft: number): { draft: RequestDraft } | { error: string } {
  const parsed = parseIntent(text);
  if (parsed.status === "terminate" || parsed.goals.length === 0) return { error: parsed.reason };
  const ceiling = Math.min(mandate.perOrder, rollingLeft);
  if (!(ceiling > 0)) return { error: "The rolling budget has no room for another purchase." };
  const budget = parsed.budgetHint == null ? ceiling : Math.min(parsed.budgetHint, ceiling);
  const shares = sharesFor(parsed.goals.map((goal) => goal.id), budget);
  if (!shares) return { error: "The request budget cannot cover every item." };
  const qty = statedQuantity(text) ?? 1;
  return {
    draft: {
      text,
      goals: parsed.goals.map((goal) => ({ ...goal, qty })),
      budget,
      shares,
      partialAccepted: parsed.goals.length > 1,
    },
  };
}

export default function SearchSection({ signedIn, initialMandate, initialSpent }: {
  signedIn: boolean;
  initialMandate?: Mandate;
  initialSpent: number;
}) {
  const [mandate, setMandate] = useState(initialMandate);
  const [confirmed, setConfirmed] = useState(!!initialMandate && !needsMandate(initialMandate));
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [spent, setSpent] = useState(initialSpent);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mandateOpen, setMandateOpen] = useState(needsMandate(initialMandate));
  const [pickOpen, setPickOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const rollingLeft = (mandate?.rolling7d ?? 0) - spent;

  async function receive(next: Attempt | null, error: string | null) {
    if (next) {
      setAttempt(next);
      if (next.status === "paid") {
        const spend = await spendingAction();
        if (spend.data !== null) setSpent(spend.data);
      }
      if (next.status === "offers" && next.offers.length > 0) setChoiceOpen(true);
    }
    setMessage(error ?? "");
    setBusy(false);
  }

  async function act(event: AttemptEvent) {
    if (!attempt) return;
    setBusy(true);
    try {
      const result = await attemptAction(attempt.id, event);
      await receive(result.data, result.error);
    } catch {
      setMessage("Connection failed. Retry the existing attempt; a payment retry uses the same reference.");
      setBusy(false);
    }
  }

  async function invalidate() {
    if (attempt && attempt.status !== "paid" && attempt.status !== "terminate") await act({ type: "cancel" });
    setAttempt(null);
    setRequestId(null);
  }

  async function search(next: RequestDraft, goalId: string, preferencesAccepted = false, fresh = false) {
    if (!confirmed || !mandate) return;
    setBusy(true);
    setPickOpen(false);
    setChoiceOpen(false);
    setDraft(next);
    try {
      let id = fresh ? null : requestId;
      if (!id) {
        const created = await requestAction(next);
        if (!created.data) return receive(null, created.error);
        id = created.data.id;
        setRequestId(id);
      }
      if (attempt && attempt.status !== "paid" && attempt.status !== "terminate") await attemptAction(attempt.id, { type: "cancel" });
      const result = await searchAction(id, goalId, undefined, preferencesAccepted);
      if (!result.data) setAttempt(null);
      await receive(result.data, result.error);
    } catch {
      setMessage("Connection failed. Retry the existing attempt; a payment retry uses the same reference.");
      setBusy(false);
    }
  }

  function submitQuery(event: React.FormEvent) {
    event.preventDefault();
    if (!signedIn || !mandate || !confirmed || needsMandate(mandate)) {
      setMandateOpen(true);
      return;
    }
    const built = draftFromSentence(query, mandate, rollingLeft);
    if ("error" in built) {
      setMessage(built.error);
      setDraft(null);
      setPickOpen(false);
      return;
    }
    setMessage("");
    setRequestId(null);
    if (built.draft.goals.length > 1) {
      setDraft(built.draft);
      setPickOpen(true);
      return;
    }
    void search(built.draft, built.draft.goals[0].id, false, true);
  }

  useEffect(() => {
    if (!attempt || attempt.status === "paid" || attempt.status === "terminate") return;
    const quoteExpiry = attempt.quote?.expiresAt ?? Number.POSITIVE_INFINITY;
    const due = Math.min(attempt.clarifyExpiresAt ?? Number.POSITIVE_INFINITY, quoteExpiry, mandate?.expiresAt ?? Number.POSITIVE_INFINITY);
    if (!Number.isFinite(due)) return;
    const id = attempt.id;
    const timer = window.setTimeout(() => {
      void attemptAction(id, { type: "tick" }).then((result) => {
        if (result.data) setAttempt(result.data);
        if (result.error) setMessage(result.error);
      });
    }, Math.max(0, due - Date.now()));
    return () => window.clearTimeout(timer);
  }, [attempt, mandate]);

  const showChoice = !!attempt && choiceOpen && attempt.status === "offers" && attempt.offers.length > 0;
  const showTie = !!attempt && attempt.status === "clarify" && attempt.issue === "tie";
  const showQuote = !!attempt && (attempt.status === "quote" || (attempt.status === "clarify" && attempt.issue === "price"));
  const showClarify = !!attempt && attempt.status === "clarify" && attempt.issue !== "tie" && attempt.issue !== "price";
  const dialog = mandateOpen ? "mandate" : pickOpen ? "pick" : showQuote ? "quote" : showTie ? "tie" : showClarify ? "clarify" : showChoice ? "choice" : null;
  const outcome = attempt && (attempt.status === "paid" || attempt.status === "terminate") ? attempt.reason : "";

  return (
    <div className="flex w-full max-w-xl flex-col items-center">
      <h1 className="text-5xl font-medium tracking-tight sm:text-6xl">Scout</h1>
      <p className="mt-1 text-lg">You type it, We buy it</p>
      <form className="mt-8 w-full" onSubmit={submitQuery}>
        <label className="relative block">
          <span className="sr-only">What should Scout buy?</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Red balloons"
            className="w-full rounded-full border border-white bg-white py-3.5 pr-14 pl-5 text-base shadow-sm outline-none"
          />
          <button type="submit" aria-label="Search" disabled={busy} className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-neutral-700">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16.5 20 20.5" strokeLinecap="round" />
            </svg>
          </button>
        </label>
      </form>
      <ShopProgress rows={attempt?.trace.rows ?? []} status={attempt?.status ?? null} busy={busy} />
      {outcome && <p role="status" className="mt-3 w-full pl-2 text-sm text-neutral-700 sm:pl-6">{outcome}</p>}
      {attempt?.status === "offers" && attempt.offers.length > 0 && !choiceOpen && (
        <button type="button" className="mt-3 text-sm font-medium text-neutral-800 underline" onClick={() => setChoiceOpen(true)}>Choose a product</button>
      )}
      {message && <p role="alert" className="shop-error mt-3 w-full pl-2 sm:pl-6">{message}</p>}
      {attempt && (
        <div className="mt-6 w-full pl-2 sm:pl-6">
          <button
            type="button"
            className="text-sm font-medium text-neutral-700 underline"
            aria-expanded={logOpen}
            aria-controls="decision-log"
            onClick={() => setLogOpen((open) => !open)}
          >
            {logOpen ? "Hide decision log" : "Show decision log"}
          </button>
          {logOpen && (
            <div id="decision-log" className="mt-4">
              <TraceLog trace={attempt.trace} />
            </div>
          )}
        </div>
      )}
      {dialog === "mandate" && (
        <MandateDialog
          open
          signedIn={signedIn}
          disabled={busy}
          onClose={() => setMandateOpen(false)}
          onSaved={(saved) => { setMandate(saved); setConfirmed(!saved.revoked); setMandateOpen(false); void invalidate(); }}
        />
      )}
      {dialog === "pick" && draft && (
        <FlowDialog title="This request is two items" onClose={() => setPickOpen(false)} closeLabel="Close">
          <p className="shop-muted mt-2">Scout buys one item at a time. The quantity and budget already follow the sentence and the mandate.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {draft.goals.map((goal) => (
              <button key={goal.id} type="button" className="shop-primary" disabled={busy} onClick={() => void search(draft, goal.id, false, true)}>
                Buy {goal.label.toLowerCase()}
              </button>
            ))}
          </div>
        </FlowDialog>
      )}
      {dialog === "choice" && attempt && (
        <ChoiceDialog attempt={attempt} disabled={busy} onSelect={(skuId) => void act({ type: "select", skuId })} onClose={() => setChoiceOpen(false)} />
      )}
      {dialog === "tie" && attempt && (
        <ChoiceDialog attempt={attempt} disabled={busy} onSelect={(skuId) => void act({ type: "select", skuId })} onClose={() => void act({ type: "decline" })} />
      )}
      {dialog === "quote" && attempt && (
        <QuoteDialog attempt={attempt} disabled={busy} onEvent={(event) => void act(event)} onClose={() => void act({ type: "decline" })} />
      )}
      {dialog === "clarify" && attempt && (
        <ClarifyDialog
          attempt={attempt}
          disabled={busy}
          onEvent={(event) => void act(event)}
          onPreferences={() => { const goal = draft?.goals.find((item) => item.id === attempt?.input.goalId) ?? draft?.goals[0]; if (draft && goal) void search(draft, goal.id, true); }}
          onClose={() => void act({ type: "decline" })}
        />
      )}
    </div>
  );
}
