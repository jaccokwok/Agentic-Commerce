export type PayReceipt =
  | { status: "paid"; booked: true }
  | { status: "terminate"; reason: "card_data" | "tender" | "timeout_before"; booked: false };

export type PayMemory = {
  read(key: string): PayReceipt | null;
  save(key: string, receipt: PayReceipt): void;
};

export function memoryPayStore(): PayMemory {
  const map = new Map<string, PayReceipt>();
  return {
    read: (key) => map.get(key) ?? null,
    save: (key, receipt) => {
      map.set(key, receipt);
    },
  };
}

export type ChargeInput = {
  vaultId: string;
  addressId: string;
  amount: number;
  currency: string;
  expiresAt: number;
  tender: string;
  allowedTenders: string[];
  idempotencyKey: string;
  phase: "ok" | "timeout_before" | "timeout_after";
  pan?: string;
  cardNumber?: string;
};

function tenderAllowed(tender: string, allowed: string[]): boolean {
  if (tender !== "card") return false;
  if (allowed.length === 0) return true;
  return allowed.includes("card");
}

export function charge(input: ChargeInput, memory: PayMemory): PayReceipt & { first: boolean } {
  const existing = memory.read(input.idempotencyKey);
  if (existing) return { ...existing, first: false };

  let receipt: PayReceipt;
  if (input.pan || input.cardNumber) {
    receipt = { status: "terminate", reason: "card_data", booked: false };
  } else if (!tenderAllowed(input.tender, input.allowedTenders)) {
    receipt = { status: "terminate", reason: "tender", booked: false };
  } else if (input.phase === "timeout_before") {
    receipt = { status: "terminate", reason: "timeout_before", booked: false };
  } else {
    receipt = { status: "paid", booked: true };
  }

  memory.save(input.idempotencyKey, receipt);
  return { ...receipt, first: true };
}
