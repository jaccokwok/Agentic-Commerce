# Build steps for the five roles

Last reviewed: 2026-10-03. Branch: `gpt6.1-ivy`.

Read this before editing code. `prompt.md` is the product rule. `tasks/agent-roles.md` is what each role does in each case. `tasks/multi-agent.md` is why the slices are in this order. This file is the change list: which file, which test, when to stop.

Do not overwrite `tasks/plan.md` or `tasks/todo.md`. Those belong to the shop loop that already shipped.

## What you are building

One Next.js process. Five functions share one trace id. There is no new agent framework, no queue, no hosted model, and no second shopper.

| Slice | What changes for a person using the shop | Status |
| --- | --- | --- |
| 0 | Mandate, three offers, mock card, refund does not refill the week | Shipped on this branch |
| 1 | The decision log names shopper, mandate, merchant, auditor, or payer on every row | In the working tree. Not committed. |
| 2 | The winning website may change shipping or the coupon once. A bad counter is refused. | In the working tree. |
| 3 | If card fails before any charge, a mock wallet can pay. The account page can refund. | In the working tree. |
| 4 | Confirming the mandate and the quote signs two mock credentials. A bad signature does not charge. | In the working tree. |
| 5 | Auto mode pays only when the auditor and the payer both accept | In the working tree. 49 tests. Overspend 0. Not committed. |

## What a judge can see today

Slices 0 through 5 are in the working tree. Nothing in this list is committed.

What is in the code:

- The decision log prints one of five names on each line: shopper, mandate, merchant, auditor, payer.
- A catalogue row may include one counter. It may change shipping or the coupon. The shelf stays the shelf. If the new cash is inside the mandate, that cash is the quote and the coupon is reserved. Cash 410 against a per-order limit of 400 is refused and nothing is booked. If the counter text says to ignore the mandate, the auditor drops it. The 24 demo products do not carry a counter, so the party-items click-through does not show one.
- The tender list on the mandate is the payer’s list. Blank means card. `points` stops the payment. `card` then `wallet` tries card first. If card is declined before any charge, one payment is booked with the key `wallet:` plus the original key, for the same cash. If card already charged, wallet is not used. A timeout before any charge stops the payment and does not skip to wallet.
- The account page shows the latest booked cash and cashback. “Refund this receipt” marks that receipt refunded and sets its cashback to 0. The “spent in the preceding 168 hours” number does not go down. A receipt that belongs to someone else is left alone.
- Each new account gets an id `did:mock:` plus the user number. The account page shows it. When the user confirms a quote, the server signs two slips with a key that stays on the server. The intent slip repeats the mandate limits, the tender list, confirm mode, and expiry. The payment slip repeats the cash, the tender, the merchant, and a fingerprint of the quote. The decision log shows the auditor check, then the charge. One changed character in the payment signature, a different merchant, or a different cash total stops the attempt and books nothing. There is no blockchain and no live registry.
- Auto mode has no second payment path. A unique winner calls the same confirm. The log shows the auditor line, then the payer line, then the booking. A tie still asks and books nothing. A tender list of only `points` stops and books nothing. The same auto run with one flipped character in the payment signature stops and books nothing.

`npm test` is 49 tests. The harness prints `Replay scenarios: 13; overspend count: 0`.

## Rules for every slice

1. Write the test named in that slice first. Run it. It must fail for the missing behavior, not for a typo.
2. Write the smallest change that makes that test pass. Do not start the next slice in the same edit.
3. Run `npm test`. All previous tests stay green. The harness prints `Replay scenarios: 13; overspend count: 0`.
4. Do not lower the coverage floor in `CONSTRAINTS.md`.
5. Do not add a dependency. Do not add a second process.
6. Do not put the counter sku into `fixtures/catalog.json`. A new row there changes which balloons win, and the 13 replays move. Pass the counter row through `ctx.catalog` in the test.
7. Money stays in `lib/money.ts`. If a role needs cash, it calls `priceLine` or `createQuote`. It does not add the numbers itself.
8. Commit only when the team asks. One slice per commit when you do.

Proof command for every slice:

```
npm test
```

Focused command while you are inside one file:

```
npm test -- lib/negotiate.test.ts
```

## Who works where

Two people do not edit `lib/attempt.ts` in the same slice. The person on the current slice owns that file. Everyone else stays out of it.

| Person | Owns | Stays out of |
| --- | --- | --- |
| Slice owner | The files named in the current slice | The next slice |
| Demo | The shop click-through: mandate, party items, cash 340, 360 asks, 410 refused, five role names in the log | `lib/` |
| Scorecard | A yes/no mark on each case in `tasks/agent-roles.md` after `npm test` | Code, until a test is actually red |
| Deck | `tasks/artifacts/scout-hackathon.pptx` stays honest about which slice is in the demo | Behavior code |

## Slice 1 — already in the tree

