# production-apk Build Version Increment — Design

**Date:** 2026-08-09
**Status:** Approved

## Problem

After merging both env-var fixes (`4de0d32`) and building a fresh APK via
`eas build -p android --profile production-apk`, the user reported the
device still showed the old pre-fix crash message.

## Investigation

Direct, artifact-level verification (not source reading, not assumptions):

- Downloaded the actual built APK (`gitCommitHash: 4de0d328882bb4d5786ab0ac01e1aa13957579fa`,
  `buildProfile: production-apk`) and extracted `index.android.bundle`.
- Confirmed by grepping the compiled bundle directly: the literal string
  `https://api.schooldesk.app/v1` is present (only reachable via Expo's babel
  inlining of `process.env.EXPO_PUBLIC_API_BASE_URL`, since that URL exists
  nowhere else in the codebase), and `configError`, `ConfigErrorBanner`, and
  the exact banner text `"Can't reach the server. Please contact support."`
  are all present.
- Conclusion: **this build's JS artifact is correct** — both prior fixes are
  compiled in.

Comparing this build's metadata against the previous one (`859ee4f4`, built
from the pre-fix commit `9bebdd6`) via `eas build:view --json`: both report
**identical `appBuildVersion: "2"`** (Android versionCode). `eas.json`'s
`production-apk` profile has no `autoIncrement` (only the `production`
profile does). Android's package installer can silently refuse to replace an
installed app with another APK carrying the same versionCode unless it's
explicitly uninstalled first.

**Root cause: the device that showed the old error never actually received
the new build — installing over the old app with an unchanged versionCode
was silently a no-op, leaving the pre-fix app running.**

## Fix

Add `"autoIncrement": true` to the `production-apk` profile in `eas.json`,
matching the existing `production` profile, so every `production-apk` build
gets a fresh, always-increasing versionCode and can never be silently
skipped by the Android installer again.

```json
"production-apk": {
  "distribution": "internal",
  "autoIncrement": true,
  "android": {
    "buildType": "apk"
  },
  "env": {
    "EXPO_PUBLIC_API_BASE_URL": "https://api.schooldesk.app/v1",
    "SENTRY_DISABLE_AUTO_UPLOAD": "true"
  }
}
```

## Out of scope

- No changes to `src/config/env.ts`, `App.tsx`, or any other source file —
  the previous investigation already proved the bundle is correct; this is
  purely a build-configuration fix.
- No changes to the `preview` or `production` profiles.

## Testing

- Not unit-testable (this is EAS build configuration, not application code).
- Verification: build a fresh `production-apk` APK after this change and
  confirm via `eas build:view --json` that `appBuildVersion` is higher than
  the previous build's ("2"). Then have the user **fully uninstall** the
  currently-installed app before installing the new APK, to eliminate any
  ambiguity from the versionCode issue on this one verification pass, and
  confirm: app opens, no startup error, Home/Login renders, and (if
  reachable) requests hit `https://api.schooldesk.app/v1`.
