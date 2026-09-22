# Plan: Web App Frontend

**Spec:** ./spec.md
**Status:** Draft
**Created:** 2026-09-21

## Approach

A React + Vite + TypeScript single-page app at `/frontend`, calling the existing
`/api/v1` Rails API over JSON with the bearer JWT auth already built in spec 001.
Styling is Tailwind CSS (decided with the user) — utility classes only, no custom
design system, matching this being an initial version rather than a polished
product.

Server state (products, stages, projects, messages, permissions) is managed with
**TanStack Query** rather than a general state manager (Redux/Zustand): almost
everything this app shows is server data, and Query's built-in loading/error/
caching/invalidation model maps directly onto NFR-1 (visible pending state on
every request) and FR-12 (show new data without a manual reload) without hand-
rolling either. Local-only UI state (form inputs, modals) stays in component
state — there's little enough of it that a global client-state library would be
pure overhead.

Real-time agent replies (FR-12) use the `ProjectStageChannel` Action Cable
channel spec 001 already built, via `@rails/actioncable`: a message broadcast
invalidates that stage's message-history and project-stage-status queries, so
Query refetches and the UI updates itself. If the socket is ever unavailable, the
chat view still shows a "waiting for the agent" pending state (derived from the
stage's `running` status) and a manual refresh action, so nothing is silently
stuck — no separate polling loop is added for v1.

**Rejected alternative:** Redux/Zustand for all state. Rejected because there is
almost no client-only state in this app beyond form inputs and a couple of modal
toggles; introducing a global store to hold what's fundamentally cached server
data would duplicate what TanStack Query already does correctly, including the
cache-invalidation-on-websocket-event pattern above.

**Backend touch points:** this plan also makes small, additive changes to five
existing Rails controllers plus one new endpoint — see **Routes & Controllers**.
Nothing in spec 001's data model, authorization, or existing tests changes; these
are response-shape additions the frontend genuinely cannot work without (e.g. it
has no way to show "you're a viewer on this product" if the API never says so).

## Data Model

No new tables and no migrations. All of spec 001's schema is reused as-is.

## Routes & Controllers

No new Rails routes except one (`GET /api/v1/me`). The rest are additive JSON
response-shape changes to existing actions — no behavior, authorization, or
status-code changes.

- **`config/routes.rb`**: add `resource :me, only: [:show]` inside the
  `api/v1` namespace (alongside `session`).
- **New `Api::V1::MeController#show`** (`app/controllers/api/v1/me_controller.rb`)
  — returns the current user's `{ id, name, surname, email }`, resolved from the
  bearer token already required by `Authenticatable`. Lets the frontend rehydrate
  "who am I" on reload from a stored token, without decoding the JWT client-side.
- **`Api::V1::SessionsController#create`** — response becomes
  `{ token, user: { id, name, surname, email } }` instead of just `{ token }`, so
  a fresh login doesn't need a second round trip to know who's signed in.
- **`Api::V1::ProductsController#index` / `#show`** — each product gains
  `access_level` (`"owner" | "admin" | "viewer"`, computed for the current user)
  and `owner: { id, name, surname, email }`. Needed for Scenario 3/FR-4 (label
  each product with the user's role) and for the frontend's access-control hook
  (FR-18/NFR-2).
- **`Api::V1::PermissionsController#index`** — each permission gains a nested
  `user: { id, name, surname, email }` instead of a bare `user_id`. Needed to
  render the collaborator list (FR-16) with a name/email instead of a raw id.
- **`Api::V1::ProjectsController#create` / `#show`** (via its existing
  `project_json` helper) — each `project_stages` entry gains a nested
  `stage: { id, name, sequence_order }`. Needed to label each stage's progress
  row (FR-9) without a second request per stage.
- **`Api::V1::ProjectStagesController#index` / `#show`** — same addition: each
  project_stage response gains `stage: { id, name, description, initial_prompt,
  sequence_order }`, so the stage-chat view (FR-10, FR-13) has the stage's name
  and prompt without a separate fetch.
- **`Api::V1::ProjectMessagesController#index` / `#create`** — each message
  gains `user: { id, name, surname }` when `sender_type` is `user_sender` (`nil`
  for agent messages). Needed to label who sent a message (FR-11) beyond a bare
  `user_id`.

## Views / Frontend

`/frontend` (new), React 19 + Vite + TypeScript, React Router for navigation,
TanStack Query for server state, Tailwind CSS for styling.

```
frontend/
  index.html
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  package.json
  .env.example                    # VITE_API_BASE_URL, VITE_WS_BASE_URL
  src/
    main.tsx                      # mounts <App>, QueryClientProvider, AuthProvider
    App.tsx                       # <BrowserRouter> + route table
    api/
      client.ts                   # fetch wrapper: base URL, Authorization header,
                                   # JSON parse, typed ApiError, 401 -> logout hook
      types.ts                    # TS types mirroring the JSON shapes above
      auth.ts                     # login/register/logout/me API calls
      products.ts                 # product + stage + project + permission API calls
      messages.ts                 # project_stage message API calls + transitions
    auth/
      AuthContext.tsx             # { user, token, login, register, logout },
                                   # persists token to localStorage, calls /me on boot
      RequireAuth.tsx             # route guard: redirect to /login if no user
    cable/
      cableConsumer.ts            # @rails/actioncable createConsumer(token)
      useProjectStageChannel.ts   # subscribes, invalidates queries on broadcast
    hooks/
      useAccessLevel.ts           # (product) => { isOwner, isAdmin, isViewer, canManage }
    components/                   # Button, TextField, Spinner, ErrorBanner,
                                   # EmptyState, Modal, QueryBoundary
    pages/
      LoginPage.tsx                        # Scenario 1
      RegisterPage.tsx                     # Scenario 1
      ProductsPage.tsx                     # Scenario 3, 4
      ProductDetailPage.tsx                # Scenario 5, 6, 7, 11, 12, 13, 14
      ProjectDetailPage.tsx                # Scenario 7, 10
      StageChatPage.tsx                    # Scenario 8, 9, 13
    main.test-setup.ts            # RTL/jsdom setup for Vitest
  tests/                          # Vitest + React Testing Library, colocated *.test.tsx
  e2e/
    happy-path.spec.ts            # Playwright, see Testing Strategy
```

**Routing:**
- `/login`, `/register` — public
- `/` — `ProductsPage` (protected)
- `/products/:productId` — `ProductDetailPage` (protected)
- `/products/:productId/projects/:projectId` — `ProjectDetailPage` (protected)
- `/products/:productId/projects/:projectId/stages/:projectStageId` —
  `StageChatPage` (protected)

**Auth (FR-1, FR-2, FR-3, FR-19):** `AuthContext` holds `{ user, token }`, persists
the token to `localStorage` (key `zilla_token`). On boot, if a token exists, it
calls `GET /api/v1/me`; a 401 clears the token and routes to `/login` — this is
what makes "stay signed in across reload" (FR-2) and "session expires" (Edge
Case) work uniformly. `login`/`register` store the returned token + user;
`register` immediately calls `login` so a new user lands signed in (Scenario 1).
Login failure renders the API's single generic error message verbatim (FR-3 is
already satisfied server-side; the frontend just doesn't add its own field-
specific interpretation on top of it).

**Access control (FR-17, FR-18, NFR-2):** `useAccessLevel(product)` derives
`isOwner`/`isAdmin`/`isViewer`/`canManage` (`isOwner || isAdmin`) from the
product's `access_level` field. Every write control (add stage, start project,
share, send message, skip/redo/force-advance) renders only when `canManage` is
true; delete-product and remove-owner controls render only when `isOwner` is
true. This is enforced again server-side regardless (spec 001's Pundit
policies) — the frontend check exists purely so a viewer never sees a control
that would fail, per NFR-2, not as the actual security boundary.

