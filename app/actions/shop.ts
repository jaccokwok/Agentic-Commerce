"use server";

import { getSessionUser } from "@/lib/auth";
import { saveMandate, createRequest, searchRequest, actOnAttempt, type RequestDraft } from "@/lib/shop-service";
import type { Mandate } from "@/lib/mandate";
import type { AttemptEvent } from "@/lib/attempt";
import { spent7d } from "@/lib/ledger";

async function authenticated<T>(run: (userId: number) => T | Promise<T>) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to save your mandate and use mock checkout", data: null };
  try { return { error: null, data: await run(user.id) }; }
  catch (error) { return { error: error instanceof Error ? error.message : "Internal server error; no further purchasing action", data: null }; }
}
export async function mandateAction(mandate: Mandate) {
  return authenticated(id => saveMandate(id, mandate));
}
export async function requestAction(draft: RequestDraft) {
  return authenticated(id => createRequest(id, draft, Date.now()));
}
export async function searchAction(requestId: string, goalId: string, merchantId?: string, preferencesAccepted = false) {
  return authenticated(id => searchRequest(id, requestId, goalId, merchantId, preferencesAccepted, Date.now()));
}
export async function attemptAction(attemptId: string, event: AttemptEvent) {
  return authenticated(id => actOnAttempt(id, attemptId, event, Date.now()));
}
export async function spendingAction() {
  return authenticated(id => spent7d(id, Date.now()));
}
