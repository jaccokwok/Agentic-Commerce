"use client";

import FlowDialog from "@/components/flow-dialogs";
import type { Attempt, AttemptEvent } from "@/lib/attempt";
import type { Quote } from "@/lib/quote";

function QuoteDetails({ quote }: { quote: Quote }) {
  return (
    <div className="mt-4 space-y-2 text-sm">
      {quote.items.map((item) => <p key={item.sku_id}>{item.name} × {item.qty} · pre-coupon line HKD {item.lineTotal.toFixed(2)}</p>)}
      <dl className="space-y-1">
        {([
          ["Coupon", quote.coupon],
          ["Merchandise", quote.merchandise],
          ["Shipping", quote.shipping],
          ["Cash to pay", quote.cashTotal],
          ["Effective cost for comparison", quote.effectiveCost],
          ["Cashback after successful booking", quote.reward.cashback],
        ] as const).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd>HKD {value.toFixed(2)}</dd></div>
        ))}
      </dl>
      <p>Tender: {quote.tender} · Currency: {quote.currency}{quote.cardOff > 0 ? ` · Card off HKD ${quote.cardOff.toFixed(2)}` : ""}</p>
      <p className="shop-muted">Rewards never reduce cash or the rolling spend.</p>
    </div>
  );
}

function scoredRow(attempt: Attempt, sku: string) {
  return [...attempt.trace.rows].reverse().find((row) => row.ruleId === "scored" && row.numbers.sku === sku);
}

export function WhyChosen({ attempt, sku }: { attempt: Attempt; sku: string }) {
  const row = scoredRow(attempt, sku);
  if (!row) return <p className="shop-muted">No scored row for this product yet.</p>;
  const explanation = typeof row.numbers.explanation === "string" && row.numbers.explanation !== "Explanation skipped" ? row.numbers.explanation : null;
  return (
    <div className="mt-2 text-sm">
      {explanation && <p>{explanation}</p>}
      <p className="shop-muted">
        {String(row.numbers.sku)} · cash {String(row.numbers.cash)} · {String(row.numbers.tender)} · score {String(row.numbers.score)}
      </p>
      <p className="shop-muted">{String(row.numbers.parts)}</p>
    </div>
  );
}

export function ChoiceDialog({ attempt, disabled, onSelect, onClose }: {
  attempt: Attempt;
  disabled: boolean;
  onSelect: (skuId: string) => void;
  onClose: () => void;
}) {
  const waiting = attempt.status === "clarify" && attempt.issue === "tie";
  return (
    <FlowDialog title={waiting ? "Choose one product" : "Select a product"} onClose={onClose} closeLabel={waiting ? "Close / decline" : "Close"}>
      <p className="shop-muted mt-2">{attempt.reason}</p>
      <ul className="mt-4 space-y-3">
        {attempt.offers.map((choice) => (
          <li key={choice.offer.sku_id} className="shop-offer">
            <p className="font-semibold">{choice.offer.name}</p>
            <WhyChosen attempt={attempt} sku={choice.offer.sku_id} />
            <button type="button" className="shop-primary mt-3" disabled={disabled} onClick={() => onSelect(choice.offer.sku_id)}>
              Select {choice.offer.name}
            </button>
          </li>
        ))}
      </ul>
    </FlowDialog>
  );
}

export function QuoteDialog({ attempt, disabled, onEvent, onClose }: {
  attempt: Attempt;
  disabled: boolean;
  onEvent: (event: AttemptEvent) => void;
  onClose: () => void;
}) {
  const sku = attempt.quote?.items[0]?.sku_id ?? attempt.selected?.sku_id ?? "";
  return (
    <FlowDialog title="Confirm this quote" onClose={onClose} closeLabel="Close / decline">
      <p className="shop-muted mt-2">{attempt.reason}</p>
      {attempt.clarifyExpiresAt && <p className="shop-muted mt-2">Answer before {new Date(attempt.clarifyExpiresAt).toLocaleTimeString()}.</p>}
      {attempt.quote && <QuoteDetails quote={attempt.quote} />}
      {sku && <WhyChosen attempt={attempt} sku={sku} />}
      <button type="button" className="shop-primary mt-4" disabled={disabled || !attempt.quote} onClick={() => onEvent({ type: "confirm", version: attempt.quoteVersion })}>
        Confirm HKD {attempt.quote?.cashTotal.toFixed(2) ?? ""}
      </button>
      {sku === "price-demo" && (
        <div className="mt-3 flex gap-3">
          <button type="button" className="shop-secondary" disabled={disabled} onClick={() => onEvent({ type: "price_change", cashTotal: 360 })}>Demo price 360</button>
          <button type="button" className="shop-secondary" disabled={disabled} onClick={() => onEvent({ type: "price_change", cashTotal: 410 })}>Demo price 410</button>
        </div>
      )}
    </FlowDialog>
  );
}

export function ClarifyDialog({ attempt, disabled, onEvent, onPreferences, onClose }: {
  attempt: Attempt;
  disabled: boolean;
  onEvent: (event: AttemptEvent) => void;
  onPreferences: () => void;
  onClose: () => void;
}) {
  const issue = attempt.issue;
  return (
    <FlowDialog title="Scout needs an answer" onClose={onClose} closeLabel="Close / decline">
      <p className="mt-2">{attempt.reason}</p>
      {attempt.clarifyExpiresAt && <p className="shop-muted mt-2">Answer before {new Date(attempt.clarifyExpiresAt).toLocaleTimeString()}.</p>}
      {issue === "repeat" && <button type="button" className="shop-primary mt-4" disabled={disabled} onClick={() => onEvent({ type: "accept_repeat" })}>Accept the repeat</button>}
      {issue === "weights" && <button type="button" className="shop-primary mt-4" disabled={disabled} onClick={onPreferences}>Search again with the form weights</button>}
      {issue === "pay" && <button type="button" className="shop-primary mt-4" disabled={disabled} onClick={() => onEvent({ type: "retry" })}>Retry the same payment</button>}
      {(issue === "mandate" || issue === "list" || issue === "allocation") && (
        <p className="shop-muted mt-3">Close this, change the sentence, and search again.</p>
      )}
    </FlowDialog>
  );
}

