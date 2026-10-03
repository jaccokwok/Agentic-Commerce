import type { Goal } from "@/lib/intent";

const LABEL = "font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400";
const INPUT =
  "mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[#a4cd39] focus:outline-none focus:ring-2 focus:ring-[#c8f14f]/40";

export function ShoppingList({
  goals,
  quantities,
  shares,
  requestBudget,
  remainder,
  shareError,
  goalId,
  onQuantity,
  onShare,
  onBudget,
  onGoal,
}: {
  goals: Goal[];
  quantities: Record<string, string>;
  shares: Record<string, string>;
  requestBudget: string;
  remainder: number | null;
  shareError: string | null;
  goalId: string;
  onQuantity: (id: string, value: string) => void;
  onShare: (id: string, value: string) => void;
  onBudget: (value: string) => void;
  onGoal: (id: string) => void;
}) {
  if (goals.length === 0) return null;
  const split = goals.length > 1;

  return (
    <section className="mt-8 w-full max-w-3xl rounded-3xl bg-white p-5 text-left shadow-[0_24px_70px_-24px_rgba(23,23,23,0.25)] ring-1 ring-neutral-900/5 sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight">Shopping list</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Quantities start empty. Search waits until each one is set.
        {split && " Assign each goal a share. Unassigned money stays reserved."}
      </p>
      {split && (
        <div className="mt-4 max-w-xs">
          <label htmlFor="request-budget" className={LABEL}>
            Request budget (HKD)
          </label>
          <input id="request-budget" inputMode="numeric" value={requestBudget} onChange={(event) => onBudget(event.target.value)} className={INPUT} />
          {remainder !== null && <p className="mt-1 text-sm text-neutral-500">Reserved remainder: {remainder} HKD</p>}
          {shareError && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {shareError}
            </p>
          )}
        </div>
      )}
      <ul className="mt-4 space-y-4">
        {goals.map((goal) => (
          <li key={goal.id} className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{goal.label}</h3>
              {split && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="goal" checked={goalId === goal.id} onChange={() => onGoal(goal.id)} />
                  Search this goal
                </label>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {goal.appearance ? `Appearance: ${goal.appearance}. ` : ""}
              {goal.brand ? `Brand: ${goal.brand}. ` : ""}
              Quantity is blank until you set it.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`qty-${goal.id}`} className={LABEL}>
                  Quantity
                </label>
                <input
                  id={`qty-${goal.id}`}
                  inputMode="numeric"
                  value={quantities[goal.id] ?? ""}
                  onChange={(event) => onQuantity(goal.id, event.target.value)}
                  placeholder="Empty"
                  className={INPUT}
                />
              </div>
              {split && (
                <div>
                  <label htmlFor={`share-${goal.id}`} className={LABEL}>
                    Share (HKD)
                  </label>
                  <input
                    id={`share-${goal.id}`}
                    inputMode="numeric"
                    value={shares[goal.id] ?? ""}
                    onChange={(event) => onShare(goal.id, event.target.value)}
                    placeholder="Empty"
                    className={INPUT}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
