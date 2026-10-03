import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import GlowBackdrop from "@/components/glow-backdrop";
import SiteHeader from "@/components/site-header";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { currentSpend } from "@/lib/ledger";

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
  const spent = await currentSpend(user.id);
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

          <div className="mt-7 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-left">
            <h2 className="font-semibold">Mock payment references</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt>Vault ID</dt><dd className="break-all font-mono text-xs">{record?.vault_id}</dd></div>
              <div><dt>Address ID</dt><dd className="break-all font-mono text-xs">{record?.address_id}</dd></div>
              <div><dt>Spent in the preceding 168 hours</dt><dd className="font-semibold">HKD {spent.toFixed(2)}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">A refund does not restore the rolling seven-day budget. Original cash payments remain counted for the preceding continuous 168 hours. These references are created with your account; checkout never asks for a card number.</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#c8f14f] px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-[#bdef38]"
            >
              Back to Scout
            </Link>
          </div>

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
