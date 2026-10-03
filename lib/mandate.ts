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
  const conflicts: string[] = [];
  if (request?.budgetHint != null && request.budgetHint > m.perOrder) conflicts.push(`The request budget of ${request.budgetHint} is above the per-order limit of ${m.perOrder}.`);
  if (request?.categoryId && m.categoryDeny.includes(request.categoryId)) conflicts.push(`Category ${request.categoryId} is on the deny list.`);
  else if (request?.categoryId && m.categoryAllow.length && !m.categoryAllow.includes(request.categoryId)) conflicts.push(`Category ${request.categoryId} is not on the allow list (${m.categoryAllow.join(", ")}).`);
  if (request?.merchantId && m.merchantDeny.includes(request.merchantId)) conflicts.push(`Merchant ${request.merchantId} is on the deny list.`);
  else if (request?.merchantId && m.merchantAllow.length && !m.merchantAllow.includes(request.merchantId)) conflicts.push(`Merchant ${request.merchantId} is not on the allow list (${m.merchantAllow.join(", ")}).`);
  if (conflicts.length) return { status: "clarify", reason: `${conflicts.join(" ")} Change the sentence or the mandate, then search again.` };
  return { status: "ready", reason: "Confirmed mandate is valid" };
}

export function proposeMandate(text: string, current: Mandate): Decision & { mandate: Mandate } {
  if (hasInjection(text)) return { status: "terminate", reason: "User instruction attempts to override authorization", mandate: current };
  const next = { ...current };
  const blocked: string[] = [];
  for (const [key, label, pattern] of [
    ["perItem", "Per item", /(?:per\s*item|单项|每项)\s*[:=]?\s*(\d+(?:\.\d+)?)/i],
    ["perOrder", "Per order", /(?:per\s*order|单笔|每单)\s*[:=]?\s*(\d+(?:\.\d+)?)/i],
    ["rolling7d", "Rolling 7 days", /(?:rolling\s*7d|七天|7天)\s*[:=]?\s*(\d+(?:\.\d+)?)/i],
  ] as const) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (value > current[key]) blocked.push(`${label} ${value} is above the saved limit of ${current[key]}.`);
    else next[key] = value;
  }
  if (/auto|自动/i.test(text) && current.confirmMode !== "auto") blocked.push(`The sentence asks for auto confirm, and the saved mandate is ${current.confirmMode}.`);
  if (/manual|手动/i.test(text) && current.confirmMode !== "manual") blocked.push(`The sentence asks for manual confirm, and the saved mandate is ${current.confirmMode}.`);
  if (/allow\s+merchant|允许商家/i.test(text)) blocked.push("A sentence cannot add an allowed merchant.");
  if (/exclude rewards|不计奖励/i.test(text)) next.includeRewards = false;
  if (blocked.length) return { status: "clarify", reason: `${blocked.join(" ")} The saved form was not changed. Type a higher limit on the form.`, mandate: current };
  return { status: "ready", reason: "Review and confirm the proposed form", mandate: next };
}
