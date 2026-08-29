# Startup Config Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `EXPO_PUBLIC_*` env vars actually reach the running app (dev and EAS builds alike), and a misconfigured `EXPO_PUBLIC_API_BASE_URL` no longer hard-crashes the app before any UI exists — instead it degrades to a visible banner while Home/Login render normally.

**Architecture:** Four small, sequential changes to `src/config/env.ts` and its consumers: (1) fix the babel env-var inlining bug at the call site, (2) make `loadEnv` report a `configError` instead of throwing, (3) report that error to Sentry once at startup, (4) surface it to the user via a new always-visible banner component, mirroring the existing `OfflineBanner` pattern.

**Tech Stack:** TypeScript, React Native, Expo (babel-preset-expo's env-var inlining), Jest + `@testing-library/react-native`, Sentry (`@sentry/react-native`).

## Global Constraints

- `loadEnv`'s existing signature (`Record<string, string | undefined>`) and its unit-test call sites (passing plain object literals) are unaffected by the inlining fix — only the module-level call site in `src/config/env.ts` changes (spec: "Fix the inlining bug").
- `loadEnv` must never throw. On a missing/placeholder/non-https `EXPO_PUBLIC_API_BASE_URL` in production, it sets `configError: string` (the same descriptive text as before, including the "use eas build" hint) and `API_BASE_URL` falls back to `PLACEHOLDER` (spec: "`loadEnv` never throws").
- The in-app banner text must be exactly `"Can't reach the server. Please contact support."` — generic and end-user-facing. The detailed "use eas build" diagnostic goes to Sentry only, never to the UI (spec: "Surface it in-app without blocking navigation").
- Sentry reporting of a config error only fires from `initSentry()`, after a successful `Sentry.init(...)`, and only when `SENTRY_DSN` is configured (existing early-return guard is unchanged) (spec: "Report the config error to Sentry, once, from `initSentry()`").
- No active connectivity/health-check gate before Home/Login renders, no `eas.json` changes — both explicitly out of scope (spec: "Out of scope").
- Reuse the existing `httpClient` → `AppError({code: 'network'})` → per-screen `ErrorState` path for actual failed network requests; no new error-handling plumbing there (spec: "Surface it in-app without blocking navigation").

---

### Task 1: Fix the env-var inlining bug

**Files:**

- Modify: `src/config/env.ts:31` (only the module-level call site)
- Test: `src/__tests__/config/env.test.ts` (run only, no changes expected)

**Interfaces:**

- Consumes: nothing new — `loadEnv(raw: Record<string, string | undefined>, isDev: boolean): AppEnv` is unchanged in this task.
- Produces: nothing new for later tasks — this task only changes how `env.ts`'s module-level call constructs its input object. Task 2 modifies `loadEnv`'s body and `AppEnv` itself.

- [ ] **Step 1: Confirm the existing tests pass before making changes**

Run: `npm test -- env.test`
Expected: PASS (6 tests) — baseline before editing.

- [ ] **Step 2: Rewrite the call site to use literal `process.env.EXPO_PUBLIC_*` expressions**

In `src/config/env.ts`, replace the final line:

```ts
export const env: AppEnv = loadEnv(process.env, __DEV__);
```

with:

```ts
export const env: AppEnv = loadEnv(
  {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
  __DEV__
);
```

This matters because Expo's babel transform (`babel-preset-expo`'s `expoInlineEnvVars`, in `node_modules/babel-preset-expo/build/inline-env-vars.js`) only rewrites a literal `process.env.EXPO_PUBLIC_X` `MemberExpression` found directly in source. Passing the whole `process.env` object into a function (the old code) means the transform never sees the pattern it's looking for, so the values are never inlined — in any build, dev or production.

- [ ] **Step 3: Run the tests to confirm nothing broke**

Run: `npm test -- env.test`
Expected: PASS (6 tests, unchanged) — `loadEnv` itself wasn't touched, only its caller.

- [ ] **Step 4: Commit**

```bash
git add src/config/env.ts
git commit -m "fix(config): reference EXPO_PUBLIC_* vars literally so Expo can inline them"
```

---

### Task 2: `loadEnv` reports a config error instead of throwing

**Files:**

