# Feature: Web App Frontend

**Status:** Draft
**Created:** 2026-09-21

## Overview
Zilla's product-builder workflow (spec 001) exists today only as a JSON API with no
way for a person to actually use it. This feature is the web application a user
interacts with directly: signing in, managing their infoproducts and the stages
that define how they're built, running and comparing multiple build attempts
(projects), chatting with the agent to steer a stage's output, and sharing a
product with collaborators at the right access level. It is the visual, clickable
surface over every workflow spec 001 already defines the rules for.

## User Scenarios

- **Scenario 1: Sign up and log in**
  Given a new visitor, When they register with their name, surname, email, and
  password, Then they land signed in on their products overview. Given a
  registered user, When they log in with correct credentials, Then they reach the
  same overview; with incorrect credentials, they see a single generic error and
  remain on the login screen.

- **Scenario 2: Stay signed in across a visit**
  Given a signed-in user, When they reload the page or return in a new tab, Then
  they remain signed in without re-entering credentials, until they explicitly log
  out or their session expires.

- **Scenario 3: See all accessible products at a glance**
  Given a signed-in user, When they open the products overview, Then they see
  every product they own or have been given access to, each labeled with their
  role on it (owner, admin, or viewer).

- **Scenario 4: Create a product**
  Given a signed-in user on the products overview, When they submit a name (and
  optionally a description), Then the new product appears in their list and they
  land on its detail view.

- **Scenario 5: Define a product's build stages**
  Given a user with owner or admin access viewing a product with no stages yet,
  When they add a stage with a name and an initial prompt (and optional
  description), Then it appears at the end of the product's stage sequence, and
  they can keep adding more.

- **Scenario 6: Start a new project (build attempt)**
  Given a product that has at least one stage, When a user with owner or admin
  access starts a new project, Then a new project appears showing every stage as
  not-yet-started, independent of any other project already running for that
  product. Given a product with zero stages, the option to start a project is
  unavailable, with an explanation why.

- **Scenario 7: Compare multiple projects side by side**
  Given a product with two or more projects at different points in their build,
  When the user views the product, Then each project's stage-by-stage progress is
  shown distinctly, so the user can tell them apart at a glance.

- **Scenario 8: Chat with the agent on a stage**
  Given a project on a given stage, When the user opens that stage and sends a
  message, Then their message appears immediately in the conversation, and the
  agent's reply appears in the same conversation once produced, without the user
  needing to manually refresh the page.

- **Scenario 9: Ask for a revision**
  Given a stage that already has produced output the user isn't happy with, When
  they send a follow-up message describing the change, Then the conversation shows
  their request and the agent's revised reply, and the stage's current output
  reflects the revision.

- **Scenario 10: Skip, force-advance, or redo a stage**
  Given a project on a stage, When the user chooses to skip it, force it to
  complete, or redo a stage already marked complete, Then that stage's status
  updates immediately to reflect the choice, and the user can act on any other
  stage regardless of order.

- **Scenario 11: Share a product with a collaborator**
  Given a user with owner or admin access to a product, When they enter another
  registered user's email and choose an access level (admin or viewer), Then that
  person appears in the product's collaborator list at that level. If the email
  isn't a registered user, they see a clear error and no one is added.

- **Scenario 12: Experience a product as a viewer**
  Given a user with viewer access to a product, When they browse it, Then they can
  see its stages, projects, and conversations, but every control that would create,
  edit, chat, skip/redo, or share is either hidden or disabled to them.

- **Scenario 13: Experience a product as an admin**
  Given a user with admin access to a product, When they use it, Then they can do
  everything the owner can except delete the product or remove the owner's access,
  and any control tied to those two actions is hidden or disabled to them.

- **Scenario 14: Revoke a collaborator's access**
  Given a product's collaborator list, When a user with owner or admin access
  removes someone, Then that person disappears from the list immediately, and if
  they are currently viewing that product, their next action against it fails
  with a clear message that they no longer have access.

- **Scenario 15: Log out**
  Given a signed-in user, When they log out, Then they're returned to the login
  screen and can no longer reach any product without signing in again.

## Functional Requirements

- **FR-1:** The system MUST provide a registration form (name, surname, email,
  password) and a login form (email, password), each with inline validation
  errors for missing/invalid fields.
- **FR-2:** The system MUST keep a user signed in across page reloads and new tabs
  until they log out or their session expires, without asking them to re-enter
  credentials in the meantime.
