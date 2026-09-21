---
name: spec
description: >
  Use at the start of a new feature, before any planning or coding, to write a formal
  feature specification (spec.md). Triggers on "/spec", "spec out X", "write a spec for X",
  "create a specification for X", "new feature: X". Produces specs/NNN-slug/spec.md focused
  on WHAT and WHY (user-facing behavior and requirements), never HOW (no tech stack, no
  schema, no API shapes — that belongs in /plan).
---

# Spec

Write a feature specification that a non-technical stakeholder could read and agree
"yes, that's what I want" — and that a QA engineer could turn directly into test cases.
This is the first step of the spec → clarify → plan → tasks → execute workflow.

## Steps

1. **Determine the feature slug and number.**
   - Run `ls specs/ 2>/dev/null` (create the `specs/` directory if it doesn't exist).
   - Find the highest `NNN-` prefix already used; the new feature is `NNN+1`, zero-padded
     to 3 digits (e.g. `001`, `002`).
   - Derive a short kebab-case slug from the feature name (e.g. `user-avatar-upload`).
   - Target file: `specs/NNN-slug/spec.md`.

2. **Gather just enough context.** Read the request carefully. If something is genuinely
   required to write a testable requirement or acceptance criterion (e.g. "notify users" —
   via email? in-app? both?), ask about it directly. Otherwise, don't stall on it — write
   the requirement and mark the open point inline as `[NEEDS CLARIFICATION: question]`.
   Resolving those markers is `/clarify`'s job, not this step's.

3. **Write `spec.md`** using this structure:

   ```markdown
   # Feature: <Name>

   **Status:** Draft
   **Created:** <YYYY-MM-DD>

   ## Overview
   One paragraph: what this feature is and why it matters (the problem/opportunity, not
   the solution).

   ## User Scenarios
   Written as Given/When/Then or short user stories. Cover the primary/happy path first,
   then the important secondary flows. Each scenario must be independently testable.

   - **Scenario 1: <name>**
     Given ..., When ..., Then ...

   ## Functional Requirements
   Numbered, testable, unambiguous. Each one should be verifiable by a single test.
   - **FR-1:** The system MUST ...
   - **FR-2:** The system MUST ...
   - **FR-3:** The system SHOULD ... (use SHOULD only for genuinely optional behavior)

   Mark unresolved points inline, e.g.:
   - **FR-4:** The system MUST [NEEDS CLARIFICATION: retention period for deleted records?]

   ## Non-Functional Requirements
   Performance, security, accessibility, auditability — only what's actually relevant to
   this feature. Omit the section if there's nothing meaningful to say.

   ## Edge Cases
   Boundary conditions, error states, empty/invalid input, concurrent access, permissions.
   List them as bullet points; each should map to a future test.

   ## Out of Scope
   Explicitly excluded behavior, to prevent scope creep during planning.

   ## Success Criteria
   How we'll know this feature works: measurable, from the user's or business's
   perspective (not "the code passes review").
   ```

4. **Rules while writing:**
   - No implementation details: no gem names, no table/column names, no route paths, no
     class names. If you catch yourself writing "using ActiveRecord callback..." — stop,
     that's a `/plan` concern.
   - Every requirement must be testable. Reject vague verbs ("handle", "support",
     "properly") in favor of concrete, observable behavior.
   - Prefer several small, unambiguous requirements over one broad one.

5. **Report back.** Tell the user the file path, how many `[NEEDS CLARIFICATION]` markers
   remain (if any), and that the next step is `/clarify` (if markers exist) or `/plan`
   (if the spec is already unambiguous).
