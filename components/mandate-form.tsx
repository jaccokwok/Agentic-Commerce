import type { ReactNode } from "react";
import { CATEGORY_IDS } from "@/lib/categories";
import { defaultMandate, type Mandate } from "@/lib/mandate";

const LABEL = "font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400";
const INPUT =
  "mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#a4cd39] focus:outline-none focus:ring-2 focus:ring-[#c8f14f]/40";

export type MandateDraft = {
  expiryMode: "no_expire" | "time";
  expiry: string;
  confirmMode: "auto" | "manual";
  merchantAllow: string;
  merchantDeny: string;
  categoryAllow: string;
  categoryDeny: string;
  perItem: string;
  perOrder: string;
  rolling: string;
  tenders: string;
  oneMerchant: boolean;
  maxSearch: string;
  rewards: boolean;
  objective: string;
  cashWeight: string;
};

export type FieldErrors = Partial<
  Record<"perItem" | "perOrder" | "rolling" | "maxSearch" | "expiry" | "categoryAllow" | "categoryDeny" | "cashWeight", string>
>;

export function initialDraft(): MandateDraft {
  const base = defaultMandate();
  return {
    expiryMode: "no_expire",
    expiry: "",
    confirmMode: base.confirmMode,
    merchantAllow: "",
    merchantDeny: "",
    categoryAllow: "",
    categoryDeny: "",
    perItem: "",
    perOrder: "",
    rolling: "",
    tenders: "",
    oneMerchant: base.oneMerchantPerOrder,
    maxSearch: String(base.maxSearchTimeSec),
    rewards: base.includeRewards,
    objective: "",
    cashWeight: "",
  };
}

