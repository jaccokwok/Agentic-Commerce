"use server";

import { getSessionUser } from "@/lib/auth";
import { saveMandate, createRequest, searchRequest, actOnAttempt, type RequestDraft } from "@/lib/shop-service";
import type { Mandate } from "@/lib/mandate";
import type { AttemptEvent } from "@/lib/attempt";
import { redirect } from "next/navigation";
import { receipt, refund, spent7d } from "@/lib/ledger";
import { confirmMockPurchase, runMockShoppingRequest, type MockShoppingOffer } from "@/lib/agents";

export async function mockSearchAction(request: string) {
  if (typeof request !== "string" || request.trim().length === 0 || request.length > 500) {
    throw new Error("Enter a request of 1 to 500 characters.");
  }
  return runMockShoppingRequest(request.trim());
}

export async function mockConfirmAction(offer: MockShoppingOffer | null, mandateLimit: number) {
  return confirmMockPurchase(offer, mandateLimit);
}

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
export async function refundAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  const key = String(formData.get("key") ?? "");
  const row = receipt(key);
  if (row && row.user_id === user.id && row.refunded_at == null) refund(user.id, key, Date.now());
  redirect("/account");
}
