export const RATE_TIMESTAMP = "2026-10-03T00:00:00.000Z";
export const FX_RATES: Record<string, number> = { HKD: 1, CNY: 1.08, USD: 7.8 };

export function toHKD(amount: number, currency: string) {
  const rate = FX_RATES[currency];
  if (!rate || !Number.isFinite(amount) || amount < 0) throw new Error("Invalid currency or amount");
  return { amount: Math.round(amount * rate * 100) / 100, rate, rateTimestamp: RATE_TIMESTAMP };
}
