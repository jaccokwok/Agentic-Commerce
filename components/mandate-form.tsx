"use client";

import { useState, useTransition, type FormEvent } from "react";
import { mandateAction } from "@/app/actions/shop";
import { defaultMandate, proposeMandate, validateMandate, type Mandate } from "@/lib/mandate";
import FlowDialog from "@/components/flow-dialogs";

const limits = [["perItem", "Per-item line limit (HKD)"], ["perOrder", "Per-order cash limit (HKD)"], ["rolling7d", "Rolling 168-hour limit (HKD)"], ["maxSearchSeconds", "Max search time (seconds)"]] as const;
const lists = [["merchantAllow", "Allowed merchants (blank = all)"], ["merchantDeny", "Denied merchants"], ["categoryAllow", "Allowed categories"], ["categoryDeny", "Denied categories"], ["tenders", "Payment tenders"]] as const;

export default function MandateForm({ initial, onConfirmed, onDirty, disabled }: {
  initial?: Mandate; onConfirmed: (m: Mandate) => void; onDirty: () => void; disabled: boolean;
}) {
  const [form, setForm] = useState(initial ?? defaultMandate());
  const [listTexts, setListTexts] = useState(() => Object.fromEntries(lists.map(([key]) => [key, (initial ?? defaultMandate())[key].join(", ")])));
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const errors = validateMandate(form);
  function update(patch: Partial<Mandate>) { setForm({ ...form, ...patch }); setMessage(""); onDirty(); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (errors.length) { setMessage(errors.join("; ")); return; }
    startTransition(async () => {
      try { const result = await mandateAction({ ...form, revoked: false });
        if (result.data) { setForm(result.data); onConfirmed(result.data); setMessage("Mandate confirmed. You can prepare your shopping list."); }
        else setMessage(result.error ?? "Could not save mandate");
      } catch { setMessage("Connection failed. Please confirm the form again."); }
    });
  }
  return <section className="shop-panel">
    <h2>1. Set your buying mandate</h2>
    <p className="shop-muted">Your authorization: limits always apply, including in automatic mode. Per-item checks the whole line before coupons.</p>
    <form onSubmit={submit} className="mt-5">
      <fieldset disabled={disabled || pending}>
        <div className="shop-fields">
          {limits.map(([key, label]) => <label key={key}>{label}
            <input type="number" step="0.01" min="0.01" max="10000000" required value={Number.isFinite(form[key]) ? form[key] : ""}
              onChange={e => update({ [key]: e.target.value === "" ? NaN : Number(e.target.value) })} aria-invalid={errors.some(e => e.startsWith(key))} />
            {errors.filter(e => e.startsWith(key)).map(error => <span key={error} className="shop-error">{error}</span>)}
          </label>)}
          <label>Confirmation mode<select value={form.confirmMode} onChange={e => update({ confirmMode: e.target.value as Mandate["confirmMode"] })}>
            <option value="manual">Manual — confirm the quote</option><option value="auto">Automatic — unique winner only</option>
          </select></label>
          <label>Payment objective<select value={form.paymentObjective} onChange={e => update({ paymentObjective: e.target.value as Mandate["paymentObjective"] })}>
            <option value="balanced">Balanced</option><option value="lowest_cash">Lowest cash</option>
          </select></label>
          <label>Mandate expiry (Hong Kong time, blank = no expiry)<input type="datetime-local" value={form.expiresAt === null || !Number.isFinite(form.expiresAt) ? "" : new Date(form.expiresAt + 8 * 3600000).toISOString().slice(0, 16)} onChange={e => update({ expiresAt: e.target.value ? new Date(`${e.target.value}+08:00`).getTime() : null })} /></label>
          {lists.map(([key, label]) => <label key={key}>{label}<input value={listTexts[key]} placeholder={key.startsWith("category") ? "snacks, balloons" : key === "tenders" ? "card" : "party-shop, hk-party"}
            onChange={e => { setListTexts({ ...listTexts, [key]: e.target.value }); update({ [key]: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }); }} />
            {key.startsWith("category") && <span className="shop-muted">Catalogue categories: snacks, balloons</span>}
          </label>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-5">
          <label className="shop-check"><input type="checkbox" checked={form.includeRewards} onChange={e => update({ includeRewards: e.target.checked })} />Include rewards in ranking</label>
          <label className="shop-check"><input type="checkbox" checked={form.oneMerchant} onChange={e => update({ oneMerchant: e.target.checked })} />One merchant per order</label>
        </div>
        <p className="shop-muted mt-2">This MVP always quotes one goal and one merchant. The only mock tender is card.</p>
        <details className="mt-4"><summary>Fill with natural language</summary>
          <label className="mt-3 block">Propose settings (e.g. “per order 300, per item 200”)<textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} /></label>
          <button type="button" className="shop-secondary mt-2" onClick={() => {
            const proposal = proposeMandate(text, form);
            if (proposal.status === "ready") { update(proposal.mandate); setMessage(proposal.reason); }
            else setConflict(proposal.reason);
          }}>Fill draft for review</button>
        </details>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="shop-primary" type="submit">{pending ? "Saving…" : "Confirm mandate"}</button>
          <button className="shop-secondary" type="button" onClick={() => startTransition(async () => {
            try { const result = await mandateAction({ ...form, revoked: true });
              if (result.data) { onDirty(); setForm(result.data); setMessage("Mandate revoked. Further purchasing stops."); }
              else setMessage(result.error ?? "Revocation failed");
            } catch { setMessage("Connection failed. Retry revocation."); }
          })}>Revoke authorization</button>
        </div>
      </fieldset>
    </form>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {conflict && <FlowDialog title="Review conflicting authorization" onClose={() => setConflict(null)}><p className="mt-3">{conflict}</p><p className="shop-muted mt-3">Edit the form explicitly and confirm it to change authorization.</p></FlowDialog>}
  </section>;
}
