# Tasks: Scout buying loop

Source of truth for behavior: `prompt.md`. Order and decisions: `tasks/plan.md`. Do these in order. A task is done when its acceptance checks and its verify command pass.

## Task 1: Add Vitest and `npm test`

**Description:** The repo has no test script. Add Vitest so later tasks can run one file.

**Acceptance criteria:**

- [x] `npm test` runs Vitest once and exits 0
- [x] A smoke test imports a lib module path via `@/`

**Verification:**

- [x] Tests pass: `npm test`
- [x] Build succeeds: not required for this task
- [x] Manual check: `package.json` scripts contain `test`

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `lib/smoke.test.ts`

**Estimated scope:** Small: 1-2 files of logic, plus the Vitest dependency

## Task 2: Money formula and HKD rates

**Description:** Implement the five cash steps and the fixed FX table. Pin the worked example.

**Acceptance criteria:**

- [x] Shelf 200 × qty 2 with coupon 80 and shipping 30 returns line 400, merchandise 320, `cash_total` 350
- [x] `per_item` reads the line total before the coupon
- [x] Missing shipping is rejected by this function
- [x] When rewards are on, a gift of 100 makes `effective_cost = cash_total − 50`. When rewards are off, `effective_cost = cash_total`
- [x] `effective_cost` does not change `cash_total`
- [x] A non-HKD shelf converts with the fixed table and the result carries the rate timestamp

**Verification:**

- [x] Tests pass: `npm test -- lib/money.test.ts lib/fx.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 1

**Files likely touched:**

- `lib/money.ts`
- `lib/money.test.ts`
- `lib/fx.ts`
- `lib/fx.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 3: Catalog fixtures and offer drops

**Description:** Check in mock offers for Taobao, HKTV Mall, and Pinduoduo. Load them and drop offers the agent must not follow.

**Acceptance criteria:**

- [x] Every offer has `sku_id`, `platform_id`, `merchant_id`, `category_id`, shelf, shipping, currency, rating, purchase count, `human_price`, `agent_price`, coupon, reward, and description or review text
- [x] `platform_id` and `merchant_id` are both stored
- [x] An offer whose description tells the agent to change the budget or pay is dropped
- [x] An offer with `agent_price` above `human_price` is dropped
- [x] An offer with no shipping is rejected, not treated as zero
- [x] At least one clean offer remains in the fixture set
- [x] One pair of clean offers is an exact score tie for a later test

**Verification:**

- [x] Tests pass: `npm test -- lib/catalog.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 1

**Files likely touched:**

- `fixtures/catalog.json`
- `lib/catalog.ts`
- `lib/catalog.test.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 1-3

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] Money and catalog do not import React or the database

## Task 4: Mandate record, defaults, and conflict routing

**Description:** Represent the mandate form and decide clarify versus terminate.

**Acceptance criteria:**

- [x] An unset mandate is manual confirm, one merchant per order, rewards included, and no expiry
- [x] An empty merchant allow list means every merchant except the deny list
- [x] Category ids that are not in the fixture tree fail validation
- [x] A request that conflicts with a valid mandate returns clarify and does not pay
- [x] An expired, revoked, or invalid mandate returns terminate
- [x] A preference cannot raise `per_item`, `per_order`, or the rolling limit

**Verification:**

- [x] Tests pass: `npm test -- lib/mandate.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 1

**Files likely touched:**

- `lib/mandate.ts`
- `lib/mandate.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 5: Intent parser

**Description:** Map shopping text to JSON with the deterministic parser. Do not call a model and do not build SQL.

**Acceptance criteria:**

- [x] “Party items” returns an editable list of snacks and balloons
- [x] Quantities are null until the caller sets them
- [x] “Red balloons” sets appearance on the balloon goal
- [x] A budget hint is stored and does not change the mandate limits
- [x] Text that tells the agent to ignore the mandate returns terminate
- [x] Two shopping goals return two goal objects

**Verification:**

- [x] Tests pass: `npm test -- lib/intent.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 1

**Files likely touched:**

- `lib/intent.ts`
- `lib/intent.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 6: Sub-request budget shares

**Description:** Split goals share one rolling budget. The user assigns the shares.

**Acceptance criteria:**

- [x] A new split starts with blank amounts
- [x] Search is blocked until every goal has an amount and the amounts fit the request budget
- [x] Unassigned remainder stays reserved
- [x] One goal cannot spend another goal’s share
- [x] The rolling 7-day limit still applies on top of the shares

**Verification:**

- [x] Tests pass: `npm test -- lib/allocation.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 2, Task 5

**Files likely touched:**

- `lib/allocation.ts`
- `lib/allocation.test.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 4-6

- [x] `npm test` passes
- [x] Parser output cannot change a mandate number

## Task 7: Rank top 3

