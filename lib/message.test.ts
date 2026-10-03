import { expect, test } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { initializeSchema } from "@/lib/db";
import { newTrace } from "@/lib/trace";
import { deliver } from "@/lib/message";
import { websiteHits } from "@/lib/agents";
import { rawOffers } from "@/lib/catalog";
import { spent7d } from "@/lib/ledger";

test("the switchboard finds the merchant, and a charge with no auditor pass does not book", async () => {
  const offer = rawOffers.find(row => row.platform_id === "taobao" && row.stock)!;
  const trace = newTrace();
  const reply = await deliver(trace, { traceId: trace.id, from: "shopper", to: "merchant", type: "negotiate", body: { selected: offer, current: offer, shelf: offer.shelf } }, 1000, "negotiate");
  expect(reply.from).toBe("merchant");
  expect(reply.to).toBe("shopper");
  expect(reply.body.status).toBe("accepted");
  const database = new DatabaseSync(":memory:");
  initializeSchema(database);
  const refused = await deliver(trace, { traceId: trace.id, from: "shopper", to: "payer", type: "charge", body: { input: { vaultId: "vault_x", addressId: "address_x", amount: 10, currency: "HKD", tender: "card", expiresAt: 9, idempotencyKey: "k" }, context: { userId: 1, requestId: "r", goalId: "g", traceId: trace.id, skus: [], cashback: 0, mandate: {}, now: 1000 }, ruleId: "mock_refs_idempotency", cash: 10 } }, 1000, "pay", database);
  expect(refused.from).toBe("payer");
  expect(refused.body.status).toBe("terminate");
  expect(spent7d(1, 1000, database)).toBe(0);
  database.close();
});

test("only the website that owns the row is asked", async () => {
  websiteHits.length = 0;
  const offer = rawOffers.find(row => row.platform_id === "taobao" && row.stock)!;
  const trace = newTrace();
  await deliver(trace, { traceId: trace.id, from: "shopper", to: "merchant", type: "negotiate", body: { selected: offer, current: offer, platform_id: offer.platform_id, shelf: offer.shelf } }, 1000, "negotiate");
  expect(websiteHits).toEqual(["taobao"]);
  const foreign = { ...offer, platform_id: "ebay" };
  const missed = await deliver(trace, { traceId: trace.id, from: "shopper", to: "merchant", type: "negotiate", body: { selected: foreign, current: foreign, platform_id: "ebay", shelf: foreign.shelf } }, 1000, "negotiate");
  expect(missed.body.status).toBe("rejected");
  expect(missed.body.reason).toBe("out_of_stock");
  expect(websiteHits).toEqual(["taobao"]);
});
