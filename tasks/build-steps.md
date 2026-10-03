# Build steps for the five roles

Last reviewed: 2026-10-03. Branch: `gpt6.1-ivy`.

Read this before editing code. `prompt.md` is the product rule. `tasks/agent-roles.md` is what each role does in each case. `tasks/multi-agent.md` is why the slices are in this order. This file is the change list: which file, which test, when to stop.

Do not overwrite `tasks/plan.md` or `tasks/todo.md`. Those belong to the shop loop that already shipped.

## What you are building

One Next.js process. Five roles share one trace id. `deliver` is the switchboard. There is no agent framework, no queue, and no second shopper. A model may draft the parse JSON when `SCOUT_LLM` is set. Slice 16 lets each role add one explanation after its tool has already decided. Slice 17 lets the shopper propose the next legal message, and a proposal that does not match is refused. Slice 18 ran one live red balloons search. It ended at a quote. The tools still price, sign, and book.

| Slice | What changes for a person using the shop | Status |
| --- | --- | --- |
| 0 | Mandate, three offers, mock card, refund does not refill the week | Shipped on this branch |
| 1 | The decision log names shopper, mandate, merchant, auditor, or payer on every row | In the working tree. Not committed. |
| 2 | The winning website may change shipping or the coupon once. A bad counter is refused. | In the working tree. |
| 3 | If card fails before any charge, a mock wallet can pay. The account page can refund. | In the working tree. |
| 4 | Confirming the mandate and the quote signs two mock credentials. A bad signature does not charge. | In the working tree. |
| 5 | Auto mode pays only when the auditor and the payer both accept | In the working tree. 49 tests. Overspend 0. Committed when you said so. |
| 6 | The shopper asks one website with a message. The website answers with a message. | In the working tree. |
| 7 | The mandate and the auditor answer with messages. A bad signature is a message, and pay is not sent. | In the working tree. |
| 8 | The payer’s charge and its reply are messages. Wallet stays inside that one payer. | In the working tree. 50 tests. Overspend 0. Not committed. |
| 9 | The switchboard looks up the role. A charge with no auditor ok does not book. | In the working tree. |
| 10 | Taobao, HKTV Mall, and Pinduoduo each have a handler. Only the row’s website is asked. | In the working tree. 52 tests. Overspend 0. Not committed. |
| 11 | The auditor is asked, by message, to filter listings and to read a counter reason. | In the working tree. |
| 12 | The mandate is asked, by message, about the form, the row limits, and expiry. | In the working tree. 54 tests. Overspend 0. Not committed. |
| 13 | After rank, the shopper agent names the next message. The script no longer calls prepare in a private loop. | In the working tree. 55 tests. Overspend 0. Not committed. |
| 14 | A model may draft the parse JSON only when `SCOUT_LLM` is set. Tests leave it unset. | In the working tree. 57 tests. Overspend 0. No live call: no key is present. Not committed. |
| 15 | The deck and this file match the log. They do not claim a model is on. | In the working tree. Deck names deliver and the message types. No live model call is claimed. |
| Demo | `npm run demo` prints every replay and the extra paths. The app prints the same lines. | In the working tree. |
| 16 | Each role may explain its own tool result when `SCOUT_LLM` is set. The tool’s numbers stay. | In the working tree. 59 tests. Overspend 0. No live call. Not committed. |
| 17 | The shopper model may propose the next legal message. A bad proposal is refused and the code’s message is sent. | In the working tree. 60 tests. Overspend 0. Replay statuses unchanged. No live call. Not committed. |
| 18 | One live “red balloons” search, then the deck says each role may speak and the tools decide. | In the working tree. One search ended at a quote. HTTP 200. Cash stayed 60 HKD. 1 model_turn_ok, 2 model_turn_rejected. Not committed. |

## What a judge can see today

Slices 0 through 18 are in the working tree, plus the terminal walkthrough. The model switch is off unless `SCOUT_LLM` is set. One live “red balloons” search returned HTTP 200 and ended at a quote. The tool cash was 60 HKD. Twelve arrows carried an explanation. The first proposal was `model_turn_ok` for `negotiate`. The next two were `model_turn_rejected`, and the tool message was sent. A sentence cannot change cash, status, the coupon, or a signature. A tie still asks and does not negotiate. The deck names the explanation line, `model_turn_ok`, and `model_turn_rejected`. There is no LangChain. `npm test` leaves the switch unset. `npm run demo` prints every replay. `npm run live` repeats that one search. While `npm run dev` is running, the same one-line steps print in the server terminal.

