"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, ScoutMark, SlidersIcon } from "@/components/icons";

const SUGGESTIONS = [
  "Carry-on under $180",
  "Non-toxic cookware",
  "Running shoes for wide feet",
];

const INITIAL_QUERY =
  "A quiet espresso machine for a small kitchen, easy to clean, with a steam wand";

const FIELD_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400";

export default function SearchSection() {
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
    <>
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
    </>
  );
}
