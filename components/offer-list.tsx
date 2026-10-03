"use client";

import type { Attempt } from "@/lib/attempt";
import type { RankedOffer } from "@/lib/rank";

export function OfferChoice({ item, selected, disabled, onSelect }: { item: RankedOffer; selected: boolean; disabled: boolean; onSelect: () => void }) {
  return <article className={`shop-offer ${selected ? "shop-offer-selected" : ""}`}>
    <p className="shop-muted">{item.offer.platform_id} · {item.offer.merchant_id}</p>
    <h3 className="mt-2">{item.offer.name}</h3>
    <p className="mt-3 text-xl font-semibold">HKD {item.money.cashTotal.toFixed(2)} <span className="text-xs font-normal">cash, shipping included</span></p>
    {item.money.cardOff > 0 ? <p className="shop-muted">{item.tender} takes HKD {item.money.cardOff.toFixed(2)} off after merchandise {item.money.merchandise.toFixed(2)}</p> : null}
    <p className="shop-muted">Effective cost HKD {item.money.effectiveCost.toFixed(2)} · Rating {item.offer.rating.toFixed(1)}/5</p>
    <p className="shop-muted">Score {item.score.toFixed(4)} · reward bonus {item.rewardBonus.toFixed(4)}</p>
    <details className="mt-3 text-xs"><summary>Weights and score breakdown</summary>
      <dl className="mt-2 space-y-1">{Object.entries(item.weights).map(([name, weight]) => <div className="flex justify-between gap-2" key={name}>
        <dt>{name} · weight {weight.toFixed(2)}</dt><dd>{item.breakdown[name as keyof typeof item.weights].toFixed(4)}</dd>
      </div>)}</dl>
    </details>
    <button type="button" disabled={disabled} className="shop-secondary mt-4" onClick={onSelect}>{selected ? "Selected — review quote" : "Select offer"}</button>
  </article>;
}
export default function OfferList({ attempt, disabled, onSelect }: { attempt: Attempt; disabled: boolean; onSelect: (sku: string) => void }) {
  return <section className="shop-panel">
    <h2>3. Compare offers</h2><p className="shop-muted">One goal, one merchant. Selecting an offer does not pay in manual mode.</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-3">{attempt.offers.map(item => <OfferChoice key={item.offer.sku_id} item={item} selected={attempt.selected?.sku_id === item.offer.sku_id}
      disabled={disabled || attempt.status === "paid" || attempt.status === "terminate"} onSelect={() => onSelect(item.offer.sku_id)} />)}</div>
    {!attempt.offers.length && <p className="mt-4">No offers to display. {attempt.reason}</p>}
  </section>;
}
