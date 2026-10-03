"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { runShop } from "@/app/actions/shop";
import { FlowDialogs } from "@/components/flow-dialogs";
import { ArrowRightIcon, ScoutMark, SlidersIcon } from "@/components/icons";
import {
  MandateForm,
  cashWeightOf,
  fieldErrors,
  initialDraft,
  toMandate,
  type MandateDraft,
} from "@/components/mandate-form";
import { OfferList } from "@/components/offer-list";
import { ShoppingList } from "@/components/shopping-list";
import { TraceLog } from "@/components/trace-log";
import { checkShares } from "@/lib/allocation";
import { parseIntent, type Goal } from "@/lib/intent";
import type { ShopCall, ShopView } from "@/lib/shop-types";

const SUGGESTIONS = ["party items for 8, red balloons, budget 350", "red balloons", "cookware"];

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400";

function amount(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function quantitiesOf(goals: Goal[], raw: Record<string, string>): Record<string, number> | null {
  const quantities: Record<string, number> = {};
  for (const goal of goals) {
    const value = amount(raw[goal.id] ?? "");
    if (value === null || value <= 0) return null;
    quantities[goal.id] = value;
  }
  return quantities;
}

function sharesOf(goals: Goal[], raw: Record<string, string>): Record<string, number | null> {
  return Object.fromEntries(
    goals.map((goal) => {
      const text = raw[goal.id] ?? "";
      return [goal.id, text.trim() === "" ? null : amount(text)];
    }),
  );
}

export default function SearchSection() {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<MandateDraft>(initialDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgetHint, setBudgetHint] = useState<number | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [requestBudget, setRequestBudget] = useState("");
  const [goalId, setGoalId] = useState("");
  const [result, setResult] = useState<ShopView | null>(null);
  const [selectedSku, setSelectedSku] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const last = useRef<ShopCall | null>(null);

  const errors = showErrors ? fieldErrors(draft) : {};
  const shareMap = sharesOf(goals, shares);
  const budget = requestBudget.trim() === "" ? null : amount(requestBudget);
  const shareCheck =
    goals.length > 1
      ? budget === null
        ? { ok: false as const, reason: "blank" as const }
        : checkShares(goals.map((goal) => goal.id), shareMap, budget, Number.POSITIVE_INFINITY)
      : { ok: true as const, remainder: 0 };
  const shareError = shareCheck.ok
    ? null
    : shareCheck.reason === "over_request"
      ? "The shares are above the request budget."
      : "Each goal needs a share before search.";

  const perOrder = amount(draft.perOrder);
  const hintConflict = budgetHint !== null && perOrder !== null && budgetHint > perOrder;

  function blocker(): string | null {
    if (!confirmed) return "Confirm the mandate before search.";
    if (goals.length === 0) return "Read the request into a list before search.";
    if (!quantitiesOf(goals, qty)) return "Set a quantity on every goal before search.";
    if (goals.length > 1 && !goalId) return "Choose which goal to search.";
    if (goals.length > 1 && !shareCheck.ok) return shareError;
    return null;
  }

  function formCall(): ShopCall | null {
    const mandate = toMandate(draft);
    if (!mandate) return null;
    const weight = cashWeightOf(draft);
    return {
      text: query,
      mandate,
      quantities: quantitiesOf(goals, qty) ?? {},
      shares: shareMap,
      requestBudget: budget,
      goalId: goals.length <= 1 ? goals[0]?.id : goalId || undefined,
      formWeights: weight === undefined ? undefined : { cash: weight },
    };
  }

  function send(patch: Partial<ShopCall>, reuse: boolean) {
    setShowErrors(true);
    const form = formCall();
    if (!confirmed || !form) {
      setNotice("Confirm a valid mandate before search.");
      return;
    }
    const scripted = patch.scene !== undefined || patch.decline === true || patch.clarifyAskedAt !== undefined;
    if (!reuse && !scripted && blocker()) {
      setNotice(blocker());
      return;
    }
    if (reuse && !last.current) return;
    const next: ShopCall =
      reuse && last.current ? { ...last.current, ...patch, mandate: form.mandate } : { ...form, ...patch };
    last.current = next;
    setNotice(null);
    if (!reuse && !scripted) setSelectedSku(undefined);
    startTransition(async () => {
      const view = await runShop(next);
      setResult(view);
      if (view.quote?.skuId) setSelectedSku(view.quote.skuId);
    });
  }

  function readList() {
    const parsed = parseIntent(query);
    setResult(null);
    last.current = null;
    if (!parsed.ok) {
      setGoals([]);
      setBudgetHint(null);
      setReadError(
        parsed.reason === "injection"
          ? "That request tries to change the mandate. Search will stop."
          : "Name snacks, balloons, cookware, or shoes.",
      );
      return;
    }
    setReadError(null);
    setGoals(parsed.goals);
    setBudgetHint(parsed.budgetHint);
    setQty({});
    setShares({});
    setRequestBudget(parsed.budgetHint === null ? "" : String(parsed.budgetHint));
    setGoalId(parsed.goals.length === 1 ? parsed.goals[0].id : "");
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send({}, false);
  }

  const waiting = blocker();

  return (
    <>
      <form
        onSubmit={handleSend}
        className="mt-10 w-full max-w-3xl rounded-3xl bg-white shadow-[0_24px_70px_-24px_rgba(23,23,23,0.25)] ring-1 ring-neutral-900/5 sm:mt-12"
      >
        <div className="flex items-start gap-4 px-5 pt-5 pb-6 sm:px-7">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#c8f14f]">
            <ScoutMark className="h-5 w-5 text-neutral-900" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <label htmlFor="scout-query" className={FIELD_LABEL}>
              What are you looking for?
            </label>
            <input
              id="scout-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="party items for 8, red balloons, budget 350"
              className="mt-1.5 w-full bg-transparent text-lg font-semibold tracking-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none sm:text-xl"
            />
          </div>
        </div>
        <div className="h-px bg-neutral-100" />
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <button
            type="button"
            onClick={readList}
            className="flex w-fit items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-950"
          >
            Read into a list
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("mandate")?.scrollIntoView({ behavior: "smooth" })}
            className="flex w-fit items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-950 sm:ml-5"
          >
            <SlidersIcon className="h-4 w-4" />
            Preferences
          </button>
          <button
            type="submit"
            disabled={pending || waiting !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c8f14f] px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-[#bdef38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a4cd39] disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto sm:w-auto"
          >
            Send Scout
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </form>

      {waiting && <p className="mt-3 text-sm text-neutral-500">{waiting}</p>}
      {notice && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {notice}
        </p>
      )}
      {readError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {readError}
        </p>
      )}
      <p className="mt-2 max-w-3xl text-sm text-neutral-500">
        Reading fills the list only. It does not change a limit, add a merchant, or switch confirm mode.
      </p>
      {hintConflict && (
        <p className="mt-2 text-sm text-neutral-700">
          The budget hint is above the per-order limit. Search will ask you to change one of them.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        <span className="text-sm text-neutral-400">Try asking for</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setQuery(suggestion)}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] text-neutral-700 shadow-sm ring-1 ring-neutral-900/5 hover:text-neutral-950"
          >
            <ScoutMark className="h-3.5 w-3.5 text-[#a4cd39]" />
            {suggestion}
          </button>
        ))}
      </div>

      <MandateForm
        draft={draft}
        errors={errors}
        confirmed={confirmed}
        onChange={(next) => {
          setDraft(next);
          setConfirmed(false);
        }}
        onConfirm={() => {
          setShowErrors(true);
          if (Object.keys(fieldErrors(draft)).length > 0) {
            setConfirmed(false);
            return;
          }
          setConfirmed(true);
          setNotice(null);
        }}
      />

      <ShoppingList
        goals={goals}
        quantities={qty}
        shares={shares}
        requestBudget={requestBudget}
        remainder={shareCheck.ok ? shareCheck.remainder : null}
        shareError={goals.length > 1 && quantitiesOf(goals, qty) && !shareCheck.ok ? shareError : null}
        goalId={goalId}
        onQuantity={(id, value) => setQty((current) => ({ ...current, [id]: value }))}
        onShare={(id, value) => setShares((current) => ({ ...current, [id]: value }))}
        onBudget={setRequestBudget}
        onGoal={setGoalId}
      />

      {result && <OfferList offers={result.offers} selectedSku={selectedSku} onSelect={(sku) => send({ selectedSku: sku, confirm: false, decline: false, previousCash: undefined }, true)} />}
      {result && <TraceLog traceId={result.traceId} rows={result.trace} />}
      <FlowDialogs
        result={result}
        confirmMode={draft.confirmMode}
        onChoose={(sku) => send({ selectedSku: sku, confirm: false, decline: false, previousCash: undefined }, true)}
        onAcceptPrice={() => send({ previousCash: undefined, confirm: false, decline: false }, true)}
        onDecline={() => send({ decline: true, confirm: false, previousCash: undefined, scene: undefined }, true)}
        onConfirmPay={() =>
          send(
            { confirm: true, decline: false, previousCash: undefined, selectedSku: selectedSku ?? result?.quote?.skuId },
            true,
          )
        }
        onMove={() =>
          send(
            { scene: "moved", previousCash: result?.quote?.cashTotal ?? 340, selectedSku: "move-340", confirm: false },
            true,
          )
        }
        onScene={(scene) => {
          if (scene === "timeout") {
            send({ clarifyAskedAt: Date.now() - 121_000, confirm: false }, false);
            return;
          }
          send({ scene, confirm: false, decline: false, previousCash: undefined, selectedSku: undefined }, false);
        }}
      />
    </>
  );
}
