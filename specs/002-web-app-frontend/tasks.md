# Tasks: Web App Frontend

**Plan:** ./plan.md
**Status:** 56/57 done. Only T052 (`bin/rails test` to confirm the extended
backend response-shape assertions) is blocked — same missing-Postgres sandbox
limitation as specs/001's T011/T055. Run it once Postgres is reachable.

## Phase 1: Setup

- [x] T001 Add `resource :me, only: [:show]` inside the `api/v1` namespace,
      alongside `resource :session` (`config/routes.rb`)
- [x] T002 Scaffold the Vite + React + TypeScript app at `/frontend`
      (`frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`,
      `src/main.tsx`, `src/App.tsx` placeholder)
- [x] T003 Install frontend dependencies: `react-router-dom`,
      `@tanstack/react-query`, `@rails/actioncable`; dev: `vitest`,
      `@testing-library/react`, `@testing-library/jest-dom`,
      `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`,
      `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`
      (`frontend/package.json`)
- [x] T004 Configure Tailwind CSS — npm installed Tailwind v4, which is
      CSS-first and needs no `tailwind.config.js`; done via
      `frontend/postcss.config.js` (`@tailwindcss/postcss` plugin) and
      `frontend/src/index.css` (`@import "tailwindcss";`), already imported
      from `main.tsx`
- [x] T005 Configure Vitest + jsdom + RTL setup
      (`frontend/vite.config.ts` test block, `frontend/src/main.test-setup.ts`)
- [x] T006 Configure ESLint + Prettier
      (`frontend/eslint.config.js`, `frontend/.prettierrc`)
- [x] T007 Add `.env.example` documenting `VITE_API_BASE_URL` and
      `VITE_WS_BASE_URL` (`frontend/.env.example`)
- [x] T008 Configure Playwright (`frontend/playwright.config.ts`,
      `frontend/e2e/` directory)

## Phase 2: Data Model

No new tables or migrations — this feature reuses spec 001's schema as-is (see
plan.md's Data Model section).

## Phase 3: Tests (write first)

Backend request-test updates (extend existing files with new assertions; no new
behavior/authorization is being tested, only response-shape additions):

- [x] T009 [P] `Api::V1::MeController#show` request test — 200 with the current
      user's `{ id, name, surname, email }` when authenticated, 401 when not
      (`test/controllers/api/v1/me_controller_test.rb`, new file)
- [x] T010 [P] Extend the login test to assert the response body includes
      `user: { id, name, surname, email }` alongside `token`
      (`test/controllers/api/v1/sessions_controller_test.rb`)
- [x] T011 [P] Extend product tests to assert each product includes
      `access_level` (`"owner"`/`"admin"`/`"viewer"` matching the requesting
      user) and `owner: { id, name, surname, email }` — FR-4
      (`test/controllers/api/v1/products_controller_test.rb`)
- [x] T012 [P] Extend the permissions index test to assert each entry has a
      nested `user: { id, name, surname, email }` instead of a bare `user_id`
      — FR-16 (`test/controllers/api/v1/permissions_controller_test.rb`)
- [x] T013 [P] Extend project create/show tests to assert each
      `project_stages` entry has a nested `stage: { id, name, sequence_order }`
      — FR-9 (`test/controllers/api/v1/projects_controller_test.rb`)
- [x] T014 [P] Extend project_stages index/show tests to assert a nested
      `stage: { id, name, description, initial_prompt, sequence_order }` — FR-10,
      FR-13 (`test/controllers/api/v1/project_stages_controller_test.rb`)
- [x] T015 [P] Extend project_messages tests to assert a nested
      `user: { id, name, surname }` on user messages and `null` on agent
      messages — FR-11 (`test/controllers/api/v1/project_messages_controller_test.rb`)

Frontend tests (Vitest + React Testing Library + MSW, written before the
component/page that makes them pass):

- [x] T016 [P] `api/client.ts` test — classifies 401 (triggers logout callback),
      403, 404, 422 (surfaces `errors` array), and network/5xx failure — FR-20
      (`frontend/tests/client.test.ts`)
- [x] T017 [P] `AuthContext` test — login persists token + user and rehydrates
      via `/me` on reload, register auto-logs-in, logout clears state, a 401
      from `/me` on boot clears a stale token — FR-1, FR-2, FR-19, Scenarios 1,
      2, 15 (`frontend/tests/AuthContext.test.tsx`)