**Error handling (FR-20, Edge Cases):** the `api/client.ts` wrapper classifies
every non-2xx response: `401` triggers a global logout + redirect to `/login`;
`403` renders inline as "you don't have permission to do that"; `404` on a
resource detail route renders as "this is unavailable, or you no longer have
access to it" with a link back to `/`, covering the access-revoked-mid-session
edge case without special-casing it; `422` renders the API's `errors` array
inline on the form/action that triggered it; anything else (network failure,
5xx) renders a generic retryable error banner.

**Chat / real-time (FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14):**
`StageChatPage` shows the stage's `initial_prompt`/current `output`, its message
history (TanStack Query), and a composer gated by `canManage`. Sending a message
optimistically appends it, then `useProjectStageChannel` invalidates the
messages + project-stages queries on the `message_created` broadcast so the
agent's reply appears without a manual reload. While the stage is `running` and
the latest message is from the user, the view shows a "waiting for the agent…"
indicator (covers the Edge Case of a slow/failed agent reply leaving no
indication). `ProjectDetailPage` shows every stage's status for that project
(independently per project, satisfying FR-9/Scenario 7) with skip/redo/force
buttons per stage, gated by `canManage`.

## Background Jobs / Services

None new. The frontend calls the existing `AgentRespondJob`-backed API; no
frontend-side background work.

