# Implementation Plan: Scout buying loop

## Overview

Turn the landing page into the buying loop in `prompt.md`. The user sets a mandate, describes a purchase, sees three mock offers from one merchant, and confirms before a mock Stripe pay call. Money limits are computed in code. The replay harness must report 0 overspends. Identity (register, login, session) already exists and stays as it is.

Product rules stay in `prompt.md`. This file is the implementation plan. Tasks are in `tasks/todo.md`.

## Capability map

| Module | Responsibility | Depends on |
| --- | --- | --- |
| `money` | Line, coupon, shipping, `cash_total`, `effective_cost`, FX | — |
| `catalog` | Fixture offers, drop poisoned text and higher `agent_price` | — |
| `mandate` | Form record, defaults, validation, clarify vs terminate | identity |
| `intent` | Text to JSON, blank quantities, split goals | `mandate` |
| `rank` | Weights, one merchant, top 3, ties | `catalog`, `money`, `mandate` |
| `checkout` | Quote, one-shot catalogue accept/reject, mock pay, ledger | `rank`, `mandate`, identity |
| `harness` | Replay and the overspend count | `money`, `catalog`, `rank`, `checkout` |

Build order: test runner, then `money` and `catalog`, then `mandate`, `intent`, `rank`, `checkout`, then `harness`, then the screens. A trace is a list of reason rows the attempt runner appends. It is not its own module.

`money` and `catalog` can be written in parallel after the test runner. The UI waits until the attempt runner exists.

## Architecture decisions

- `prompt.md` is the product spec, including the approved defaults at the bottom. Do not split it into one spec file per module.
- Pure functions return the numbers and a reason string. `lib/attempt.ts` is the only composer. It creates the trace id and appends those reasons.
- The model does not compute money, shipping, or whether a limit passed.
- This release parses with a deterministic function into `{ goals, qty, brand, appearance, budgetHint }`. The user confirms the form. No hosted LLM and no SQL string.
- Quote currency is HKD. `lib/fx.ts` holds a fixed rate table and puts the rate timestamp on the quote.
- Default weights: relevance 0.35, cash 0.25, rating 0.15, purchase count 0.10, history 0.15.
- When rewards are on, `effective_cost = cash_total − gift × 0.5`. A gift of 100 lowers the ranking cost by 50. When rewards are off, `effective_cost = cash_total`. The gift never changes `cash_total` or `spent_7d`.
- Worked example the tests must pin: shelf 200 × qty 2 = line 400. Coupon 80 leaves 320. Shipping 30 makes `cash_total` 350. If 340 remains on the rolling budget, the order stops.
- Unset mandate: manual confirm, one merchant per order, rewards included, no expiry. Empty merchant allow list means every merchant except the deny list.
- Split goals start with blank amounts. The user assigns each goal a share. Unassigned money stays reserved.
- Vault id and address id are created at registration and sent on pay. The pay call never receives a card number. The only mock tender is `card`.
- Negotiation is one catalogue lookup. Accept continues. Reject releases the coupon and does not pay.
- Search timeout is 15 seconds, capped by the mandate. Clarify timeout is 120 seconds. Tests inject the clock. They do not sleep.
- A timeout before any charge terminates. A timeout after pay retries the same idempotency key.
- User-input injection terminates the attempt. A poisoned listing or `agent_price` above `human_price` drops that offer only.
- Repeated purchase means the same `sku_id` within 72 hours and opens clarify.
- Refunds do not reduce `spent_7d`. The account page says so.
- Overspend means `cash_total` broke a mandate, reward reduced cash, or shipping was omitted. The harness count on the replay set must be 0.
- Tests are added with the behavior, in the same task, using Vitest. The repo has no test script until Task 1.

## Commands

```
Dev: npm run dev
Lint: npm run lint
Types: npx tsc --noEmit
Test: npm test
Build: npm run build
```

`npm test` does not exist until Task 1. Later tasks use `npm test` for the files they add.

## Project structure

```
prompt.md                 product rules
CONSTRAINTS.md            quality floor
tasks/plan.md             this plan
tasks/todo.md             ordered tasks
fixtures/catalog.json     mock offers
fixtures/replays.json     harness scenarios
lib/money.ts              cash formula
lib/fx.ts                 HKD rates
lib/catalog.ts            load fixtures and drop bad offers
lib/mandate.ts            record, defaults, conflict routing
lib/intent.ts             text to JSON
lib/allocation.ts         sub-request shares
lib/rank.ts               top 3
lib/quote.ts              snapshot and expiry
lib/negotiate.ts          one catalogue request
lib/ledger.ts             book(), spent_7d, refunds
lib/pay.ts                mock ACP pay
lib/trace.ts              trace id and reason rows
lib/attempt.ts            composer
lib/harness.ts            replay and overspend count
app/actions/shop.ts       server entry for one attempt
components/               mandate form, list, offers, dialogs, trace
```