What is in the code:

- The decision log prints one of five names on each line: shopper, mandate, merchant, auditor, payer.
- A catalogue row may include one counter. It may change shipping or the coupon. The shelf stays the shelf. If the new cash is inside the mandate, that cash is the quote and the coupon is reserved. Cash 410 against a per-order limit of 400 is refused and nothing is booked. If the counter text says to ignore the mandate, the auditor drops it. The 24 demo products do not carry a counter, so the party-items click-through does not show one.
- The tender list on the mandate is the payer’s list. Blank means card. `points` stops the payment. `card` then `wallet` tries card first. If card is declined before any charge, one payment is booked with the key `wallet:` plus the original key, for the same cash. If card already charged, wallet is not used. A timeout before any charge stops the payment and does not skip to wallet.
- The account page shows the latest booked cash and cashback. “Refund this receipt” marks that receipt refunded and sets its cashback to 0. The “spent in the preceding 168 hours” number does not go down. A receipt that belongs to someone else is left alone.
- Each new account gets an id `did:mock:` plus the user number. The account page shows it. When the user confirms a quote, the server signs two slips with a key that stays on the server. The intent slip repeats the mandate limits, the tender list, confirm mode, and expiry. The payment slip repeats the cash, the tender, the merchant, and a fingerprint of the quote. The decision log shows the auditor check, then the charge. One changed character in the payment signature, a different merchant, or a different cash total stops the attempt and books nothing. There is no blockchain and no live registry.
- Auto mode has no second payment path. A unique winner calls the same confirm. The log shows the auditor line, then the payer line, then the booking. A tie still asks and books nothing. A tender list of only `points` stops and books nothing. The same auto run with one flipped character in the payment signature stops and books nothing.
- The shopper does not call the other roles directly. It sends `{ traceId, from, to, type, body }` through `deliver`. The switchboard looks up the role. The log prints `shopper → merchant`, then `merchant → shopper`, then `mandate → shopper`, then `auditor → shopper`, then `payer → shopper`. A charge with no auditor pass does not book. Only the website named on the row is asked: Taobao, HKTV Mall, or Pinduoduo. A bad signature has no payer line. There is no LangChain. A model call happens only when `SCOUT_LLM` is set, and only to draft the parse. That switch is unset, so this tree made no model call.

`npm test` is 61 tests. The harness prints `Replay scenarios: 13; overspend count: 0`. With `SCOUT_LLM` unset, the shopper uses the local parser and does not call the network. A Qwen draft is used only when that switch and `QWEN_API_KEY` are set in `.env.local`. The draft may name goals, quantity, brand, appearance, and a budget hint. It cannot change the mandate. Cash is still computed in `lib/money.ts`. Search asks the auditor with `filter_catalog` before rank. A counter instruction is `review_text`. The form check is `validate_form`. A hint that fights the form is `request_conflict`. Row limits are one `filter_limits` message. An open attempt re-checks the form with `still_valid`. After rank, the shopper names the next message. On a normal catalogue that message is `negotiate` to the merchant and it carries the winning row’s `platform_id`. A reject, a vetoed counter, or a counter that fails the cash gate asks the next of the three. If none remain, the attempt stops with “All catalogue negotiations rejected.” A tie never sends that negotiate. This loop does not charge. Pay still happens after confirm.

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

## Task 6: The shopper and one website exchange messages

**Description.** A call between roles becomes one object, not a new process. `lib/attempt.ts` remains the only composer. It sends `{ traceId, from, to, type, body }` and appends the reply before the next step. Slice 6 does this for one pair only: the shopper asks the merchant, and the merchant answers accept, reject, or one counter. The other calls stay function calls until their own slice.

**Acceptance criteria:**

