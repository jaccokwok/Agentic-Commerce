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

## Project structure

```text
app/
  layout.tsx    # Root layout (Geist fonts, metadata)
  page.tsx      # Scout landing page — search bar + price filter (backend stubbed)
  globals.css   # Tailwind v4 entry + theme tokens
Dockerfile          # Multi-stage production image
docker-compose.yml  # Convenience runner (maps port 3000)
next.config.ts      # output: "standalone" for Docker
```

## Next steps (backend)

- Implement the agent API and call it from `handleSendScout` in `app/page.tsx` (the query and min/max price state are already collected).
- Return ranked product results, then render them under the search card.
