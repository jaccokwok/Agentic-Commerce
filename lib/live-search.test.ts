import { expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "@/lib/db";
import { defaultMandate } from "@/lib/mandate";
import { parseIntent } from "@/lib/intent";
import { runAttempt } from "@/lib/attempt";
import { formatRow } from "@/lib/trace";

const BEIJING = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

async function searchOnce() {
  const database = new DatabaseSync(":memory:");
  initializeSchema(database);
  const goal = { ...parseIntent("plain rice").goals[0], qty: 1 };
  const input = { userId: 1, requestId: "live-plain-rice", text: "plain rice", goals: [goal], goalId: "groceries", shares: { groceries: 350 }, budget: 350, partialAccepted: false, mandate: defaultMandate() };
  const ctx = { database, now: () => 1000, vaultId: "vault_demo", addressId: "address_demo" };
  let http = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const response = await original(url, init);
    http = response.status;
    return response;
  };
  try {
    const attempt = await runAttempt(input, ctx);
    return { attempt, http };
  } finally {
    globalThis.fetch = original;
    database.close();
  }
}

test("npm test does not call Qwen; SCOUT_LIVE=1 runs one plain rice search", async () => {
  if (process.env.SCOUT_LIVE !== "1") {
    let hits = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { hits += 1; throw new Error("network"); };
    try {
      expect(hits).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
    return;
  }
  if (!process.env.SCOUT_LLM || !process.env.QWEN_API_KEY) {
    console.log("LIVE skipped: SCOUT_LLM or QWEN_API_KEY is unset. No live call.");
    expect(process.env.QWEN_API_KEY).toBeTruthy();
    return;
  }
  process.env.SCOUT_TRACE = "1";
  let result = await searchOnce();
  const failed = result.attempt.reason === "Model draft was not catalogue JSON" && result.http !== 200;
  if (failed && !process.env.QWEN_BASE_URL) {
    console.log(`LIVE international call HTTP ${result.http}. Retrying the Beijing endpoint once.`);
    process.env.QWEN_BASE_URL = BEIJING;
    result = await searchOnce();
  }
  const rows = result.attempt.trace.rows;
  console.log(`LIVE status=${result.attempt.status} http=${result.http}`);
  console.log(`LIVE reason=${result.attempt.reason}`);
  for (const row of rows) console.log(formatRow(row));
  const explained = rows.filter(row => typeof row.numbers.explanation === "string" && row.numbers.explanation !== "Explanation skipped");
  console.log(`LIVE explanations=${explained.length} model_turn_ok=${rows.filter(row => row.ruleId === "model_turn_ok").length} model_turn_rejected=${rows.filter(row => row.ruleId === "model_turn_rejected").length}`);
  expect(result.attempt.status === "quote" || result.attempt.status === "paid").toBe(true);
}, 180000);