**What a teammate sees.** Open a paid attempt. Each log line starts with a role name.

**Code.** `lib/trace.ts` sets `role` from the step and the rule. Listing drops are auditor. Mandate, the offer limit, and the cash gate are mandate. Negotiate is merchant. Pay is payer. Everything else is shopper. `components/trace-log.tsx` prints the role. An old saved row with no role displays as shopper.

**Proof already written.**

- `lib/trace.test.ts` maps each step to one role.
- `lib/attempt.test.ts` expects a party-items confirm to contain all five names.

**Do this before Slice 2.** Commit the trace change and the weight change in `lib/rank.ts` together, or commit the weight change first and the trace second. Do not mix either of them into the counter-offer commit.

**Stop.** Slice 1 does not add a counter, a wallet, or a signature.

## Task 2: One counter from the winning website

**Description.** The merchant adapter for `taobao`, `hktvmall`, or `pinduoduo` may accept, reject, or return one counter. A counter may change shipping or the coupon. The shopper keeps it only when the new cash passes the mandate. The auditor throws it out when the reason text is an instruction.

**Acceptance criteria:**

- [ ] A counter that stays inside per-item, per-order, the goal share, and the remaining 168 hours becomes the quote, and the coupon is reserved.
- [ ] A counter that makes cash 410 against per-order 400 is refused. The coupon is unused. Nothing is booked.
- [ ] A counter whose reason matches the injection patterns is vetoed by the auditor. The coupon is unused.
- [ ] Accept, `out_of_stock`, `coupon_gone`, and `price_mismatch` behave as they do today.
- [ ] `npm test` is green and the overspend count is 0.

**Dependencies.** Slice 1.

**Files.**

- `lib/catalog.ts` — optional `counter` on an offer: `{ shipping?: number; coupon?: number; reason: string }`. No new row in the JSON fixture.
- `lib/negotiate.ts` — three platform ids share one answer function. Each call checks that the row’s `platform_id` is one of those three and matches the held offer. A counter is returned with coupon `unused` and the adjusted offer. Shelf is copied from the fixture, never from the counter. Missing or negative shipping on the result is a reject.
- `lib/attempt.ts` — `prepare` runs `loadCatalog` on the selected row again. A drop skips that offer. A counter with injection is logged as `listing_injection` (the trace role becomes auditor) and the offer is skipped. A counter that fails `checkQuote` is skipped, not a full terminate, so a later clean offer can still be held. If none remain, the existing “all negotiations rejected” stop still fires. A counter that passes the gate is the offer `createQuote` uses, and the coupon becomes `reserved`.
- `lib/negotiate.test.ts` and `lib/attempt.test.ts` — the three cases above.

**Do not.** Add a second counter. Let the merchant read the budget. Change the 24-row catalogue. Teach the merchant to compute cash.

**Verify.** `npm test`. Then one manual look is enough: the existing demo sku `price-demo` still opens at cash 340, 360 still asks, 410 still cannot be confirmed. The counter is not on that sku.

**Estimated scope.** Medium. Three files plus tests.

**Checkpoint.** Stop. Show the three new tests to the team before Slice 3.

## Task 3: The payer walks tenders, and the account can refund

**Description.** One payer. It tries the mandate’s tender list in order. `card` uses the stored vault. `wallet` uses the same vault and a different idempotency-key prefix. A failure before any charge may try the next tender. A charge that already happened retries the same key and does not start the next tender. Refund marks the receipt, reverses the cashback figure, and leaves `spent7d` unchanged. The account page shows the latest receipt and a refund control.

**Acceptance criteria:**

- [ ] Timeout before any charge books nothing.
- [ ] Timeout after a charge retries the same key and books once.
- [ ] The same key with a different amount does not book the new amount.
- [ ] An expired quote or a mandate revoked inside `book()` writes no row.
- [ ] A tender list with neither `card` nor `wallet` terminates.
- [ ] An empty tender list still allows `card`.
- [ ] Card fails before charge, wallet is next: one booking, on the wallet key.
- [ ] Card already charged, wallet is also listed: wallet is not started.
- [ ] Refund sets `refunded_at`, sets cashback cents to 0, and the next purchase that needed that cash still terminates.
- [ ] The account page shows the booked cash, the cashback, the refunded state, and the existing sentence that a refund does not restore the 168-hour spend.
- [ ] Overspend count stays 0.

**Dependencies.** Task 2 checkpoint.

**Files.**