## Dependencies

New `frontend/package.json`, npm workspace, isolated from the Ruby `Gemfile`:

- `react`, `react-dom` — UI runtime.
- `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`,
  `@types/react-dom`, `@types/node` — build tooling + typing, as already decided
  (React + Vite + TypeScript).
- `react-router-dom` — client-side routing; the standard choice for a Vite SPA,
  no real alternative considered given the app has multiple distinct pages/
  protected routes.
- `@tanstack/react-query` — server-state fetching/caching/invalidation (see
  Approach for why this replaces a general state manager).
- `@rails/actioncable` — official client for the existing `ProjectStageChannel`;
  avoids hand-rolling WebSocket framing/reconnection.
- `tailwindcss`, `postcss`, `autoprefixer` — styling, per the chosen approach.
- `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier` —
  baseline lint/format, matching the Ruby side already running Rubocop.
- Dev/test only: `vitest`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`
  (Mock Service Worker, to test components against a fake API without hitting
  the real Rails server), `@playwright/test` (e2e).

## Affected Files

```
Backend (additive changes, no behavior/authorization changes):
config/routes.rb                                      (add `resource :me, only: [:show]`)
app/controllers/api/v1/me_controller.rb                (new)
app/controllers/api/v1/sessions_controller.rb          (modify: include `user` in create response)
app/controllers/api/v1/products_controller.rb          (modify: include `access_level`, `owner`)
app/controllers/api/v1/permissions_controller.rb       (modify: nest `user` instead of `user_id`)
app/controllers/api/v1/projects_controller.rb          (modify: nest `stage` in project_stages)
app/controllers/api/v1/project_stages_controller.rb    (modify: nest `stage`)
app/controllers/api/v1/project_messages_controller.rb  (modify: nest `user`)
test/controllers/api/v1/me_controller_test.rb          (new)
test/controllers/api/v1/sessions_controller_test.rb    (modify: assert `user` in response)
test/controllers/api/v1/products_controller_test.rb    (modify: assert `access_level`, `owner`)
test/controllers/api/v1/permissions_controller_test.rb (modify: assert nested `user`)
test/controllers/api/v1/projects_controller_test.rb    (modify: assert nested `stage`)
test/controllers/api/v1/project_stages_controller_test.rb    (modify: assert nested `stage`)
test/controllers/api/v1/project_messages_controller_test.rb  (modify: assert nested `user`)

Frontend (new):
frontend/package.json, tsconfig.json, vite.config.ts, tailwind.config.js,
  postcss.config.js, index.html, .env.example
frontend/src/main.tsx, App.tsx
frontend/src/api/client.ts, types.ts, auth.ts, products.ts, messages.ts
frontend/src/auth/AuthContext.tsx, RequireAuth.tsx
frontend/src/cable/cableConsumer.ts, useProjectStageChannel.ts
frontend/src/hooks/useAccessLevel.ts
frontend/src/components/Button.tsx, TextField.tsx, Spinner.tsx, ErrorBanner.tsx,
  EmptyState.tsx, Modal.tsx, QueryBoundary.tsx
frontend/src/pages/LoginPage.tsx, RegisterPage.tsx, ProductsPage.tsx,
  ProductDetailPage.tsx, ProjectDetailPage.tsx, StageChatPage.tsx