- Modify: `src/config/env.ts` (the `AppEnv` interface and `loadEnv`'s body)
- Modify: `src/__tests__/config/env.test.ts` (full rewrite of the throw-based assertions)
- Modify: `index.ts:5-9` (comment only)

**Interfaces:**

- Consumes: the `loadEnv(raw, isDev)` call site from Task 1 (unchanged by this task).
- Produces: `AppEnv` gains `configError: string | null`. Task 3 (`initSentry`) and Task 4 (`ConfigErrorBanner`) both read `env.configError` from `@/config/env`.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `src/__tests__/config/env.test.ts` with:

```ts
import { loadEnv } from '@/config/env';

const PLACEHOLDER = 'https://api.schooldesk.local/v1';

describe('loadEnv', () => {
  it('accepts a valid https URL in production with no config error', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'https://api.school.com/v1' }, false);
    expect(out.API_BASE_URL).toBe('https://api.school.com/v1');
    expect(out.configError).toBeNull();
  });

  it('sets a config error in production when the URL is missing, and falls back to the placeholder', () => {
    const out = loadEnv({}, false);
    expect(out.configError).toMatch(/EXPO_PUBLIC_API_BASE_URL/);
    expect(out.configError).toMatch(/eas build --profile production/);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('sets a config error in production when the URL is the placeholder host', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: PLACEHOLDER }, false);
    expect(out.configError).toMatch(/placeholder/i);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('sets a config error in production when the URL is not https, and falls back to the placeholder', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'http://api.school.com/v1' }, false);
    expect(out.configError).toMatch(/https/i);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('falls back to the localhost placeholder in dev with no config error', () => {
    const out = loadEnv({}, true);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
    expect(out.configError).toBeNull();
  });

  it('passes through the optional maps key and sentry dsn', () => {
    const out = loadEnv(
      {
        EXPO_PUBLIC_API_BASE_URL: 'https://a.com/v1',
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'k',
        EXPO_PUBLIC_SENTRY_DSN: 'd',
      },
      false
    );
    expect(out.GOOGLE_MAPS_API_KEY).toBe('k');
    expect(out.SENTRY_DSN).toBe('d');
    expect(out.configError).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- env.test`
Expected: FAIL — `out.configError` is `undefined` (property doesn't exist yet), and the missing/placeholder/non-https cases throw instead of returning, so those three tests fail with an uncaught exception.

- [ ] **Step 3: Rewrite `AppEnv` and `loadEnv` in `src/config/env.ts`**

Replace the whole file with:

```ts
// The app talks only to the live backend. API_BASE_URL must include the /v1
// prefix (every backend route is under /v1); repositories use /v1-relative paths.
// In production a missing/placeholder/non-https URL sets `configError` instead
// of throwing, so a misconfigured build still starts and shows the user a
// connection banner (see ConfigErrorBanner) rather than crashing before any UI
// exists. In dev we keep a localhost default and never set a config error.
const PLACEHOLDER = 'https://api.schooldesk.local/v1';

export interface AppEnv {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  SENTRY_DSN: string;
  configError: string | null;
}

export function loadEnv(raw: Record<string, string | undefined>, isDev: boolean): AppEnv {
  const url = raw.EXPO_PUBLIC_API_BASE_URL;

  const EAS_BUILD_HINT =
    "Build with 'eas build --profile production' (or 'production-apk'/'preview') — " +
    "eas.json env values are not applied by 'expo export' alone.";

  let configError: string | null = null;

  if (!isDev) {
    if (!url) {
      configError = `EXPO_PUBLIC_API_BASE_URL is required in production builds. ${EAS_BUILD_HINT}`;
    } else if (url === PLACEHOLDER) {
      configError = `EXPO_PUBLIC_API_BASE_URL is still the placeholder (${PLACEHOLDER}). ${EAS_BUILD_HINT}`;
    } else if (!url.startsWith('https://')) {
      configError = `EXPO_PUBLIC_API_BASE_URL must use https in production. ${EAS_BUILD_HINT}`;
    }
  }

  return {
    API_BASE_URL: configError ? PLACEHOLDER : (url ?? PLACEHOLDER),
    GOOGLE_MAPS_API_KEY: raw.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    SENTRY_DSN: raw.EXPO_PUBLIC_SENTRY_DSN ?? '',
    configError,
  };
}

export const env: AppEnv = loadEnv(
  {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
  __DEV__
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- env.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Update the comment in `index.ts`**

`index.ts`'s guarded `require` no longer catches the env-var scenario it was originally written to describe (that scenario now sets `configError` instead of throwing). It remains valuable as a general safety net. Replace lines 5-9:

```ts
// App.tsx pulls in src/config/env, which throws synchronously (before any
// component mounts) if the build's EXPO_PUBLIC_API_BASE_URL is missing or
// invalid. A throw during a static `import` crashes the whole JS bundle with
// no error UI — the app just opens and immediately closes. Loading it via a
// guarded `require` here turns that into a visible message instead.
```

with:

```ts
// Guarded require, not a static import: this is a last-resort safety net for
// any unexpected exception thrown while evaluating App.tsx's module graph (or
// anything it imports) before any component mounts — which a static import
// can't catch and which would otherwise crash the whole JS bundle with no
// error UI. Known misconfiguration (e.g. a bad EXPO_PUBLIC_API_BASE_URL) no
// longer throws here; see src/config/env.ts's `configError` and
// ConfigErrorBanner instead.
```

- [ ] **Step 6: Run the full test suite to check for unrelated breakage**

Run: `npm test`
Expected: PASS — `env.API_BASE_URL`/`env.GOOGLE_MAPS_API_KEY`/`env.SENTRY_DSN` are read by `src/lib/sentry.ts`, `src/providers/AppProviders.tsx`, and `src/screens/bus/BusMap.web.tsx`; none of them read `configError` yet (Tasks 3-4 add that), and none of their existing tests assert on `AppEnv`'s shape directly, so none should break.

- [ ] **Step 7: Commit**

```bash
git add src/config/env.ts src/__tests__/config/env.test.ts index.ts
git commit -m "fix(config): report configError instead of throwing on invalid production config"
```

---

### Task 3: Report the config error to Sentry once at startup

**Files:**

- Modify: `src/lib/sentry.ts` (`initSentry`)
- Modify: `src/__tests__/lib/sentry.test.ts` (rewrite to support two DSN/configError scenarios)

**Interfaces:**

- Consumes: `env.configError: string | null` and `env.SENTRY_DSN: string` from `src/config/env.ts` (Task 2).
- Produces: nothing new for later tasks — `initSentry()`'s exported signature (`(): boolean`) is unchanged.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `src/__tests__/lib/sentry.test.ts` with:

```ts
describe('initSentry', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('returns false and does not initialize when no DSN is configured', () => {
    jest.doMock('@sentry/react-native', () => ({
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      wrap: (c: unknown) => c,
    }));
    jest.doMock('@/config/env', () => ({ env: { SENTRY_DSN: '', configError: null } }));

    const { initSentry } = require('@/lib/sentry');
    expect(initSentry()).toBe(false);
  });

  it('reports a captured message when a config error is present and a DSN is configured', () => {
    const Sentry = {
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      wrap: (c: unknown) => c,
    };
    jest.doMock('@sentry/react-native', () => Sentry);
    jest.doMock('@/config/env', () => ({
      env: { SENTRY_DSN: 'https://example.ingest.sentry.io/1', configError: 'bad config' },
    }));

    const { initSentry } = require('@/lib/sentry');
    expect(initSentry()).toBe(true);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('App config error: bad config', 'error');
  });

  it('does not report a message when a DSN is configured but there is no config error', () => {
    const Sentry = {
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      wrap: (c: unknown) => c,
    };
    jest.doMock('@sentry/react-native', () => Sentry);
    jest.doMock('@/config/env', () => ({
      env: { SENTRY_DSN: 'https://example.ingest.sentry.io/1', configError: null },
    }));

    const { initSentry } = require('@/lib/sentry');
    expect(initSentry()).toBe(true);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
```

Each test uses `jest.doMock` + `require` (instead of a static top-level `import`/`jest.mock`) so every test gets a fresh module registry via `jest.resetModules()` in `afterEach` — this resets `sentry.ts`'s internal `initialized` flag between tests, since three tests each need `initSentry()` to run its real body rather than short-circuit from a previous test's state.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- sentry.test`
Expected: FAIL — `Sentry.captureMessage` doesn't exist as a call in `initSentry()` yet, so the second test's `toHaveBeenCalledWith` assertion fails (message never sent).

- [ ] **Step 3: Add the config-error report to `initSentry()`**

In `src/lib/sentry.ts`, replace:

```ts
export function initSentry(): boolean {
  if (initialized || !env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableNativeCrashHandling: true,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
  initialized = true;
  return true;
}
```

with:

```ts
export function initSentry(): boolean {
  if (initialized || !env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableNativeCrashHandling: true,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
  initialized = true;
  if (env.configError) {
    Sentry.captureMessage(`App config error: ${env.configError}`, 'error');
  }
  return true;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- sentry.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sentry.ts src/__tests__/lib/sentry.test.ts
git commit -m "feat(sentry): report a captured message when startup config is invalid"
```

---

### Task 4: `ConfigErrorBanner` — surface the error in-app

**Files:**

- Create: `src/components/ConfigErrorBanner.tsx`
- Test: `src/__tests__/components/ConfigErrorBanner.test.tsx`
- Modify: `App.tsx` (import + mount next to `OfflineBanner`)

**Interfaces:**

- Consumes: `env.configError: string | null` from `src/config/env.ts` (Task 2).
- Produces: `ConfigErrorBanner: React.FC` (no props), exported from `src/components/ConfigErrorBanner.tsx`. No later task depends on anything beyond this component existing and being mounted.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/ConfigErrorBanner.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

describe('ConfigErrorBanner', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('renders nothing when there is no config error', () => {
    jest.doMock('@/config/env', () => ({ env: { configError: null } }));
    const { ConfigErrorBanner } = require('@/components/ConfigErrorBanner');
    const { toJSON } = render(<ConfigErrorBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders the generic message when a config error is present', () => {
    jest.doMock('@/config/env', () => ({ env: { configError: 'bad config' } }));
    const { ConfigErrorBanner } = require('@/components/ConfigErrorBanner');
    const { getByText } = render(<ConfigErrorBanner />);
    expect(getByText("Can't reach the server. Please contact support.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- ConfigErrorBanner.test`
Expected: FAIL with a module-not-found error for `@/components/ConfigErrorBanner` — the component doesn't exist yet.

- [ ] **Step 3: Create the component**

Create `src/components/ConfigErrorBanner.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { env } from '@/config/env';
import { Colors } from '@/theme';

export const ConfigErrorBanner: React.FC = () => {
  if (!env.configError) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>Can&apos;t reach the server. Please contact support.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.absent, paddingVertical: 6, alignItems: 'center' },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- ConfigErrorBanner.test`
Expected: PASS (2 tests).

- [ ] **Step 5: Mount the banner in `App.tsx`**

In `App.tsx`, add the import next to `OfflineBanner`'s:

```tsx
import { OfflineBanner } from './src/components/OfflineBanner';
```

becomes:

```tsx
import { OfflineBanner } from './src/components/OfflineBanner';
import { ConfigErrorBanner } from './src/components/ConfigErrorBanner';
```

And in the JSX, replace:

```tsx
                <StatusBar style="auto" />
                <OfflineBanner />
                <RootNavigator />
```

with:

```tsx
                <StatusBar style="auto" />
                <OfflineBanner />
                <ConfigErrorBanner />
                <RootNavigator />
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS — `App.tsx` itself has no direct test file (confirm with `ls src/__tests__ -R | grep -i app` if in doubt), so this change has no test of its own beyond the two just added; the full run confirms no other suite broke.

- [ ] **Step 7: Commit**

```bash
git add src/components/ConfigErrorBanner.tsx src/__tests__/components/ConfigErrorBanner.test.tsx App.tsx
git commit -m "feat(startup): show a generic connection banner when config is invalid"
```

---

## Manual verification (not automated, do after all tasks)

Per the spec's Testing section, confirm the actual fix end-to-end: run `npx expo start` locally with `.env`'s `EXPO_PUBLIC_API_BASE_URL=http://localhost:5162/v1` and check (e.g. via a temporary `console.log(env.API_BASE_URL)`, or by observing that requests now actually hit `localhost:5162`) that the real value is now used instead of the hardcoded placeholder — then, if desired, a fresh `eas build --profile production-apk` should no longer show the connection banner when `eas.json`'s production API URL is reachable.