Existing auth files stay: `lib/db.ts`, `lib/auth.ts`, `app/actions/auth.ts`, `app/account/page.tsx`.

## Code style

Match the existing TypeScript. One function returns the money result:

```ts
export function priceLine(input: {
  shelf: number;
  qty: number;
  coupon: number;
  shipping: number;
  giftValue: number;
  includeRewards: boolean;
}): { lineTotal: number; cashTotal: number; effectiveCost: number; reason: string }
```

Money is integer HKD cents inside the module and converted at the edge only if a fixture is stored in dollars. The worked example in `prompt.md` is in HKD whole units. Tests use those whole units so the example stays readable. Do not add a second money library.

## Testing strategy

Vitest, files named `lib/*.test.ts` next to the module. Each task adds the tests for its acceptance criteria before the implementation is called done. The harness task replays `fixtures/replays.json` and asserts the overspend count is 0. UI tasks are checked with `npm run build` and a manual pass of the demo script. No browser suite in this release.

## Boundaries

- Always: follow `prompt.md` and `CONSTRAINTS.md`. Add a test in the same task as the behavior. Keep card numbers out of the pay call.
- Ask first: a new hosted LLM, a real Stripe key, a live scrape, or a dependency that is not Vitest.
- Never: let the parser or a fixture text raise a mandate limit, omit shipping, reduce `cash_total` by a reward, or skip a failing test to go green.

## Success criteria

- `npm test` passes, and the harness reports 0 overspends.
- `npm run lint` and `npx tsc --noEmit` pass.
- The demo can be clicked: manual confirm, per-item 250 HKD, per-order 400 HKD, rolling 7d 1000 HKD, rewards on, “party items for 8, red balloons, budget 350”. The list appears with empty quantities. Search waits. Three offers show a weight breakdown and a trace id. A tie asks the user. A move from 340 to 360 asks again and declining releases the coupon. A confirm that would make cash 410 is rejected.
- The footer no longer claims a shopper count, secure checkout, or sponsored-result policy that the app does not implement.

## Task list

### Phase 1: Kernel

- [x] Task 1: Add Vitest and `npm test`
- [x] Task 2: Money formula and HKD rates
- [x] Task 3: Catalog fixtures and offer drops

### Checkpoint: Kernel

- [x] `npm test` passes for money, FX, and catalog
- [x] `npm run lint` passes

### Phase 2: Request

- [x] Task 4: Mandate record, defaults, and conflict routing
- [x] Task 5: Intent parser
- [x] Task 6: Sub-request budget shares

### Checkpoint: Request

- [x] Tests cover party items, blank qty, injection, expired mandate, and allocation

### Phase 3: Choose and pay

- [x] Task 7: Rank top 3
- [x] Task 8: Quote snapshot
- [x] Task 9: Ledger, vault id, and address id
- [x] Task 10: Catalogue negotiation
- [x] Task 11: Mock pay

### Checkpoint: Choose and pay

- [x] Worked example, reject-releases-coupon, and idempotent retry are tested
- [x] `npx tsc --noEmit` passes

### Phase 4: Proof

- [x] Task 12: Attempt runner and trace
- [x] Task 13: Overspend harness

### Checkpoint: Proof

- [x] Harness overspend count is 0
- [x] `npm test` passes

### Phase 5: Screens

- [x] Task 14: Remove false landing claims
- [x] Task 15: Mandate form
- [x] Task 16: Shopping list
- [x] Task 17: Offers and trace
- [x] Task 18: Clarify, confirm, price change
- [x] Task 19: Account refs and 7-day note

### Checkpoint: Demo

- [x] `npm run build` passes
- [x] The demo script in Success criteria can be clicked through
- [ ] Human review before any further scope

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| UI computes a second price | High | Screens render `cash_total` and `effective_cost` from `lib/money.ts` only |
| A fixture instruction changes the budget | High | Catalog loader drops the offer before rank |
| Tests sleep for 120 seconds | Med | Pass `now` into the attempt runner |
| Ledger and profile both edit `lib/db.ts` | Med | Task 9 is the only schema change |
| Live model added so the demo “feels” smarter | Med | Harness imports the parser, not a network client |

## Open questions

None. The four defaults confirmed on 2026-10-03 are in `prompt.md` under “Approved for this release”.