- [ ] A message is `{ traceId, from, to, type, body }`. `from` and `to` are the five role names. There is no second shopper and no second payer.
- [ ] On a paid attempt the decision log shows `shopper → merchant` for `negotiate`, then `merchant → shopper` for `accepted`, before the charge line.
- [ ] A counter reply keeps the shelf from the catalogue row and may change shipping or the coupon. The coupon stays unused until the mandate gate passes.
- [ ] A reject reply leaves the coupon unused and the shopper may ask the next of the three. If all three reject, the attempt still stops with “All catalogue negotiations rejected.”
- [ ] `npm test` stays green and the harness still prints `Replay scenarios: 13; overspend count: 0`.

**Dependencies.** Task 5. Slices 1–5 stay green.

**Files.**

- `lib/message.ts` — the message type and one `exchange` function. It writes the outbound row and the reply row. It does not open a socket, a queue, or a second process.
- `lib/trace.ts` — a row may carry `from` and `to`. Old rows with only `role` still render.
- `lib/attempt.ts` — the `negotiate` call goes through `exchange`. Do not route parse, rank, the cash gate, the signature check, or `mockPay` in this slice.
- `components/trace-log.tsx` — when `from` and `to` are present, print `shopper → merchant`. Otherwise keep `role · step · ruleId`.
- `lib/attempt.test.ts` — the accepted reply and the counter reply above.

**Do not.** Add a dependency. Add an agent framework. Let the merchant call the payer. Let two websites answer one order. Change `fixtures/catalog.json`.

**Verify.** `npm test`. On a paid attempt the log shows the shopper’s ask and the website’s answer as two directed lines.

**Estimated scope.** Medium. One pair of roles.

**Checkpoint.** Stop. Do not route the mandate, the auditor, or the payer in the same edit.

## Task 7: Mandate and auditor replies are messages

**Description.** The cash gate and the signature check become replies on the same trace id. The payer is not asked unless the auditor’s reply says the two slips match.

**Acceptance criteria:**

- [ ] A quote that passes shows `shopper → mandate` and `mandate → shopper` with the cash total in the body.
- [ ] A quote that fails the per-order limit shows a mandate reply of terminate, and no pay message is written.
- [ ] A valid confirm shows `shopper → auditor` and `auditor → shopper` with `credentials_ok` before any payer line.
- [ ] One flipped character shows `credentials_bad` from the auditor. No payer message. Nothing is booked.
- [ ] Overspend count stays 0.

**Dependencies.** Task 6 checkpoint.

**Files.** `lib/attempt.ts`, `lib/message.ts`, `lib/attempt.test.ts`. The check functions stay in `lib/quote.ts` and `lib/credential.ts`. The orchestrator calls them. They do not call each other.

**Do not.** Start the payer message. Move money math out of `lib/money.ts`.

**Verify.** `npm test`.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 8: The payer answers with one message

**Description.** After the auditor’s ok reply, the orchestrator sends one pay message. The payer’s reply is paid, clarify, or terminate. Card then wallet stays inside that reply. A second payer is not a second message.

**Acceptance criteria:**

- [ ] A card charge shows `shopper → payer` and `payer → shopper` with status paid, the cash, and the idempotency key.
- [ ] Card declined before charge, with wallet next, is still one pay message. The reply books `wallet:` once.
- [ ] Timeout before charge is a terminate reply and does not book.
- [ ] Timeout after charge is a clarify reply for the same key. The retry does not send a second payer into the attempt.
- [ ] Overspend count stays 0.

**Dependencies.** Task 7 checkpoint.

**Files.** `lib/attempt.ts`, `lib/pay.ts` only if the reply must expose the tender that booked, `lib/attempt.test.ts`, `lib/pay.test.ts`.

**Do not.** Add a queue. Add a live card charge. Let the payer change the quote.

**Verify.** `npm test`.

**Estimated scope.** Medium.

**Checkpoint.** Stop. Update the deck only after this slice is green, so the deck does not claim messages that are not in the log yet.

## What is still a direct call

Slices 6–8 made four conversations into messages: negotiate, the cash gate on a held quote, the two slips, and the charge. `lib/attempt.ts` still calls the rest itself, and it still picks the agent object by hand. These are the gaps, in the order a shopping trip actually runs.

