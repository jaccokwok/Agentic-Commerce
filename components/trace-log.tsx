import type { Trace } from "@/lib/trace";

export default function TraceLog({ trace }: { trace: Trace }) {
  return <section className="shop-panel">
    <h2>Decision log</h2><p className="shop-muted break-all">Trace ID: {trace.id}</p>
    <ol className="mt-4 space-y-3">{trace.rows.map((row, i) => <li key={i} className="border-t border-neutral-200 pt-3 text-sm">
      <p className="font-semibold">{row.role ?? "shopper"} · {row.step} · {row.ruleId}</p><p>{row.reason}</p>
      <p className="shop-muted break-all">{Object.entries(row.numbers).map(([key, value]) => `${key}: ${value ?? "none"}`).join(" · ")}</p>
    </li>)}</ol>
  </section>;
}
