import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb, type UserRow } from "@/lib/db";
import { validateMandate, checkMandate, type Mandate } from "@/lib/mandate";
import { parseIntent, type Goal } from "@/lib/intent";
import { CATEGORY_IDS } from "@/lib/catalog";
import { checkAllocations } from "@/lib/allocation";
import { spent7d } from "@/lib/ledger";
import { runAttempt, advanceAttempt, type Attempt, type AttemptEvent } from "@/lib/attempt";

export type RequestDraft = { text: string; goals: Goal[]; shares: Record<string, number | null>; budget: number; partialAccepted: boolean };
export type ShoppingRequest = RequestDraft & { id: string; userId: number; revision: number; mandate: Mandate; createdAt: number };
function userRecord(userId: number, db: DatabaseSync): UserRow {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
  if (!user) throw new Error("Please sign in before shopping");
  return user;
}
function ownedPayload<T>(table: "attempts" | "shopping_requests", userId: number, id: string, db: DatabaseSync): T {
  if (typeof id !== "string" || id.length > 100) throw new Error("Invalid reference");
  const row = db.prepare(`SELECT payload FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!row) throw new Error("This reference does not belong to your account");
  return JSON.parse(String(row.payload)) as T;
}
function storeAttempt(a: Attempt, db: DatabaseSync) {
  db.prepare("INSERT INTO attempts (id, user_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload").run(a.id, a.input.userId, JSON.stringify(a));
  return a;
}
export async function saveMandate(userId: number, mandate: Mandate, db = getDb()) {
  const user = userRecord(userId, db);
  const errors = validateMandate(mandate);
  if (errors.length) throw new Error(errors.join("; "));
  db.prepare("UPDATE users SET mandate_json = ?, mandate_revision = mandate_revision + 1 WHERE id = ?").run(JSON.stringify(mandate), userId);
  for (const row of db.prepare("SELECT payload FROM attempts WHERE user_id = ?").all(userId)) {
    const attempt = JSON.parse(String(row.payload)) as Attempt;
    if (!["paid", "terminate"].includes(attempt.status)) {
      attempt.input.mandate.revoked = true;
      storeAttempt(await advanceAttempt(attempt, { type: "cancel" }, { database: db, now: () => Date.now(), vaultId: user.vault_id, addressId: user.address_id }), db);
    }
  }
  return mandate;
}
export function createRequest(userId: number, draft: RequestDraft, now: number, db = getDb()): ShoppingRequest {
  const user = userRecord(userId, db);
  if (!user.mandate_json) throw new Error("Confirm the mandate form first");
  const mandate = JSON.parse(user.mandate_json) as Mandate;
  const valid = checkMandate(mandate, now);
  if (valid.status !== "ready") throw new Error(valid.reason);
  const parsed = parseIntent(draft.text);
  if (parsed.status === "terminate") throw new Error(parsed.reason);
  if (!Array.isArray(draft.goals) || !draft.goals.length || draft.goals.length > 2 || draft.goals.some(g =>
    !g || !CATEGORY_IDS.includes(g.categoryId) || g.id !== g.categoryId || !Number.isSafeInteger(g.qty) || (g.qty ?? 0) < 1 || (g.qty ?? 0) > 10000 ||
    typeof g.label !== "string" || g.label.length > 100 || (g.brand !== null && typeof g.brand !== "string") || (g.appearance !== null && typeof g.appearance !== "string")) ||
    new Set(draft.goals.map(g => g.id)).size !== draft.goals.length) throw new Error("Set valid catalogue goals and positive whole quantities");
  if (!draft.shares || typeof draft.shares !== "object" || Object.keys(draft.shares).length !== draft.goals.length || draft.goals.some(g => !(g.id in draft.shares))) throw new Error("Set a share for each goal");
  if (draft.goals.length > 1 && draft.partialAccepted !== true) throw new Error("Accept possible partial completion before splitting");
  const allocation = checkAllocations(draft.shares, draft.budget, mandate.rolling7d - spent7d(userId, now, db));
  if (allocation.status !== "ready") throw new Error(allocation.reason);
  const request: ShoppingRequest = { ...draft, id: randomUUID(), userId, revision: user.mandate_revision, mandate, createdAt: now };
  db.prepare("INSERT INTO shopping_requests (id, user_id, payload) VALUES (?, ?, ?)").run(request.id, userId, JSON.stringify(request));
  return request;
}
export async function searchRequest(userId: number, requestId: string, goalId: string, merchantId: string | undefined, preferencesAccepted: boolean, now: number, db = getDb()): Promise<Attempt> {
  const user = userRecord(userId, db);
  const request = ownedPayload<ShoppingRequest>("shopping_requests", userId, requestId, db);
  if (request.revision !== user.mandate_revision) throw new Error("Mandate changed. Start a new request under the confirmed form.");
  if (typeof goalId !== "string" || !request.goals.some(g => g.id === goalId) || (merchantId !== undefined && (typeof merchantId !== "string" || merchantId.length > 100))) throw new Error("Invalid goal or merchant");
  const attempt = await runAttempt({ userId, requestId, text: request.text, goals: request.goals, goalId, shares: request.shares, budget: request.budget,
    partialAccepted: request.partialAccepted, mandate: request.mandate, merchantId, preferencesAccepted },
    { database: db, now: () => now, vaultId: user.vault_id, addressId: user.address_id,
      authorize: () => { if (userRecord(userId, db).mandate_revision !== request.revision) throw new Error("Mandate changed before booking"); } });
  return storeAttempt(attempt, db);
}
export async function actOnAttempt(userId: number, attemptId: string, event: AttemptEvent, now: number, db = getDb()): Promise<Attempt> {
  const user = userRecord(userId, db);
  const attempt = ownedPayload<Attempt>("attempts", userId, attemptId, db);
  const request = ownedPayload<ShoppingRequest>("shopping_requests", userId, attempt.input.requestId, db);
  if (!event || !["select", "confirm", "price_change", "accept_repeat", "retry", "decline", "cancel", "tick"].includes(event.type)) throw new Error("Invalid attempt action");
  if ((event.type === "confirm" && !Number.isSafeInteger(event.version)) || (event.type === "select" && typeof event.skuId !== "string") || (event.type === "price_change" && ![360, 410].includes(event.cashTotal))) throw new Error("Invalid action value");
  if (request.revision !== user.mandate_revision) attempt.input.mandate.revoked = true;
  const advanced = await advanceAttempt(attempt, event, { database: db, now: () => now, vaultId: user.vault_id, addressId: user.address_id,
    authorize: () => { if (userRecord(userId, db).mandate_revision !== request.revision) throw new Error("Mandate changed before booking"); } });
  return storeAttempt(advanced, db);
}
