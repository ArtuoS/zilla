# Feature: Product Builder Core Workflow

**Status:** Draft
**Created:** 2026-09-20

## Overview
Zilla lets a user design an infoproduct (e.g. a PDF guide) as a sequence of build
stages (such as copywriting, then landing page creation), and generate one or more
concrete attempts — projects — at producing that product by running an AI agent
through those stages. Because a single attempt may not turn out the way the user
wants, they can spin up additional independent projects for the same product (to
test different personas, angles, or formats) and can converse with the agent
mid-build to request changes to what it has produced. This feature covers the
foundational workflow: authenticating, defining a product's stages, running
multiple independent build attempts against them, and chatting with the agent
during a build.

## User Scenarios

- **Scenario 1: User logs in**
  Given a registered user with valid credentials, When they submit their email and
  password, Then they are authenticated and gain access to their products.

- **Scenario 2: Failed login**
  Given a user submits an incorrect password or an unregistered email, When they
  attempt to log in, Then access is denied and no session is established.

- **Scenario 3: Create a product**
  Given a logged-in user, When they create a product with a name (and optionally a
  description), Then the product exists and belongs to that user.

- **Scenario 4: Define stages for a product**
  Given a logged-in user viewing their product, When they add a stage with a name
  and an initial prompt (and optionally a description), Then the stage is saved as
  part of that product's build sequence, positioned after any existing stages.

- **Scenario 5: Reorder / sequence of stages**
  Given a product with multiple stages, When the user views the product, Then the
  stages are presented in a defined, consistent build order.

- **Scenario 6: Start a new project (build attempt) for a product**
  Given a product with at least one stage, When the user starts a new project,
  Then a new, independent build attempt is created that will progress through the
  product's stages from the beginning, without affecting any other project already
  created for that product.

- **Scenario 7: Run multiple projects for the same product in parallel**
  Given a product with two projects at different points in their build (e.g. one on
  its copywriting stage, another already on its landing page stage), When the user
  views either project, Then each project's progress and stage status is shown
  independently of the other.

- **Scenario 8: Chat with the agent during a build**
  Given an active project on a given stage, When the user sends a message to the
  agent about that stage, Then the message is recorded, the agent responds with its
  own message, and both appear in that project's conversation for that stage.

- **Scenario 9: Request a change to a completed stage's output**
  Given a project whose stage has produced output the user is not satisfied with,
  When the user sends a follow-up message describing the desired change, Then the
  agent produces revised output for that stage reflecting the request, and the
  revision is reflected in the project's stage output.

- **Scenario 10: Owner shares a product with an existing user**
  Given a product owned by a user, When the owner shares it with the email of
  another registered user and an access level (admin or viewer), Then that user
  gains access to the product at that access level and it appears among their
  accessible products.

- **Scenario 11: Owner shares a product with an unregistered email**
  Given a product owner attempts to share it with an email that has no matching
  account, When they submit the share request, Then it is rejected with an error
  and no access is granted.

- **Scenario 12: Viewer accesses a shared product**
  Given a user with viewer access to a product, When they open that product's
  stages, projects, and message history, Then they can see everything but find no
  way to create stages, create projects, send messages, or change sharing.

- **Scenario 13: Admin manages a shared product**
  Given a user with admin access to a product, When they create or edit stages,
  create projects, send project messages, or share the product with further users,
  Then those actions succeed the same as if performed by the owner.

- **Scenario 14: Admin cannot remove the owner**
  Given a user with admin access to a product, When they attempt to revoke the
  owner's access or delete the product, Then the action is rejected.

- **Scenario 15: Owner revokes another user's access**
  Given a product shared with another user, When the owner removes that user's
  access, Then that user can no longer see or act on the product, its stages,
  projects, or messages.

- **Scenario 16: Skip, force-advance, or redo a stage**
  Given a project partway through its stages, When the user chooses to skip an
  upcoming stage, force-advance past the current one, or redo a stage already
  marked completed, Then the project's progress reflects that choice immediately,
  regardless of whether prior stages were completed in order.

- **Scenario 17: Editing a stage definition affects existing projects**
  Given a product with a stage that one or more projects have already used, When
  the owner or an admin edits that stage's name, description, or initial prompt,
  Then every project using that stage — in progress or already completed — shows
  the updated definition.

## Functional Requirements

- **FR-1:** The system MUST allow a user to authenticate using an email and
  password.
- **FR-2:** The system MUST reject authentication attempts with incorrect
  credentials without revealing whether the email or the password was wrong.
- **FR-3:** The system MUST allow an authenticated user to create a product with a
  required name and an optional description.
- **FR-4:** The system MUST allow an authenticated user to add stages to a product
  they own, each with a required name and a required initial prompt, and an
  optional description.
- **FR-5:** The system MUST assign each stage within a product a position in a
  build sequence, and MUST NOT allow two stages of the same product to share the
  same position.
- **FR-6:** The system MUST allow an authenticated user to create any number of
  independent projects for the same product.
