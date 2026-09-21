# Plan: Product Builder Core Workflow

**Spec:** ./spec.md
**Status:** Draft
**Created:** 2026-09-21

## Approach

Rails 8.1.3.1 stays API-only (`config.api_only = true`, already set) and serves JSON
under `/api/v1`. Auth is stateless JWT (not cookie/session-based): the app is a
monorepo with `/frontend` as a separate Vite dev server during development (different
port from Rails), so cookie-based CORS-with-credentials would add complexity (SameSite,
credentials: 'include' on every request) for no real benefit at this stage. A bearer
token issued on login, sent via `Authorization: Bearer <token>`, avoids that entirely
and works identically whether the two apps are same-origin behind a proxy in production
or cross-origin in development.

Authorization (owner/admin/viewer) is handled with **Pundit** rather than hand-rolled
`if` checks scattered across controllers — the permission matrix (FR-22/23/24) is
exactly what Pundit policies are for, and it keeps `ProductPolicy` as the single place
that encodes "who can do what" so it doesn't drift per-controller.

Stage *definitions* (`Stage`) are templates owned by the `Product`; a project's actual
progress through them is tracked by a separate `ProjectStage` join model. This directly
satisfies FR-17 (editing a `Stage` affects all projects using it — there's nothing to
propagate, since projects reference the same row) and FR-7 (each project's status is
its own row, so parallel projects never share state).

Agent replies are produced asynchronously via Solid Queue (already in the Gemfile) and
delivered to the frontend by both (a) a plain polling-friendly REST endpoint and (b) an
Action Cable broadcast over Solid Cable (already in the Gemfile) — the frontend can use
whichever fits, but nothing new needs to be provisioned for either.

**Rejected alternative:** Devise + session cookies. Rejected because Devise's view/
mailer conventions target server-rendered apps, and cookie auth across the Vite dev
server's separate origin needs CORS credentials plumbing that a bearer token sidesteps.

## Data Model

All tables use UUID primary keys (`id: :uuid`, `default: "gen_random_uuid()"`); the
`pgcrypto` extension is enabled via migration for this.

**users**
- `name` string, null: false
- `surname` string, null: false
- `email` citext (or string + unique index on `LOWER(email)`), null: false, unique
- `password_digest` string, null: false
- `has_secure_password` (bcrypt)

**products**
- `user_id` uuid, fk → users, null: false, index (this is the **owner**)
- `name` string, null: false
- `description` text

**stages**
- `product_id` uuid, fk → products, null: false, index
- `name` string, null: false
- `description` text
- `initial_prompt` text, null: false
- `sequence_order` integer, null: false
- unique index on `[product_id, sequence_order]`
- Note: no `status` column here — see `project_stages`. Editing this row is what
  makes FR-17 true for free.

**projects**
- `product_id` uuid, fk → products, null: false, index
- No `current_sequence` column — a project's position is derived from its
  `project_stages`, and FR-18 (skip/redo/force out of order) means there's no
  single linear "current" pointer to maintain anyway.

