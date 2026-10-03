/** Fixed mock rates. Not a live feed. */
export const FX_AS_OF = "2026-01-01T00:00:00.000Z";

const TO_HKD: Record<string, number> = {
  HKD: 1,
  CNY: 1.1,
  USD: 7.8,
};

export function toHkd(
  amount: number,
  currency: string,
): { hkd: number; asOf: string } | { error: "unknown_currency" } {
  const rate = TO_HKD[currency];
  if (rate === undefined) return { error: "unknown_currency" };
  return { hkd: Math.round(amount * rate), asOf: FX_AS_OF };
}