- **FR-7:** Each project MUST track its own build progress (which stage it is on
  and that stage's status) independently of any other project for the same
  product.
- **FR-8:** A newly created project MUST begin its build at the product's first
  stage.
- **FR-9:** The system MUST NOT allow a project to be created for a product that
  has zero stages.
- **FR-10:** The system MUST allow a user to send a message within a project,
  addressed to a specific stage of that project.
- **FR-11:** Every message MUST be attributable either to the user who sent it or
  to the agent, and MUST be distinguishable as one or the other.
- **FR-12:** When a user sends a message on a stage, the system MUST produce an
  agent response associated with that same project and stage.
- **FR-13:** The system MUST persist the full message history for a project's
  stage in chronological order, viewable by the owning user.
- **FR-14:** The system MUST allow a user to request changes to a stage's already
  produced output via a message, and MUST reflect the resulting revision as that
  stage's current output.
- **FR-15:** The system MUST only allow a user to view or act on products,
  projects, stages, and messages that they own or that have been shared with them.
- **FR-16:** A stage's status MUST reflect one of: not yet started, in progress, or
  completed, scoped to the specific project it belongs to.
- **FR-20:** The system MUST allow a product's owner to share that product with
  another user, identified by that other user's email, at one of two access
  levels: admin or viewer.
- **FR-21:** The system MUST reject a share request for an email that does not
  match any registered user, without granting any access.
- **FR-22:** A user with viewer access to a product MUST be able to view that
  product, its stages, its projects, and all project message history, and MUST
  NOT be able to create or edit stages, create projects, send project messages, or
  change sharing.
- **FR-23:** A user with admin access to a product MUST be able to perform every
  action the owner can perform on that product — creating/editing stages,
  creating projects, sending project messages, and sharing/unsharing other users —
  except removing the owner's access or deleting the product.
- **FR-24:** The system MUST prevent any user, including an admin, from revoking
  the owner's access to a product or deleting the product, except the owner
  themselves.
- **FR-25:** The system MUST allow a product's owner to revoke a previously
  granted user's access to that product at any time, immediately ending that
  user's ability to view or act on it.
- **FR-26:** A given user MUST hold at most one access level on a given product at
  a time.
- **FR-17:** When a stage's definition (name, description, or initial prompt) is
  edited, the system MUST reflect that change for every project using that stage,
  including projects already in progress or already completed against it — there
  is no per-project snapshot of a stage's definition.
- **FR-18:** The system MUST allow a user to skip a stage, force-advance past a
  stage, or redo (re-run) an already-completed stage within a project, in any
  order — stages within a project are not required to be completed sequentially.
- **FR-19:** The system MUST NOT impose a limit on the number of projects a user
  can create for a single product.

## Non-Functional Requirements

- **NFR-1 (Security):** Passwords MUST never be stored or transmitted in
  recoverable plain text.
- **NFR-2 (Auditability):** All project messages MUST be retained with enough
  information to reconstruct the exact chronological conversation for a given
  project and stage after the fact.
- **NFR-3 (Isolation):** Data belonging to one user MUST never be visible or
  reachable by another user.

## Edge Cases

- User attempts to log in with an email that doesn't exist.
- User attempts to create a product without a name.
- User attempts to add a stage without a name or without an initial prompt.
- User attempts to create a project for a product that has no stages yet.
- User sends a message referencing a stage that doesn't belong to the project's
  product.
- User sends an empty message.
- Two projects for the same product are actively being worked on at the same time
  by the same user (must not cross-contaminate state).
- Agent fails to produce a response to a user's message.
- User attempts to view or message a project, product, or stage they don't own.
- A product has a stage added, edited, or removed after projects already exist for
  it — per FR-17, existing projects (in-flight or completed) see the updated stage
  set and definitions, not a snapshot from when they were created.
- Owner attempts to share a product with an email that doesn't match a registered
  user.
- Owner attempts to share a product with an email that already has access (should
  update the access level rather than error or duplicate).
- Owner attempts to share a product with their own email.
- Admin attempts to revoke the owner's access or delete the product.
- Viewer attempts to send a project message, create a stage, or create a project
  directly (bypassing the UI).
- Owner revokes a user's access while that user has the product open — that
  user's next action against it must be denied.

## Out of Scope

- Transferring ownership of a product from one user to another.
- Access levels other than admin and viewer (e.g. a custom/granular permission
  model).
- Sharing at any granularity other than a whole product (e.g. sharing a single
  project or stage in isolation).
- Payment, pricing, or distribution of the finished infoproduct.
- The specific mechanics of what the agent generates (writing quality, prompt
  design) beyond that it produces stage output and can revise it on request.
- Real-time collaborative editing of stage output by multiple users at once.
- Versioning/rollback of stage output beyond the current revision.

## Success Criteria

- A user can go from signing in to having a produced, revised piece of stage
  output for a product without leaving the guided workflow.
- A user can maintain two or more distinct projects for the same product and see
  their build progress and outputs remain fully independent of one another.
- Every agent-produced message and output change is traceable to the user message
  that prompted it.