- [x] T018 [P] `LoginPage` test — inline validation, single generic
      wrong-credentials message — FR-1, FR-3, Scenario 1, Edge Case
      (`frontend/tests/LoginPage.test.tsx`)
- [x] T019 [P] `RegisterPage` test — inline validation, duplicate-email error
      — FR-1, Edge Case (`frontend/tests/RegisterPage.test.tsx`)
- [x] T020 [P] `useAccessLevel` test — correct `isOwner`/`isAdmin`/`isViewer`/
      `canManage` for each of the three access levels — FR-17, FR-18, NFR-2
      (`frontend/tests/useAccessLevel.test.ts`)
- [x] T021 [P] `ProductsPage` test — lists products with their access level,
      create-product form validation — FR-4, FR-5, Scenario 3, 4, Edge Case
      (`frontend/tests/ProductsPage.test.tsx`)
- [x] T022 [P] `ProductDetailPage` test — stages render in sequence order,
      create-stage validation (FR-6, FR-7, Scenario 5); start-project disabled
      with zero stages (FR-8, Scenario 6); collaborator list with access
      levels, share form, unregistered/duplicate/own-email error (FR-15, FR-16,
      Scenario 11, Edge Cases); a viewer fixture renders zero write controls, an
      admin fixture renders every control except delete-product/remove-owner
      (FR-17, FR-18, Scenario 12, 13); revoke removes a collaborator from the
      list immediately (Scenario 14); a 404 (revoked access) renders the
      "no longer have access" state with a link back to products (Edge Case)
      (`frontend/tests/ProductDetailPage.test.tsx`)
- [x] T023 [P] `ProjectDetailPage` test — two project fixtures on the same
      product show independent per-stage status (FR-9, Scenario 7);
      skip/redo/force-advance call the right endpoint and reflect the returned
      status, available regardless of other stages' order (FR-14, Scenario 10)
      (`frontend/tests/ProjectDetailPage.test.tsx`)
- [x] T024 [P] `StageChatPage` test — message history in order with sender
      visually distinguished (FR-10, FR-11); sending appends optimistically and
      is rejected client-side when empty (FR-10, Edge Case); a mocked channel
      broadcast triggers a refetch showing the agent's new message (FR-12); a
      "waiting for the agent" state shows while the stage is `running` and the
      latest message is the user's (Edge Case); the stage's `output` is
      displayed (FR-13) (`frontend/tests/StageChatPage.test.tsx`)

## Phase 4: Backend

- [x] T025 `Api::V1::MeController#show` — returns the current user's attributes
      — makes T009 pass (`app/controllers/api/v1/me_controller.rb`, new)
- [x] T026 `Api::V1::SessionsController#create` — include `user` in the
      response — makes T010 pass (`app/controllers/api/v1/sessions_controller.rb`)
- [x] T027 `Api::V1::ProductsController#index`/`#show` — compute and include
      `access_level` and `owner` per product — makes T011 pass
      (`app/controllers/api/v1/products_controller.rb`)
- [x] T028 `Api::V1::PermissionsController#index` — nest `user` instead of
      `user_id` — makes T012 pass (`app/controllers/api/v1/permissions_controller.rb`)
- [x] T029 `Api::V1::ProjectsController#project_json` — nest `stage` in each
      `project_stages` entry — makes T013 pass
      (`app/controllers/api/v1/projects_controller.rb`)
- [x] T030 `Api::V1::ProjectStagesController#index`/`#show` — nest `stage` —
      makes T014 pass (`app/controllers/api/v1/project_stages_controller.rb`)
- [x] T031 `Api::V1::ProjectMessagesController#index`/`#create` — nest `user`
      — makes T015 pass (`app/controllers/api/v1/project_messages_controller.rb`)

## Phase 5: Frontend

- [x] T032 `api/types.ts` — TypeScript types mirroring every JSON shape from
      plan.md's Routes & Controllers section (`frontend/src/api/types.ts`)
- [x] T033 `api/client.ts` — fetch wrapper: base URL from
      `VITE_API_BASE_URL`, attaches `Authorization: Bearer`, parses JSON,
      classifies errors per plan.md's Error handling — makes T016 pass
      (`frontend/src/api/client.ts`)
- [x] T034 `api/auth.ts` — `login`, `register`, `logout`, `me` calls
      (`frontend/src/api/auth.ts`)