| Step in the trip | What the code does today | Slice that closes it |
| --- | --- | --- |
| Read the sentence | `parseIntent` inside the shopper. No model. | 14, and only as a draft |
| Check the form is alive | `validate_form` message | Done in Slice 12 |
| The sentence fights the form | `request_conflict` message | Done in Slice 12 |
| Shares and weights | `checkAllocations` and `resolveWeights` inside the shopper | Stays inside the shopper. Not a message. |
| Drop bad catalogue rows | `filter_catalog` message | Done in Slice 11 |
| Drop rows over the cash limits | `filter_limits` message | Done in Slice 12 |
| Rank one seller | `rankOffers` inside the shopper | Stays inside the shopper. Not a message. |
| Ask the website | `deliver` to one shared merchant agent | 10 splits that agent by website |
| Read a counter’s reason | `review_text` message | Done in Slice 11 |
| Gate the held quote | `deliver` to the mandate | Done in Slice 7 |
| Same sku inside 72 hours | `recentSkus` inside the shopper | Stays inside the shopper. Not a message. |
| Form expires while the attempt is open | `still_valid` message | Done in Slice 12 |
| Catalogue changed at confirm | `filter_catalog`, then `quoteChanged` asks the user | Listing filter is Slice 11. The price ask stays the user’s. |
| Check the two slips | `deliver` to the auditor | Done in Slice 7 |
| Charge | `deliver` to the payer, but the caller passes the payer object in | 9 |
| Re-check cash inside `book()` | `checkQuote` in the payer’s guard, in the same write | Stays a tool call. A message here would sit outside the write. |
| Build the cash number | `createQuote` / `priceLine` | Stays in `lib/money.ts`. No role, and no model, redoes it. |

## Task 9: The switchboard looks up the role

**Description.** `deliver` today takes the agent object as an argument, so the caller can hand a charge to the wrong function. After this slice, `deliver(trace, message, at, step)` finds the handler from `message.to`. A `charge` or `retry` message is refused unless this trace already has an auditor reply of `credentials_ok` to the shopper.

**Acceptance criteria:**

- [ ] `lib/attempt.ts` no longer passes `merchantAgent`, `mandateAgent`, `auditorAgent`, or `payerAgent` into `deliver`.
- [ ] A message whose `to` is `merchant` is handled by the merchant handler. The reply’s `from` is `merchant`.
- [ ] A `charge` message on a trace with no `credentials_ok` row does not call `book()`. The reply is terminate. `spent7d` stays unchanged.
- [ ] The happy path still books once, and the log order is still merchant reply, then mandate cash gate, then auditor `credentials_ok`, then payer `mock_refs_idempotency`.
- [ ] Overspend count stays 0.

**Dependencies.** Task 8.

**Files.** `lib/message.ts`, `lib/agents.ts`, `lib/attempt.ts`, `lib/message.test.ts`, `lib/attempt.test.ts`.

**Do not.** Add a queue. Make `handle` async in this slice. Let the payer import the shopper.

**Verify.** `npm test`.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 10: One handler per website

**Description.** `merchantAgent` is one function for all three sites. `negotiate` already rejects a platform mismatch, but the shopper does not address a website. This slice registers three handlers, `taobao`, `hktvmall`, and `pinduoduo`. The message `to` stays `merchant`. The body carries `platform_id`. The registry calls only that handler. The log line still reads `shopper → merchant`, and the platform id is one of the logged numbers.

**Acceptance criteria:**

- [ ] A Taobao row is handled by the Taobao handler. The HKTV Mall handler is not called on that message.
- [ ] A row whose `platform_id` is not one of the three, or does not match the handler, replies `out_of_stock`. The coupon stays unused.
- [ ] A counter from the matching website still cannot change the shelf.
- [ ] The other two websites stay silent on that order. There is still one `merchant_id` on the quote.
- [ ] Overspend count stays 0.

**Dependencies.** Task 9 checkpoint.

**Files.** `lib/agents.ts`, `lib/message.ts`, `lib/negotiate.ts` only if the platform check must be callable per handler, `lib/attempt.test.ts`.

**Do not.** Add three Role names. The five names on the log stay shopper, mandate, merchant, auditor, payer. Do not let two websites reply to one offer.

**Verify.** `npm test`.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 11: The auditor is asked about listings

