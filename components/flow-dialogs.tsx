import type { ShopView } from "@/lib/shop-types";

const COPY: Record<string, string> = {
  tie: "These offers scored the same. Choose one. Choosing does not pay.",
  price_change: "The cash total changed, so the earlier confirm is void.",
  mandate_conflict: "The request budget is above the per-order limit. Change the mandate or the request.",
  repeat_purchase: "This same sku was bought within 72 hours.",
  weight_conflict: "The cash weight on the form disagrees with the request.",
  assign_shares: "Give each goal a share before search.",
  blank_qty: "Set a quantity before search.",
  insufficient_budget: "This quote is over a spending limit. Confirming cannot raise it.",
  coupon_gone: "The seller rejected the coupon. It was not spent.",
  out_of_stock: "The seller is out of stock. The coupon was not spent.",
  price_mismatch: "The shelf no longer matches the human price. The coupon was not spent.",
  clarify_timeout: "No reply within 120 seconds. This attempt has ended.",
  price_declined: "Back to search. The coupon is unused.",
  sign_in: "Sign in so pay can use the vault and address on the account.",
  missing_refs: "This account has no vault or address reference yet.",
};

function textOf(reason: string): string {
  return COPY[reason] ?? reason;
}

export function FlowDialogs({
  result,
  confirmMode,
  onChoose,
  onAcceptPrice,
  onDecline,
  onConfirmPay,
  onMove,
  onScene,
}: {
  result: ShopView | null;
  confirmMode: "auto" | "manual";
  onChoose: (skuId: string) => void;
  onAcceptPrice: () => void;
  onDecline: () => void;
  onConfirmPay: () => void;
  onMove: () => void;
  onScene: (scene: "tie" | "move" | "over" | "timeout") => void;
}) {
  const quote = result?.quote;
  const open = result && result.status !== "paid" && result.reason !== "await_confirm";

  return (
    <div className="mt-8 w-full max-w-3xl space-y-4 text-left">
      {result?.status === "paid" && quote && (
        <p className="rounded-2xl bg-[#c8f14f] px-4 py-3 text-sm font-medium text-neutral-900" role="status">
          Paid {quote.cashTotal} HKD. {result.booked ? "Recorded on the 168-hour ledger." : "This pay used an existing idempotency key, so it was not booked again."}
        </p>
      )}

      {open && (
        <section role="dialog" aria-labelledby="flow-title" className="rounded-3xl bg-white p-5 ring-1 ring-neutral-900/5 sm:p-7">
          <h2 id="flow-title" className="text-lg font-semibold tracking-tight">
            {result.status === "terminate" || result.status === "rolled_back" || result.status === "signed_out"
              ? "Stopped"
              : "Needs a decision"}
          </h2>
          <p className="mt-2 text-sm text-neutral-700">{textOf(result.reason)}</p>
          {quote && (
            <p className="mt-3 text-sm text-neutral-600">
              Cash {quote.cashTotal} HKD. Effective {quote.effectiveCost} HKD. Tender {quote.tender}. Rate {quote.rateAsOf}. Quote expires {new Date(quote.quoteExpiresAt).toISOString()}. Mandate expiry {quote.mandateExpiresAt === null ? "none" : new Date(quote.mandateExpiresAt).toISOString()}.
            </p>
          )}
          {result.reason === "tie" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.offers.map((row) => (
                <button key={row.offer.sku_id} type="button" onClick={() => onChoose(row.offer.sku_id)} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                  Choose {row.offer.sku_id}
                </button>
              ))}
            </div>
          )}
          {result.reason === "price_change" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onAcceptPrice} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                Use the new quote
              </button>
              <button type="button" onClick={onDecline} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-800 ring-1 ring-neutral-300">
                Decline and release the coupon
              </button>
            </div>
          )}
          {result.reason === "sign_in" && (
            <a href="/login?next=/" className="mt-4 inline-block text-sm font-medium text-neutral-900 underline">
              Sign in
            </a>
          )}
        </section>
      )}

      {result?.status === "ready" && quote && (
        <section className="rounded-3xl bg-white p-5 ring-1 ring-neutral-900/5 sm:p-7">
          <h2 className="text-lg font-semibold tracking-tight">Quote</h2>
          <p className="mt-2 text-sm text-neutral-700">
            {quote.skuId}: cash {quote.cashTotal} HKD, effective {quote.effectiveCost} HKD, line {quote.lineTotal}, shipping {quote.shipping}. {quote.currency}, tender {quote.tender}. Rewards {quote.includeRewards ? "on" : "off"}. Rate {quote.rateAsOf}.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Search timeout {quote.searchTimeoutSec}s. Clarification timeout {quote.clarifyTimeoutSec}s. Quote expires {new Date(quote.quoteExpiresAt).toISOString()}. Mandate expiry {quote.mandateExpiresAt === null ? "none" : new Date(quote.mandateExpiresAt).toISOString()}.
          </p>
          {confirmMode === "manual" && (
            <button type="button" onClick={onConfirmPay} className="mt-4 rounded-full bg-[#c8f14f] px-5 py-2.5 text-sm font-semibold text-neutral-900">
              Confirm and pay
            </button>
          )}
          {quote.skuId === "move-340" && (
            <button type="button" onClick={onMove} className="mt-4 ml-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-800 ring-1 ring-neutral-300">
              Seller moved cash from 340 to 360
            </button>
          )}
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 ring-1 ring-neutral-900/5 sm:p-7">
        <h2 className="text-lg font-semibold tracking-tight">Checks</h2>
        <p className="mt-1 text-sm text-neutral-500">
          These use the same attempt runner. They need a confirmed mandate and a signed-in account. The 340 quote has a line of 240, so the per-item limit has to allow that. The 410 check uses a 400 per-order cap.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onScene("tie")} className="rounded-full bg-white px-4 py-2 text-sm text-neutral-800 ring-1 ring-neutral-300">
            Ask about the tied balloons
          </button>
          <button type="button" onClick={() => onScene("move")} className="rounded-full bg-white px-4 py-2 text-sm text-neutral-800 ring-1 ring-neutral-300">
            Quote cash 340
          </button>
          <button type="button" onClick={() => onScene("over")} className="rounded-full bg-white px-4 py-2 text-sm text-neutral-800 ring-1 ring-neutral-300">
            Confirm cash 410 against a 400 limit
          </button>
          <button type="button" onClick={() => onScene("timeout")} className="rounded-full bg-white px-4 py-2 text-sm text-neutral-800 ring-1 ring-neutral-300">
            Clarification timed out
          </button>
        </div>
      </section>
    </div>
  );
}
