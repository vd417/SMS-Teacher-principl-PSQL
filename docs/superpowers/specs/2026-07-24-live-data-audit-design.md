# Live-Data Audit — sms-teacher-app (Phase 1: Findings)

**Date:** 2026-07-24
**Branch:** field-alignment-canonical
**Status:** Phase 1 (audit) only. Fix/backend/live-verification phases are planned separately once findings exist.

## Context

`sms-teacher-app` was migrated to be live-only against `sms-backend` on 2026-06-22 ([[teacher-app-live-api]]), followed by a production-hardening pass on 2026-06-23 ([[production-hardening]]) that removed several known fabrications (attendance pills, hardcoded dates, fake exam banner). An auth overhaul followed on the same day ([[auth-overhaul]]). Those memories are ~31 days old and are point-in-time — this audit re-verifies against current code rather than trusting them.

The user wants: the app's backend wiring in the best possible state, with all dummy/fabricated data removed, verified against a live running backend — and is willing to have `sms-backend` itself patched if a gap is found there, not just reported.

## Goal

Produce a complete, accurate findings list: every screen (teacher + principal roles) that renders data not sourced live from `sms-backend`, classified so the next phase can be scoped and planned.

## Method

1. Enumerate all screens under `src/screens/**` (both roles).
2. For each screen, trace the data path: screen → hook (`src/features/**` or `src/data/**` hooks) → repo (`src/data/repositories/**`, `src/data/http/**`) → zod schema/mapper (`src/data/http/mappers.ts`, `*.schema.ts`) → backend endpoint. Cross-check the endpoint against `sms-backend/src/Sms.Api/Swagger/ApiAudienceMap.cs` and the relevant endpoint/handler file.
3. Flag suspects: inline literal arrays/objects in a screen or hook standing in for API data; hardcoded dates/numbers/strings presented as live values; leftover artifacts from the deleted mock layer (`src/data/mock/**` was deleted 2026-06-22 — check for orphaned references or patterns copied from it); client-synthesized fields that were flagged as gaps in prior memory (approvals title/priority/requesterName, exam-paper topics/class_name, thread initials/online status) — re-verify whether the backend now has real sources.
4. Classify each finding:
   - **(a) App-side wiring gap** — backend has the data; the app isn't fetching/using it.
   - **(b) Backend gap** — the data doesn't exist on the backend at all (would need a schema/endpoint change).
   - **(c) Acceptable derived value** — genuinely client-computed for UX (e.g., a formatted date), not fabrication. Document why it's acceptable so it isn't re-flagged later.

## Output

A findings report: for each item, file:line, current behavior, classification (a/b/c), and — for (b) — what `sms-backend` would need to add (endpoint/field/migration, best guess at effort). No code changes in this phase.

## Out of scope (this spec)

- Implementing fixes in `sms-teacher-app`.
- Patching `sms-backend`.
- Spinning up the local backend/DB and running live smoke verification.

These become their own plan(s) — sized using the findings from this phase — per the earlier discussion: app-side fixes render missing fields as blank/placeholder (`—`) rather than fabricate, backend gaps get fixed in `sms-backend` (not just reported), and final verification is a live smoke pass against a running backend.

## Testing

N/A for this phase — it produces a report, not code. The findings report itself should be reviewed by the user before Phase 2 planning starts.
