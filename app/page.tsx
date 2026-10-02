"use client";

import { useState, type FormEvent } from "react";

// ---------------------------------------------------------------------------
// Static demo content. The Scout agent backend is intentionally NOT
// implemented yet — every interactive element is a local-UI-only stub.
// ---------------------------------------------------------------------------

const NAV_LINKS = ["How it works", "Discover", "For brands"];

const SUGGESTIONS = [
  "Carry-on under $180",
  "Non-toxic cookware",
  "Running shoes for wide feet",
];

const TRUST_ITEMS = [
  "No sponsored results",
  "Secure checkout",
  "Free to search",
];

const AVATAR_GRADIENTS = [
  "from-amber-300 to-orange-400",
  "from-rose-300 to-pink-400",
  "from-sky-300 to-indigo-400",
];

const INITIAL_QUERY =
  "A quiet espresso machine for a small kitchen, easy to clean, with a steam wand";

// Palette (used as literal Tailwind arbitrary values below):
//   accent lime   -> #c8f14f  (buttons, icon tiles)
//   headline lime -> #a4cd39  (headline, small icons)
//   page bg       -> #f4f4f0

type IconProps = { className?: string };

function ScoutMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5c1 4.2 2.3 5.5 6.5 6.5-4.2 1-5.5 2.3-6.5 6.5-1-4.2-2.3-5.5-6.5-6.5 4.2-1 5.5-2.3 6.5-6.5Z" />
      <path
        d="M18.2 14.2c.5 2.1 1.15 2.75 3.3 3.3-2.15.55-2.8 1.2-3.3 3.3-.5-2.1-1.15-2.75-3.3-3.3 2.15-.55 2.8-1.2 3.3-3.3Z"
        opacity={0.8}
      />
    </svg>
  );
}

function SlidersIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h8.5M17.5 7H20M4 17h2.5M11.5 17H20" />
      <circle cx="15" cy="7" r="2.25" />
      <circle cx="9" cy="17" r="2.25" />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </svg>
  );
}

function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </svg>
  );
}

const FIELD_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400";