**Description:** Score clean offers and return three for one goal and one merchant.

**Acceptance criteria:**

- [x] Default weights are 0.35, 0.25, 0.15, 0.10, 0.15 and each result shows them
- [x] An explicit weight overrides a weight inferred from the text
- [x] A conflict between those two returns clarify
- [x] Cash weight uses `cash_total`. Reward changes only `effective_cost`, and only when rewards are on
- [x] A `sku_id` in the purchase history scores higher than the same offer without history
- [x] The result is one merchant and at most three offers
- [x] An exact tie returns clarify instead of an automatic winner

**Verification:**

- [x] Tests pass: `npm test -- lib/rank.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 2, Task 3, Task 4

**Files likely touched:**

- `lib/rank.ts`
- `lib/rank.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 8: Quote snapshot

**Description:** Freeze the numbers the user confirms. Later changes void that confirm.

**Acceptance criteria:**

- [x] The quote stores `cash_total`, items, shipping, currency, tender, reward terms, and both expiry clocks
- [x] Search timeout is 15 seconds unless the mandate max search time is lower
- [x] Clarify timeout is 120 seconds
- [x] A change to cash, items, shipping, currency, tender, or reward terms marks the confirm void
- [x] A confirm does not pass when `cash_total` exceeds `per_item`, `per_order`, the goal share, or the remaining 168-hour budget

**Verification:**

- [x] Tests pass: `npm test -- lib/quote.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 2, Task 7

**Files likely touched:**

- `lib/quote.ts`
- `lib/quote.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 9: Ledger, vault id, and address id

**Description:** Persist spending and create the two ids pay will send. This is the only schema change.

**Acceptance criteria:**

- [x] `book()` writes `cash_total` into `spent_7d` only after a successful pay
- [x] A refund does not reduce `spent_7d`
- [x] The window is the preceding 168 hours
- [x] Registration stores a vault id and an address id
- [x] The same `sku_id` purchased inside 72 hours is visible to the clarify check

**Verification:**

- [x] Tests pass: `npm test -- lib/ledger.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: a new registration row has both ids

**Dependencies:** Task 2

**Files likely touched:**

- `lib/db.ts`
- `lib/ledger.ts`
- `lib/ledger.test.ts`
- `app/actions/auth.ts`

**Estimated scope:** Medium: 3-5 files

## Task 10: Catalogue negotiation

**Description:** One request to the fixture catalogue. Accept or reject. Reject releases the coupon.

**Acceptance criteria:**

- [x] Accept leaves the coupon reserved and allows quote
- [x] Reject does not pay and returns the coupon to unused
- [x] The reason is one of: coupon gone, out of stock, or price no longer matches
- [x] A rejection does not terminate the whole attempt when another offer is clean

**Verification:**

- [x] Tests pass: `npm test -- lib/negotiate.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 2, Task 3

**Files likely touched:**

- `lib/negotiate.ts`
- `lib/negotiate.test.ts`

**Estimated scope:** Small: 1-2 files

## Task 11: Mock pay

**Description:** Mock the agentic pay call with the stored ids and an idempotency key.

**Acceptance criteria:**

- [x] The call receives the vault id, address id, amount, currency, and expiry
- [x] The call does not accept a card number
- [x] Tender must be `card` and must be allowed by the mandate list
- [x] A timeout before any charge terminates
- [x] A second attempt with the same idempotency key does not book twice
- [x] A failed attempt does not call `book()`

**Verification:**

- [x] Tests pass: `npm test -- lib/pay.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Task 8, Task 9

**Files likely touched:**

- `lib/pay.ts`
- `lib/pay.test.ts`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 7-11

- [x] `npm test` passes
- [x] `npx tsc --noEmit` passes
- [x] No pay test sends a PAN

## Task 12: Attempt runner and trace

**Description:** Compose the modules for one attempt. Append a reason for each step under one trace id.

**Acceptance criteria:**

- [x] One trace id covers parse, mandate check, search, rank, negotiate, quote, and pay
- [x] Each row has the rule id and the numbers used
- [x] The runner returns clarify, terminate, or a quote ready to confirm
- [x] Tests pass a clock in. They do not wait 15 or 120 seconds
- [x] Rollback and terminate release the coupon

**Verification:**

- [x] Tests pass: `npm test -- lib/attempt.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: none

**Dependencies:** Tasks 4 through 11

**Files likely touched:**

- `lib/trace.ts`
- `lib/attempt.ts`
- `lib/attempt.test.ts`

**Estimated scope:** Medium: 3-5 files

## Task 13: Overspend harness

**Description:** Replay a fixed scenario file and count overspends.

**Acceptance criteria:**