**Description.** `loadCatalog` and `hasInjection` still run inside `runAttempt` and `prepare`. The auditor agent never sees them. This slice sends one message per check. The auditor calls those functions as tools and replies. The shopper acts on the reply.

**Acceptance criteria:**

- [ ] Search sends `shopper → auditor` with type `filter_catalog`. The reply lists each dropped sku and its rule: `listing_injection`, `agent_surcharge`, `shipping_missing`, or `invalid_offer`. A clean sibling stays in the reply.
- [ ] If every row is dropped, the attempt terminates and nothing is booked. The omitted-shipping replay still terminates.
- [ ] A counter whose reason matches the injection patterns sends `shopper → auditor` with type `review_text`. The reply is a veto. That offer is skipped. The coupon stays unused. The existing `listing_injection` rule id is still on the trace.
- [ ] Confirm re-reads the selected row with `filter_catalog`. A dropped or missing row terminates with “Current catalogue offer rejected” or “Offer no longer exists”. A changed fingerprint still asks the user. The model is not asked.
- [ ] Poisoned-listing and agent-surcharge replays still pay. Overspend count stays 0.

**Dependencies.** Task 10 checkpoint.

**Files.** `lib/agents.ts`, `lib/attempt.ts`, `lib/attempt.test.ts`. `lib/catalog.ts` stays the tool. The auditor does not reimplement the drop rules.

**Do not.** Delete a clean offer because its sibling was bad. Let the auditor call `mockPay`.

**Verify.** `npm test`.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 12: The mandate is asked about the form and the rows

**Description.** The cash gate on a held quote is already a message. The form check, the request conflict, the per-row limit during search, and the expiry check in `advanceAttempt` are still direct calls. This slice makes each of those a mandate reply. The reason strings stay the ones the tests already expect.

**Acceptance criteria:**

- [ ] Start of an attempt sends `shopper → mandate` type `validate_form`. Revoked, expired, or a broken field replies terminate with “Mandate revoked or expired” or the form error. Nothing is searched.
- [ ] A budget hint above per-order, or a denied merchant or category, sends type `request_conflict`. The reply is clarify. The user can edit the form or the request. Decline terminates.
- [ ] Search sends one `shopper → mandate` type `filter_limits`. The reply names the sku ids that fail per-item, per-order, the share, or the remaining 168 hours. Those rows are not ranked. Each failure is still logged as `offer_limit`.
- [ ] `advanceAttempt` sends type `still_valid` before it handles the event. A form that expired or was revoked replies terminate with “Mandate revoked or expired”.
- [ ] The cash gate message from Slice 7 still runs on the held quote. Overspend count stays 0.

**Dependencies.** Task 11 checkpoint.

**Files.** `lib/agents.ts`, `lib/attempt.ts`, `lib/attempt.test.ts`, `lib/mandate.test.ts` only if a reason string must be shared.

**Do not.** Let the mandate search or pay. Let a message raise `perItem`, `perOrder`, or `rolling7d`. Move the `book()` guard out of the payer. That guard stays `checkQuote` inside the write.

**Verify.** `npm test`.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 13: The shopper names the next message after rank

**Description.** After rank, `runAttempt` still loops over the three offers and calls `prepare` itself. This slice moves that loop into the shopper agent. The shopper returns the next message, or a stop. The switchboard delivers it and gives the reply back to the shopper. The shopper then returns the next message. Parse, shares, weights, and rank stay inside the shopper and are not fake messages to itself.

**Acceptance criteria:**

- [x] On a normal catalogue the shopper’s first outgoing message after rank is `negotiate` to `merchant`, with the winning row’s `platform_id`.
- [x] An `accepted` reply that passes the cash gate ends the loop at status `quote`. Manual mode waits. Auto mode still confirms through the same pay messages.
- [x] A `rejected` reply, a vetoed counter, or a counter that fails the cash gate makes the shopper send `negotiate` for the next of the three. The coupon stays unused on each skip.
- [x] When no offer remains, the shopper stops the loop. The reason is still “All catalogue negotiations rejected.”
- [x] A tie never enters this loop. The user is asked first. Overspend count stays 0.

**Dependencies.** Task 12 checkpoint. Slices 9–12 must already be messages, or this loop has nothing to send.

