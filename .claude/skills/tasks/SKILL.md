---
name: tasks
description: >
  Use once a feature's plan.md exists to break it into an ordered, dependency-aware,
  checkbox task list (tasks.md) ready for /execute. Triggers on "/tasks", "break down
  the plan into tasks", "create a task list for X".
---

# Tasks

Turn a plan into an ordered checklist that `/execute` can work through mechanically,
task by task, without re-deriving design decisions.

## Steps

1. **Locate and validate the plan.** Find `specs/NNN-slug/plan.md` (ask which feature if
   ambiguous). If it doesn't exist, tell the user to run `/plan` first.

2. **Break the plan into tasks**, grouped into phases in dependency order:
   - **Setup** — migrations, new gems (`bundle add` + `bundle install`), routes.
   - **Data Model** — model classes, validations, associations.
   - **Tests (write first)** — this app follows test-first ordering: write the Minitest
     tests for each Functional Requirement/Edge Case from the spec *before* the
     implementation task that makes them pass. Reference the spec requirement id
     (e.g. `FR-3`) in the task.
   - **Backend** — controllers, services, jobs.
   - **Frontend** — views, partials, Stimulus/Turbo.
   - **Polish** — edge cases, error handling, cleanup, docs if requested.

3. **Format each task** as a checkbox line with an id, exact file path(s), and enough
   detail to execute without re-reading the whole plan:

   ```markdown
   - [ ] T001 Add `avatar` migration (db/migrate/xxx_add_avatar_to_users.rb)
   - [ ] T002 [P] Write User#avatar validation test (test/models/user_test.rb) — FR-1
   - [ ] T003 Add avatar validation to User model (app/models/user.rb) — FR-1
   ```

   - Mark tasks `[P]` when they touch files independent of other in-flight tasks in the
     same phase and can be done in any order relative to each other. Never mark two tasks
     `[P]` if one's file depends on the other's output.
   - Keep each task scoped to one coherent change — small enough to verify in isolation,
     large enough not to be pure busywork.

4. **Write `tasks.md`** in `specs/NNN-slug/`:

   ```markdown
   # Tasks: <Name>

   **Plan:** ./plan.md
   **Status:** Not started

   ## Phase 1: Setup
   - [ ] T001 ...

   ## Phase 2: Data Model
   - [ ] T00x ...

   ## Phase 3: Tests
   - [ ] T00x ...

   ## Phase 4: Backend
   ...

   ## Phase 5: Frontend
   ...

   ## Phase 6: Polish
   ...
   ```

5. **Sanity check before finishing:** every Functional Requirement and Edge Case in
   spec.md should be traceable to at least one task (usually a test task). Every file in
   plan.md's Affected Files list should appear in at least one task.

6. **Report back.** File path, task count per phase, and that the next step is `/execute`.