**project_stages** (join: a project's progress through one stage)
- `project_id` uuid, fk → projects, null: false
- `stage_id` uuid, fk → stages, null: false
- `status` integer enum: `pending` (0, default), `running` (1), `completed` (2),
  `skipped` (3)
- `output` text — the stage's current produced content
- `started_at`, `completed_at` datetime, nullable
- unique index on `[project_id, stage_id]`
- Row created for every stage as soon as a project is created (FR-8/FR-9: a project
  can't be created for a product with zero stages, and immediately has one
  `project_stages` row per existing stage, all `pending`).

**project_messages**
- `project_id` uuid, fk → projects, null: false
- `project_stage_id` uuid, fk → project_stages, null: false
- `sender_type` integer enum: `user` (0), `agent` (1)
- `user_id` uuid, fk → users, nullable (set when `sender_type: user`)
- `content` text, null: false

**permissions**
- `product_id` uuid, fk → products, null: false
- `user_id` uuid, fk → users, null: false
- `access_level` integer enum: `viewer` (0), `admin` (1)
- unique index on `[product_id, user_id]`
- The owner never has a row here (ownership is `products.user_id`), which is what
  makes FR-24 (owner can't be removed/demoted by an admin) structurally true rather
  than a special case to remember to check.

**Associations (sketch):**
```ruby
class User < ApplicationRecord
  has_secure_password
  has_many :owned_products, class_name: "Product", foreign_key: :user_id
  has_many :permissions
  has_many :shared_products, through: :permissions, source: :product
  has_many :project_messages
end

class Product < ApplicationRecord
  belongs_to :owner, class_name: "User", foreign_key: :user_id
  has_many :stages, -> { order(:sequence_order) }
  has_many :projects
  has_many :permissions, dependent: :destroy
  has_many :shared_users, through: :permissions, source: :user
end

class Stage < ApplicationRecord
  belongs_to :product
  has_many :project_stages, dependent: :restrict_with_error
end

class Project < ApplicationRecord
  belongs_to :product
  has_many :project_stages, dependent: :destroy
  has_many :project_messages, through: :project_stages
end

class ProjectStage < ApplicationRecord
  belongs_to :project
  belongs_to :stage
  has_many :project_messages
  enum :status, { pending: 0, running: 1, completed: 2, skipped: 3 }
end

class ProjectMessage < ApplicationRecord
  belongs_to :project
  belongs_to :project_stage
  belongs_to :user, optional: true
  enum :sender_type, { user_sender: 0, agent_sender: 1 } # avoid clashing with `user` assoc name
end

class Permission < ApplicationRecord
  belongs_to :product
  belongs_to :user
  enum :access_level, { viewer: 0, admin: 1 }
end
```

## Routes & Controllers

All under `/api/v1`, JSON only.

```ruby
namespace :api do
  namespace :v1 do
    resources :registrations, only: [:create]
    resource  :session,       only: [:create, :destroy]

    resources :products do
      resources :stages,      only: [:index, :create, :update, :destroy]
      resources :projects,    only: [:index, :create, :show]
      resources :permissions, only: [:index, :create, :update, :destroy]
    end

    resources :projects, only: [:show] do
      resources :project_stages, only: [:index, :show] do
        member do
          post :skip
          post :redo
          post :force_advance
        end
        resources :messages, only: [:index, :create], controller: "project_messages"
      end
    end
  end
end
```

- `Api::V1::RegistrationsController#create` — sign-up (implied by spec's use of
  "registered user"; see Risks).
- `Api::V1::SessionsController#create` — verifies email/password (FR-1/FR-2), issues
  JWT. `#destroy` is a no-op success response (stateless token; see Risks).
- `Api::V1::ProductsController` — standard CRUD, scoped to `current_user`'s owned +
  shared products (FR-3, FR-15).
- `Api::V1::StagesController` — nested under product; `ProductPolicy#manage_stages?`
  gates create/update/destroy (owner or admin only) (FR-4, FR-5, FR-22, FR-23).
  `destroy` is blocked at the model level if any `project_stages` reference it
  (`dependent: :restrict_with_error`) — see Risks re: stage deletion semantics.
- `Api::V1::ProjectsController` — `create` requires the product to have ≥1 stage
  (FR-9) and creates one `project_stages` row per existing stage (FR-8). No
  per-product cap (FR-19).
- `Api::V1::PermissionsController` — `create` looks up the invitee by email and
  404s/422s if not found (FR-21); `ProductPolicy#share?` gates it (owner or admin).
  Owner is never a row, so there is nothing for `destroy` to act on to remove the
  owner (FR-24 satisfied structurally).
- `Api::V1::ProjectStagesController#skip/#redo/#force_advance` — status
  transitions per FR-18; `redo` re-enqueues `AgentRespondJob`.
- `Api::V1::ProjectMessagesController#create` — `ProductPolicy#chat?` gates it
  (owner or admin only; viewers are read-only per FR-22); persists the user's
  message, enqueues `AgentRespondJob` (FR-10, FR-12, FR-13, FR-14).

## Views / Frontend

`/frontend`: React + Vite (TypeScript assumed as the reasonable default — flag if
you'd rather plain JS). Scaffolding is out of scope for this plan (no existing
frontend code to build on yet) and will get its own plan when the frontend work
starts; this plan only fixes the API contract it will call and the CORS
configuration that allows it:

- `config/initializers/cors.rb` — uncomment and configure `origins` from
  `ENV.fetch("FRONTEND_ORIGIN", "http://localhost:5173")`.

Rails renders no views/ERB (API-only, no Jbuilder needed); JSON responses are built
with a light serialization method (`as_json` overrides or plain hashes in
controllers) rather than pulling in a serializer gem, since the response shapes
here are simple and few.

## Background Jobs / Services

- `AgentRespondJob < ApplicationJob` (Solid Queue) — takes a `project_message_id`
  (the user's message just created), calls `Agent::RespondToMessage`, persists the
  agent's `ProjectMessage` (`sender_type: agent_sender`), updates the triggering
  `ProjectStage#output` and status (`pending`/`running` → `completed` once the
  agent finishes), and broadcasts the new message over Action Cable
  (`ProjectStageChannel`, backed by Solid Cable, already in the Gemfile).
- `Agent::RespondToMessage` (`app/services/agent/respond_to_message.rb`) — the
  actual LLM call. Provider/model is not yet decided (see Risks) — this service is
  the single seam to swap that in without touching controllers or jobs.
- `ProjectStageChannel` (Action Cable) — broadcasts new `project_messages` and
  `project_stages` status changes to subscribers with access to that project.

## Dependencies

- `bcrypt` (uncomment in Gemfile) — `has_secure_password`.
- `jwt` (new) — encode/decode bearer tokens; small, no-frills, standard choice for
  stateless API auth.
- `rack-cors` (uncomment in Gemfile) — required for the Vite dev server (different
  port/origin) to call the API in development.
- `pundit` (new) — authorization policies for owner/admin/viewer (see Approach).
- `ruby-openai` (new) — client for the OpenAI API, used inside
  `Agent::RespondToMessage`; avoids hand-rolling HTTP + retry/streaming handling
  against OpenAI's chat completions endpoint.

## Affected Files

```
Gemfile / Gemfile.lock                         (uncomment bcrypt, rack-cors; add jwt, pundit)
config/initializers/cors.rb                    (enable + configure)
config/initializers/pundit.rb                  (new, if needed)
config/routes.rb                               (namespace :api :v1 as above)

db/migrate/*_enable_pgcrypto.rb                (new)
db/migrate/*_create_users.rb                   (new)
db/migrate/*_create_products.rb                (new)
db/migrate/*_create_stages.rb                  (new)
db/migrate/*_create_projects.rb                (new)
db/migrate/*_create_project_stages.rb          (new)
db/migrate/*_create_project_messages.rb        (new)
db/migrate/*_create_permissions.rb             (new)

app/models/user.rb                             (new)
app/models/product.rb                          (new)
app/models/stage.rb                            (new)
app/models/project.rb                          (new)
app/models/project_stage.rb                    (new)
app/models/project_message.rb                  (new)
app/models/permission.rb                       (new)

app/policies/application_policy.rb             (new)
app/policies/product_policy.rb                 (new)

app/controllers/application_controller.rb      (modify: auth concern include)
app/controllers/concerns/authenticatable.rb    (new)
app/controllers/api/v1/registrations_controller.rb   (new)
app/controllers/api/v1/sessions_controller.rb        (new)
app/controllers/api/v1/products_controller.rb        (new)
app/controllers/api/v1/stages_controller.rb          (new)
app/controllers/api/v1/projects_controller.rb        (new)
app/controllers/api/v1/project_stages_controller.rb  (new)
app/controllers/api/v1/project_messages_controller.rb (new)
app/controllers/api/v1/permissions_controller.rb     (new)

app/services/agent/respond_to_message.rb       (new)
app/jobs/agent_respond_job.rb                  (new)
app/channels/project_stage_channel.rb          (new)

frontend/                                      (new directory; scaffolding is a
                                                 separate, later plan)
```

## Testing Strategy

Minitest, `test/` directory, mapped to spec requirements:

- **Model tests** (`test/models/`): validations and associations for all seven
  models; uniqueness constraints (`[product_id, sequence_order]`,
  `[project_id, stage_id]`, `[product_id, user_id]`); enum behavior for
  `ProjectStage#status`, `ProjectMessage#sender_type`, `Permission#access_level`.
- **Request tests** (`test/controllers/` or `test/requests/`), one file per
  controller, covering:
  - Sessions: FR-1, FR-2 (Scenarios 1–2)
  - Products/Stages: FR-3, FR-4, FR-5 (Scenarios 3–5)
  - Projects: FR-6, FR-7, FR-8, FR-9 (Scenarios 6–7, Edge case: zero-stage product)
  - ProjectMessages: FR-10, FR-11, FR-12, FR-13, FR-14 (Scenarios 8–9)
  - Permissions: FR-20–FR-26 (Scenarios 10–15, all their edge cases)
  - ProjectStages skip/redo/force: FR-18 (Scenario 16)
  - Cross-product isolation: FR-15, NFR-3 (Edge case: acting on another user's
    resources → 403/404)
- **Integration tests** (`test/integration/`): one end-to-end flow — register →
  login → create product → add stages → create two projects → chat on each → share
  with a second user → second user's viewer/admin access verified.
- `AgentRespondJob` and `Agent::RespondToMessage` are tested with a stubbed agent
  client (no real LLM calls in the test suite).

## Risks & Open Questions

- **Registration has no explicit FR.** The spec's scenarios only cover login, but
  FR-2 and Scenario 2 talk about "registered"/"unregistered" users, which implies
  accounts get created somehow. This plan adds a minimal `RegistrationsController`
  to make the rest of the spec implementable — flag if sign-up should instead be
  invite-only or admin-provisioned, which would change this.
- **LLM provider: OpenAI** (decided). `Agent::RespondToMessage` wraps the OpenAI API
  (chat completions), authenticated via `ENV["OPENAI_API_KEY"]`. Model choice, cost
  controls, and the exact prompt construction from `stage.initial_prompt` + message
  history are still undesigned — worth their own follow-up plan once those are
  worked out; this plan only fixes that OpenAI is the provider behind the seam.
- **Stateless JWT means no server-side logout/revocation.** `DELETE /session` just
  returns success; the token remains technically valid until expiry if intercepted.
  Acceptable for MVP; revisit (short expiry + refresh tokens, or a denylist) if that
  becomes a real requirement.
- **Stage deletion is blocked, not handled, once used.** FR-17 only asked for edits
  to propagate; it didn't say what happens on delete. This plan takes the
  conservative default (`restrict_with_error` — can't delete a stage any project has
  touched) rather than guessing at cascade/orphan behavior. Confirm before `/tasks`
  if that's wrong.
- **Frontend scaffolding is out of scope here.** This plan only fixes the API
  contract and CORS origin the frontend will need; the actual Vite/React setup,
  routing, and state management get their own plan.