**Files.** `lib/agents.ts`, `lib/attempt.ts`, `lib/attempt.test.ts`.

**Do not.** Add a second shopper. Let the shopper compute cash. Let the shopper set `to: payer` from this loop. Pay happens only in `advanceAttempt` after confirm.

**Verify.** `npm test`.

**Estimated scope.** Medium. This is the risky slice. If the 13 replay statuses move, revert this slice and stop.

**Checkpoint.** Stop. Read the replay line before Slice 14.

## Task 14: A model may draft the parse, and only the parse

**Description.** `handle` and `deliver` become async because a model call is async. `runAttempt`, `advanceAttempt`, and `lib/shop-service.ts` await them. When `SCOUT_LLM` is unset, the shopper uses `parseIntent` and no network call is made. When it is set, one server function `complete` sends the sentence and must get back JSON with goals, qty, brand, appearance, and budget hint. That JSON is then checked by the same mandate rules as a typed form. The key stays in the server environment.

**Acceptance criteria:**

- [x] With `SCOUT_LLM` unset, `npm test` makes no network call. Party items still become snacks and balloons with blank quantities. The harness prints overspend count 0.
- [x] A test double that returns `{ goals, qty, brand, appearance, budgetHint }` for “red balloons” produces the same goal as `parseIntent`.
- [x] A test double that tries to raise per-order, add a merchant, or switch confirm mode does not change the form. The mandate reply is clarify or the proposal is ignored. Nothing is booked.
- [x] A test double that returns text that is not that JSON asks or stops. The text is not executed.
- [x] The merchant, mandate, auditor, and payer handlers do not call `complete`. Cash, the two slips, and `book()` are unchanged.
- [x] No LangChain and no new agent framework. One `fetch` to the provider is enough inside `complete`.

**Dependencies.** Task 13 checkpoint.

**Files.** `lib/message.ts`, `lib/agents.ts`, `lib/attempt.ts`, `lib/shop-service.ts`, `lib/intent.ts`, a new `lib/complete.ts`, `lib/attempt.test.ts`. Do not add the provider SDK unless `fetch` cannot speak its API. Do not commit a key.

**Do not.** Call `complete` from the harness. Let the model omit shipping, treat a gift as cash, or choose the tender. Let the model run when `SCOUT_LLM` is unset.

**Verify.** `npm test` with the variable unset. Then one manual check with the variable set, if a key is present: the same “red balloons” sentence still ends at a quote or a paid attempt, and the log still shows the five arrows. If no key is present, say so and do not pretend the live call was made.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 15: The deck matches the log

**Description.** After Slice 14, update `scripts/hackathon-deck.cjs` and the “What a judge can see today” section above. Every message type that is in the code is on a slide. The model slide says the call is off unless `SCOUT_LLM` is set, and that cash is still computed in `lib/money.ts`.

**Acceptance criteria:**

- [x] The deck names `deliver`, the five arrows, the three website handlers, and the rule that a charge needs `credentials_ok` first.
- [x] The deck does not say LangChain is used.
- [x] The deck does not say a live model was called if the demo has no key.
- [x] `npm test` is unchanged by this slice. It is a documentation slice.

**Dependencies.** Task 14 checkpoint.

**Files.** `scripts/hackathon-deck.cjs`, `tasks/artifacts/scout-hackathon.pptx`, this file, `tasks/multi-agent.md`.

**Do not.** Change shopping behavior in this slice.

**Verify.** Rebuild the deck and run the Office XML check. `npm test`.

**Estimated scope.** Small.

**Checkpoint.** Stop. The message loop is in the tree. Slices 16–18 are the speaking loop.

## Task 16: Each role explains its own tool result

**Description.** The tool runs first. When `SCOUT_LLM` is set, that role calls `complete` with its own short prompt and the tool result. The model may return `{ "explanation": "..." }` only. The log stores that sentence on the reply. Cash, status, coupon, sku, shipping, and the signature stay the tool’s values. A model field that tries to change them is dropped. If Qwen fails or returns other text, the tool result still stands and the log says the explanation was skipped. When the switch is unset, no network call is made.

**Acceptance criteria:**