frontend/tests/*.test.tsx (one per page/hook listed above)
frontend/e2e/happy-path.spec.ts
```

## Testing Strategy

**Backend (Minitest, updates to existing request tests):** each modified
controller's existing request test gets its response-shape assertions extended
(e.g. `products_controller_test.rb` asserts `body["access_level"]` and
`body["owner"]["email"]`) rather than new test files, since behavior/
authorization is unchanged — only `me_controller_test.rb` is new, covering: 200
with the current user's attributes when authenticated, 401 when not.

**Frontend (Vitest + React Testing Library + MSW):**
- `AuthContext` — login persists token + rehydrates on reload, register auto-
  logs-in, logout clears state and redirects, a 401 from `/me` clears a stale
  token — FR-1, FR-2, FR-19, Scenario 1, 2, 15.
- `LoginPage`/`RegisterPage` — inline validation errors, generic login-failure
  message — FR-1, FR-3, Scenario 1, Edge Cases (bad login, duplicate email).
- `useAccessLevel` — correct booleans for each of owner/admin/viewer — FR-17,
  FR-18, NFR-2.
- `ProductsPage` — renders each product with its access level; create-product
  form validation — FR-4, FR-5, Scenario 3, 4.
- `ProductDetailPage` — stage list in order and create-stage validation (FR-6,
  FR-7, Scenario 5); start-project disabled with zero stages (FR-8, Scenario 6);
  collaborator list + share form + unregistered-email error (FR-15, FR-16,
  Scenario 11); every write control hidden for a viewer fixture and visible-but-
  owner-only controls hidden for an admin fixture (FR-17, FR-18, Scenario 12,
  13); revoke removes a collaborator from the list (Scenario 14).
- `ProjectDetailPage` — two project fixtures render independent per-stage status
  (FR-9, Scenario 7); skip/redo/force-advance call the right endpoint and
  reflect the returned status (FR-14, Scenario 10).
- `StageChatPage` — message history renders in order with sender distinguished
  (FR-10, FR-11); sending appends optimistically (FR-10); a mocked channel
  broadcast triggers a refetch that shows the new agent message (FR-12); stage
  `output` is displayed (FR-13); an empty message is rejected client-side before
  it ever hits the API (Edge Case).
- `api/client.ts` — 401/403/404/422/5xx are each classified and surfaced the way
  **Error handling** above specifies — FR-20, Edge Cases (revoked access,
  network failure).

**E2E (Playwright, one happy-path spec):** register → login → create product →
add two stages → start two projects → send a chat message on project one's
first stage → assert the message appears and a "waiting for the agent" state
shows → assert project two's stages remain untouched → share the product with a
second registered user → log in as that user → assert every write control is
absent. This mirrors the backend's own
`test/integration/product_builder_flow_test.rb`. It asserts the *user's*
message and UI states, not the agent's reply content (non-deterministic, and
would require a live OpenAI call — see Risks).

## Risks & Open Questions

- **Backend response-shape changes are part of this plan, not spec 001's.**
  They're additive and don't change spec 001's behavior or tests beyond
  assertion updates, but flagging clearly since "frontend plan" touching Ruby
  files could be unexpected — confirm this split is acceptable before `/tasks`.
- **Token in `localStorage`, not an httpOnly cookie.** Consistent with spec
  001's own choice of bearer-JWT auth (made to avoid CORS-credentials
  complexity across the Vite dev server's origin), but it does mean the token
  is readable by any script on the page (XSS exposure). Acceptable for an
  initial version; revisit alongside spec 001's already-flagged "no server-side
  logout/revocation" risk if this goes further than an initial version.
- **E2E test requires a live Rails server + reachable Postgres**, same
  limitation this session already hit building the backend (no Postgres in this
  sandbox). It cannot be run here; treat it as written-but-unverified like the
  backend's own suite was, until run on a machine with both up.
- **E2E test must not assert on real agent output.** Running it against a real
  `OPENAI_API_KEY` would make it slow, flaky, and cost money per run; it only
  asserts the user-facing message and pending state, never the agent's reply
  text. If a fully-deterministic e2e run is wanted later, that needs a way to
  stub `Agent::RespondToMessage` in the running Rails test/e2e environment —
  not designed here.
- **No visual design/mockups exist.** Tailwind utility classes are applied
  directly per component with no shared design tokens beyond Tailwind's
  defaults — intentionally minimal for an initial version, expect it to look
  plain rather than polished.
