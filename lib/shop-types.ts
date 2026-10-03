import type { Mandate } from "@/lib/mandate";
import type { Quote } from "@/lib/quote";
import type { RankedOffer, Weights } from "@/lib/rank";
import type { TraceRow } from "@/lib/trace";

export type ShopScene = "tie" | "move" | "moved" | "over";

export type ShopCall = {
  text: string;
  mandate: Mandate;
  quantities: Record<string, number>;
  shares: Record<string, number | null>;
  requestBudget: number | null;
  goalId?: string;
  selectedSku?: string;
  confirm?: boolean;
  decline?: boolean;
  previousCash?: number;
  formWeights?: Partial<Weights>;
  clarifyAskedAt?: number;
  scene?: ShopScene;
};

export type ShopView = {
  status: "clarify" | "terminate" | "ready" | "paid" | "rolled_back" | "signed_out";
  reason: string;
  traceId: string;
  trace: TraceRow[];
  offers: RankedOffer[];
  quote: Quote | null;
  booked: boolean;
  couponHeld: boolean;
};
