"use client";

import { useState } from "react";
import Link from "next/link";
import { mandateAction } from "@/app/actions/shop";
import FlowDialog from "@/components/flow-dialogs";
import { defaultMandate, proposeMandate, type Mandate } from "@/lib/mandate";

const LIMITS = ["perItem", "perOrder", "rolling7d", "maxSearchSeconds"] as const;

export function needsMandate(mandate: Mandate | undefined, now = Date.now()): boolean {
  if (!mandate || mandate.revoked) return true;
  return mandate.expiresAt !== null && now >= mandate.expiresAt;
}

function withDefaults(form: Mandate): Mandate {
  const base = defaultMandate();
  const next = { ...form, revoked: false };
  for (const key of LIMITS) {
    if (!Number.isFinite(next[key]) || next[key] <= 0) next[key] = base[key];
  }
  if (!next.tenders.length) next.tenders = [...base.tenders];
  return next;
}

function list(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function copyMandate(mandate: Mandate): Mandate {
  return {
    ...mandate,
    merchantAllow: [...mandate.merchantAllow],
    merchantDeny: [...mandate.merchantDeny],
    categoryAllow: [...mandate.categoryAllow],
    categoryDeny: [...mandate.categoryDeny],
    tenders: [...mandate.tenders],
  };
}

export default function MandateDialog({ open, signedIn, current, editing, disabled, onClose, onSaved }: {
  open: boolean;
  signedIn: boolean;
  current?: Mandate;
  editing: boolean;
  disabled: boolean;
  onClose: () => void;
  onSaved: (mandate: Mandate) => void;
}) {
  const basis = editing && current ? copyMandate(current) : defaultMandate();
  const [step, setStep] = useState<"write" | "review">(editing ? "review" : "write");
  const [sentence, setSentence] = useState("");
  const [form, setForm] = useState<Mandate>(basis);
  const [notice, setNotice] = useState("");

  if (!open) return null;

  function continueFromSentence() {
    const proposal = proposeMandate(sentence, editing && current ? copyMandate(current) : defaultMandate());
    if (proposal.status !== "ready") {
      setNotice(proposal.reason);
      return;
    }
    setNotice("");
    setForm(proposal.mandate);
    setStep("review");
  }

  async function save(revoked = false) {
    const result = await mandateAction({ ...withDefaults(form), revoked });
    if (result.data) onSaved(result.data);
    else setNotice(result.error ?? "Mandate was not saved");
  }

  return (
    <FlowDialog title={step === "write" ? "Set your buying mandate" : "Review your mandate"} onClose={onClose} closeLabel="Close">
      {step === "write" ? (
        <>
          <p className="shop-muted mt-2">
            Write limits, confirm mode, and tenders in one sentence. A sentence cannot raise a limit, switch confirm mode, switch the comparison mix, or name an allowed merchant.
            {editing
              ? " Unmentioned fields stay on your saved mandate. Type a higher limit on the form."
              : " Unmentioned fields stay at the defaults: 250 per item, 400 per order, 1,000 rolling 7 days, manual confirm, card, rewards on, no expiry."}
          </p>
          {!signedIn && (
            <p className="mt-3 text-sm">
              <Link href="/login" className="font-semibold underline">Sign in</Link>
              {" or "}
              <Link href="/register" className="font-semibold underline">create an account</Link>
              {" before this can be saved."}
            </p>
          )}
          <label className="mt-4 block">Mandate in a sentence
            <textarea value={sentence} disabled={disabled} onChange={(event) => setSentence(event.target.value)} placeholder="Manual confirm, card only, rewards on" />
          </label>
          {notice && <p role="alert" className="shop-error mt-3">{notice}</p>}
          <div className="mt-4 flex gap-3">
            <button type="button" className="shop-primary" disabled={disabled} onClick={continueFromSentence}>Continue</button>
            <button type="button" className="shop-secondary" disabled={disabled} onClick={() => { setNotice(""); setForm(basis); setStep("review"); }}>Edit the form</button>
          </div>
        </>
      ) : (
        <>
          <p className="shop-muted mt-2">This is the proposed mandate. Edit any field. An emptied number is filled from the default before save.</p>
          <div className="shop-fields mt-4">
            {LIMITS.map((key) => (
              <label key={key}>{key}
                <input type="number" min="0.01" step="0.01" value={Number.isFinite(form[key]) ? form[key] : ""} disabled={disabled}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value === "" ? Number.NaN : Number(event.target.value) })} />
              </label>
            ))}
          </div>
          <div className="shop-fields mt-4">
            <label>Allowed merchants<input value={form.merchantAllow.join(", ")} disabled={disabled} onChange={(event) => setForm({ ...form, merchantAllow: list(event.target.value) })} /></label>
            <label>Denied merchants<input value={form.merchantDeny.join(", ")} disabled={disabled} onChange={(event) => setForm({ ...form, merchantDeny: list(event.target.value) })} /></label>
            <label>Allowed categories<input value={form.categoryAllow.join(", ")} disabled={disabled} onChange={(event) => setForm({ ...form, categoryAllow: list(event.target.value) })} /></label>
            <label>Denied categories<input value={form.categoryDeny.join(", ")} disabled={disabled} onChange={(event) => setForm({ ...form, categoryDeny: list(event.target.value) })} /></label>
            <label>Tenders<input value={form.tenders.join(", ")} disabled={disabled} onChange={(event) => setForm({ ...form, tenders: list(event.target.value) })} /></label>
            <label>Confirm mode
              <select value={form.confirmMode} disabled={disabled} onChange={(event) => setForm({ ...form, confirmMode: event.target.value as Mandate["confirmMode"] })}>
                <option value="manual">manual</option><option value="auto">auto</option>
              </select>
            </label>
            <label>Payment objective
              <select value={form.paymentObjective} disabled={disabled} onChange={(event) => setForm({ ...form, paymentObjective: event.target.value as Mandate["paymentObjective"] })}>
                <option value="balanced">balanced</option>
                <option value="lowest_cash">lowest cash</option>
                <option value="relevance">relevance</option>
                <option value="rating">rating</option>
                <option value="popular">popular</option>
                <option value="familiar">familiar</option>
              </select>
            </label>
            <label>Expiry (leave blank for none)
              <input type="datetime-local" disabled={disabled} value={form.expiresAt ? new Date(form.expiresAt + 8 * 60 * 60 * 1000).toISOString().slice(0, 16) : ""}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value ? new Date(`${event.target.value}:00+08:00`).getTime() : null })} />
            </label>
          </div>
          <label className="shop-check mt-4"><input type="checkbox" checked={form.includeRewards} disabled={disabled} onChange={(event) => setForm({ ...form, includeRewards: event.target.checked })} />Include rewards in the score</label>
          <label className="shop-check mt-2"><input type="checkbox" checked={form.oneMerchant} disabled={disabled} onChange={(event) => setForm({ ...form, oneMerchant: event.target.checked })} />One merchant for the whole order</label>
          {notice && <p role="alert" className="shop-error mt-3">{notice}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="shop-secondary" disabled={disabled} onClick={() => { setNotice(""); setStep("write"); }}>Edit sentence</button>
            <button type="button" className="shop-primary" disabled={disabled} onClick={() => void save(false)}>Submit</button>
            {editing && <button type="button" className="shop-secondary" disabled={disabled} onClick={() => void save(true)}>Revoke</button>}
          </div>
        </>
      )}
    </FlowDialog>
  );
}
