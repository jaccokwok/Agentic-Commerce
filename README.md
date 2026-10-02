# Agentic-Commerce — Scout

Agentic commerce starter built with **Next.js** (App Router) and **Tailwind CSS**, fully containerized with **Docker**.

The UI recreates the *Scout* buying-agent landing page: a hero headline, one centered search bar and a min/max **price-range filter**. The backend / agent logic is intentionally **not implemented yet** — submitting the form is currently a no-op stub.

## Tech stack

| Layer    | Choice                                         |
| -------- | ---------------------------------------------- |
| Frontend | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling  | Tailwind CSS v4                                |
| Runtime  | Docker (multi-stage image, standalone output)  |

## Run locally (Node 20+)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Production build:

```bash
npm run build
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

The multi-stage `Dockerfile` installs dependencies, builds the app with `output: "standalone"` (see `next.config.ts`), and runs the minimal `server.js` on a slim `node:22-alpine` image as a non-root user.

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
  layout.tsx         # Root layout (Geist fonts, metadata)
  page.tsx           # Scout landing page — search bar + price filter (agent stubbed)
  login/page.tsx     # Sign-in page
  register/page.tsx  # Create-account page
  account/page.tsx   # Protected account page
  actions/auth.ts    # Server actions: register / login / logout
components/
  site-header.tsx    # Navbar (auth-aware)
  search-section.tsx # Search card + suggestion chips (client)
  auth-forms.tsx     # Login / register forms (client)
  icons.tsx          # Inline SVG icons
  glow-backdrop.tsx  # Shared lime glow background
lib/
  db.ts              # SQLite (node:sqlite) user store
  jwt.ts             # Session JWT sign/verify (jose, Edge-safe)
  password.ts        # scrypt password hashing
  auth.ts            # Session cookie helpers (server)
proxy.ts            # Route protection for /account
Dockerfile          # Multi-stage production image
docker-compose.yml  # Runner with persisted SQLite volume
```

## Next steps (backend)


- Implement the agent API and call it from `handleSendScout` in `components/search-section.tsx` (the query and min/max price state are already collected).
- Return ranked product results, then render them under the search card.
