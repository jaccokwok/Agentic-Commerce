import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import GlowBackdrop from "@/components/glow-backdrop";
import SiteHeader from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { spentSince } from "@/lib/ledger";

export const metadata: Metadata = {
  title: "Your account — Scout",
};

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  return source
    .split(/[\s@._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");

  const record = await getUserById(user.id);
  const spent = spentSince(user.id, new Date());
  const memberSince = record?.created_at
    ? new Date(record.created_at.replace(" ", "T") + "Z").toLocaleDateString(
        "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4f4f0] font-sans text-neutral-900">
      <GlowBackdrop />
      <SiteHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 py-14 sm:py-20">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 text-left shadow-[0_24px_70px_-24px_rgba(23,23,23,0.25)] ring-1 ring-neutral-900/5 sm:p-9">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c8f14f] text-lg font-bold text-neutral-900">
            {initialsOf(user.name, user.email)}
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {user.name || "Scout shopper"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{user.email}</p>
          {memberSince && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
              Member since {memberSince}
            </p>
          )}

          <dl className="mt-7 space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 text-sm">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Vault reference
              </dt>
              <dd className="mt-1 break-all font-medium text-neutral-900">
                {record?.vault_ref}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Address reference
              </dt>
              <dd className="mt-1 break-all font-medium text-neutral-900">
                {record?.address_ref}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Spent in 168 hours
              </dt>
              <dd className="mt-1 font-medium text-neutral-900">{spent} HKD</dd>
            </div>
            <p className="text-sm leading-relaxed text-neutral-500">
              A refund does not restore spending counted in the preceding 168
              hours.
            </p>
          </dl>

          <form action={logoutAction} className="mt-7 border-t border-neutral-100 pt-5">
            <button
              type="submit"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
