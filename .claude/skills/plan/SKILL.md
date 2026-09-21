---
name: plan
description: >
  Use once a feature's spec.md is finalized (no unresolved [NEEDS CLARIFICATION] markers)
  to produce a technical implementation plan (plan.md) — architecture, data model,
  affected files, dependencies, and testing strategy for this Rails app. Triggers on
  "/plan", "plan the implementation for X", "how should we build X". Refuses to run
  against a spec that still has open clarifications.
---

# Plan

Turn an approved spec into a concrete technical plan: the HOW. This is where Rails
conventions, file paths, models, routes, and gems get decided. No task breakdown yet —
that's `/tasks`.

## Steps

1. **Locate and validate the spec.** Find `specs/NNN-slug/spec.md` (ask which feature if
   ambiguous). If it still contains `[NEEDS CLARIFICATION: ...]` markers, stop and tell
   the user to run `/clarify` first — don't guess at unresolved requirements.

2. **Understand the current codebase** before proposing anything:
   - This is a Rails app on Ruby `4.0.6`'s Gemfile target (check `.ruby-version` /
     `Gemfile.lock` for the actual Rails version in use), using **Minitest** (`test/`,
     not `spec/`) as the test framework.
   - Skim relevant existing code: `app/models`, `app/controllers`, `app/views`,
     `config/routes.rb`, `db/schema.rb`, and any existing patterns for similar features
     (e.g. how another CRUD resource, background job, or service object is structured).
   - Reuse existing conventions (service objects, concerns, form objects, job classes)
     rather than introducing a new pattern unless the spec genuinely requires it.

3. **Write `plan.md`** in the same `specs/NNN-slug/` directory:

   ```markdown
   # Plan: <Name>

   **Spec:** ./spec.md
   **Status:** Draft
   **Created:** <YYYY-MM-DD>

   ## Approach
   Short narrative: the overall implementation strategy and why (esp. if there were
   real alternatives — note what was considered and rejected, briefly).

   ## Data Model
   New/changed models, associations, validations, and migrations. Name actual
   tables/columns/types. If no data model changes, say so explicitly.

   ## Routes & Controllers
   New/changed routes (`config/routes.rb` entries) and the controllers/actions involved.

   ## Views / Frontend
   New/changed views, partials, Stimulus controllers, or Turbo Streams/Frames involved,
   if any.

   ## Background Jobs / Services
   Any async work, service objects, or external integrations, and where they live.

   ## Dependencies
   New gems (with justification) or none.

   ## Affected Files
   Concrete list of files to be created or modified — this feeds directly into `/tasks`.

   ## Testing Strategy
   What gets covered by model tests, controller/request tests, integration/system tests
   (Minitest, `test/` dir). Map back to the spec's Functional Requirements and Edge Cases
   so every one has a corresponding test.

   ## Risks & Open Questions
   Anything non-obvious, risky, or where the user's input is genuinely needed before
   implementation (distinct from spec ambiguity — this is technical risk).
   ```

4. **Keep it decision-complete.** A reader should be able to go implement this without
   re-deriving design decisions. Vague plan items ("figure out the best way to...") are a
   sign more investigation is needed before this step is done.

5. **Report back.** File path, one-line summary of the approach, and any flagged risks.
   Next step is `/tasks`.
