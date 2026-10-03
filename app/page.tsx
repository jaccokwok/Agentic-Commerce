import GlowBackdrop from "@/components/glow-backdrop";
import { CheckCircleIcon } from "@/components/icons";
import SearchSection from "@/components/search-section";
import SiteHeader from "@/components/site-header";

const TRUST_ITEMS = ["Mock catalogue", "You confirm before payment", "Free to search"];

const AVATAR_GRADIENTS = [
  "from-amber-300 to-orange-400",
  "from-rose-300 to-pink-400",
  "from-sky-300 to-indigo-400",
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4f4f0] font-sans text-neutral-900">
      <GlowBackdrop />

      <SiteHeader />

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

        {/* Search card + suggestions (client component) */}
        <SearchSection />
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
            Search the mock catalogue
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
