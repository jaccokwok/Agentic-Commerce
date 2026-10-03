# Multi-agent commerce, added in slices

Last reviewed: 2026-10-03. Branch: `gpt6.1-ivy`. Product rules in `prompt.md` stay in force. This file is the build order. The behavior contract for every role and every case is `tasks/agent-roles.md`. The step-by-step build, with the exact files and the test that proves each step, is `tasks/build-steps.md`. Neither file replaces `prompt.md` or `tasks/todo.md`.

## What the current system is

Scout is one Next.js process. `lib/attempt.ts` calls plain functions in order: parse, mandate, shares, rank, one catalogue accept-or-reject, quote, mock card pay. `lib/shop-service.ts` stores the mandate, the request, and the attempt in SQLite. The trace is a list of reason rows on that attempt. The harness replays 13 scenarios and requires an overspend count of 0.

That loop already covers a confirmed mandate, a blank shopping list, one merchant and at most three offers, HKD quotes, a gift that changes effective cost and not cash, idempotent mock pay, a timeout before charge, a timeout after pay that retries the same key, and a refund that does not restore the preceding 168 hours.

It is not multi-agent. Nothing negotiates with anything else. The auditor is a filter inside the catalogue load. Payment is `mockPay` of tender `card` using a vault id and an address id. There is no second tender, no payment route, no checkout credential, and no refund button. DID and verifiable credentials are not in the code.

A local, uncommitted edit on this branch lets one explicit weight stay off a sum of 1. Commit that before Slice 1 so the next work starts from a clean tree. Do not merge `bono_v1`.

## What “full multi-agent” means here

Five roles, one orchestrator. They exchange typed messages and a shared trace id. They do not share a hidden global that skips the mandate.


| Role     | Decides                                                                                            | Must not                                                                          |
| -------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Shopper  | Which goal to search, which offer to hold, when to ask the user                                    | Compute money, raise a limit, store a card number                                 |
| Mandate  | Whether the request is inside the confirmed form                                                   | Search or pay                                                                     |
| Merchant | Accept, reject, or one counter-offer for its own catalogue rows                                    | See another merchant’s hidden price, or instruct the shopper to ignore the budget |
| Auditor  | Drop a poisoned row, a higher agent price, or a missing shipping figure, including mid-negotiation | Pay, or delete a clean offer because a sibling was bad                            |
| Payer    | Route a tender, charge, retry the same key, book, refund                                           | Change the quote, or treat a reward as a cash discount                            |


The user remains the only party who can confirm a mandate, break a tie, accept a repeat sku, or accept a new cash total.

Money stays in `lib/money.ts`. Every role reads that result. No role reimplements the five-step formula.

## What stays out

Slices 1–5 are green. The next work is Slices 6–8 in `tasks/build-steps.md`: the same five functions, called by one message object `{ traceId, from, to, type, body }`. `lib/attempt.ts` is still the only composer. A reply is appended before the next step.

- A second process, a queue, or an agent framework. The exchange is an in-process object. It is not a new runtime.
- Slice 6 is only the shopper asking one website. The mandate, the auditor, and the payer stay direct calls until Slices 7 and 8.
- A hosted model. The parser stays deterministic. A model may sit behind the same JSON later, and the harness still must not call one.
- A live Stripe key, a live DID registry, or a public blockchain.
- Cross-merchant baskets. One goal, one merchant, at most three offers, until the orchestrator can already run the five roles.
- Letting a refund reduce `spent7d`. A refund reverses the mock charge and the cashback row. The 168-hour sum still counts the original cash.

`CONSTRAINTS.md` stays as written, including the coverage floor. New slices add tests. They do not lower the floor to pass.

## Build order

```
money + mandate (already exist)
        │
        ▼
Slice 1  role ids on the existing trace
        │
        ▼
Slice 2  merchant counter-offer, auditor can veto the counter
        │
        ▼
Slice 3  payer routes tenders, books, retries, refunds
        │
        ▼
Slice 4  mock DID and two signed credentials checked before pay
        │
        ▼
Slice 5  auto pay only when auditor and payer both accept
        │
        ▼
Slice 6  shopper and one website exchange a message
        │
        ▼
Slice 7  mandate and auditor answer with messages
        │
        ▼
Slice 8  payer charge is one message, wallet stays inside it
        │
        ▼
Slice 9  registry lookup; charge requires credentials_ok
        │
        ▼
Slice 10 one handler per website: taobao, hktvmall, pinduoduo
        │
        ▼
Slice 11 auditor messages for listings and counter text
        │
        ▼
Slice 12 mandate messages for the form, row limits, and expiry
        │
        ▼
Slice 13 shopper names the next message after rank
        │
        ▼
Slice 14 model drafts parse JSON only when SCOUT_LLM is set
        │
        ▼
Slice 15 deck matches the log
        │
        ▼
Slice 16 each role explains its tool result
        │
        ▼
Slice 17 shopper proposes the next legal message
        │
        ▼
Slice 18 one live search, then the deck
```

