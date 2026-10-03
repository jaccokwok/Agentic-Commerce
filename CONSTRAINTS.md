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

Coverage is not in this table yet. The repo has no test script. Task 1 in `tasks/todo.md` adds `npm test`. After that suite exists, record its coverage and hold the line. Do not set a percentage before a suite exists.

## Measured, not yet enforced

| Metric | Today | Direction |
| --- | --- | --- |
| `npm test` | no script | add in Task 1, then must not be removed |

## Exceptions

None.
