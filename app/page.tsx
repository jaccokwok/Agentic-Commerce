import GlowBackdrop from "@/components/glow-backdrop";
import SearchSection from "@/components/search-section";
import SiteHeader from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { currentSpend } from "@/lib/ledger";
import type { Mandate } from "@/lib/mandate";

export default async function Home() {
  const user = await getSessionUser();
  const record = user ? await getUserById(user.id) : null;
  const initialMandate = record?.mandate_json ? JSON.parse(record.mandate_json) as Mandate : undefined;
  const spent = user ? await currentSpend(user.id) : 0;
  return <div className="relative flex min-h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
    <GlowBackdrop /><SiteHeader />
    <main className="relative z-10 flex flex-1 flex-col items-center px-4 sm:px-6">
      <section className="w-full max-w-5xl pt-8 sm:pt-12">
        <p className="text-xs uppercase tracking-widest text-neutral-600">Scout · Mock commerce MVP</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Describe it. <span className="text-neutral-700">Buy within your limits.</span></h1>
        <p className="mt-4 max-w-2xl text-neutral-600">Set your authorization, turn a request into an editable list, compare mock offers, and review the final quote. All payments are simulated.</p>
      </section>
      <SearchSection signedIn={!!record} initialMandate={initialMandate} initialSpent={spent} />
    </main>
    <footer className="relative z-10 px-4 pb-8 text-center text-sm text-neutral-600">Fixed mock catalogue · HKD quotes · No real checkout or charge</footer>
  </div>;
}
