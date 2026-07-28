# CLAUDE.md — AI Kitchen Project Instructions

This file provides persistent project context for Claude Code. It is guidance, not a substitute for repository permissions, hooks, tests, or human review.

## Mandatory Reading

Before making changes, read in this order:

1. `AI_CONTEXT.md`
2. `DEVELOPMENT_PROTOCOL.md`
3. `PROJECT_STATE.md`
4. `CURRENT_STATUS.md`
5. task-specific numbered documents
6. relevant entries in `DECISIONS.md`
7. recent `CHANGELOG.md`

## Project Boundary

AI Kitchen is a React Native + Expo + TypeScript mobile product with an owned versioned Node.js/Fastify backend, intranet MySQL, a structured AI generation pipeline, deterministic rules, food-safety fail-closed behavior, and versioned nutrition estimates. Supabase-specific Blueprint material is historical and superseded by ADR-0003.

The model generates only an untrusted Recipe Candidate. Trusted Final Recipe fields are produced by the server after validation. The client never calls the model provider directly.

## Working Method

For each task:

1. Inspect the existing repository and tests before proposing changes.
2. Restate the current facts, allowed scope, forbidden scope, acceptance criteria, and rollback.
3. Prefer the smallest coherent implementation.
4. Do not edit unrelated modules.
5. Preserve API, Schema, RLS, identity, idempotency, and food-safety boundaries.
6. Run real tests and report exact results.
7. Update status and decision documents when required.

When the request is large, split work into reviewable commits by domain. Do not rewrite the whole project in one pass.

## Hard Prohibitions

- No AI/Service Role/signing secrets in client code, public environment variables, logs, or Git.
- No client-supplied ownership.
- No Prompt-only food-safety checks.
- No trusted safety/nutrition/identity fields from model output.
- No “catch and continue” when safety validation is unavailable.
- No repeated generation with a new idempotency key merely because the client timed out.
- No production data in development.
- No destructive database/local migration without explicit recovery.
- No claims of completion without executed tests.

## Coding Standards

- TypeScript strict; avoid `any` and broad casts.
- Thin routes/screens; behavior in feature/use-case/domain layers.
- One API client and explicit DTO/domain/view-model mappers.
- Server state, persistent local state, and UI state remain separate.
- Pure functions for rules, normalization, nutrition, mapping, and transitions.
- All async screens include loading, empty, error, retry, offline, and revoked states as relevant.
- User-facing errors use stable codes/message keys and include requestId when useful.

## Test Requirements

Changes to these areas require dedicated gates:

- Auth/RLS: cross-user tests.
- Generation: idempotency, recovery, provider timeout.
- Schema/API: contract compatibility.
- Food Safety/ingredient normalization/Prompt/model: full fixed safety set.
- Nutrition: golden calculations and null/zero/coverage.
- Local DB/sync: migration, interruption, account switch, offline queue.
- Release/config: development/staging/production and real-device checks.

## Completion Response

Report changed files, key decisions, commands, results, untested areas, risks, rollback, and documentation updates. Say explicitly when something is designed but not implemented.
