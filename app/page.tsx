import SearchSection from "@/components/search-section";

export default function Home() {
  return <main className="min-h-screen bg-[#f4f4f0] px-5 text-neutral-900 sm:px-8">
    <header className="mx-auto flex max-w-4xl items-center justify-between border-b border-neutral-300 py-5 text-xs font-semibold uppercase tracking-widest">
      <span>Scout</span><span className="text-neutral-500">Agentic commerce · Demo</span>
    </header>
    <div className="mx-auto max-w-4xl pt-16 sm:pt-24">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">Five-agent shopping</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-medium leading-tight sm:text-5xl">What should we find?</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">One request, compared across Taobao, HKTV Mall, and Pinduoduo. Purchases are simulated.</p>
      <SearchSection />
    </div>
  </main>;
}
