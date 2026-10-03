"use client";

import type { Goal } from "@/lib/intent";
import type { RequestDraft } from "@/lib/shop-service";

export default function ShoppingList({ draft, onChange, onSearch, disabled, ready, confirmed, merchant, onMerchant }: {
  draft: RequestDraft; onChange: (draft: RequestDraft) => void; onSearch: (goal: Goal) => void;
  disabled: boolean; ready: boolean; confirmed: boolean; merchant: string; onMerchant: (value: string) => void;
}) {
  function editGoal(id: string, patch: Partial<Goal>) { onChange({ ...draft, goals: draft.goals.map(g => g.id === id ? { ...g, ...patch } : g) }); }
  return <div className="mt-5">
    <label className="block">Overall request budget (HKD)<input type="number" min="0.01" step="0.01" value={draft.budget || ""} disabled={disabled} onChange={e => onChange({ ...draft, budget: Number(e.target.value) })} /></label>
    <div className="mt-4 space-y-4">{draft.goals.map(goal => <div key={goal.id} className="shop-list-row">
      <h3>{goal.label}</h3>
      <div className="shop-fields mt-3">
        <label>Quantity — {goal.label}<input type="number" min="1" step="1" max="10000" value={goal.qty ?? ""} disabled={disabled} placeholder="Set quantity"
          onChange={e => editGoal(goal.id, { qty: e.target.value ? Number(e.target.value) : null })} /></label>
        <label>Budget share (HKD) — {goal.label}<input type="number" min="0.01" step="0.01" value={draft.shares[goal.id] ?? ""} disabled={disabled} placeholder="Assign a share"
          onChange={e => onChange({ ...draft, shares: { ...draft.shares, [goal.id]: e.target.value ? Number(e.target.value) : null } })} /></label>
        <label>Brand — {goal.label}<input value={goal.brand ?? ""} disabled={disabled} onChange={e => editGoal(goal.id, { brand: e.target.value || null })} /></label>
        <label>Appearance — {goal.label}<input value={goal.appearance ?? ""} disabled={disabled} onChange={e => editGoal(goal.id, { appearance: e.target.value || null })} /></label>
      </div>
      <button type="button" className="shop-primary mt-4" disabled={disabled || !ready || !confirmed} onClick={() => onSearch(goal)}>Search {goal.label.toLowerCase()}</button>
    </div>)}</div>
    {draft.goals.length > 1 && <label className="shop-check mt-4"><input type="checkbox" checked={draft.partialAccepted} disabled={disabled} onChange={e => onChange({ ...draft, partialAccepted: e.target.checked })} />I accept separate orders and possible partial completion. Unassigned money stays reserved.</label>}
    <label className="mt-4 block">Merchant filter (optional)<select value={merchant} disabled={disabled} onChange={e => onMerchant(e.target.value)}>
      <option value="">Choose best merchant</option><option value="party-shop">Taobao · party-shop</option><option value="hk-party">HKTV Mall · hk-party</option>
      <option value="value-party">Pinduoduo · value-party</option><option value="tie-shop">Demo · equal-score tie</option><option value="demo-shop">Demo · price change (snacks)</option>
    </select></label>
    {!ready && <p role="status" className="shop-muted mt-3">Set all quantities and shares within the request budget; accept partial completion for a split.</p>}
  </div>;
}