- [x] With `SCOUT_LLM` unset, `npm test` makes no network call. The harness prints overspend count 0.
- [x] A test double for the merchant, mandate, auditor, payer, and shopper stores one explanation on that role’s reply. The status, cash, and signature stay the tool’s values.
- [x] A test double that returns a higher cash, a raised limit, or `ok: true` on a bad signature does not change the tool result. Nothing extra is booked.
- [x] The harness does not set `SCOUT_LLM`.

**Dependencies.** Task 15 checkpoint. The terminal walkthrough is already in the tree.

**Files.** `lib/complete.ts`, `lib/agents.ts`, `lib/attempt.ts`, `lib/trace.ts`, `lib/attempt.test.ts`.

**Do not.** Let the model price a line, omit shipping, raise a limit, clear a poisoned listing, sign a slip, or call `book()`. Add LangChain.

**Verify.** `npm test` with the variable unset.

**Estimated scope.** Medium.

**Checkpoint.** Stop.

## Task 17: The shopper proposes the next legal message

**Description.** After a reply, when `SCOUT_LLM` is set, the shopper model returns `{ "to", "type" }` from a closed list: `negotiate`, `review_text`, `filter_catalog`, `check_cash`, `validate_form`, `still_valid`, `request_conflict`, `filter_limits`, or stop. The code compares that proposal with the message `shopperTurn` would have sent. A match is logged `model_turn_ok` and delivered. A difference is logged `model_turn_rejected` and the code’s message is delivered. `payer`, `charge`, and `retry` from this loop are refused. Pay stays after confirm.

**Acceptance criteria:**

- [x] A matching proposal is the message that is delivered, and the log says `model_turn_ok`.
- [x] A proposal of `payer`, `charge`, or `retry` is refused. The code’s message is delivered. The log says `model_turn_rejected`.
- [x] A tie still asks and never sends `negotiate`.
- [x] If any of the 13 replay statuses move, revert this slice and stop. Overspend count stays 0.

**Dependencies.** Task 16 checkpoint.

**Files.** `lib/agents.ts`, `lib/attempt.ts`, `lib/attempt.test.ts`.

**Do not.** Let this loop send `charge`. Let a rejected proposal change cash or the coupon.

**Verify.** `npm test`.

**Estimated scope.** Medium. This is the risky slice.

**Checkpoint.** Stop. Read the replay line before Slice 18.

## Task 18: One live search, then the deck

**Description.** With the key loaded by the app, one “red balloons” search shows the parse draft and an explanation on each arrow, and still ends at a quote or a paid attempt. `npm test` leaves `SCOUT_LLM` unset. The deck says each role may speak, the tools decide, and there is no LangChain. If the international DashScope address rejects the key, set `QWEN_BASE_URL` and run that one search again. If no live call succeeds, say so.

**Acceptance criteria:**

- [x] `npm test` makes no network call.
- [x] The deck names the explanation line and `model_turn_ok` / `model_turn_rejected`.
- [x] The deck does not say LangChain is used.
- [x] The deck does not say a live call was made unless that search was actually run.

**Dependencies.** Task 17 checkpoint.

**Files.** `scripts/hackathon-deck.cjs`, `tasks/artifacts/scout-hackathon.pptx`, this file, `tasks/multi-agent.md`.

**Do not.** Change shopping behavior in the deck edit. Commit a key.

**Verify.** Rebuild the deck and run the Office XML check. `npm test`. One manual search only if the key is present.

**Estimated scope.** Small.

**Checkpoint.** Stop.

## What is deliberately not a task

- A second shopping agent with its own priority. Priority is the weight vector on the one shopper.
- A basket that mixes `merchant_id`s.
- A live Stripe key, a live DID registry, or a public chain.
- A model that prices a line, omits shipping, raises a limit, clears a poisoned listing, signs a slip, or calls `book()`. Slices 16 and 17 allow an explanation and a proposed next message. The tool result wins.
- LangChain, a queue, a second process, or a second shopper.
- A refund that subtracts from `spent7d`.

## After the last green slice

Update the deck from `scripts/hackathon-deck.cjs` so the “specified, not built” column only lists slices that are still unbuilt. Update the status lines in `tasks/multi-agent.md`. Leave `tasks/plan.md` and `tasks/todo.md` alone.
