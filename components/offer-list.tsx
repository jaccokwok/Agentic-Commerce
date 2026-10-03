import type { RankedOffer } from "@/lib/rank";

const WEIGHTS: { key: keyof RankedOffer["weights"]; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "cash", label: "Cash" },
  { key: "rating", label: "Rating" },
  { key: "purchaseCount", label: "Purchase count" },
  { key: "history", label: "History" },
];

export function OfferList({
  offers,
  selectedSku,
  onSelect,
}: {
  offers: RankedOffer[];
  selectedSku?: string;
  onSelect: (skuId: string) => void;
}) {
  if (offers.length === 0) return null;

  return (
    <section className="mt-8 w-full max-w-3xl text-left">
      <h2 className="text-lg font-semibold tracking-tight">Offers</h2>
      <p className="mt-1 text-sm text-neutral-500">At most three, from one merchant. A click selects. It does not pay.</p>
      <ul className="mt-4 space-y-3">
        {offers.map((row) => {
          const selected = selectedSku === row.offer.sku_id;
          return (
            <li key={row.offer.sku_id}>
              <button
                type="button"
                onClick={() => onSelect(row.offer.sku_id)}
                aria-pressed={selected}
                className={`w-full rounded-3xl bg-white p-5 text-left ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a4cd39] ${selected ? "ring-[#a4cd39]" : "ring-neutral-900/5"}`}
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{row.offer.sku_id}</span>
                  <span className="text-sm text-neutral-500">
                    {row.offer.platform_id} · {row.offer.merchant_id}
                  </span>
                </span>
                <span className="mt-2 block text-sm text-neutral-600">{row.offer.description}</span>
                <span className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <span>Cash {row.cashTotal} HKD</span>
                  <span>Effective {row.effectiveCost} HKD</span>
                  <span>Score {row.score.toFixed(3)}</span>
                </span>
                <span className="mt-3 flex flex-wrap gap-2">
                  {WEIGHTS.map((weight) => (
                    <span key={weight.key} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                      {weight.label} {row.weights[weight.key]} × {row.parts[weight.key].toFixed(2)}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
