# Tasks: Product Builder Core Workflow

**Plan:** ./plan.md
**Status:** All tasks written; T011 and T055 blocked on a PostgreSQL instance
(none available in the execution sandbox — see final report)

## Phase 1: Setup

- [x] T001 `bundle add` gems: uncomment `bcrypt`, `rack-cors` in `Gemfile`; add `jwt`,
      `pundit`, `ruby-openai`; `bundle install`
- [x] T002 Configure `config/initializers/cors.rb` — allow origin from
      `ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")`, all methods, headers `:any`
- [x] T003 [P] Migration: enable `pgcrypto` extension
      (`db/migrate/20260921120001_enable_pgcrypto.rb`)
- [x] T004 Migration: `create_users` (`db/migrate/20260921120002_create_users.rb`)
- [x] T005 Migration: `create_products` (`db/migrate/20260921120003_create_products.rb`)
- [x] T006 Migration: `create_stages` (`db/migrate/20260921120004_create_stages.rb`)
- [x] T007 Migration: `create_projects` (`db/migrate/20260921120005_create_projects.rb`)
- [x] T008 Migration: `create_project_stages` (`db/migrate/20260921120006_create_project_stages.rb`)
- [x] T009 Migration: `create_project_messages` (`db/migrate/20260921120007_create_project_messages.rb`)
- [x] T010 Migration: `create_permissions` (`db/migrate/20260921120008_create_permissions.rb`)
- [ ] T011 Run `bin/rails db:migrate` (dev + test envs), verify `db/schema.rb`
- [x] T012 Add `config/routes.rb` — `api/v1` namespace: `registrations`, `session`,
      `products` (nested `stages`, `projects`, `permissions`), `projects` (nested
      `project_stages` with member routes `skip`/`redo`/`force_advance`, nested
      `messages`) per plan.md's Routes & Controllers section

## Phase 2: Data Model

- [x] T013 [P] `User` model — `has_secure_password`, `has_many :owned_products`,
      `has_many :permissions`, `has_many :shared_products, through: :permissions`,
      email format/uniqueness validation (`app/models/user.rb`)
- [x] T014 [P] `Product` model — `belongs_to :owner, class_name: "User"`,
      `has_many :stages`, `has_many :projects`, `has_many :permissions`,
      `has_many :shared_users, through: :permissions`, `name` presence
      (`app/models/product.rb`)
- [x] T015 [P] `Stage` model — `belongs_to :product`, `has_many :project_stages,
      dependent: :restrict_with_error`, presence validations on `name`,
      `initial_prompt`, `sequence_order` (`app/models/stage.rb`)
- [x] T016 [P] `Project` model — `belongs_to :product`, `has_many :project_stages,
      dependent: :destroy`, `has_many :project_messages, through: :project_stages`
      (`app/models/project.rb`)
- [x] T017 [P] `ProjectStage` model — `belongs_to :project`, `belongs_to :stage`,
      `has_many :project_messages`, `enum :status, { pending: 0, running: 1,
      completed: 2, skipped: 3 }` (`app/models/project_stage.rb`)
- [x] T018 [P] `ProjectMessage` model — `belongs_to :project`, `belongs_to
      :project_stage`, `belongs_to :user, optional: true`, `enum :sender_type,
      { user_sender: 0, agent_sender: 1 }`, `content` presence
      (`app/models/project_message.rb`)
- [x] T019 [P] `Permission` model — `belongs_to :product`, `belongs_to :user`,
      `enum :access_level, { viewer: 0, admin: 1 }` (`app/models/permission.rb`)

## Phase 3: Tests (write first)

Model tests:

- [x] T020 [P] User validations/associations test — email uniqueness, password
      required (NFR-1) (`test/models/user_test.rb`)
- [x] T021 [P] Product validations/associations test (`test/models/product_test.rb`)
- [x] T022 [P] Stage validations + `[product_id, sequence_order]` uniqueness test —
      FR-5 (`test/models/stage_test.rb`)
