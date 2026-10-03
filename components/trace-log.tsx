import type { TraceRow } from "@/lib/trace";

export function TraceLog({ traceId, rows }: { traceId: string; rows: TraceRow[] }) {
  if (!traceId) return null;

  return (
    <section className="mt-8 w-full max-w-3xl rounded-3xl bg-white p-5 text-left ring-1 ring-neutral-900/5 sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight">Trace</h2>
      <p className="mt-1 font-mono text-sm text-neutral-700">{traceId}</p>
      <ol className="mt-4 space-y-2">
        {rows.map((row, index) => (
          <li key={`${row.step}-${row.rule}-${index}`} className="text-sm text-neutral-700">
            <span className="font-medium">{row.step}</span>
            <span className="text-neutral-400"> · </span>
            {row.rule}
            <span className="mt-0.5 block text-neutral-500">{row.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
