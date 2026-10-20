# Pax Virentia agent coordination

These project instructions supplement the inherited Gemini/Muse engineering workflow. Preserve existing specifications, project instructions, approval gates, and unrelated work. Configuration requests authorize configuration work only; implement application features only when assigned.

## Responsibilities

- Gemini Planner remains the overall project manager. Gemini owns project scope, architecture, approved specifications/plans, contract decisions, and final project acceptance.
- Codex Senior is the main Codex engineering agent, configured as `gpt-6.1-sol` with `high` reasoning. Senior coordinates assigned Codex implementation, integration, verification, and one consolidated report to Gemini.
- Muse Junior remains the separate OpenCode implementation worker under Gemini's coordination. Muse is not a Codex subagent and is not replaced by this configuration.
- `frontend-worker`: `gpt-6.1-sol`, `medium` reasoning; owns assigned frontend UI, forms, charts, responsiveness, and accessibility, normally in `apps/web/`.
- `backend-worker`: `gpt-6.1-sol`, `high` reasoning; owns assigned FastAPI, database integration, authentication, and simulation logic, normally in `backend/`.
- `test-reviewer`: `gpt-6.1-sol`, `high` reasoning; independently reviews correctness, security, scientific calculations, and test coverage. It reports findings and does not change application code unless explicitly assigned.

## Delegation and ownership

Codex Senior may delegate independent implementation tasks to these project-local custom agents when useful within Gemini's approved scope. This is the project-specific extension of the inherited Gemini/Muse division of labor.

1. Before related frontend/backend work begins, agree on the API contract: endpoints and methods, request/response schemas, field names and units, authentication/authorization, validation errors, status values, and loading/empty/failure behavior. Record the contract in the task brief or existing plan. Route changes through Codex Senior and Gemini when they affect approved scope.
2. Give each worker a bounded task, acceptance criteria, validation requirements, and an explicit, non-overlapping list of owned files. Default domain directories are guidance, not blanket permission to edit every file within them.
3. Include Codex Senior and Muse Junior in the ownership map. Assign a single owner for shared types, contracts, migrations, dependency manifests, lockfiles, configuration, and shared documentation. Serialize work that cannot have separate file ownership.
4. Use the configured custom agent names. Keep at most three Codex subagents open concurrently, excluding Codex Senior. Workers must not spawn nested agents.
5. Workers report contract mismatches, ownership conflicts, and blockers to Codex Senior before expanding scope. Preserve other agents' and the user's changes.
6. After implementation and integration, run a final independent review with `test-reviewer` against the final changes and relevant tests. Address actionable findings within assigned ownership, rerun affected checks, and have any resulting fixes reviewed before declaring the work complete.
7. Codex Senior returns one consolidated report to Gemini Planner containing changes and file ownership, contract decisions, validation results, independent review findings and their disposition, and remaining blockers. Workers report to Senior rather than sending separate completion reports to Gemini.

## Project evidence

Follow `CONTEXT.md`, `Branding.md`, the approved system design, and applicable specifications. Keep scientific calculations deterministic, track evidence and units, compare compatible scenario boundaries, and preserve `not_estimable` as distinct from zero. Generated narratives must not replace numerical calculations or source evidence. Use the exact configured models; report unavailability instead of silently substituting.
