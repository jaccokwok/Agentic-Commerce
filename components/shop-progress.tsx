"use client";

import { useEffect, useRef, useState } from "react";
import { progressStory } from "@/lib/progress-story";
import type { TraceRow } from "@/lib/trace";

const LINE_MS = 1000;

export function devStage(status: string | null, rows: Pick<TraceRow, "step" | "ruleId">[]): string {
  const last = rows.at(-1);
  if (last) return `stage: ${last.step} · ${last.ruleId}`;
  return status ? `stage: ${status}` : "stage: idle";
}

export default function ShopProgress({ rows, status, busy }: { rows: TraceRow[]; status: string | null; busy: boolean }) {
  const lines = progressStory(rows, status);
  const signature = lines.join("\n");
  const previous = useRef("");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const extended = previous.current.length > 0 && signature.startsWith(previous.current);
    previous.current = signature;
    if (!extended) setShown(0);
  }, [signature]);

  useEffect(() => {
    if (shown >= lines.length) return;
    const timer = window.setTimeout(() => setShown((count) => count + 1), LINE_MS);
    return () => window.clearTimeout(timer);
  }, [shown, lines.length, signature]);

  const visible = lines.slice(0, shown);
  const working = busy && shown >= lines.length;

  return (
    <div className="mt-6 w-full pl-2 text-left text-sm sm:pl-6">
      <ol aria-live="polite">
        {visible.length === 0 && !working && <li className="text-neutral-400">Waiting for a request.</li>}
        {visible.map((line, index) => (
          <li key={`${line}-${index}`} className={`shop-progress-line ${index === visible.length - 1 && !working ? "text-neutral-800" : "text-neutral-500"}`}>
            {line}
          </li>
        ))}
        {working && <li className="text-neutral-800">Shopper is working through the next step.</li>}
      </ol>
      <p className="mt-3 font-mono text-xs text-neutral-500">{devStage(status, rows)}</p>
    </div>
  );
}
