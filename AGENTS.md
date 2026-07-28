# AGENTS.md — Repository Instructions for Coding Agents

## Scope

These instructions apply to the repository root and all descendants unless a deeper `AGENTS.md` provides more specific compatible instructions.

## Source of Truth

Read before work:

- `AI_CONTEXT.md`
- `DEVELOPMENT_PROTOCOL.md`
- `PROJECT_STATE.md`
- `CURRENT_STATUS.md`
- relevant numbered Blueprint documents
- `DECISIONS.md`
- `CHANGELOG.md`

When documents conflict, follow the priority defined in `README.md`. Do not use chat history as the final factual source.

## Current Reality Check

The Blueprint may describe target code that does not exist. Before editing:

- list repository files;
- identify the package manager and lockfile;
- identify actual commands;
- inspect current implementation and tests;
- confirm the active branch/commit;
- do not create a second project beside an existing one.

## Architecture Invariants

- React Native + Expo + TypeScript mobile client.
- Versioned owned REST API; App does not call AI providers directly.
- 内网 Node.js API + MySQL；服务端验证数据归属，当前 guestId 仅为过渡期业务标识。
- Monorepo shared request/response/Recipe Schema.
- Model output is Recipe Candidate only.
- Deterministic Schema, business, Food Safety, and Nutrition stages assemble Final Recipe.
- Food Safety fails closed; Nutrition may become unavailable.
- `requestId` and `idempotencyKey` are first-class.
- Three environments are isolated.

## Change Discipline

- Make the smallest change that satisfies the acceptance criteria.
- Do not refactor unrelated code.
- Do not upgrade major dependencies while implementing a feature.
- Do not change API/Schema/database/security behavior without updating design and ADRs.
- Preserve backwards compatibility during mobile rollout.
- Database changes require migrations and RLS tests.
- Local schema changes require versioned migrations and recovery tests.
- Never hand-edit production configuration outside the declared deployment path.

## Security and Privacy

Never expose secrets. Never trust client owner IDs. Never log tokens, full email, raw allergy text, raw AI output, or complete recipes by default. Use synthetic test data. Keep user namespaces isolated. Account deletion must cover cloud and local data.

## Validation

Run exact commands available in the repository. At minimum, choose relevant checks from:

- format/lint/typecheck;
- unit/component/integration;
- contract/API;
- RLS/database;
- AI evaluation and Food Safety fixed set;
- local migration/sync;
- mobile E2E/device;
- build/release configuration;
- documentation links and code fences.

Do not hide failures or convert mandatory checks into skips.

## Agent Output

Every completed task must include:

- summary;
- files changed;
- tests and results;
- untested items;
- risk/security notes;
- rollback;
- required `CURRENT_STATUS.md`, `CHANGELOG.md`, or `DECISIONS.md` changes.

If blocked, provide the exact blocker and the maximum safe partial result; do not claim completion.