export default function Home() {
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [minPrice, setMinPrice] = useState("250");
  const [maxPrice, setMaxPrice] = useState("650");

  // TODO: send `query`, `minPrice` and `maxPrice` to the Scout agent API once
  // the backend exists. Backend logic is intentionally left unimplemented.
  function handleSendScout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function handlePrice(value: string): string {
    return value.replace(/[^0-9]/g, "").slice(0, 6);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4f4f0] font-sans text-neutral-900">
      {/* Soft lime glows behind the content */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute top-[28%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-lime-300/50 blur-[130px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[26rem] w-[26rem] rounded-full bg-lime-200/40 blur-[120px]" />
      </div>

      {/* ------------------------------- Navbar ------------------------------ */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#c8f14f]">
            <ScoutMark className="h-5 w-5 text-neutral-900" />
          </span>
          <span className="text-xl font-bold tracking-tight">Scout</span>
        </a>

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

        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href="#"
            className="text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950"
          >
            Sign in
          </a>
          <a
            href="#"
            className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Start shopping
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 sm:px-6">
        {/* -------------------------------- Hero ------------------------------ */}
        <section className="flex w-full max-w-3xl flex-col items-center pt-10 text-center sm:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 font-mono text-[10px] tracking-[0.18em] text-neutral-500 uppercase shadow-sm ring-1 ring-neutral-900/5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a4cd39]" />
            Your personal buying agent — always on
          </span>

          <h1 className="mt-7 text-5xl font-medium tracking-[-0.03em] sm:text-6xl md:text-7xl">
            Describe it. <span className="text-[#a4cd39]">Scout finds it.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-500 sm:text-lg">
            Tell Scout what you want in your own words. Your agent searches
            trusted stores, compares the fine print, and brings back the best
            matches.
          </p>
        </section>

        {/* ----------------------------- Search card -------------------------- */}
        <form
          onSubmit={handleSendScout}
          className="mt-10 w-full max-w-3xl rounded-3xl bg-white shadow-[0_24px_70px_-24px_rgba(23,23,23,0.25)] ring-1 ring-neutral-900/5 sm:mt-12"
        >
          <div className="flex items-start gap-4 px-5 pt-5 pb-6 sm:px-7">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#c8f14f]">
              <ScoutMark className="h-5 w-5 text-neutral-900" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <label htmlFor="scout-query" className={FIELD_LABEL}>
                What are you looking for?
              </label>
              <input
                id="scout-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Describe what you are looking for…"
                className="mt-1.5 w-full bg-transparent text-lg font-semibold tracking-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none sm:text-xl"
              />
            </div>
          </div>

          <div className="h-px bg-neutral-100" />

          <div className="flex flex-col gap-5 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
            {/* Price range filter */}
            <div className="flex items-center gap-5 sm:gap-7">
              <div>
                <label htmlFor="min-price" className={FIELD_LABEL}>
                  Min price
                </label>
                <div className="mt-0.5 flex items-baseline text-[15px] font-semibold text-neutral-900">
                  <span>$</span>
                  <input
                    id="min-price"
                    inputMode="numeric"
                    value={minPrice}
                    onChange={(event) =>
                      setMinPrice(handlePrice(event.target.value))
                    }
                    placeholder="0"
                    className="w-14 bg-transparent font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="h-9 w-px bg-neutral-200" />

              <div>
                <label htmlFor="max-price" className={FIELD_LABEL}>
                  Max price
                </label>
                <div className="mt-0.5 flex items-baseline text-[15px] font-semibold text-neutral-900">
                  <span>$</span>
                  <input
                    id="max-price"
                    inputMode="numeric"
                    value={maxPrice}
                    onChange={(event) =>
                      setMaxPrice(handlePrice(event.target.value))
                    }
                    placeholder="Any"
                    className="w-14 bg-transparent font-semibold text-neutral-900 placeholder:font-normal placeholder:text-neutral-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="hidden h-9 w-px bg-neutral-200 sm:ml-7 sm:block" />

            {/* Decorative for now — no preferences backend yet */}
            <button
              type="button"
              className="flex w-fit items-center gap-2 text-sm font-medium text-neutral-800 transition-colors hover:text-neutral-950 sm:ml-5"
            >
              <SlidersIcon className="h-4 w-4" />
              Preferences
            </button>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c8f14f] px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-[#bdef38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a4cd39] sm:ml-auto sm:w-auto"
            >
              Send Scout
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* ----------------------------- Suggestions -------------------------- */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          <span className="text-sm text-neutral-400">Try asking for</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] text-neutral-700 shadow-sm ring-1 ring-neutral-900/5 transition hover:text-neutral-950 hover:ring-neutral-900/10"
            >
              <ScoutMark className="h-3.5 w-3.5 text-[#a4cd39]" />
              {suggestion}
            </button>
          ))}
        </div>
      </main>

      {/* ------------------------------ Trust row ---------------------------- */}
      <footer className="relative z-10 mx-auto mt-14 flex w-full max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 pb-12 text-sm text-neutral-600 sm:mt-16 sm:gap-x-10">
        <span className="flex items-center gap-2.5">
          <span className="flex -space-x-2.5" aria-hidden="true">
            {AVATAR_GRADIENTS.map((gradient) => (
              <span
                key={gradient}
                className={`h-7 w-7 rounded-full bg-linear-to-br ring-2 ring-[#f4f4f0] ${gradient}`}
              />
            ))}
          </span>
          <span>
            <span className="font-semibold text-neutral-900">12,000+</span>{" "}
            thoughtful shoppers
          </span>
        </span>

        {TRUST_ITEMS.map((item) => (
          <span key={item} className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            {item}
          </span>
        ))}
      </footer>
    </div>
  );
}