Each slice keeps `npm test` green and the harness overspend count at 0. Stop after a slice if that fails. Do not start the next slice in the same commit.

## Slice 1 — Name the roles

Status: in the working tree, not committed. Every new trace row has a `role`. The decision log shows it.

The shopper, mandate, merchant, auditor, and payer are the functions that already run. Each trace row gains a `role` field. The page shows that role next to the reason.

The auditor runs before rank and again on the selected offer before negotiate. A poisoned description, a higher `agent_price`, or missing shipping drops that offer only. If every offer drops for missing shipping, the attempt terminates with that reason. Otherwise an empty pool is no offers.

Done when a party-items search trace contains all five role names, a poisoned fixture still leaves a clean offer, and no payment path changes.

Files: `lib/trace.ts`, `lib/attempt.ts`, `components/trace-log.tsx`, the attempt tests.

## Slice 2 — One negotiation round

Status: in the working tree, not committed. A row may carry one counter that changes shipping or the coupon. The shopper keeps it only when the new cash passes the mandate. An instruction in the counter is an auditor veto. Cash 410 against per-order 400 is refused and nothing is booked. The shared 24-row catalogue is unchanged, so the click-through demo does not show a counter yet.

A merchant role is three adapters, one per `platform_id`: `taobao`, `hktvmall`, `pinduoduo`. Each adapter may accept the row, reject it (`out_of_stock`, `coupon_gone`, `price_mismatch`), or return one counter. A counter may change shipping or coupon. It may not change the shelf above `human_price`, omit shipping, or put instructions in the reason text.

The shopper accepts a counter only when the new cash still passes per-item, per-order, the goal share, and the remaining 168-hour budget. The auditor rejects a counter whose text looks like an instruction, and the coupon stays unused. Decline of a counter returns to the offer list and releases the coupon.

There is no second counter. A rejection does not end the attempt while another clean offer remains.

Done when a fixture counter that stays inside the mandate produces a new quote, a counter that would make cash 410 against a 400 per-order limit is refused, and the harness overspend count stays 0.

Files: `lib/negotiate.ts`, `fixtures/catalog.json`, `lib/attempt.ts`, negotiate and attempt tests.

## Slice 3 — Payer, routing, checkout, refund

Status: in the working tree, not committed. A blank tender list charges card. A list with neither card nor wallet stops. If the list is card then wallet, and card is declined before any charge, one row is booked under the key `wallet:` plus the original key. If card already charged, wallet is not started. A timeout before any charge still stops and does not skip to wallet. Refund on the account page sets `refunded_at`, sets cashback to 0, and leaves the 168-hour total unchanged. Another user’s key is ignored.

The payer is the only module that calls `book` and `refund`. The shopper sends it the vault id, the address id, the cash total, the currency, the tender, the quote expiry, and the idempotency key. The payer rejects a card number if one is present.

Routing walks the mandate tender list in order. `card` is the first mock tender and uses the stored vault. A second mock tender, `wallet`, uses the same vault and a different key prefix. An empty tender list still allows `card`. A list that contains neither `card` nor `wallet` terminates. A failed tender does not book, and the payer tries the next tender with a new key only when no charge was attempted. A timeout after a charge retries that same key and does not start the next tender.

Checkout is the quote the user is confirming: items, shipping, currency, tender, reward terms, quote expiry, mandate expiry. Changing any of those voids the previous confirm, which the quote module already does.

Refund is an account action on a paid receipt. It writes `refunded_at`, reverses the cashback figure, and leaves `spent7d` unchanged. The account page shows both numbers and the sentence that a refund does not restore the 168-hour spend.

Edge cases the payer tests must pin, one each: timeout before any charge, timeout after a charge, idempotency key reused with a different amount, quote expired, mandate revoked before book, tender not allowed, refund after pay, two tenders where the first fails before charge and the second pays once.

Done when those tests pass, the account page can refund the latest mock receipt, and a refund does not make a following purchase fit under a rolling limit that the original cash still fills.

Files: `lib/pay.ts`, `lib/ledger.ts`, `app/account/page.tsx`, `app/actions/shop.ts`, pay and ledger tests.

## Slice 4 — Mock DID and verifiable credentials

Status: in the working tree, not committed. A new account stores `did:mock:` plus the user id, and the account page shows it. Confirming a quote signs an intent slip and a payment slip with a server-side key. The auditor checks both before the payer charges. A flipped signature, a swapped merchant, or a changed cash total books nothing. The trace shows that check before the charge line. No network and no blockchain. Slice 5, the extra auto-mode test, is not started.

Add `did:mock:<user id>` on the user row, next to the vault id. No network, no registry.

Two credentials, each a JSON body plus a signature from a key that lives in server memory for this demo:

