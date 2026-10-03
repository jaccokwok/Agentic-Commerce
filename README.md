# Agentic-Commerce — Scout

Agentic commerce MVP built with **Next.js** (App Router), **Tailwind CSS**, and embedded SQLite, with a Docker deployment configuration.

Scout implements the buying loop in `prompt.md`: confirmed mandate → editable shopping goals and budget shares → one merchant's top three offers → catalogue negotiation → final quote → mock card payment → persistent ledger and decision trace. Catalogues, FX and payments are mock data. No hosted LLM, live scrape, card collection or real Stripe charge is used.

## Tech stack

| Layer    | Choice                                         |
| -------- | ---------------------------------------------- |
| Frontend | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling  | Tailwind CSS v4                                |
| Runtime  | Docker (multi-stage image, standalone output)  |

## Run locally (Node 22.13+ recommended)

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

Production build:

```bash
npm run build
# Set AUTH_SECRET in your environment before starting production.
npm run start
```

## Run with Docker

```bash
docker compose up --build
```

or manually:

```bash
docker build -t agentic-commerce .
docker run --rm -p 3000:3000 agentic-commerce
```

The multi-stage `Dockerfile` installs dependencies, builds the app with `output: "standalone"` (see `next.config.ts`), and runs the minimal `server.js` on a slim `node:22-alpine` image as a non-root user. The build copy script also works on Windows. Local scripts explicitly enable SQLite for older Node 22 versions. System fonts keep the build independent of external font downloads.

## Login system

Email + password authentication, fully self-contained in the single container:

- **Storage:** embedded SQLite via Node's built-in `node:sqlite` — the database file lives in `DATA_DIR` (default `./data`, `/app/data` in Docker, persisted with the `scout-data` volume). No native addons required.
- **Passwords:** hashed with Node's built-in `scrypt` (random per-user salt, constant-time comparison).
- **Sessions:** stateless JWT (HS256, signed with `AUTH_SECRET`) in an httpOnly cookie, valid for 7 days.
- **Route protection:** `proxy.ts` (Next.js 16's replacement for `middleware.ts`) gates `/account`; the page verifies the session again server-side.

Pages: `/login`, `/register`, `/account` (protected). The navbar shows "Sign in" for guests and a user chip + "Sign out" once authenticated.

Environment variables:

| Variable        | Required | Description                                                                    |
| --------------- | -------- | ------------------------------------------------------------------------------ |
| `AUTH_SECRET`   | prod     | Secret for signing session JWTs — generate with `openssl rand -base64 32`.      |
| `DATA_DIR`      | no       | Directory for the SQLite file (default `./data`).                              |
| `COOKIE_SECURE` | no       | Set to `true` when serving over HTTPS to add the `Secure` cookie flag.          |

> Note: `node:sqlite` is still flagged experimental by Node.js (it logs a warning at startup). Swap in `better-sqlite3` or Postgres for production-grade workloads.

## Project structure

```text
app/
  layout.tsx         # Root layout (system fonts, metadata)
  page.tsx           # Scout buying loop
  login/page.tsx     # Sign-in page
  register/page.tsx  # Create-account page
  account/page.tsx   # Protected account page
  actions/auth.ts    # Server actions: register / login / logout
  actions/shop.ts    # Authenticated shopping actions
components/
  site-header.tsx    # Navbar (auth-aware)
  search-section.tsx # Mandate → list → offers → confirmation controller
  mandate-form.tsx   # Explicit authorization and text proposals
  shopping-list.tsx  # Blank quantities, fixed shares, partial-order acceptance
  offer-list.tsx     # Prices, weights and score breakdown
  quote-review.tsx   # Final quote, clarification and price-change demos
  trace-log.tsx      # Rule IDs, inputs and reasons
  auth-forms.tsx     # Login / register forms (client)
  icons.tsx          # Inline SVG icons
  glow-backdrop.tsx  # Shared lime glow background
lib/
  db.ts              # SQLite users, requests, attempts and orders; additive migration
  jwt.ts             # Session JWT sign/verify (jose, Edge-safe)
  password.ts        # scrypt password hashing
  auth.ts            # Session cookie helpers (server)
  money.ts, fx.ts     # Integer-cent cash formula and fixed HKD conversion
  catalog.ts         # Mock fixtures and unsafe-offer filtering
  mandate.ts, intent.ts, allocation.ts # Authorization and request rules
  rank.ts, quote.ts, negotiate.ts      # Offer choice and frozen terms
  ledger.ts, pay.ts   # Mock payment, idempotency and original-cash spend
  attempt.ts         # Sole buying-loop composer and decision trace
  shop-service.ts    # Account ownership, persisted state and revision checks
  harness.ts         # Deterministic replay checks
fixtures/            # Mock offers and 13 replay scenarios
tasks/MVP_SUMMARY.md  # Implementation report and conflict decisions
proxy.ts            # Route protection for /account
Dockerfile          # Multi-stage production image
docker-compose.yml  # Runner with persisted SQLite volume
```

## Verification

```bash
npm test
npm run test:coverage
npm run lint
npx tsc --noEmit
npm run build
```

The replay test prints `Replay scenarios: 13; overspend count: 0`. Coverage thresholds hold the first measured baseline in `CONSTRAINTS.md`.

## Clickable demo

1. Register, return home, and confirm the default manual mandate (250 / 400 / 1000 HKD, rewards on).
2. Create the list for “party items for 8, red balloons, budget 350”. Both quantities and shares start blank; set quantities to 1, shares to 175 each, and accept possible partial completion.
3. Search a goal, compare its three offers, select one, then review and confirm its quote. `/account` shows the original cash spend and stored mock refs.
4. For a tie, use the balloon request and merchant “Demo · equal-score tie”. Selection pauses for a choice.
5. For price changes, use “snacks budget 400”, quantity 1, share 400, merchant “Demo · price change (snacks)”. The initial quote is 340. Change to 360, then decline: coupon returns to unused. Select again, change to 410, and try to confirm: the 400 limit rejects payment.

Refunds keep original successful cash payments counted for the preceding continuous 168 hours. Unassigned request money stays reserved, and a goal cannot borrow another goal's share. Reconfirming or revoking a mandate invalidates outstanding attempts. Docker configuration was preserved; the image was not built during local MVP verification.
