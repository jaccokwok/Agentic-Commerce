import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { ArrowUpRightIcon, ScoutMark } from "@/components/icons";
import { getSessionUser } from "@/lib/auth";

const NAV_LINKS = ["How it works", "Discover", "For brands"];

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  return source
    .split(/[\s@._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#c8f14f]">
          <ScoutMark className="h-5 w-5 text-neutral-900" />
        </span>
        <span className="text-xl font-bold tracking-tight">Scout</span>
      </Link>

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm text-neutral-600 md:flex">
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="transition-colors hover:text-neutral-950"
          >
            {link}
          </a>
        ))}
      </nav>

      {user ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-sm ring-1 ring-neutral-900/5 transition hover:ring-neutral-900/10"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c8f14f] text-[11px] font-bold text-neutral-900">
              {initialsOf(user.name, user.email)}
            </span>
            <span className="hidden max-w-[10rem] truncate text-sm font-medium text-neutral-800 sm:block">
              {user.name || user.email}
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Start shopping
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </header>
  );
}
