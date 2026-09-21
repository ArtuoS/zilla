---
name: clarify
description: >
  Use after a spec.md exists and before /plan, to resolve [NEEDS CLARIFICATION] markers
  and other ambiguities in a feature spec through targeted questions. Triggers on
  "/clarify", "clarify the spec", "resolve open questions in the spec". Do not skip this
  when unresolved markers exist — /plan should refuse to proceed until they're gone.
---

# Clarify

Turn an ambiguous spec into an unambiguous one, using the fewest questions that actually
change what gets built.

## Steps

1. **Locate the spec.** If the user names a feature, use `specs/NNN-slug/spec.md`.
   Otherwise find the most recently modified `specs/*/spec.md`. If several are equally
   recent, ask which one.

2. **Scan for ambiguity.** Collect:
   - Every `[NEEDS CLARIFICATION: ...]` marker.
   - Any requirement that's vague enough that two reasonable engineers would implement it
     differently (conflicting scenarios, unstated limits, unspecified error behavior,
     missing permission rules).

   Do not manufacture questions for things that don't matter to the implementation or the
   tests — this step is not a formality, only ask what genuinely changes the spec.

3. **Ask, batched.** Use the `AskUserQuestion` tool. Group related questions together
   (max ~4 per call, per tool constraints). Favor concrete options with a recommended
   default over open-ended questions where a sensible default exists.

4. **Update `spec.md` in place** for each resolved point:
   - Replace the `[NEEDS CLARIFICATION: ...]` marker with the resolved requirement text.
   - For ambiguities that weren't explicitly marked, tighten the requirement text directly.
   - Append a `## Clarifications` section at the end of the file, dated, logging what was
     asked and decided:
     ```markdown
     ## Clarifications

     ### 2026-09-20
     - Q: Retention period for deleted records? → A: 30 days, then hard delete.
     ```

5. **If the user defers a question** ("not sure, just pick something reasonable"), pick
   the lowest-risk/most-conventional default, note it as an assumption in the
   Clarifications log, and move on — don't block on it.

6. **Report back.** Confirm the spec now has zero `[NEEDS CLARIFICATION]` markers (or list
   the ones intentionally left, with why), and that the next step is `/plan`.
