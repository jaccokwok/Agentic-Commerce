import type { Trace } from "@/lib/trace";

export default function TraceLog({ trace }: { trace: Trace }) {
  return <section className="shop-panel">
    <h2>Decision log</h2>
    <p className="shop-muted break-all">Trace ID: {trace.id}</p>
    <ol className="mt-4 space-y-3">{trace.rows.map((row, i) => <li key={i} className="border-t border-neutral-200 pt-3 text-sm">
      <p className="font-semibold">{row.from && row.to ? `${row.from} → ${row.to}` : row.role} · {row.step} · {row.ruleId}</p>
      <p>{row.reason}</p>
      <dl className="mt-1 space-y-1">{Object.entries(row.numbers).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => <div className="grid grid-cols-[9rem_1fr] gap-2" key={key}>
        <dt className="shop-muted">{key}</dt><dd className="break-all">{String(value)}</dd>
      </div>)}</dl>
    </li>)}</ol>
  </section>;
}