- **FR-3:** The system MUST show a login failure as one generic message that does
  not reveal whether the email or the password was wrong.
- **FR-4:** The system MUST display, for a signed-in user, every product they own
  or have shared access to, each labeled with their access level on it.
- **FR-5:** The system MUST let a user create a product from a name (required) and
  description (optional), and MUST show a validation error if the name is
  missing.
- **FR-6:** The system MUST let a user with owner or admin access add a stage
  (name and initial prompt required, description optional) to a product, and MUST
  show a validation error if a required field is missing.
- **FR-7:** The system MUST display a product's stages in their defined build
  order.
- **FR-8:** The system MUST let a user with owner or admin access start a new
  project for a product that has at least one stage, and MUST disable or hide
  that action (with an explanation) when the product has none.
- **FR-9:** The system MUST display, for each project, the status (not started,
  in progress, completed, or skipped) of every one of its stages, independently
  of any other project on the same product.
- **FR-10:** The system MUST let a user open a conversation for a given project's
  stage, see its full message history in order, and — if they have owner or admin
  access — send a new message.
- **FR-11:** The system MUST visually distinguish messages sent by the user from
  messages sent by the agent.
- **FR-12:** The system MUST show a newly produced or revised agent reply in the
  conversation without requiring the user to manually reload the page.
- **FR-13:** The system MUST show a stage's current produced output to the user
  viewing it.
- **FR-14:** The system MUST let a user with owner or admin access skip a stage,
  force it to complete, or redo an already-completed stage, from any stage
  regardless of the others' order, and MUST reflect the resulting status change
  immediately.
- **FR-15:** The system MUST let a user with owner or admin access share a
  product by entering a collaborator's email and choosing "admin" or "viewer",
  and MUST show a clear error, without adding anyone, if that email has no
  matching account.
- **FR-16:** The system MUST display a product's current collaborators and their
  access levels to any user who can access that product.
- **FR-17:** The system MUST let a user with owner or admin access revoke another
  collaborator's access, and MUST NOT offer any control to remove the product
  owner's access or delete the product to anyone but the owner.
- **FR-18:** The system MUST hide or disable every create/edit/chat/share/
  transition control for a user with only viewer access, while still letting them
  browse everything read-only.
- **FR-19:** The system MUST let a signed-in user log out, after which they MUST
  be unable to reach any product page without signing in again.
- **FR-20:** The system MUST show a clear, in-context error (not a raw
  technical/server message) whenever an action fails, including when access to a
  resource has been revoked while the user was viewing it.

## Non-Functional Requirements

- **NFR-1 (Feedback):** Any action that triggers a network request (submitting a
  form, sending a message, sharing, transitioning a stage) MUST show a visible
  loading/pending state until it resolves.
- **NFR-2 (Consistency):** What a user is allowed to do in the interface MUST
  always match what the backend actually permits for their access level — the
  interface MUST NOT offer a control that will predictably be rejected because of
  the user's role.
- **NFR-3 (Responsiveness):** The interface MUST remain usable on both a laptop-
  sized and a phone-sized screen.

## Edge Cases

- Registering with an email that's already taken.
- Logging in with an email that doesn't exist, or a wrong password (same generic
  message either way).
- Creating a product without a name.
- Adding a stage without a name or without an initial prompt.
- Trying to start a project on a product with zero stages.
- Two projects on the same product being viewed/worked on in the same session
  without their state bleeding into each other.
- Sending an empty message.
- The agent taking a long time (or failing) to reply — the user should not be
  left with no indication anything is happening.
- Sharing with an email that has no account, an email already shared, or the
  product owner's own email.
- A viewer's browser session pointed directly at a create/edit/share action (e.g.
  via a stale link) — must be blocked the same as if the control were never shown.
- A product's access being revoked while the affected user still has it open.
- Losing network connectivity mid-action.

## Out of Scope

- Payment, billing, or subscription UI.
- A native mobile app (only a responsive web interface is covered here).
- Internationalization/localization.
- Any platform-operator/admin-only interface for managing all users across the
  system.
- Reordering stages by dragging (spec 001 defines no such capability yet).
- Offline support beyond a clear "you're offline" indication.

## Success Criteria

- A new visitor can register, create a product, define its stages, run a project,
  chat with the agent to get revised output, and share it with a collaborator —
  entirely through the interface, without needing to know the API exists.
- A viewer can never successfully trigger a write action, even by directly
  navigating to where one would be.
- Two projects on the same product never show each other's state.
