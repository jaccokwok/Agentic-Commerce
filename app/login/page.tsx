import type { Metadata } from "next";
import Link from "next/link";
import GlowBackdrop from "@/components/glow-backdrop";
import { ScoutMark } from "@/components/icons";
import SiteHeader from "@/components/site-header";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign in — Scout",
  description: "Sign in to your Scout account.",
};

function safeNextPath(raw: string | string[] | undefined): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4f4f0] font-sans text-neutral-900">
      <GlowBackdrop />
      <SiteHeader />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-14 sm:py-20">
        <div className="w-full max-w-md rounded-3xl bg-white p-7 text-left shadow-[0_24px_70px_-24px_rgba(23,23,23,0.25)] ring-1 ring-neutral-900/5 sm:p-9">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8f14f]">
            <ScoutMark className="h-6 w-6 text-neutral-900" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            Sign in and send Scout on your next shopping mission.
          </p>

          <LoginForm next={nextPath} />

          <p className="mt-7 border-t border-neutral-100 pt-5 text-center text-sm text-neutral-500">
            New to Scout?{" "}
            <Link
              href="/register"
              className="font-semibold text-neutral-900 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
