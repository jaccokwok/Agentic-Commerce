import GlowBackdrop from "@/components/glow-backdrop";
import DemoScout from "@/components/demo-scout";
import SiteHeader from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { readDemo } from "@/lib/demo-shop";

export default async function Home() {
  const user = await getSessionUser();
  const record = user ? await getUserById(user.id) : null;
  const initial = record ? readDemo(record.id) : null;
  return <div className="relative flex min-h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
    <GlowBackdrop /><SiteHeader />
    <main className="relative z-10 flex flex-1 flex-col items-center px-4 sm:px-6">
      <section className="w-full max-w-5xl pt-8 sm:pt-12">
        <p className="text-xs uppercase tracking-widest text-neutral-600">Scout · Mock commerce MVP</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight sm:text-5xl">Describe it. <span className="text-neutral-700">Buy within your limits.</span></h1>
        <p className="mt-4 max-w-2xl text-neutral-600">首次授权，告诉 Scout 你的需求，再一次确认完整购物篮。所有付款均为模拟。</p>
      </section>
      <DemoScout signedIn={!!record} initial={initial} fixtureMode={process.env.SCOUT_AI_MODEL === "browser-fixture"} />
    </main>
    <footer className="relative z-10 px-4 pb-8 text-center text-sm text-neutral-600">Fixed mock catalogue · HKD quotes · No real checkout or charge</footer>
  </div>;
}
