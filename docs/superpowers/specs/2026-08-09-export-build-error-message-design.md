# Clarify production build failure for `expo export` — Design

**Date:** 2026-08-09
**Status:** Approved

## Problem

Running `npx expo export` for what was meant to be a production build fails at
app startup with:

```
EXPO_PUBLIC_API_BASE_URL is required in production builds.
```

The message doesn't say why the variable is missing or what to do about it,
which turns a one-command mistake into a debugging session.

## Root cause

`eas.json`'s per-profile `env` blocks (`preview`, `production`,
`production-apk`) are applied only by `eas build`. `expo export` never reads
them — it only loads `.env` files. The repo has a single `.env` with a
localhost dev URL, so an `expo export`-produced bundle running outside
`__DEV__` has no valid `EXPO_PUBLIC_API_BASE_URL`, and `src/config/env.ts`'s
production guard throws by design (added during the 2026-06-23 production
hardening pass to stop a build from silently shipping with no backend).

This is a workflow mistake, not a code defect: shippable builds should be
produced with `eas build --profile <preview|production|production-apk>`,
which already has the correct env values wired up.

## Fix

Two small, independent changes — no behavior change to the validation logic
itself, no new build scripts, no new env files.

### 1. Sharper error messages in `src/config/env.ts`

Reword all three production-mode errors to name the cause and the fix:

- Missing URL:
  `"EXPO_PUBLIC_API_BASE_URL is required in production builds. Build with 'eas build --profile production' (or 'production-apk'/'preview') — eas.json env values are not applied by 'expo export' alone."`
- Placeholder URL: append the same "use eas build" hint after the existing
  placeholder message.
- Non-https URL: append the same hint after the existing https message.

The existing test file (`src/__tests__/config/env.test.ts`) asserts on loose
regexes (`/EXPO_PUBLIC_API_BASE_URL/`, `/placeholder/i`, `/https/i`), so the
reworded messages don't require test changes — but re-run the suite to
confirm after editing.

### 2. New top-level `README.md`

The repo currently has no README. Add a minimal one with a short "Building"
section stating:

- Development: `npm start` / `npm run android` / `npm run ios`.
- Shippable builds (preview/production/production-apk) must go through
  `eas build --profile <name>` (see `eas.json` for profiles and the existing
  `apk` npm script as an example). `expo export` alone does not produce a
  valid production bundle because it does not apply `eas.json`'s `env`
  blocks.

Keep this to what's needed to prevent the mistake — not a full project
README rewrite.

## Out of scope

- No `.env.production` file.
- No preflight script/CI guard that checks env vars before a build runs.
- No changes to `eas.json` or the validation logic in `env.ts` beyond the
  error text.

## Testing

- Run `npm test -- env.test` (or full `npm test`) after editing
  `src/config/env.ts` to confirm the existing assertions still pass against
  the reworded messages.