function list(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function whole(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value > 0 ? value : null;
}

export function fieldErrors(draft: MandateDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (whole(draft.perItem) === null) errors.perItem = "Enter a per-item limit above 0.";
  if (whole(draft.perOrder) === null) errors.perOrder = "Enter a per-order limit above 0.";
  if (whole(draft.rolling) === null) errors.rolling = "Enter a rolling 7-day limit above 0.";
  if (whole(draft.maxSearch) === null) errors.maxSearch = "Enter a max search time above 0.";
  if (draft.expiryMode === "time" && Number.isNaN(Date.parse(draft.expiry))) {
    errors.expiry = "Enter an expiry time, or choose no expiry.";
  }
  for (const key of ["categoryAllow", "categoryDeny"] as const) {
    const unknown = list(draft[key]).filter(
      (id) => !CATEGORY_IDS.includes(id as (typeof CATEGORY_IDS)[number]),
    );
    if (unknown.length > 0) {
      errors[key] = `Unknown category: ${unknown.join(", ")}. Use ${CATEGORY_IDS.join(", ")}.`;
    }
  }
  if (draft.cashWeight.trim() !== "" && !/^\d+(\.\d+)?$/.test(draft.cashWeight.trim())) {
    errors.cashWeight = "Enter a cash weight such as 0.5, or leave it blank.";
  }
  return errors;
}

export function cashWeightOf(draft: MandateDraft): number | undefined {
  if (draft.cashWeight.trim() === "" || fieldErrors(draft).cashWeight) return undefined;
  return Number(draft.cashWeight);
}

export function toMandate(draft: MandateDraft): Mandate | null {
  if (Object.keys(fieldErrors(draft)).length > 0) return null;
  return {
    expiresAt: draft.expiryMode === "no_expire" ? null : Date.parse(draft.expiry),
    revoked: false,
    confirmMode: draft.confirmMode,
    merchantAllow: list(draft.merchantAllow),
    merchantDeny: list(draft.merchantDeny),
    categoryAllow: list(draft.categoryAllow),
    categoryDeny: list(draft.categoryDeny),
    perItemLimit: whole(draft.perItem),
    perOrderLimit: whole(draft.perOrder),
    rolling7d: whole(draft.rolling),
    tenders: list(draft.tenders),
    oneMerchantPerOrder: draft.oneMerchant,
    maxSearchTimeSec: whole(draft.maxSearch) ?? 15,
    includeRewards: draft.rewards,
    paymentObjective: draft.objective.trim(),
  };
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function MandateForm({
  draft,
  errors,
  confirmed,
  onChange,
  onConfirm,
}: {
  draft: MandateDraft;
  errors: FieldErrors;
  confirmed: boolean;
  onChange: (draft: MandateDraft) => void;
  onConfirm: () => void;
}) {
  function set<K extends keyof MandateDraft>(key: K, value: MandateDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <section id="mandate" className="mt-8 w-full max-w-3xl rounded-3xl bg-white p-5 text-left shadow-[0_24px_70px_-24px_rgba(23,23,23,0.25)] ring-1 ring-neutral-900/5 sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight">Mandate</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Empty merchant and category allow lists mean every id except the deny list. Search stays off until you confirm this form.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id="expiry-mode" label="Expiry" error={errors.expiry}>
          <select
            id="expiry-mode"
            value={draft.expiryMode}
            onChange={(event) => set("expiryMode", event.target.value as MandateDraft["expiryMode"])}
            className={INPUT}
          >
            <option value="no_expire">No expiry</option>
            <option value="time">Time</option>
          </select>
          {draft.expiryMode === "time" && (
            <input
              id="expiry"
              type="datetime-local"
              value={draft.expiry}
              onChange={(event) => set("expiry", event.target.value)}
              aria-invalid={Boolean(errors.expiry)}
              aria-describedby={errors.expiry ? "expiry-mode-error" : undefined}
              className={INPUT}
            />
          )}
        </Field>
        <Field id="confirm-mode" label="Confirm mode">
          <select
            id="confirm-mode"
            value={draft.confirmMode}
            onChange={(event) => set("confirmMode", event.target.value as MandateDraft["confirmMode"])}
            className={INPUT}
          >
            <option value="manual">Manual</option>
            <option value="auto">Auto</option>
          </select>
        </Field>
        <Field id="merchant-allow" label="Merchant allow list">
          <input id="merchant-allow" value={draft.merchantAllow} onChange={(event) => set("merchantAllow", event.target.value)} placeholder="hktv-m1, tb-shop-9" className={INPUT} />
        </Field>
        <Field id="merchant-deny" label="Merchant deny list">
          <input id="merchant-deny" value={draft.merchantDeny} onChange={(event) => set("merchantDeny", event.target.value)} placeholder="hktv-m2" className={INPUT} />
        </Field>
        <Field id="category-allow" label="Category allow list" error={errors.categoryAllow}>
          <input id="category-allow" value={draft.categoryAllow} onChange={(event) => set("categoryAllow", event.target.value)} placeholder={CATEGORY_IDS.join(", ")} aria-invalid={Boolean(errors.categoryAllow)} aria-describedby={errors.categoryAllow ? "category-allow-error" : undefined} className={INPUT} />
        </Field>
        <Field id="category-deny" label="Category deny list" error={errors.categoryDeny}>
          <input id="category-deny" value={draft.categoryDeny} onChange={(event) => set("categoryDeny", event.target.value)} aria-invalid={Boolean(errors.categoryDeny)} aria-describedby={errors.categoryDeny ? "category-deny-error" : undefined} className={INPUT} />
        </Field>
        <Field id="per-item" label="Per-item limit (HKD)" error={errors.perItem}>
          <input id="per-item" inputMode="numeric" value={draft.perItem} onChange={(event) => set("perItem", event.target.value)} aria-invalid={Boolean(errors.perItem)} aria-describedby={errors.perItem ? "per-item-error" : undefined} className={INPUT} />
        </Field>
        <Field id="per-order" label="Per-order limit (HKD)" error={errors.perOrder}>
          <input id="per-order" inputMode="numeric" value={draft.perOrder} onChange={(event) => set("perOrder", event.target.value)} aria-invalid={Boolean(errors.perOrder)} aria-describedby={errors.perOrder ? "per-order-error" : undefined} className={INPUT} />
        </Field>
        <Field id="rolling" label="Rolling 7-day limit (HKD)" error={errors.rolling}>
          <input id="rolling" inputMode="numeric" value={draft.rolling} onChange={(event) => set("rolling", event.target.value)} aria-invalid={Boolean(errors.rolling)} aria-describedby={errors.rolling ? "rolling-error" : undefined} className={INPUT} />
        </Field>
        <Field id="tenders" label="Payment tender list">
          <input id="tenders" value={draft.tenders} onChange={(event) => set("tenders", event.target.value)} placeholder="card" className={INPUT} />
        </Field>
        <Field id="max-search" label="Max search time (seconds)" error={errors.maxSearch}>
          <input id="max-search" inputMode="numeric" value={draft.maxSearch} onChange={(event) => set("maxSearch", event.target.value)} aria-invalid={Boolean(errors.maxSearch)} aria-describedby={errors.maxSearch ? "max-search-error" : undefined} className={INPUT} />
        </Field>
        <Field id="objective" label="Payment objective">
          <input id="objective" value={draft.objective} onChange={(event) => set("objective", event.target.value)} placeholder="Lowest cash, rewards on" className={INPUT} />
        </Field>
        <Field id="cash-weight" label="Cash weight" error={errors.cashWeight}>
          <input id="cash-weight" value={draft.cashWeight} onChange={(event) => set("cashWeight", event.target.value)} placeholder="0.25, blank uses the default" aria-invalid={Boolean(errors.cashWeight)} aria-describedby={errors.cashWeight ? "cash-weight-error" : undefined} className={INPUT} />
        </Field>
        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" checked={draft.oneMerchant} onChange={(event) => set("oneMerchant", event.target.checked)} />
            One merchant per order
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" checked={draft.rewards} onChange={(event) => set("rewards", event.target.checked)} />
            Include rewards in ranking
          </label>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onConfirm} className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a4cd39]">
          Confirm mandate
        </button>
        {confirmed && <p className="text-sm text-neutral-600">Mandate confirmed.</p>}
      </div>
    </section>
  );
}
