import { cents } from "@/lib/money";
export function newAllocations(goalIds: string[]): Record<string, number | null> {
  return Object.fromEntries(goalIds.map(id => [id, null]));
}
export function checkAllocations(shares: Record<string, number | null>, budget: number, remaining: number) {
  const amounts = Object.values(shares);
  if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(remaining) || remaining < budget) return { status: "terminate" as const, reserved: 0, reason: "Request budget exceeds remaining 168-hour budget" };
  if (!amounts.length || amounts.some(n => n === null || !Number.isFinite(n) || n <= 0)) return { status: "clarify" as const, reserved: budget, reason: "Assign a positive share to every goal" };
  const assigned = amounts.reduce<number>((sum, n) => sum + cents(n!), 0);
  if (assigned > cents(budget)) return { status: "clarify" as const, reserved: 0, reason: "Shares exceed the request budget" };
  return { status: "ready" as const, reserved: (cents(budget) - assigned) / 100, reason: "Unused request money stays reserved; shares cannot borrow" };
}
export function canSpendShare(cash: number, share: number) { return cents(cash) <= cents(share); }