- [x] T035 `api/products.ts` — product, stage, project, permission CRUD calls
      (`frontend/src/api/products.ts`)
- [x] T036 `api/messages.ts` — project_stage message list/create + skip/redo/
      force_advance calls (`frontend/src/api/messages.ts`)
- [x] T037 `auth/AuthContext.tsx` — holds `{ user, token }`, persists token to
      `localStorage`, calls `/me` on boot, exposes `login`/`register`/`logout`
      — makes T017 pass (`frontend/src/auth/AuthContext.tsx`)
- [x] T038 `auth/RequireAuth.tsx` — route guard redirecting to `/login` when
      there's no authenticated user (`frontend/src/auth/RequireAuth.tsx`)
- [x] T039 `cable/cableConsumer.ts` — `@rails/actioncable` `createConsumer`
      using `VITE_WS_BASE_URL` + the current token
      (`frontend/src/cable/cableConsumer.ts`)
- [x] T040 `cable/useProjectStageChannel.ts` — subscribes to
      `ProjectStageChannel` for a given `project_stage_id`, invalidates the
      relevant TanStack Query caches on a `message_created` broadcast
      (`frontend/src/cable/useProjectStageChannel.ts`)
- [x] T041 `hooks/useAccessLevel.ts` — derives
      `isOwner`/`isAdmin`/`isViewer`/`canManage` from a product's
      `access_level` — makes T020 pass (`frontend/src/hooks/useAccessLevel.ts`)
- [x] T042 [P] Generic UI primitives: `Button`, `TextField`, `Spinner`,
      `ErrorBanner`, `EmptyState`, `Modal`, `QueryBoundary`
      (`frontend/src/components/*.tsx`)
- [x] T043 `pages/LoginPage.tsx` — makes T018 pass (`frontend/src/pages/LoginPage.tsx`)
- [x] T044 `pages/RegisterPage.tsx` — makes T019 pass (`frontend/src/pages/RegisterPage.tsx`)
- [x] T045 `pages/ProductsPage.tsx` — makes T021 pass (`frontend/src/pages/ProductsPage.tsx`)
- [x] T046 `pages/ProductDetailPage.tsx` — makes T022 pass; on a 404 renders
      the access-revoked state per plan.md's Error handling
      (`frontend/src/pages/ProductDetailPage.tsx`)
- [x] T047 `pages/ProjectDetailPage.tsx` — makes T023 pass (`frontend/src/pages/ProjectDetailPage.tsx`)
- [x] T048 `pages/StageChatPage.tsx` — makes T024 pass, wires in
      `useProjectStageChannel` (`frontend/src/pages/StageChatPage.tsx`)
- [x] T049 `App.tsx`/`main.tsx` — final route table (`/login`, `/register`, `/`,
      `/products/:productId`, `/products/:productId/projects/:projectId`,
      `/products/:productId/projects/:projectId/stages/:projectStageId`),
      `QueryClientProvider`, `AuthProvider`, `RequireAuth` wiring
      (`frontend/src/App.tsx`, `frontend/src/main.tsx`)
- [x] T050 Playwright e2e happy path: register → login → create product → add
      two stages → start two projects → send a chat message on project one's
      first stage → assert it appears + a "waiting for the agent" state shows
      → assert project two's stages are untouched → share with a second
      registered user → log in as that user → assert every write control is
      absent; also assert the core layout renders at both a laptop and a phone
      viewport (NFR-3) (`frontend/e2e/happy-path.spec.ts`)

## Phase 6: Polish

- [x] T051 Cross-check every spec.md Edge Case and NFR against Phase 3 tests;
      add any missing coverage found (e.g. a loading/pending state assertion
      per mutating action per NFR-1; confirm no route exists for a viewer to
      reach a write action directly, satisfying that Edge Case via T022's
      role-based visibility rather than route-level blocking)
- [ ] T052 Run `bin/rails test` — confirm T009–T015's extended backend
      assertions pass
- [x] T053 Run `bin/rubocop` and `bin/brakeman` on the backend changes
- [x] T054 Run `npm run lint` and `tsc --noEmit` in `/frontend`
- [x] T055 Run `npm run test` (Vitest) in `/frontend` — full suite green
- [x] T056 Run `npm run build` in `/frontend` — production build succeeds
- [x] T057 Document frontend dev setup in `README.md` (dev server command, npm
      scripts, `VITE_API_BASE_URL`/`VITE_WS_BASE_URL`, running `frontend/e2e`)
