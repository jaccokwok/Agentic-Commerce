"use client";

import { useRef, useState } from "react";
import { mockConfirmAction, mockSearchAction } from "@/app/actions/shop";
import type { MockAgentStep, MockShoppingOffer, MockShoppingRun } from "@/lib/agents";

const wait = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));
const platformName = (platform: string) => ({ taobao: "Taobao", hktvmall: "HKTV Mall", pinduoduo: "Pinduoduo" })[platform] ?? platform;
const money = (amount: number) => new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD", maximumFractionDigits: 0 }).format(amount);

export default function SearchSection() {
  const [request, setRequest] = useState("");
  const [run, setRun] = useState<MockShoppingRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [mandateLimit, setMandateLimit] = useState("400");
  const [selectedOffer, setSelectedOffer] = useState<MockShoppingOffer | null>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setRun(null);
    setConfirmed(false);
    setSelectedOffer(null);
    try {
      const result = await mockSearchAction(request);
      setRun({ ...result, steps: result.steps.map((step, index) => ({ ...step, status: index === 0 ? "complete" : "pending", message: index === 0 ? step.message : "Waiting for the previous agent." })) });
      for (let index = 0; index < result.steps.length; index += 1) {
        await wait(350);
        setRun(current => current ? { ...current, steps: current.steps.map((step, stepIndex) => stepIndex === index ? result.steps[index] : step) } : current);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The mock search could not run.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(offer: MockShoppingOffer, limit: number) {
    setBusy(true);
    try {
      const result = await mockConfirmAction(offer, limit);
      setConfirmed(result.status === "paid");
      setError(result.status === "mandate_blocked" ? result.message : "");
      setRun(current => current ? { ...current, steps: current.steps.map((step, index) => index === current.steps.length - 1 ? { ...step, status: result.status === "paid" ? "complete" : "blocked", message: result.message } : step) } : current);
      return result.status === "paid";
    } catch {
      setError("The mock confirmation could not be completed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return <section className="w-full max-w-2xl">
    <form onSubmit={search} className="flex gap-2">
      <label className="sr-only" htmlFor="shopping-request">What are you looking for?</label>
      <input id="shopping-request" type="search" value={request} maxLength={500} placeholder="Red balloons under 350" onChange={event => { setRequest(event.target.value); setRun(null); setConfirmed(false); }} disabled={busy} required className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-offset-2 focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:opacity-60" />
      <button type="submit" disabled={busy || !request.trim()} className="rounded-md bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Working" : "Search"}
      </button>
    </form>
    <div className="mt-3 max-w-xs">
      <label htmlFor="purchase-mandate" className="block text-sm font-medium">Purchase mandate <span className="font-normal text-neutral-600">(maximum HKD)</span></label>
      <input id="purchase-mandate" type="number" min="0" max="400" step="1" value={mandateLimit} disabled={busy || confirmed} onChange={event => { setMandateLimit(event.target.value); setError(""); }} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:opacity-60" />
      <p className="mt-1 text-xs text-neutral-600">The default mandate caps an order at HKD 400.</p>
    </div>

    <div className="mt-6 border-t border-neutral-300 pt-5" aria-live="polite" aria-busy={busy}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Agent activity</h2>
        <span className="text-xs text-neutral-600">MOCK RUN</span>
      </div>
      {!run && !busy && <p className="mt-4 text-sm text-neutral-600">Your five agents are ready. Search to see the request move through the mock flow.</p>}
      {busy && !run && <p role="status" className="mt-4 text-sm text-neutral-600">Shopper is preparing your request…</p>}
      {run && <ol className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
        {run.steps.map((step: MockAgentStep, index) => <li key={`${step.role}-${index}`} className="grid grid-cols-[7.5rem_1fr] gap-3 py-3 text-sm">
          <span className="font-medium capitalize">{step.role}</span>
          <span className={step.status === "blocked" ? "text-red-700" : step.status === "complete" ? "text-neutral-900" : "text-neutral-500"}>
            <span className="mr-2 inline-block w-16 text-xs uppercase">{step.status}</span>{step.message}
          </span>
        </li>)}
      </ol>}

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {run?.offers.length ? <div className="mt-5">
        <h3 className="text-sm font-semibold">Best matching offers</h3>
        <ul className="mt-2 divide-y divide-neutral-200 border-y border-neutral-200">
          {run.offers.map((offer, index) => <li key={offer.sku}>
            <button type="button" disabled={busy || confirmed} onClick={() => { setSelectedOffer(offer); setError(""); confirmDialog.current?.showModal(); }} aria-label={`Review ${offer.name} from ${platformName(offer.platform)} for ${money(offer.price)}`} className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60">
              <span className="min-w-0"><span className="block font-medium">{offer.name}{index === 0 && <span className="ml-2 text-xs font-normal text-green-800">Recommended</span>}</span><span className="text-neutral-600">{platformName(offer.platform)}</span></span>
              <span className="shrink-0 font-semibold">{money(offer.price)}</span>
            </button>
          </li>)}
        </ul>
      </div> : null}
    </div>
    <dialog ref={confirmDialog} onClose={() => setSelectedOffer(null)} aria-labelledby="confirm-title" className="m-auto w-[min(32rem,calc(100%-2rem))] max-w-none rounded-lg border border-neutral-300 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40">
      {selectedOffer && <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Mock checkout</p>
        <h2 id="confirm-title" className="mt-2 text-xl font-semibold">Confirm this purchase?</h2>
        <p className="mt-4 font-medium">{selectedOffer.name}</p>
        <dl className="mt-4 space-y-2 border-y border-neutral-200 py-4 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-neutral-600">Marketplace</dt><dd>{platformName(selectedOffer.platform)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-neutral-600">Quote</dt><dd>{money(selectedOffer.price)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-neutral-600">Mandate maximum</dt><dd>{money(Number(mandateLimit))}</dd></div>
        </dl>
        {Number(mandateLimit) < selectedOffer.price && <p role="alert" className="text-sm text-red-700">The mandate is below this quote.</p>}
        <p className="text-sm text-neutral-600">This is a simulated confirmation. No real payment will be made.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => confirmDialog.current?.close()} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold">Cancel</button>
          <button type="button" disabled={busy || !mandateLimit || !Number.isFinite(Number(mandateLimit)) || Number(mandateLimit) < selectedOffer.price || Number(mandateLimit) > 400} onClick={async () => { if (await confirm(selectedOffer, Number(mandateLimit))) confirmDialog.current?.close(); }} className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Confirm purchase</button>
        </div>
      </div>}
    </dialog>
  </section>;
}