- [x] Overspend means `cash_total` broke a mandate, reward reduced cash, or shipping was omitted
- [x] The replay set includes one pass and the abnormal stops named in `prompt.md`: clarify timeout, expired mandate, insufficient budget, user injection, poisoned listing, agent surcharge, omitted shipping, price rollback, refund that does not restore budget, and failed negotiation
- [x] The reported overspend count is 0
- [x] The harness does not call a network model

**Verification:**

- [x] Tests pass: `npm test -- lib/harness.test.ts`
- [x] Build succeeds: `npx tsc --noEmit`
- [x] Manual check: the test output prints the overspend count

**Dependencies:** Task 12

**Files likely touched:**

- `fixtures/replays.json`
- `lib/harness.ts`
- `lib/harness.test.ts`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 12-13

- [x] `npm test` passes
- [x] Overspend count is 0
- [x] Do not start the screens if this checkpoint fails

## Task 14: Remove false landing claims

**Description:** The footer claims a shopper count, secure checkout, and a sponsored-result policy. Remove those claims.

**Acceptance criteria:**

- [x] The landing page does not state a shopper count
- [x] It does not say checkout is secure
- [x] It does not say results are unsponsored

**Verification:**

- [x] Tests pass: no new test required
- [x] Build succeeds: `npm run build`
- [x] Manual check: load `/` and read the footer

**Dependencies:** None

**Files likely touched:**

- `app/page.tsx`

**Estimated scope:** Small: 1-2 files

## Task 15: Mandate form

**Description:** The user can fill, correct, and confirm the mandate before a search.

**Acceptance criteria:**

- [x] The form includes every field listed in `prompt.md`
- [x] Defaults match Task 4
- [x] The parser can fill the form from the request text
- [x] Search stays disabled until the user confirms the form
- [x] Invalid numbers are shown on the field

**Verification:**

- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: submit an empty per-order limit and see the validation message

**Dependencies:** Task 4, Task 5

**Files likely touched:**

- `components/mandate-form.tsx`
- `app/page.tsx`

**Estimated scope:** Small: 1-2 files

## Task 16: Shopping list

**Description:** A vague request becomes a list. Quantities start blank.

**Acceptance criteria:**

- [x] “Party items” shows snacks and balloons
- [x] Quantities are empty
- [x] Search does not run until the user sets quantities
- [x] Two goals show blank share inputs and do not search until the shares fit

**Verification:**

- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: the party-items demo list appears with empty quantities

**Dependencies:** Task 5, Task 6, Task 15

**Files likely touched:**

- `components/search-section.tsx`
- `components/shopping-list.tsx`

**Estimated scope:** Small: 1-2 files

## Task 17: Offers and trace

**Description:** After search, show three offers and the reason log.

**Acceptance criteria:**

- [x] The screen shows at most three offers from one merchant
- [x] Each offer shows the weight breakdown, `cash_total`, and `effective_cost`
- [x] The trace id and each step’s reason are visible
- [x] Clicking an offer selects it and does not pay

**Verification:**

- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: run the demo search and read the trace

**Dependencies:** Task 12, Task 16

**Files likely touched:**

- `app/actions/shop.ts`
- `components/offer-list.tsx`
- `components/trace-log.tsx`

**Estimated scope:** Medium: 3-5 files

## Task 18: Clarify, confirm, price change

**Description:** Dialogs for the cases that must pause, then mock pay on confirm.

**Acceptance criteria:**

- [x] A tie asks the user to choose
- [x] Manual mode requires a confirm click on the quote
- [x] Auto mode pays only when one offer is strictly first and no clarify is open
- [x] A cash move from 340 to 360 voids the confirm. Decline returns to search and the coupon is unused
- [x] A confirm that would make cash 410 against a 400 per-order limit is rejected
- [x] Clarify with no answer within the injected timeout terminates

**Verification:**

- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: walk the price-change decline and the 410 rejection

**Dependencies:** Task 8, Task 10, Task 11, Task 17

**Files likely touched:**

- `components/flow-dialogs.tsx`
- `components/offer-list.tsx`
- `app/actions/shop.ts`

**Estimated scope:** Medium: 3-5 files

## Task 19: Account refs and 7-day note

**Description:** Show the ids pay uses, and explain that refunds do not restore the rolling budget.

**Acceptance criteria:**

- [x] `/account` shows the vault id and address id
- [x] The page states that a refund does not restore the preceding 168-hour spend
- [x] `spent_7d` on that page matches the ledger

**Verification:**

- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: register, open `/account`, and read both ids and the refund sentence

**Dependencies:** Task 9

**Files likely touched:**

- `app/account/page.tsx`

**Estimated scope:** Small: 1-2 files

## Checkpoint: Demo

- [x] `npm test` passes
- [x] `npm run lint` and `npx tsc --noEmit` pass
- [x] `npm run build` passes
- [x] The demo script in `tasks/plan.md` can be clicked through
- [ ] Stop for human review
