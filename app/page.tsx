import SearchSection from "@/components/search-section";
import SiteHeader from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { currentSpend } from "@/lib/ledger";
import type { Mandate } from "@/lib/mandate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  const record = user ? await getUserById(user.id) : null;
  const initialMandate = record?.mandate_json ? JSON.parse(record.mandate_json) as Mandate : undefined;
  const initialSpent = user ? await currentSpend(user.id) : 0;
  return (
    <div className="relative flex min-h-screen flex-col bg-[#e6e6e6] text-neutral-900">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <SearchSection signedIn={!!record} initialMandate={initialMandate} initialSpent={initialSpent} />
      </main>
    </div>
  );
}
