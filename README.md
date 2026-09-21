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
