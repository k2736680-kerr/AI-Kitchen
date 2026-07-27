# AI Kitchen Handoff Template

> Complete this file when moving to a new chat, AI tool, developer, branch, or work session. Replace every placeholder; do not delete unresolved errors.

## 1. Project Identity

- Project: AI Kitchen / AI 厨房助手
- Blueprint version:
- Product version:
- Current phase:
- Date/time and timezone:
- Handoff from:
- Handoff to:

## 2. Repository

- Repository path/URL:
- Branch:
- Last known working commit:
- Current HEAD:
- Working tree clean?:
- Package manager/lockfile:
- Environment: development / staging / production

## 3. Mandatory Reading

- [ ] `AI_CONTEXT.md`
- [ ] `DEVELOPMENT_PROTOCOL.md`
- [ ] `PROJECT_STATE.md`
- [ ] `CURRENT_STATUS.md`
- [ ] Relevant numbered design documents:
- [ ] Relevant `DECISIONS.md` entries:
- [ ] Recent `CHANGELOG.md`:

## 4. Current Task

- Task:
- User/business goal:
- Current behavior:
- Expected behavior:
- Why this task is needed now:

## 5. Scope

### Allowed to modify

-

### Must not modify

-

### Dependencies/owners

-

## 6. Actual Status

### Completed and verified

-

### Implemented but not verified

-

### In progress

-

### Not started

-

### Blocked

-

Do not put planned work under “completed”.

## 7. Changed Files

| File | Change | Reason | Tested |
|---|---|---|---|
| | | | |

## 8. Commands and Results

```text
Command:
Environment:
Result:
Pass/fail/skip counts:
Artifact/log:
```

Repeat for every important command.

## 9. Runtime/Device Evidence

- Mobile build:
- Device/model:
- OS/API:
- Simulator/emulator or real device:
- API environment:
- Test account type:
- Main path result:
- Screenshot/video/log location:

## 10. Errors

Paste the complete relevant error, not a paraphrase:

```text
...
```

- First observed:
- Reproduction steps:
- Frequency:
- Suspected cause:
- What has already been tried:
- What must not be retried blindly:

## 11. Data and Safety

- Database migrations involved:
- RLS/ownership impact:
- Local migration/sync impact:
- AI/Prompt/Schema impact:
- Food Safety impact:
- Nutrition impact:
- Privacy/permissions impact:
- Idempotency/cost impact:
- Secrets checked:

## 12. Acceptance Criteria

- [ ]
- [ ]
- [ ]

## 13. Next Exact Step

Write one concrete next task, not a broad roadmap:

- Goal:
- Files to inspect/change:
- Test command:
- Expected proof:

## 14. Risks and Rollback

- Known risks:
- Rollback commit/version:
- Database rollback/forward-fix:
- Feature flag/kill switch:
- Data recovery:

## 15. Fixed Instructions for the Next Agent

1. Inspect current files and tests before changing code.
2. Do not rebuild the project or change architecture without approval.
3. Preserve client secret boundary, server ownership, shared Schema, idempotency, Food Safety fail-closed behavior, and environment isolation.
4. Make the smallest coherent change.
5. Report exact test evidence and untested items.
6. Update `CURRENT_STATUS.md`, `CHANGELOG.md`, and `DECISIONS.md` when applicable.