- [x] T023 [P] Project validations/associations test (`test/models/project_test.rb`)
- [x] T024 [P] ProjectStage validations, `[project_id, stage_id]` uniqueness,
      `status` enum test — FR-16, FR-18 (`test/models/project_stage_test.rb`)
- [x] T025 [P] ProjectMessage validations, `sender_type` enum, empty-content
      rejection test — FR-11 (`test/models/project_message_test.rb`)
- [x] T026 [P] Permission validations, `[product_id, user_id]` uniqueness,
      `access_level` enum test — FR-26 (`test/models/permission_test.rb`)

Request tests (written before the controller that makes them pass):

- [x] T027 [P] Registrations#create request test — success + duplicate email
      (`test/controllers/api/v1/registrations_controller_test.rb`)
- [x] T028 [P] Sessions#create/#destroy request test — valid login, wrong
      password, nonexistent email (doesn't reveal which) — FR-1, FR-2, Scenarios
      1–2 (`test/controllers/api/v1/sessions_controller_test.rb`)
- [x] T029 [P] Products request test — create requires name, list/show scoped to
      owner + shared products, 403/404 on another user's product — FR-3, FR-15,
      NFR-3 (`test/controllers/api/v1/products_controller_test.rb`)
- [x] T030 [P] Stages request test — create requires name+initial_prompt, sequence
      assigned/unique, owner/admin only (viewer forbidden) — FR-4, FR-5, FR-22,
      FR-23 (`test/controllers/api/v1/stages_controller_test.rb`)
- [x] T031 [P] Projects request test — create requires ≥1 stage, creates one
      `project_stage` per existing stage all `pending`, two projects for the same
      product track status independently, no project-count cap — FR-6, FR-7, FR-8,
      FR-9, FR-19, Scenarios 6–7 (`test/controllers/api/v1/projects_controller_test.rb`)
- [x] T032 [P] ProjectMessages request test — create persists message + enqueues
      `AgentRespondJob`, empty content rejected, viewer forbidden from posting but
      can read, history returned chronologically, message must target a
      `project_stage` belonging to the project — FR-10, FR-11, FR-12, FR-13, FR-14,
      FR-22, Scenarios 8–9 (`test/controllers/api/v1/project_messages_controller_test.rb`)
- [x] T033 [P] Permissions request test — share by email, reject unregistered
      email (422/404), reject sharing with owner's own email, re-sharing an
      already-shared email updates the access level instead of duplicating,
      admin can share/unshare others but cannot remove the owner, only owner can
      revoke, revoked user immediately loses access — FR-20 through FR-26,
      Scenarios 10–15 (`test/controllers/api/v1/permissions_controller_test.rb`)
- [x] T034 [P] ProjectStages skip/redo/force_advance request test — out-of-order
      transitions allowed, `redo` re-enqueues `AgentRespondJob` — FR-18, Scenario
      16 (`test/controllers/api/v1/project_stages_controller_test.rb`)
- [x] T035 [P] Stage-edit propagation test — editing a stage's name/description/
      initial_prompt is immediately visible through any project (in-progress or
      completed) that uses it — FR-17, Scenario 17
      (`test/controllers/api/v1/stages_controller_test.rb`)
- [x] T036 [P] `Agent::RespondToMessage` test with a stubbed OpenAI client — no
      real network calls (`test/services/agent/respond_to_message_test.rb`)
- [x] T037 [P] `AgentRespondJob` test — stubs `Agent::RespondToMessage`, asserts it
      creates the agent `ProjectMessage`, updates `ProjectStage#output`/`status`,
      and broadcasts (`test/jobs/agent_respond_job_test.rb`)
- [x] T038 Integration test — register → login → create product → add stages →
      create two projects → chat on each independently → share product with a
      second user → verify that user's viewer/admin access matches their level
      (`test/integration/product_builder_flow_test.rb`)

## Phase 4: Backend

- [x] T039 `Authenticatable` concern — decode `Authorization: Bearer` JWT, set
      `current_user`, `render 401` if missing/invalid
      (`app/controllers/concerns/authenticatable.rb`)
- [x] T040 `ApplicationController` — `include Authenticatable`, `include
      Pundit::Authorization`, `rescue_from Pundit::NotAuthorizedError` → 403,
      `rescue_from ActiveRecord::RecordNotFound` → 404
      (`app/controllers/application_controller.rb`)
- [x] T041 `ApplicationPolicy` base class (`app/policies/application_policy.rb`)
- [x] T042 `ProductPolicy` — `show?`/`chat?` (owner or any permission), `manage_stages?`/
      `create_project?`/`share?` (owner or admin), `destroy?`/`unshare_owner?`
      (owner only) — FR-15, FR-22, FR-23, FR-24 (`app/policies/product_policy.rb`)
- [x] T043 `Api::V1::RegistrationsController#create` — makes T027 pass
      (`app/controllers/api/v1/registrations_controller.rb`)
- [x] T044 `Api::V1::SessionsController#create/#destroy` — verifies credentials,
      issues JWT; `#destroy` returns success (stateless) — makes T028 pass, FR-1,
      FR-2 (`app/controllers/api/v1/sessions_controller.rb`)
- [x] T045 `Api::V1::ProductsController` — index/create/show/update/destroy scoped
      via `ProductPolicy` — makes T029 pass, FR-3, FR-15
      (`app/controllers/api/v1/products_controller.rb`)
- [x] T046 `Api::V1::StagesController` — create/update/destroy, auto-assigns next
      `sequence_order` — makes T030, T035 pass, FR-4, FR-5, FR-17
      (`app/controllers/api/v1/stages_controller.rb`)
- [x] T047 `Api::V1::ProjectsController` — index/create/show, `create` 422s if
      product has zero stages, otherwise builds one `project_stage` per stage —
      makes T031 pass, FR-6, FR-7, FR-8, FR-9, FR-19
      (`app/controllers/api/v1/projects_controller.rb`)
- [x] T048 `Api::V1::ProjectStagesController#index/#show/#skip/#redo/
      #force_advance` — makes T034 pass, FR-16, FR-18
      (`app/controllers/api/v1/project_stages_controller.rb`)
- [x] T049 `Api::V1::ProjectMessagesController#index/#create` — persists message,
      enqueues `AgentRespondJob` — makes T032 pass, FR-10 through FR-14
      (`app/controllers/api/v1/project_messages_controller.rb`)
- [x] T050 `Api::V1::PermissionsController#index/#create/#update/#destroy` —
      `create` looks up invitee by email (422 if none, updates existing row if
      already shared, rejects owner's own email), `destroy`/`update` blocked
      against the owner (policy) — makes T033 pass, FR-20, FR-21, FR-25, FR-26
      (`app/controllers/api/v1/permissions_controller.rb`)
- [x] T051 `Agent::RespondToMessage` service — calls OpenAI chat completions with
      `stage.initial_prompt` + message history, returns reply text — makes T036
      pass (`app/services/agent/respond_to_message.rb`)
- [x] T052 `AgentRespondJob` — creates the agent's `ProjectMessage`, updates
      `ProjectStage#output`/`status`, broadcasts via `ProjectStageChannel` — makes
      T037 pass (`app/jobs/agent_respond_job.rb`)
- [x] T053 `ProjectStageChannel` — Action Cable subscription scoped to a project
      the current user can access, broadcasts new messages and status changes
      (`app/channels/project_stage_channel.rb`)

## Phase 5: Frontend

Deferred. Per plan.md, `/frontend` (React + Vite) scaffolding is out of scope for
this plan/task set and gets its own spec → plan → tasks once the API above is
implemented and stable. This phase intentionally has no tasks yet.

## Phase 6: Polish

- [x] T054 Cross-check every spec.md Edge Case against Phase 3 tests; add any
      missing test coverage found (e.g. sending a message against a
      `project_stage` from a different project, sharing with an already-shared
      email, sharing with the owner's own email)
- [ ] T055 Run `bin/rails test` — full suite green
- [x] T056 Run `bin/rubocop` and `bin/brakeman` — fix flagged issues
- [x] T057 Document required env vars (`OPENAI_API_KEY`, `FRONTEND_ORIGIN`, JWT
      signing secret, database credentials) in `README.md`
