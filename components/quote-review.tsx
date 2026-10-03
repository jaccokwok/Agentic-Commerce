"use client";

import type { Attempt, AttemptEvent } from "@/lib/attempt";
import type { Quote } from "@/lib/quote";
import FlowDialog from "@/components/flow-dialogs";

function QuoteDetails({ quote }: { quote: Quote }) {
  return <div className="mt-4 space-y-2 text-sm">
    {quote.items.map(item => <p key={item.sku_id}>{item.name} × {item.qty} · pre-coupon line HKD {item.lineTotal.toFixed(2)}</p>)}
    <dl className="space-y-1">
      {[["Coupon", quote.coupon], ["Merchandise", quote.merchandise], ["Shipping", quote.shipping], ["Cash to pay", quote.cashTotal], ["Effective cost for comparison", quote.effectiveCost], ["Cashback after successful booking", quote.reward.cashback]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd>HKD {Number(value).toFixed(2)}</dd></div>)}
    </dl>
    <p>Tender: {quote.tender} · Currency: {quote.currency} · Source: {quote.sourceCurrency}</p>
    <p>Reward terms: {quote.reward.terms}</p>
    <p>Quote expires: {new Date(quote.expiresAt).toLocaleString()}</p>
    <p>Mandate expires: {quote.mandateExpiresAt === null ? "No expiry" : new Date(quote.mandateExpiresAt).toLocaleString()}</p>
    <p className="shop-muted">Fixed mock FX timestamp: {quote.rateTimestamp}. Rewards never reduce cash or the rolling spend.</p>
  </div>;
}
export default function QuoteReview({ attempt, busy, reviewOpen, onReview, onEvent, onPreferences }: {
  attempt: Attempt; busy: boolean; reviewOpen: boolean; onReview: (open: boolean) => void;
  onEvent: (event: AttemptEvent) => void; onPreferences: () => void;
}) {
  const modal = attempt.status === "clarify" || (reviewOpen && attempt.status === "quote");
  return <>
    <section className="shop-panel" aria-live="polite">
      <h2>{attempt.status === "paid" ? "Mock payment completed" : attempt.status === "terminate" ? "Attempt stopped" : "Final quote"}</h2>
      <p className="mt-2">{attempt.reason}</p><p className="shop-muted">Coupon: {attempt.coupon}</p>
      {attempt.quote && <QuoteDetails quote={attempt.quote} />}
      {attempt.status === "paid" && <p className="shop-muted mt-3 break-all">Payment reference: {attempt.idempotencyKey}. No real money was charged.</p>}
      {attempt.status === "quote" && <div className="mt-4 flex flex-wrap gap-3">
        <button className="shop-primary" disabled={busy} onClick={() => onReview(true)}>Review &amp; confirm quote</button>
        {attempt.selected?.sku_id === "price-demo" && <>
          <button className="shop-secondary" disabled={busy} onClick={() => onEvent({ type: "price_change", cashTotal: 360 })}>Demo: change cash to 360</button>
          <button className="shop-secondary" disabled={busy} onClick={() => onEvent({ type: "price_change", cashTotal: 410 })}>Demo: change cash to 410</button>
        </>}
      </div>}
      {!["paid", "terminate"].includes(attempt.status) && <button className="shop-secondary mt-3" disabled={busy} onClick={() => onEvent({ type: "cancel" })}>Cancel this attempt</button>}
    </section>
    {modal && <FlowDialog title={attempt.status === "clarify" ? "Your answer is needed" : "Confirm mock payment"} onClose={() => { onReview(false); onEvent({ type: "decline" }); }}>
      <p className="mt-3">{attempt.reason}</p>
      {attempt.clarifyExpiresAt && <p className="shop-muted mt-2">Answer before {new Date(attempt.clarifyExpiresAt).toLocaleTimeString()} (120 seconds).</p>}
      {attempt.issue === "tie" && <div className="mt-4 space-y-2">{attempt.offers.map(o => <button key={o.offer.sku_id} className="shop-secondary w-full" disabled={busy} onClick={() => onEvent({ type: "select", skuId: o.offer.sku_id })}>Choose {o.offer.name} · {o.score.toFixed(4)}</button>)}</div>}
      {attempt.issue === "repeat" && <button className="shop-primary mt-4" disabled={busy} onClick={() => onEvent({ type: "accept_repeat" })}>Yes, I intend to buy this SKU again</button>}
      {attempt.issue === "weights" && <button className="shop-primary mt-4" disabled={busy} onClick={onPreferences}>Use my explicit form settings</button>}
      {attempt.issue === "pay" && <button className="shop-primary mt-4" disabled={busy} onClick={() => onEvent({ type: "retry" })}>Retry the same payment reference</button>}
      {attempt.quote && (attempt.status === "quote" || attempt.issue === "price") && <>
        <QuoteDetails quote={attempt.quote} />
        <button className="shop-primary mt-5" disabled={busy} onClick={() => { onReview(false); onEvent({ type: "confirm", version: attempt.quoteVersion }); }}>Confirm HKD {attempt.quote.cashTotal.toFixed(2)} mock payment</button>
      </>}
      {["mandate", "list", "allocation"].includes(attempt.issue ?? "") && <p className="shop-muted mt-3">Close this dialog, edit the mandate or request, and confirm again before a new search.</p>}
    </FlowDialog>}
  </>;
}
