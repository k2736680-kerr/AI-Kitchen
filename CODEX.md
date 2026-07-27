# CODEX.md — AI Kitchen Codex Workflow

> Codex should treat root `AGENTS.md` as the primary repository instruction file. This document adds an explicit task workflow and review checklist for AI Kitchen.

## Start of Task

1. Read `AGENTS.md` and the mandatory Blueprint files it lists.
2. Inspect the actual repository, branch, diff, lockfile, and tests.
3. Locate any deeper `AGENTS.md` in the target directory.
4. Write a concise task contract:
   - goal;
   - current behavior;
   - allowed files;
   - prohibited changes;
   - acceptance criteria;
   - tests;
   - rollback.

## Implementation

- Work in small reviewable patches.
- Prefer existing patterns and dependencies.
- Keep routes/UI thin and business logic testable.
- Use explicit types and stable errors.
- Treat all model output and client input as untrusted.
- Do not bypass the API, RLS, Rule Engine, Food Safety, or shared Schema for convenience.
- Preserve idempotency and request recovery.
- Add tests with the implementation, not after a large rewrite.

## Review Before Finalizing

Inspect `git diff` and ask:

- Did scope expand?
- Did any secret or user data enter code/logs/tests?
- Can user A access user B?
- Can a model-controlled field become trusted?
- Can a safety failure continue?
- Can a retry charge twice?
- Is a migration reversible/recoverable?
- Is old mobile/API compatibility preserved?
- Are error, empty, offline, and revoked states handled?
- Are docs/status accurate?

## Final Evidence

Provide exact commands and results, including failures/skips. Identify files changed and untested behavior. Do not say “done” when only a design or partial implementation was produced.

## Parallel Agents

When using multiple agents/worktrees:

- divide by independent modules;
- assign ownership of shared Schema/migrations to one agent;
- avoid simultaneous edits to generated lockfiles and central configs;
- merge foundational contracts before dependent features;
- run integrated tests after consolidation;
- do not accept independent agents making conflicting architecture decisions.
