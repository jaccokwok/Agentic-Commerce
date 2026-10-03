import fixtures from "@/fixtures/catalog.json";
import { FX_RATES } from "@/lib/fx";
import { CARD_TENDERS, type CardTender } from "@/lib/money";

export const CATEGORY_IDS = fixtures.categories;
export type Offer = {
  sku_id: string; platform_id: string; merchant_id: string; category_id: string; name: string;
  shelf: number; shipping?: number; currency: string; rating: number; purchase_count: number;
  human_price: number; agent_price: number; coupon: number;
  reward: { gift: number; rate: number; terms: string };
  description: string; review: string; brand: string; appearance: string; stock: boolean;
  cardRule?: { tender: CardTender; minMerchandise: number; off: number };
  cardRules?: { tender: CardTender; minMerchandise: number; off: number }[];
  counter?: { shipping?: number; coupon?: number; reason: string };
};
function badCardRule(offer: Offer) {
  const listed = [...(offer.cardRule ? [offer.cardRule] : []), ...(offer.cardRules ?? [])];
  const seen = new Set<string>();
  return listed.some(rule => {
    const bad = !(CARD_TENDERS as readonly string[]).includes(rule.tender) || [rule.minMerchandise, rule.off].some(n => !Number.isFinite(n) || n < 0) || seen.has(rule.tender);
    seen.add(rule.tender);
    return bad;
  });
}
export const rawOffers: Offer[] = fixtures.offers;

export function hasInjection(text: string) {
  return /(?:ignore|bypass|override|change|raise|increase|forget)[\s\S]{0,60}(?:mandate|budget|limit|instruction|authorization)|pay\s+now|system\s*prompt|(?:忽略|绕过|覆盖|提高|更改)[\s\S]{0,30}(?:预算|授权|限制|指令)|立即付[款钱]/i.test(text);
}

export function loadCatalog(input: Offer[] = rawOffers) {
  const offers: Offer[] = [];
  const dropped: { sku_id: string; rule: string; reason: string }[] = [];
  for (const offer of input) {
    let rule = "";
    if (hasInjection(`${offer.description} ${offer.review}`)) rule = "listing_injection";
    else if (offer.agent_price > offer.human_price) rule = "agent_surcharge";
    else if (offer.shipping === undefined) rule = "shipping_missing";
    else if (!CATEGORY_IDS.includes(offer.category_id) || !FX_RATES[offer.currency] ||
      !offer.sku_id || !offer.platform_id || !offer.merchant_id ||
      [offer.shelf, offer.shipping, offer.human_price, offer.agent_price, offer.coupon, offer.reward.gift, offer.reward.rate, offer.rating, offer.purchase_count].some(n => !Number.isFinite(n) || n < 0) ||
      offer.reward.rate > 1 || offer.rating > 5 || offer.agent_price !== offer.shelf || badCardRule(offer)) rule = "invalid_offer";
    if (rule) dropped.push({ sku_id: offer.sku_id, rule, reason: `Dropped ${offer.sku_id}: ${rule}` });
    else offers.push(offer);
  }
  return { offers, dropped };
}
