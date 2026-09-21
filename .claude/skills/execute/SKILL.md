---
name: execute
description: >
  Use to implement tasks from an existing tasks.md, running tests and checking off items
  as they're completed. Triggers on "/execute", "implement the tasks", "start executing
  the plan", "work through the task list". Handles a whole feature, a single phase, or a
  single task id depending on what the user asks for.
---

# Execute

Work through `tasks.md` mechanically, one task (or one batch of `[P]` tasks) at a time,
keeping the checklist and the codebase in sync.

## Steps

1. **Locate `tasks.md`.** Find `specs/NNN-slug/tasks.md` (ask which feature if ambiguous,
   or if the user names a specific task id / phase, scope to that).

2. **Work in order**, respecting phase order and task dependencies:
   - Tasks without `[P]` are done strictly in listed order.
   - Consecutive `[P]` tasks in the same phase may be batched together in one turn.
   - Before starting a task, re-read its line for the exact file path and requirement
     reference — don't rely on memory of the plan.

3. **For each task:**
   - Make the change (or write the test, if it's a test task).
   - Run the relevant tests: `bin/rails test <path>` for a scoped run, or `bin/rails test`
     for the full suite at natural checkpoints (e.g. end of a phase). This app uses
     Minitest, not RSpec.
   - If tests fail, fix the root cause before moving on — don't skip ahead with a broken
     task marked done.
   - On success, edit `tasks.md` to flip `- [ ] T00x` to `- [x] T00x`.

4. **If a task turns out to be ambiguous or the plan doesn't cover something you hit**,
   stop and ask the user rather than improvising a design decision — that's a sign
   `/plan` (or even `/clarify`) missed something, and silently deciding it here will drift
   from the spec.

5. **Do not commit or push** unless the user explicitly asks — implementing tasks is not
   itself authorization to commit.

6. **Report progress** as you go with brief updates (which task, pass/fail), and give a
   final summary: tasks completed this run, tasks remaining, any tests still failing, and
   what's left before the feature can be considered done.
