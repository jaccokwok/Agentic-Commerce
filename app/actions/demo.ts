"use server";
import { getSessionUser } from "@/lib/auth";
import { authorizeDemo, startDemo, actDemo, readDemo, demoContext, type DemoEvent } from "@/lib/demo-shop";

async function authenticated<T>(fn: (id: number) => T | Promise<T>) {
  try { const u = await getSessionUser(); if (!u) throw new Error("请先登录。"); return { data: await fn(u.id), error: null }; }
  catch (error) { return { data: null, error: error instanceof Error ? error.message : "操作失败，请重试。" }; }
}
export async function demoAuthorizeAction(input: { address: string; hours: number; limit: number; weekly: number; tender: string }) {
  return authenticated(id => authorizeDemo(id, input, Date.now()));
}
export async function demoUnderstandAction(text: string, requestId?: string) { return authenticated(id => startDemo(id, text, demoContext(), requestId)); }
export async function demoActAction(requestId: string, event: DemoEvent) { return authenticated(id => actDemo(id, requestId, event, demoContext())); }
export async function demoReadAction() { return authenticated(id => readDemo(id)); }
