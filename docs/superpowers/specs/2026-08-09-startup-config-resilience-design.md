# Startup Config Resilience — Design

**Date:** 2026-08-09
**Status:** Approved

## Problem

After building the app via `eas build --profile production-apk` (with `eas.json`
correctly configured), the installed app still crashed on startup with:

```
Startup failed:
EXPO_PUBLIC_API_BASE_URL is required in production builds. Build with 'eas build
--profile production' (or 'production-apk'/'preview') — eas.json env values are
not applied by 'expo export' alone.
```

This is the improved message from the prior fix (see
`2026-08-09-export-build-error-message-design.md`), confirming that fix shipped
— but the underlying value was still never reaching the running app, and a
missing/invalid config value still hard-crashes the app to a dead-end screen
with no navigation underneath it.

## Root cause 1: env vars never reach the running app

Expo inlines `EXPO_PUBLIC_*` variables via a babel transform
(`babel-preset-expo`'s `expoInlineEnvVars`,
`node_modules/babel-preset-expo/build/inline-env-vars.js:23-39`). It only
rewrites a **literal** `MemberExpression` matching the syntactic pattern
`process.env.EXPO_PUBLIC_X` found directly in source — there is no real
`process.env` object at runtime on a device.

`src/config/env.ts:31` does:

```ts
export const env: AppEnv = loadEnv(process.env, __DEV__);
```

`process.env` is passed as a whole object into `loadEnv`, which then reads
`raw.EXPO_PUBLIC_API_BASE_URL` internally. Babel's transform never sees the
literal `process.env.EXPO_PUBLIC_API_BASE_URL` expression anywhere in the
source, so it's never rewritten — in **any** build, dev or production. At
runtime `raw` is an empty/undefined object, so the value is always
`undefined`, regardless of what `eas.json`, EAS's dashboard env vars, or
`.env` provide.

This means dev builds have also never received real `EXPO_PUBLIC_*` values —
they silently fell back to `loadEnv`'s hardcoded `PLACEHOLDER`
(`https://api.schooldesk.local/v1`), not the `.env` file's actual
`http://localhost:5162/v1`, because `!isDev` short-circuits before ever
inspecting the (always-undefined) value.

## Root cause 2: a bad config hard-crashes the whole app

`loadEnv` throws in production for a missing/placeholder/non-https URL. That
throw happens during static `import` evaluation — before any React component
exists — so it isn't catchable by `AppErrorBoundary`
(`src/components/AppErrorBoundary.tsx`), which only catches render-phase
errors. The only thing catching it today is `index.ts`'s guarded `require`
(`index.ts:10-22`), which renders a bare `StartupError` view with no
navigation, no Login screen, and no retry path.

## Fix

### 1. Fix the inlining bug

Change the call site in `src/config/env.ts` to reference each variable as a
literal `process.env.EXPO_PUBLIC_X` expression, so babel's pattern match
finds and rewrites each one:

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

`loadEnv`'s signature (`Record<string, string | undefined>`) and every
existing test in `src/__tests__/config/env.test.ts` that calls `loadEnv`
directly with a plain object are unaffected — they already pass literal
object literals, not `process.env`, and don't route through the babel
transform at all (which only fires on `process.env.*` member expressions,
not on arbitrary object literals). Only the module-level call site changes.

### 2. `loadEnv` never throws — it reports a config error instead

Add a field to the return type:

```ts
export interface AppEnv {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  SENTRY_DSN: string;
  configError: string | null;
}
```

