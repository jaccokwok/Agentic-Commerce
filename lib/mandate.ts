import { CATEGORY_IDS, hasInjection } from "@/lib/catalog";

export type Mandate = {
  confirmMode: "manual" | "auto"; expiresAt: number | null; revoked: boolean;
  merchantAllow: string[]; merchantDeny: string[]; categoryAllow: string[]; categoryDeny: string[];
  perItem: number; perOrder: number; rolling7d: number; tenders: string[];
  oneMerchant: boolean; maxSearchSeconds: number; includeRewards: boolean;
  paymentObjective: PaymentObjective;
};
export type PaymentObjective = "balanced" | "lowest_cash" | "relevance" | "rating" | "popular" | "familiar";
export const PAYMENT_OBJECTIVES: PaymentObjective[] = ["balanced", "lowest_cash", "relevance", "rating", "popular", "familiar"];
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
  if (!PAYMENT_OBJECTIVES.includes(m.paymentObjective)) errors.push("paymentObjective: invalid objective");
  if ([m.oneMerchant, m.includeRewards, m.revoked].some(v => typeof v !== "boolean")) errors.push("Invalid boolean field");
  if (m.expiresAt !== null && (!Number.isFinite(m.expiresAt) || m.expiresAt <= 0)) errors.push("expiresAt: invalid expiry");
  if ([...(m.categoryAllow ?? []), ...(m.categoryDeny ?? [])].some(id => !CATEGORY_IDS.some(category => looselyMatches(id, category)))) errors.push("category: use snacks or groceries");
  return errors;
}

function listed(ids: string[], value: string): boolean {
  return ids.some(id => looselyMatches(id, value));
}
function namesMerchant(ids: string[], merchant: string, platform?: string): boolean {
  return listed(ids, merchant) || (platform !== undefined && listed(ids, platform));
}
export function allows(m: Mandate, merchant: string, category: string, platform?: string): boolean {
  return !namesMerchant(m.merchantDeny, merchant, platform) && (!m.merchantAllow.length || namesMerchant(m.merchantAllow, merchant, platform)) &&
    !listed(m.categoryDeny, category) && (!m.categoryAllow.length || listed(m.categoryAllow, category));
}

export function checkMandate(m: Mandate, now: number, request?: { budgetHint?: number | null; categoryId?: string; merchantId?: string }): Decision {
  const errors = validateMandate(m);
  if (errors.length || m.revoked || (m.expiresAt !== null && now >= m.expiresAt)) return { status: "terminate", reason: errors.join("; ") || "Mandate revoked or expired" };
  const conflicts: string[] = [];
  if (request?.budgetHint != null && request.budgetHint > m.perOrder) conflicts.push(`The request budget of ${request.budgetHint} is above the per-order limit of ${m.perOrder}.`);
  if (request?.categoryId && listed(m.categoryDeny, request.categoryId)) conflicts.push(`Category ${request.categoryId} is on the deny list.`);
  else if (request?.categoryId && m.categoryAllow.length && !listed(m.categoryAllow, request.categoryId)) conflicts.push(`Category ${request.categoryId} is not on the allow list (${m.categoryAllow.join(", ")}).`);
  if (request?.merchantId && listed(m.merchantDeny, request.merchantId)) conflicts.push(`Merchant ${request.merchantId} is on the deny list.`);
  else if (request?.merchantId && m.merchantAllow.length && !listed(m.merchantAllow, request.merchantId)) conflicts.push(`Merchant ${request.merchantId} is not on the allow list (${m.merchantAllow.join(", ")}).`);
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
  const asked = askedMixes(text).filter(row => row.objective !== current.paymentObjective);
  if (asked.length) blocked.push(`The sentence asks for the ${asked.map(row => row.label).join(" and ")} comparison. Pick that mix on the form.`);
  if (/allow\s+merchant|允许商家/i.test(text)) blocked.push("A sentence cannot add an allowed merchant.");
  if (/exclude rewards|不计奖励/i.test(text)) next.includeRewards = false;
  if (blocked.length) return { status: "clarify", reason: `${blocked.join(" ")} The saved form was not changed. Type a higher limit on the form.`, mandate: current };
  return { status: "ready", reason: "Review and confirm the proposed form", mandate: next };
}

const MIX_PHRASES: { objective: Exclude<PaymentObjective, "balanced">; label: string; pattern: RegExp }[] = [
  { objective: "lowest_cash", label: "lowest cash", pattern: /cheapest|lowest\s*cash|最便宜|最低现金/i },
  { objective: "relevance", label: "relevance", pattern: /most\s+relevant|best\s+match|最相关/i },
  { objective: "rating", label: "rating", pattern: /highest\s+rated|best\s+rated|top\s+rated|评分最高/i },
  { objective: "popular", label: "popular", pattern: /most\s+popular|\bpopularity\b|最热门|人气/i },
  { objective: "familiar", label: "familiar", pattern: /bought\s+before|\bfamiliar\b|买过/i },
];
function stem(value: string): string {
  const compact = value.toLowerCase().replace(/[\s_-]+/g, "");
  if (compact.endsWith("ies") && compact.length > 4) return `${compact.slice(0, -3)}y`;
  if (compact.endsWith("es") && compact.length > 4) return compact.slice(0, -2);
  if (compact.endsWith("s") && compact.length > 3) return compact.slice(0, -1);
  return compact;
}
function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= right.length; column += 1) rows[0][column] = column;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const swap = i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1] ? rows[i - 2][j - 2] : Number.POSITIVE_INFINITY;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1), swap + 1);
    }
  }
  return rows[left.length][right.length];
}
export function looselyMatches(wanted: string, actual: string): boolean {
  const left = stem(wanted);
  const right = stem(actual);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.length >= 3 && right.length >= 3 && editDistance(left, right) <= 1;
}
export function askedMixes(text: string): { objective: PaymentObjective; label: string }[] {
  return MIX_PHRASES.filter(row => row.pattern.test(text)).map(({ objective, label }) => ({ objective, label }));
}
