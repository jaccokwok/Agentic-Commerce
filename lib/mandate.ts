import { CATEGORY_IDS, hasInjection } from "@/lib/catalog";

export type Mandate = {
  confirmMode: "manual" | "auto"; expiresAt: number | null; revoked: boolean;
  merchantAllow: string[]; merchantDeny: string[]; categoryAllow: string[]; categoryDeny: string[];
  perItem: number; perOrder: number; rolling7d: number; tenders: string[];
  oneMerchant: boolean; maxSearchSeconds: number; includeRewards: boolean;
  paymentObjective: "balanced" | "lowest_cash";
};
export type Decision = { status: "ready" | "clarify" | "terminate"; reason: string };
export function defaultMandate(): Mandate {
  return { confirmMode: "manual", expiresAt: null, revoked: false, merchantAllow: [], merchantDeny: [],
    categoryAllow: [], categoryDeny: [], perItem: 250, perOrder: 400, rolling7d: 1000,
    tenders: ["card"], oneMerchant: true, maxSearchSeconds: 15, includeRewards: true, paymentObjective: "balanced" };
}

export function validateMandate(m: Mandate): string[] {
  const errors: string[] = [];
  for (const key of ["perItem", "perOrder", "rolling7d", "maxSearchSeconds"] as const) {
    if (!Number.isFinite(m[key]) || m[key] <= 0 || m[key] > 10000000) errors.push(`${key}: enter a positive number`);
  }
  for (const key of ["merchantAllow", "merchantDeny", "categoryAllow", "categoryDeny", "tenders"] as const) {
    if (!Array.isArray(m[key]) || m[key].some(id => typeof id !== "string" || !id || id.length > 100)) errors.push(`${key}: invalid list`);
  }
  if (!["manual", "auto"].includes(m.confirmMode)) errors.push("confirmMode: invalid mode");
  if (!["balanced", "lowest_cash"].includes(m.paymentObjective)) errors.push("paymentObjective: invalid objective");
  if ([m.oneMerchant, m.includeRewards, m.revoked].some(v => typeof v !== "boolean")) errors.push("Invalid boolean field");
  if (m.expiresAt !== null && (!Number.isFinite(m.expiresAt) || m.expiresAt <= 0)) errors.push("expiresAt: invalid expiry");
  if ([...(m.categoryAllow ?? []), ...(m.categoryDeny ?? [])].some(id => !CATEGORY_IDS.includes(id))) errors.push("category: use snacks or balloons");
  return errors;
}

export function allows(m: Mandate, merchant: string, category: string): boolean {
  return !m.merchantDeny.includes(merchant) && (!m.merchantAllow.length || m.merchantAllow.includes(merchant)) &&
    !m.categoryDeny.includes(category) && (!m.categoryAllow.length || m.categoryAllow.includes(category));
}

export function checkMandate(m: Mandate, now: number, request?: { budgetHint?: number | null; categoryId?: string; merchantId?: string }): Decision {
  const errors = validateMandate(m);
  if (errors.length || m.revoked || (m.expiresAt !== null && now >= m.expiresAt)) return { status: "terminate", reason: errors.join("; ") || "Mandate revoked or expired" };
  if (request && ((request.budgetHint != null && request.budgetHint > m.perOrder) ||
    (request.categoryId && (m.categoryDeny.includes(request.categoryId) || (m.categoryAllow.length && !m.categoryAllow.includes(request.categoryId)))) ||
    (request.merchantId && !allows(m, request.merchantId, request.categoryId ?? "snacks")))) {
    return { status: "clarify", reason: "Request conflicts with confirmed mandate. Edit and confirm the form or request." };
  }
  return { status: "ready", reason: "Confirmed mandate is valid" };
}

export function proposeMandate(text: string, current: Mandate): Decision & { mandate: Mandate } {
  if (hasInjection(text)) return { status: "terminate", reason: "User instruction attempts to override authorization", mandate: current };
  const next = { ...current };
  let conflict = false;
  for (const [key, pattern] of [
    ["perItem", /(?:per\s*item|单项|每项)\s*[:=]?\s*(\d+(?:\.\d+)?)/i],
    ["perOrder", /(?:per\s*order|单笔|每单)\s*[:=]?\s*(\d+(?:\.\d+)?)/i],
    ["rolling7d", /(?:rolling\s*7d|七天|7天)\s*[:=]?\s*(\d+(?:\.\d+)?)/i],
  ] as const) {
    const match = text.match(pattern);
    if (match) { const value = Number(match[1]); if (value > current[key]) conflict = true; else next[key] = value; }
  }
  if (/auto|自动/i.test(text) && current.confirmMode !== "auto") conflict = true;
  if (/manual|手动/i.test(text) && current.confirmMode !== "manual") conflict = true;
  if (/allow\s+merchant|允许商家/i.test(text)) conflict = true;
  if (/exclude rewards|不计奖励/i.test(text)) next.includeRewards = false;
  return { status: conflict ? "clarify" : "ready", reason: conflict ? "Proposal conflicts with the form; limits and confirm mode were not raised" : "Review and confirm the proposed form", mandate: conflict ? current : next };
}
