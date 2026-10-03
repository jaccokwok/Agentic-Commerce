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
  return <div className="scout-shell relative flex flex-col overflow-hidden bg-background font-sans text-foreground">
    <GlowBackdrop /><SiteHeader />
    <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-3 pb-3 sm:px-6 sm:pb-6">
      <DemoScout signedIn={!!record} initial={initial} fixtureMode={process.env.SCOUT_AI_MODEL === "browser-fixture"} />
    </main>
  </div>;
}
