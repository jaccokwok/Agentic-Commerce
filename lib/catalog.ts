import { readFileSync } from "node:fs";
import path from "node:path";
import { looksLikeInstruction } from "@/lib/untrusted";

export { CATEGORY_IDS } from "@/lib/categories";

export type Offer = {
  sku_id: string;
  platform_id: string;
  merchant_id: string;
  category_id: string;
  shelf: number;
  shipping: number | null;
  currency: string;
  rating: number;
  purchase_count: number;
  human_price: number;
  agent_price: number;
  coupon: number;
  reward: number;
  description: string;
  review?: string;
  in_stock?: boolean;
  coupon_available?: boolean;
};

export type Drop = { sku_id: string; reason: "instruction" | "agent_price" | "missing_shipping" };

export function sampleOffer(patch: Partial<Offer> & Pick<Offer, "sku_id">): Offer {
  return {
    platform_id: "hktvmall",
    merchant_id: "hktv-m1",
    category_id: "balloons",
    shelf: 120,
    shipping: 10,
    currency: "HKD",
    rating: 4.5,
    purchase_count: 80,
    human_price: 120,
    agent_price: 120,
    coupon: 0,
    reward: 0,
    description: "Plain product description.",
    in_stock: true,
    coupon_available: true,
    ...patch,
  };
}

export function classifyOffers(offers: Offer[]): { kept: Offer[]; dropped: Drop[] } {
  const kept: Offer[] = [];
  const dropped: Drop[] = [];

  for (const offer of offers) {
    const text = `${offer.description}\n${offer.review ?? ""}`;
    if (looksLikeInstruction(text)) {
      dropped.push({ sku_id: offer.sku_id, reason: "instruction" });
    } else if (offer.agent_price > offer.human_price) {
      dropped.push({ sku_id: offer.sku_id, reason: "agent_price" });
    } else if (offer.shipping === null) {
      dropped.push({ sku_id: offer.sku_id, reason: "missing_shipping" });
    } else {
      kept.push(offer);
    }
  }

  return { kept, dropped };
}

export function loadCatalog(): Offer[] {
  const file = path.join(process.cwd(), "fixtures", "catalog.json");
  return JSON.parse(readFileSync(file, "utf8")) as Offer[];
}
