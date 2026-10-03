import { CATEGORY_IDS } from "@/lib/categories";

export type Mandate = {
  expiresAt: number | null;
  revoked: boolean;
  confirmMode: "auto" | "manual";
  merchantAllow: string[];
  merchantDeny: string[];
  categoryAllow: string[];
  categoryDeny: string[];
  perItemLimit: number | null;
  perOrderLimit: number | null;
  rolling7d: number | null;
  tenders: string[];
  oneMerchantPerOrder: boolean;
  maxSearchTimeSec: number;
  includeRewards: boolean;
  paymentObjective: string;
};

export function defaultMandate(): Mandate {
  return {
    expiresAt: null,
    revoked: false,
    confirmMode: "manual",
    merchantAllow: [],
    merchantDeny: [],
    categoryAllow: [],
    categoryDeny: [],
    perItemLimit: null,
    perOrderLimit: null,
    rolling7d: null,
    tenders: [],
    oneMerchantPerOrder: true,
    maxSearchTimeSec: 15,
    includeRewards: true,
    paymentObjective: "",
  };
}

export function merchantAllowed(mandate: Mandate, merchantId: string): boolean {
  if (mandate.merchantDeny.includes(merchantId)) return false;
  if (mandate.merchantAllow.length === 0) return true;
  return mandate.merchantAllow.includes(merchantId);
}

export function categoryAllowed(mandate: Mandate, categoryId: string): boolean {
  if (mandate.categoryDeny.includes(categoryId)) return false;
  if (mandate.categoryAllow.length === 0) return true;
  return mandate.categoryAllow.includes(categoryId);
}

export function validateMandate(
  mandate: Mandate,
  now: number,
): { ok: true } | { ok: false; reason: "expired" | "revoked" | "invalid" } {
  if (mandate.revoked) return { ok: false, reason: "revoked" };
  if (mandate.expiresAt !== null && mandate.expiresAt <= now) {
    return { ok: false, reason: "expired" };
  }
  const limits = [mandate.perItemLimit, mandate.perOrderLimit, mandate.rolling7d];
  if (limits.some((value) => value === null || value <= 0)) {
    return { ok: false, reason: "invalid" };
  }
  if (mandate.maxSearchTimeSec <= 0) return { ok: false, reason: "invalid" };
  const named = [...mandate.categoryAllow, ...mandate.categoryDeny];
  if (named.some((id) => !CATEGORY_IDS.includes(id as (typeof CATEGORY_IDS)[number]))) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}

/** A text preference must not raise a spending limit. */
export function applyPreference(
  mandate: Mandate,
  patch: { perItemLimit?: number; perOrderLimit?: number; rolling7d?: number },
): { mandate: Mandate; action: "ok" | "clarify" } {
  const keys = ["perItemLimit", "perOrderLimit", "rolling7d"] as const;
  for (const key of keys) {
    const next = patch[key];
    const current = mandate[key];
    if (next === undefined || current === null) continue;
    if (next > current) return { mandate, action: "clarify" };
  }
  return {
    action: "ok",
    mandate: {
      ...mandate,
      perItemLimit: patch.perItemLimit ?? mandate.perItemLimit,
      perOrderLimit: patch.perOrderLimit ?? mandate.perOrderLimit,
      rolling7d: patch.rolling7d ?? mandate.rolling7d,
    },
  };
}