The three existing production-only checks (missing / placeholder / non-https)
still run only when `!isDev`, in the same order, but each sets `configError`
to the same descriptive message text used today (including the "use eas
build" hint — that text is for developers/Sentry, not end users) instead of
throwing. `API_BASE_URL` falls back to `PLACEHOLDER` whenever `configError`
is set, exactly like the existing dev fallback, so downstream code always
receives a syntactically valid URL string and never `undefined`.

`loadEnv` itself has no side effects (no Sentry import) — it stays a pure
function, consistent with its current design and avoiding a circular import
with `src/lib/sentry.ts` (which already imports `env` from this module).

### 3. Report the config error to Sentry, once, from `initSentry()`

`src/lib/sentry.ts`'s `initSentry()` already imports `env` and runs once at
app startup (`App.tsx:22`). After a successful `Sentry.init(...)`, add:

```ts
if (env.configError) {
  Sentry.captureMessage(`App config error: ${env.configError}`, 'error');
}
```

If `SENTRY_DSN` itself is unset (the `initSentry` guard at line 10 returns
early), no Sentry report fires — an acceptable edge case, since the in-app
banner (below) still surfaces the problem visibly without depending on
Sentry being configured.

### 4. Surface it in-app without blocking navigation

Add `src/components/ConfigErrorBanner.tsx`, styled and structured like the
existing `src/components/OfflineBanner.tsx` (same bar, same position), but
static — no state or effect needed, since `env.configError` is resolved once
at module load:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { env } from '@/config/env';
import { Colors } from '@/theme';

export const ConfigErrorBanner: React.FC = () => {
  if (!env.configError) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>Can't reach the server. Please contact support.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.absent, paddingVertical: 6, alignItems: 'center' },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
```

The message is deliberately generic — the detailed "use eas build" diagnostic
is developer/build-time information (goes to Sentry only), not something an
end user can act on.

Mount it in `App.tsx` next to `OfflineBanner` (both are always-visible,
stateless-from-the-outside status bars):

```tsx
<StatusBar style="auto" />
<OfflineBanner />
<ConfigErrorBanner />
<RootNavigator />
```

With this in place, `RootNavigator` mounts normally, `AuthProvider` proceeds
through its normal loading/Login flow, and the user sees Home/Login
immediately with the banner on top if config is broken. Any actual
login/API attempt against the fallback `PLACEHOLDER` host fails through the
existing `httpClient` → `AppError({code: 'network'})` → per-screen
`ErrorState` path (already how every other network failure surfaces today —
no new error-handling plumbing needed there).

### 5. `index.ts`'s guard stays, as a generic safety net

`index.ts`'s guarded `require('./App')` (`index.ts:10-22`) no longer triggers
for this specific scenario (since `loadEnv` no longer throws), but it remains
valuable as a last-resort catch for any other genuinely unexpected
import-time exception. Update its comment to reflect that it's now a general
safety net rather than specifically describing the env-var crash mode it was
originally written for.

## Out of scope

- **No active connectivity/health-check gate** before Home/Login renders
  (rejected "Approach C" during design discussion) — it would delay the app
  opening on every launch and contradicts the requirement that Home/Login
  render first.
- No change to the underlying `eas.json` profiles or the `production-apk`
  profile question from the prior spec.
- No change to how individual screens render `ErrorState` for failed
  requests — that pattern already exists and is reused as-is.

## Testing

- `src/__tests__/config/env.test.ts`: replace `toThrow` assertions with
  assertions on `configError` (set with matching text for missing/placeholder
  /non-https cases; `null` for a valid https URL and for dev regardless of
  input) and confirm `API_BASE_URL` still falls back to `PLACEHOLDER` in the
  error cases.
- `src/__tests__/lib/sentry.test.ts`: add a case verifying
  `Sentry.captureMessage` is called when `env.configError` is set (mock
  `@/config/env` to return a non-null `configError` alongside a truthy
  `SENTRY_DSN`), and confirm the existing no-DSN case still doesn't call it.
- New `src/__tests__/components/ConfigErrorBanner.test.tsx`: renders nothing
  when `env.configError` is `null` (mocked), renders the generic message text
  when it's set — following the `jest.mock('@/config/env', ...)` pattern
  already used in `sentry.test.ts`.
- Manual/build-level verification: after this fix, an `eas build` with a
  real `EXPO_PUBLIC_API_BASE_URL` should show the real value taking effect
  (best confirmed by a follow-up local `expo start` check that
  `env.API_BASE_URL` matches `.env`'s `http://localhost:5162/v1`, and/or a
  fresh `eas build --profile production-apk` no longer showing the banner).
