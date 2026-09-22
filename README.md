# Zilla

Rails API (API-only mode) for Zilla, an infoproduct builder. The frontend (React +
Vite) lives in `/frontend`.

## Setup

* Ruby version: see `.ruby-version` (4.0.6)
* Database: PostgreSQL (`pgcrypto` extension enabled via migration for UUID primary keys)

Start Postgres (via `docker-compose.yml`), then set up the app:

```
docker compose up -d postgres
export DATABASE_URL=postgres://zilla:zilla@localhost:5432/zilla_development
bin/setup
bin/rails db:create db:migrate
```

`DATABASE_URL` overrides `config/database.yml`'s defaults; adjust the port/db name
in both if you already have Postgres running locally instead of via Docker.

## Required environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection | `postgres://zilla:zilla@localhost:5432/zilla_development` when using `docker-compose.yml` |
| `SECRET_KEY_BASE` | Signs JWTs issued on login (`Rails.application.secret_key_base`) | Rails-managed in development/test; must be set explicitly in production |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the Vite dev server / deployed frontend | `http://localhost:5173` |
| `OPENAI_API_KEY` | Used by `Agent::RespondToMessage` to call the OpenAI API | none — required for agent replies to work |
| `OPENAI_MODEL` | Model used for agent replies | `gpt-4o-mini` |

## Running the app

```
bin/rails server
bin/jobs        # Solid Queue worker, needed for agent replies
```

## Running tests

```
bin/rails test
```

## API

All endpoints are under `/api/v1` and return JSON. Authentication is a bearer JWT:
`POST /api/v1/session` with `email`/`password` returns a `token`, sent thereafter as
`Authorization: Bearer <token>`.

See `specs/001-product-builder-core-workflow/plan.md` for the full route list and
data model.

## Frontend (`/frontend`)

React + Vite + TypeScript, Tailwind CSS, TanStack Query, React Router, and
`@rails/actioncable` for the real-time chat updates. See
`specs/002-web-app-frontend/plan.md` for the full architecture.

```
cd frontend
npm install
cp .env.example .env   # then adjust VITE_API_BASE_URL / VITE_WS_BASE_URL if needed
npm run dev             # http://localhost:5173, expects the Rails API at :3000
```

Required env vars (`frontend/.env`, see `.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | The Rails API's base URL | `http://localhost:3000/api/v1` |
| `VITE_WS_BASE_URL` | The Rails API's Action Cable endpoint | `ws://localhost:3000/cable` |

Other npm scripts (run from `/frontend`):

```
npm run lint        # ESLint
npx tsc -b          # Typecheck
npm run test         # Vitest (unit/component tests)
npm run build        # Production build
npm run e2e          # Playwright end-to-end tests (needs a live Rails API + Postgres)
```