- Intent credential, written when the user confirms the mandate. It carries the limits, the tender list, the confirm mode, the expiry, and the user’s DID.
- Payment credential, written when the user confirms a quote, or when auto mode is about to pay. It carries the quote hash, the cash total, the tender, the merchant id, and the intent credential’s id.

The payer refuses to charge unless the auditor verifies both signatures, the payment credential matches the current quote, and the intent credential matches the mandate on the attempt. A tampered cash total or a swapped merchant fails closed and does not book.

This is the trust demo. It is not a W3C library and not a blockchain. Swap the signer for a real VC library only after this slice’s tests are the ones that fail for a bad signature.

Done when a valid pair pays once, a flipped bit on the payment credential terminates with no ledger row, and the trace shows the auditor’s verify step before the payer’s charge step.

Files: `lib/credential.ts`, `lib/db.ts`, `lib/pay.ts`, `lib/attempt.ts`, credential tests.

## Slice 5 — Auto pay under both checks

Status: in the working tree, not committed. Auto mode does not have a second cashier. A unique winner calls the same confirm. The decision log shows the auditor’s signature check, then the payer’s charge. A tie still asks and books nothing. A tender list of only `points` stops and books nothing. One flipped character in the payment signature stops an automatic charge and books nothing. The 13 replays still print overspend count 0.

Auto mode pays only when all of these are true: one offer is strictly first, no clarify is open, the merchant accepted or the shopper accepted a counter, the auditor verified both credentials, and the payer’s route has an allowed tender. A tie, a price change, a repeat sku, or a failed signature stops for the user. The existing auto path stays the skeleton. This slice adds the auditor’s pass as a required input to that path.

Done when the harness happy path still pays, the tie path still asks, and an auto attempt with a broken payment credential does not book.

Files: `lib/attempt.ts`, `lib/harness.ts`, attempt and harness tests.

## What is not orchestration yet

Slices 6–18 are in the working tree. `deliver` looks up the role. A charge with no `credentials_ok` does not book. Only the row’s website handler runs. The auditor filters listings and reads a counter reason by message. The mandate answers `validate_form`, `request_conflict`, `filter_limits`, `still_valid`, and the cash gate by message. After rank, the shopper returns the next message: `negotiate` for the winning row, then the next message from that reply. With `SCOUT_LLM` unset, parse stays `parseIntent` and no network call is made. With it set, `complete` may draft goals, quantity, brand, appearance, and a budget hint, and each role may add one explanation after its tool has decided. A model field that names a different cash, status, limit, or signature is dropped. The log says “Explanation skipped” when that call fails. After rank, the shopper model may propose the next `to` and `type`. A match is `model_turn_ok` and that tool message is delivered. `payer`, `charge`, `retry`, or any other difference is `model_turn_rejected`, and the tool message is delivered anyway. A tie never sends `negotiate`. Shares, weights, rank, the 72-hour sku check, `priceLine`, and the `book()` guard stay tools. One live red balloons search returned HTTP 200 and ended at a quote. Cash stayed 60 HKD. The first proposal was `model_turn_ok`. Two later proposals were `model_turn_rejected`, and the tool message was sent. The 13 replay statuses are unchanged and overspend count is 0. The deck names the explanation line and those two rule ids. There is no LangChain. `npm run demo` prints every replay. `npm run live` repeats that one search.

## Slice 6 — One message to one website

Status: in the working tree, not committed. `deliver` in `lib/message.ts` is the only way the shopper reaches the merchant, the mandate, the auditor, and the payer. Each reply is logged as `from → to` before the next step. A bad signature produces no payer line. No model and no LangChain. 50 tests. Overspend count 0.

Done when a paid attempt shows those two directed lines before the charge, a counter reply does not change the shelf, a reject leaves the coupon unused, and the harness still prints overspend count 0.

Files: `lib/message.ts`, `lib/trace.ts`, `lib/attempt.ts`, `components/trace-log.tsx`, attempt tests.

## Branch rules

Work continues on `gpt6.1-ivy`. Commit the weight-sum change first. Then one slice per commit, in the order above. Push that branch. Merge it to `main` only after Slice 3 is green if the hackathon deadline cuts the rest; say in the demo which slices landed.

`bono_v1` stays as the other implementation. Do not merge it. Its useful difference, a weight that need not sum to 1, is the uncommitted edit already on this branch.

## Demo line

Sign in. Confirm a mandate. The account page shows `did:mock:` plus the user id. Search party items, set quantities and shares, and accept that one goal may finish without the other. Three offers come from one merchant. The counter is in the tests, not on this click-through sku. Confirming signs the payment slip, the auditor line appears, then the payer charges `card` through the vault id. The account page shows the booked cash, the cashback, and a refund that does not give the 168-hour budget back. A second run with a broken signature stops before any charge. Auto mode, also in the tests, books a unique winner the same way, asks on a tie, and books nothing when the signature is flipped. The harness still prints an overspend count of 0.