const ID_KEYS = new Set(["sku", "winner", "idempotencyKey", "platform_id", "requestId", "traceId", "vaultId", "addressId", "goalId", "merchantId", "merchant_id", "key"]);

export function maskId(value: string): string {
  if (value.length <= 2) return "*".repeat(Math.max(value.length, 1));
  const edge = value.length >= 16 ? 4 : 2;
  return `${value.slice(0, edge)}****${value.slice(-edge)}`;
}

export function maskIfId(key: string, value: string): string {
  return ID_KEYS.has(key) ? maskId(value) : value;
}

export function maskIdToken(value: string): string {
  return value.includes(" ") || !/[-_:]/.test(value) ? value : maskId(value);
}
