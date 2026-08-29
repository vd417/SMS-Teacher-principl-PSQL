# Clarify Production Build Error Message Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a production build is missing/misconfigured `EXPO_PUBLIC_API_BASE_URL`, the thrown error should tell the developer to use `eas build`, not `expo export`, and a new README should document this so the mistake isn't repeated.

**Architecture:** Two independent, non-behavioral changes: (1) reword the three production-mode error strings thrown by `loadEnv` in `src/config/env.ts`; (2) add a new top-level `README.md` with a short "Building" section. No logic, no new files beyond the README, no config changes.

**Tech Stack:** TypeScript, Jest (existing `src/__tests__/config/env.test.ts` suite).

## Global Constraints

- No changes to `eas.json`, no new `.env.production` file, no preflight script/CI guard (spec: "Out of scope").
- The existing test assertions in `src/__tests__/config/env.test.ts` use loose regexes (`/EXPO_PUBLIC_API_BASE_URL/`, `/placeholder/i`, `/https/i`) and must still pass unmodified after the wording change.
- README addition is scoped to a short "Building" section only — not a full project README rewrite (spec: "Keep this to what's needed to prevent the mistake").

---

### Task 1: Reword production error messages in `src/config/env.ts`

**Files:**

- Modify: `src/config/env.ts:17-21`
- Test: `src/__tests__/config/env.test.ts` (existing file, no new tests needed — verifies via existing assertions)

**Interfaces:**

- Consumes: nothing new — `loadEnv(raw: Record<string, string | undefined>, isDev: boolean): AppEnv` signature is unchanged.
- Produces: nothing new — this task only changes string literals thrown inside `loadEnv`. No later task depends on new exports.

- [ ] **Step 1: Confirm the existing tests pass before making changes**

Run: `npm test -- env.test`
Expected: PASS (6 tests) — this is the baseline before editing.

- [ ] **Step 2: Edit the three thrown error messages**

In `src/config/env.ts`, replace lines 16-22:

```typescript
if (!isDev) {
  if (!url) throw new Error('EXPO_PUBLIC_API_BASE_URL is required in production builds.');
  if (url === PLACEHOLDER)
    throw new Error(`EXPO_PUBLIC_API_BASE_URL is still the placeholder (${PLACEHOLDER}).`);
  if (!url.startsWith('https://'))
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use https in production.');
}
```

with:

```typescript
const EAS_BUILD_HINT =
  "Build with 'eas build --profile production' (or 'production-apk'/'preview') — " +
  "eas.json env values are not applied by 'expo export' alone.";

if (!isDev) {
  if (!url)
    throw new Error(`EXPO_PUBLIC_API_BASE_URL is required in production builds. ${EAS_BUILD_HINT}`);
  if (url === PLACEHOLDER)
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL is still the placeholder (${PLACEHOLDER}). ${EAS_BUILD_HINT}`
    );
  if (!url.startsWith('https://'))
    throw new Error(`EXPO_PUBLIC_API_BASE_URL must use https in production. ${EAS_BUILD_HINT}`);
}
```

- [ ] **Step 3: Run the tests to confirm they still pass**

Run: `npm test -- env.test`
Expected: PASS (6 tests) — the regexes (`/EXPO_PUBLIC_API_BASE_URL/`, `/placeholder/i`, `/https/i`) still match the reworded messages since the original text is preserved as a prefix.

- [ ] **Step 4: Run the full test suite to check for unrelated breakage**

Run: `npm test`
Expected: PASS — no other test references these exact error strings (confirmed via `grep -r "required in production builds" src/__tests__` returning only `env.test.ts`, which uses regex matching).

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts
git commit -m "fix(config): clarify production env error to point at eas build"
```

---

### Task 2: Add top-level `README.md` with a Building section

**Files:**

- Create: `README.md`

**Interfaces:**

- Consumes: nothing — plain documentation file, no code interface.
- Produces: nothing — no later task depends on this file's content.

- [ ] **Step 1: Create `README.md` at the repo root**

````markdown
# School Desk Teacher App

Expo/React Native app for teachers and principals in the School Desk suite.

## Development

- `npm start` — start the Metro dev server
- `npm run android` — start with the Android app open
- `npm run ios` — start with the iOS app open

Development builds talk to the backend URL in `.env` (`EXPO_PUBLIC_API_BASE_URL`).

## Building

Shippable builds (preview, production, production-apk) **must** go through
EAS Build:

```bash
eas build --profile preview        # internal APK, staging API
eas build --profile production     # store build, production API
eas build --profile production-apk # internal APK, production API
```

See `eas.json` for what each profile sets, and the `apk` npm script
(`npm run apk`) for an example.

Do **not** use `npx expo export` on its own to produce a build for testing
or distribution. `expo export` only bundles the JS/assets — it does not
apply `eas.json`'s per-profile `env` values, so the resulting bundle has no
valid `EXPO_PUBLIC_API_BASE_URL` and will crash on startup in production
mode with an error telling you to use `eas build` instead.

## Testing

- `npm test` — run the Jest suite
- `npm run smoke:teacher` — run the teacher smoke script
````

- [ ] **Step 2: Verify the file renders sensibly**

Open `README.md` in an editor/GitHub preview and confirm the three
`eas build --profile ...` lines render as a single fenced code block under
"Building", not fragmented text.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with build instructions pointing at eas build"
```
