export function checkShares(
  goalIds: string[],
  shares: Record<string, number | null | undefined>,
  requestBudget: number,
  rollingRemaining: number,
): { ok: true; remainder: number } | { ok: false; reason: "blank" | "over_request" | "over_rolling" } {
  let sum = 0;
  for (const id of goalIds) {
    const value = shares[id];
    if (value === null || value === undefined) return { ok: false, reason: "blank" };
    sum += value;
  }
  if (sum > requestBudget) return { ok: false, reason: "over_request" };
  if (sum > rollingRemaining) return { ok: false, reason: "over_rolling" };
  return { ok: true, remainder: requestBudget - sum };
}

export function withinShare(goalId: string, cash: number, shares: Record<string, number>): boolean {
  return cash <= (shares[goalId] ?? 0);
}
