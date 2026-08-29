# Production APK Version Increment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `eas build -p android --profile production-apk` gets a fresh, always-increasing Android versionCode, so the installer can never silently skip replacing an already-installed app with a new build.

**Architecture:** One-line addition to `eas.json`'s `production-apk` build profile. No application code changes — this is EAS build configuration only, verified by comparing `appBuildVersion` across two real builds via `eas build:view --json`, not by a unit test.

**Tech Stack:** EAS Build (`eas.json`), `eas-cli`.

## Global Constraints

- No changes to `src/config/env.ts`, `App.tsx`, or any other application source file — the artifact-level investigation already confirmed the compiled bundle is correct; this is purely a build-configuration fix (spec: "Out of scope").
- No changes to the `preview` or `production` profiles in `eas.json`.
- The commit for this change includes `eas.json`'s full current state (the `production-apk` profile itself, `SENTRY_DISABLE_AUTO_UPLOAD`, and the new `autoIncrement` line) in one commit, per explicit human decision — `eas.json` has had uncommitted changes since before this plan, and this formalizes what's actually been used for every build so far.

---

### Task 1: Add `autoIncrement` to the `production-apk` profile and verify with a real build

**Files:**

- Modify: `eas.json` (the `production-apk` profile, lines 27-36)

**Interfaces:**

- Consumes: nothing — this is a standalone config change.
- Produces: nothing for later tasks — this is the only task in this plan.

- [ ] **Step 1: Record the current `production-apk` versionCode for comparison**

Run: `npx eas-cli build:view c8167c22-a184-443d-be72-b722977dd0be --json`
Note the `"appBuildVersion"` value (expected: `"2"`, matching the prior build) — this is the baseline the next build must exceed.

- [ ] **Step 2: Edit `eas.json`**

Replace the `production-apk` block:

```json
    "production-apk": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.schooldesk.app/v1",
        "SENTRY_DISABLE_AUTO_UPLOAD": "true"
      }
    }
```

with:

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

- [ ] **Step 3: Validate the JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('eas.json', 'utf8')); console.log('valid')"`
Expected: prints `valid` with no error.

- [ ] **Step 4: Run the existing test suite to confirm no regression**

Run: `npm test`
Expected: PASS — this change touches no application code, so all suites that were passing before (153 tests per the last merge) should still pass identically. This is a sanity check, not a test of the config change itself (which isn't unit-testable).

- [ ] **Step 5: Commit**

```bash
git add eas.json
git commit -m "fix(build): auto-increment versionCode on production-apk builds"
```

- [ ] **Step 6: Build a fresh production-apk APK**

Run: `npx eas-cli build -p android --profile production-apk --non-interactive`
Wait for it to complete (several minutes). Record the resulting build ID from the CLI output or the printed `expo.dev` build URL.

- [ ] **Step 7: Verify the versionCode actually incremented**

Run: `npx eas-cli build:view <new-build-id> --json`
Check `"appBuildVersion"` is strictly greater than the value recorded in Step 1 (i.e., greater than `"2"`).
Expected: PASS — if it's still `"2"` or unchanged, the `autoIncrement` config did not take effect and this task is not done.

- [ ] **Step 8: Verify the new build's bundle still contains the correct production URL**

Download the new build's APK from its `applicationArchiveUrl` (from the `eas-cli build:view --json` output), extract it, and grep `assets/index.android.bundle` for the literal string `api.schooldesk.app`:

```bash
curl -sL "<applicationArchiveUrl>" -o /tmp/verify-apk/build.apk
unzip -o -q /tmp/verify-apk/build.apk -d /tmp/verify-apk/extracted
grep -ac "api.schooldesk.app" /tmp/verify-apk/extracted/assets/index.android.bundle
```

Expected: a non-zero count, confirming the bundle still has the real production URL (this profile's `env` block wasn't touched, so this should be unchanged from the prior verified build — this step exists to catch any accidental typo introduced while editing `eas.json`).

Clean up afterward: `rm -rf /tmp/verify-apk`.

## Manual verification (requires a physical/emulated Android device, not automatable from here)

Per the spec's Testing section: fully **uninstall** the currently-installed app on the test device before installing the new build (this eliminates any ambiguity from the versionCode issue for this one confirmation pass — going forward, `autoIncrement` makes this unnecessary). Then install the new build's APK and confirm:

- The app opens without the `EXPO_PUBLIC_API_BASE_URL` startup error.
- Home/Login screen renders.
- If the backend is reachable, requests succeed against `https://api.schooldesk.app/v1`; if not, the app shows the existing connection banner rather than crashing.
