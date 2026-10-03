# Constraints

Last reviewed: 2026-10-03

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `eslint-disable`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a reason in the commit message
- No secrets in source
- This file does not get weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
| --- | --- | --- | --- |
| Types | Zero type errors | `npx tsc --noEmit` | task end |
| Lint | Zero errors from the existing config | `npm run lint` | task end |
| Coverage | Statements ≥81.33%, branches ≥79.02%, functions ≥89.74%, lines ≥87.50% | `npm run test:coverage` | task end |

Task 1 added Vitest and `npm test`. The coverage floor above is the first measured suite on 2026-10-03, enforced by Vitest. The latest run has 40 passing tests: statements 83.15%, branches 80.90%, functions 90.08%, lines 88.42%. Coverage includes all `lib/*.ts`, including the existing identity modules; no source module is excluded to improve the numbers.

## Measured, not yet enforced

| Metric | Today | Direction |
| --- | --- | --- |
| `npm test` | 40 tests pass | must not be removed |

## Exceptions

None.