- `lib/pay.ts` — replace the single `tender !== "card"` check with a walk of `mandate.tenders`. Empty list means `["card"]`. Record whether `book()` was reached. Only then is the key frozen.
- `lib/quote.ts` — the quote tender check must allow `wallet` when the mandate lists it. Today `checkQuote` rejects anything except `card`. Update `lib/quote.test.ts` in the same slice. Today `lib/pay.test.ts` expects an empty tender list to terminate. That expectation flips in this slice: empty allows card. Change that one assertion on purpose and say so in the commit.
- `lib/ledger.ts` — `refund` also sets `cashback_cents` to 0. It does not delete the order and does not change the `spent7d` query. That query already ignores `refunded_at`. Leave it that way.
- `lib/pay.test.ts`, `lib/ledger.test.ts` — one test per acceptance line above. The eight edges listed in `tasks/multi-agent.md` stay, including the ones Slice 0 already covers. Do not delete those tests to make room.
- `app/account/page.tsx` and `app/actions/shop.ts` — load the latest order for this user and post a refund for that key only. Another user’s key is refused.

**Do not.** Start a second payer. Restore `spent7d`. Collect a card number. Let wallet run after a charge exists.

**Verify.** `npm test`. Then sign in, pay the demo, open the account, refund, and confirm the 168-hour figure did not fall. A following search that needs that cash still stops.

**Estimated scope.** Medium. Pay module first, account page second. If the page is not clickable in this session, the ledger tests still have to pass, and the page is the leftover named at the checkpoint.

**Checkpoint.** Stop. The harness line is still overspend 0.

## Task 4: Two mock signatures before charge

**Description.** The user row gains `did:mock:<user id>`. Confirming the mandate writes an intent credential. Confirming a quote, or auto mode about to pay, writes a payment credential. Each is JSON plus a signature from a key that lives in server memory for the demo. The auditor checks both. The payer charges only after that check. No network, no registry, no blockchain.

**Acceptance criteria:**

- [ ] A valid pair books once.
- [ ] One flipped bit on the payment credential terminates with no ledger row.
- [ ] A swapped merchant id or a tampered cash total does the same.
- [ ] The trace shows the auditor’s verify step before the payer’s charge step.
- [ ] Overspend count stays 0.

**Dependencies.** Task 3 checkpoint. The payer must already be the only module that calls `book()`.

**Files.**

- `lib/db.ts` — add `did` on the user row, default `did:mock:<id>` when the column is empty. Same pattern as `vault_id`.
- `lib/credential.ts` — new file. Sign and verify with `node:crypto` HMAC or Ed25519 from a key held in module memory. Intent body: limits, tenders, confirm mode, expiry, did. Payment body: quote hash, cash, tender, merchant id, intent id. The hash is a stable JSON of the quote terms `quoteChanged` already compares.
- `lib/attempt.ts` — write the intent when the mandate is confirmed, write the payment credential at confirm, ask the auditor to verify, and pass only on success into `pay`.
- `lib/pay.ts` — if the context says the credentials failed, return terminate and do not call `book()`.
- `lib/credential.test.ts` — valid pair, flipped bit, swapped merchant.

**Do not.** Import a verifiable-credential library. Call a DID registry. Put the private key in the browser.

**Verify.** `npm test`. The decision log on a paid attempt shows auditor then payer.

**Estimated scope.** Medium.

**Checkpoint.** Stop. This is the trust demo. Do not start auto-pay in the same edit.

## Task 5: Auto pay only when both gates pass

**Description.** The auto path that already confirms a unique winner stays. It gains two required inputs: the auditor’s credential pass, and the payer’s allowed tender. A tie, a price change, a repeat sku, or a bad signature stops for the user.

**Acceptance criteria:**

- [ ] The harness happy path still pays.
- [ ] The tie path still asks.
- [ ] An auto attempt with a broken payment credential does not book.
- [ ] Overspend count stays 0.

**Dependencies.** Task 4 checkpoint.

**Files.**

- `lib/attempt.ts` — the line that auto-confirms calls the auditor verify first. A bad result clarifies or terminates with no pay. Do not add a new auto implementation beside the old one.
- `lib/attempt.test.ts` and `lib/harness.test.ts` — the three cases. The harness file `fixtures/replays.json` stays at 13 scenarios unless a new scenario is added and the printed count is updated in the same test. Prefer asserting inside `lib/attempt.test.ts` so the replay file does not have to grow.

**Do not.** Let auto pay on a tie. Let auto pay skip the cash gate. Let a reward reduce cash so that auto mode can squeeze under the limit.

**Verify.** `npm test`. Click auto mode on a unique winner and confirm it books. Click the tie merchant and confirm it asks.

**Estimated scope.** Small, only because Slices 2–4 already exist. If they do not, this slice is not small and you stop.

## What is deliberately not a task

- A second shopping agent with its own priority. Priority is the weight vector on the one shopper.
- A basket that mixes `merchant_id`s.
- A live Stripe key, a live DID registry, or a public chain.
- A hosted model. The parser stays the function in `lib/intent.ts`.
- A refund that subtracts from `spent7d`.

## After the last green slice

Update the deck from `scripts/hackathon-deck.cjs` so the “specified, not built” column only lists slices that are still unbuilt. Update the status lines in `tasks/multi-agent.md`. Leave `tasks/plan.md` and `tasks/todo.md` alone.
