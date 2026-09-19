# Teacher App EAS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `D:\SMS\sms-project\teacher-app` (currently an empty Expo SDK 57/expo-router scaffold) into a working copy of `sms-teacher-app`, linked to the `vaibhavdds-team` EAS account, installable on physical Android phones for QA — without modifying `sms-teacher-app`.

**Architecture:** Delete the scaffold's conflicting files, copy `sms-teacher-app`'s source tree verbatim into `teacher-app`, then change only identity fields (owner/slug/name/package id/EAS project id) and add a local gitignored `.env` for LAN device testing. No code is rewritten.

**Tech Stack:** Expo SDK ~54.0.33, React Native 0.81.5, React Navigation, TypeScript, Jest, EAS Build/CLI.

**Spec:** `docs/superpowers/specs/2026-09-19-teacher-app-eas-migration-design.md`

## Global Constraints

- Do not upgrade `teacher-app` to Expo SDK 57 or introduce expo-router. It must end up on SDK ~54.0.33 / RN 0.81.5 / React Navigation, matching `sms-teacher-app` exactly.
- Do not modify, delete, or downgrade anything inside `D:\SMS\sms-project\sms-teacher-app`.
- Identity for `teacher-app`: `owner: "vaibhavdds-team"`, `slug: "teacher-app-dev"`, `name: "Teacher App (Dev)"`, `android.package: "com.vaibhavdd.teacherapp"`, `extra.eas.projectId: "8520504e-1cdf-41a1-9cbb-56cd896e6763"`.
- LAN IP `192.168.29.149:5162` may only appear in `teacher-app/.env`, which is gitignored. It must never be written into `eas.json`, `app.config.js`, or any other committed file.
- **Auth/session audit (already performed against `sms-teacher-app/src/lib/tokenStore.ts` and `src/data/http/auth.repo.ts`, carry this forward unmodified):** tokens (`accessToken`/`refreshToken`) are stored per-device via `expo-secure-store` (native) or `localStorage` (web) — there is no device/session identifier sent to the backend and no shared state between devices in the client. `logout` sends `{ refresh_token: refreshToken }`, i.e. it targets one specific refresh token, not a blanket "log out everywhere" call. There is no client-side single-device lock anywhere in this code. Whether the _backend_ additionally enforces single-session-per-account cannot be determined by reading this client's code — it can only be confirmed by the multi-device acceptance test (Task 7). Do not add any device/session restriction that doesn't already exist.
- Final acceptance report must use the exact PASS/FAIL block format from the spec (reproduced in Task 7).

---

### Task 1: Clear scaffold-only files from `teacher-app`

**Files:**

- Delete: `D:\SMS\sms-project\teacher-app\AGENTS.md`
- Delete: `D:\SMS\sms-project\teacher-app\CLAUDE.md`
- Delete: `D:\SMS\sms-project\teacher-app\LICENSE`
- Delete: `D:\SMS\sms-project\teacher-app\.vscode` (directory)
- Delete: `D:\SMS\sms-project\teacher-app\app.json`
- Delete: `D:\SMS\sms-project\teacher-app\node_modules` (directory)
- Delete: `D:\SMS\sms-project\teacher-app\package-lock.json`
- Keep as-is: `D:\SMS\sms-project\teacher-app\.git`, `D:\SMS\sms-project\teacher-app\.claude` (this is `teacher-app`'s own repo/tooling, unrelated to `sms-teacher-app`)

**Interfaces:** N/A (filesystem cleanup only).

- [ ] **Step 1: Remove scaffold-only files and folders**

```bash
cd /d/SMS/sms-project/teacher-app
rm -f AGENTS.md CLAUDE.md LICENSE app.json package-lock.json
rm -rf .vscode node_modules
```

- [ ] **Step 2: Verify removal**

Run: `ls -la /d/SMS/sms-project/teacher-app`
Expected: no `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `app.json`, `.vscode`, `node_modules`, `package-lock.json` in the listing. `.git`, `.claude`, `README.md`, `assets`, `package.json`, `scripts`, `src`, `tsconfig.json` are still present (they get overwritten in Task 2).

- [ ] **Step 3: Commit**

```bash
cd /d/SMS/sms-project/teacher-app
git add -A
git commit -m "chore: remove Expo scaffold boilerplate before migration"
```

---

### Task 2: Copy `sms-teacher-app` source tree into `teacher-app`

**Files:**

- Copy from `D:\SMS\sms-project\sms-teacher-app` to `D:\SMS\sms-project\teacher-app`: `App.tsx`, `app.config.js`, `assets/`, `babel.config.js`, `eas.json`, `eslint.config.js`, `index.ts`, `jest/`, `jest.config.js`, `metro.config.js`, `package.json`, `package-lock.json`, `prettier.config.js`, `.prettierignore`, `.lintstagedrc.js`, `.watchmanconfig`, `scripts/`, `src/`, `tsconfig.json`, `.gitignore`, `README.md`
- Excluded (never copied): `node_modules/`, `.expo/`, `.git/`, `.worktrees/`, `.claude/`, `.husky/`, `.superpowers/`, `docs/`, `*.log`, `tsconfig.tsbuildinfo`, `.env`

**Interfaces:** N/A (this task produces the raw source that Task 3 edits).

- [ ] **Step 1: Copy files and directories**

```bash
cd /d/SMS/sms-project
SRC=sms-teacher-app
DST=teacher-app

cp "$SRC/App.tsx" "$DST/App.tsx"
cp "$SRC/app.config.js" "$DST/app.config.js"
cp -r "$SRC/assets" "$DST/assets"
cp "$SRC/babel.config.js" "$DST/babel.config.js"
cp "$SRC/eas.json" "$DST/eas.json"
cp "$SRC/eslint.config.js" "$DST/eslint.config.js"
cp "$SRC/index.ts" "$DST/index.ts"
cp -r "$SRC/jest" "$DST/jest"
cp "$SRC/jest.config.js" "$DST/jest.config.js"
cp "$SRC/metro.config.js" "$DST/metro.config.js"
cp "$SRC/package.json" "$DST/package.json"
cp "$SRC/package-lock.json" "$DST/package-lock.json"
cp "$SRC/prettier.config.js" "$DST/prettier.config.js"
cp "$SRC/.prettierignore" "$DST/.prettierignore"
cp "$SRC/.lintstagedrc.js" "$DST/.lintstagedrc.js"
cp "$SRC/.watchmanconfig" "$DST/.watchmanconfig"
cp -r "$SRC/scripts" "$DST/scripts"
rm -rf "$DST/src"
cp -r "$SRC/src" "$DST/src"
cp "$SRC/tsconfig.json" "$DST/tsconfig.json"
cp "$SRC/.gitignore" "$DST/.gitignore"
cp "$SRC/README.md" "$DST/README.md"
```

- [ ] **Step 2: Verify the copy**

Run: `diff -rq /d/SMS/sms-project/sms-teacher-app/src /d/SMS/sms-project/teacher-app/src`
Expected: no output (directories are identical).

Run: `grep '"name"' /d/SMS/sms-project/teacher-app/package.json`
Expected: `"name": "school-desk-teacher-app",` (not yet renamed — Task 3 handles that).

- [ ] **Step 3: Commit**

```bash
cd /d/SMS/sms-project/teacher-app
git add -A
git commit -m "feat: copy sms-teacher-app source tree into teacher-app"
```

---

### Task 3: Re-identify `teacher-app` for the `vaibhavdds-team` EAS account

**Files:**

- Modify: `D:\SMS\sms-project\teacher-app\app.config.js`
- Modify: `D:\SMS\sms-project\teacher-app\package.json`

**Interfaces:**

- Consumes: `app.config.js` module shape from Task 2's copy — `module.exports = { expo: { name, slug, version, ..., android: { package, ... }, extra: { eas: { projectId } }, owner } }`.
- Produces: identity fields other tasks (EAS build, install) rely on — `owner: "vaibhavdds-team"`, `extra.eas.projectId: "8520504e-1cdf-41a1-9cbb-56cd896e6763"`, `android.package: "com.vaibhavdd.teacherapp"`.

- [ ] **Step 1: Edit `app.config.js` identity fields**

In `D:\SMS\sms-project\teacher-app\app.config.js`, change:

```js
    name: 'School Desk Teacher App',
    slug: 'school-desk-teacher-app',
```

to

```js
    name: 'Teacher App (Dev)',
    slug: 'teacher-app-dev',
```

Change:

```js
    android: {
      package: 'com.catre.schooldeskteacher',
```

to

```js
    android: {
      package: 'com.vaibhavdd.teacherapp',
```

Change:

```js
    extra: {
      eas: {
        projectId: '64431794-8eea-4172-b4d4-d7ce4a5a813f',
      },
    },
    owner: 'catre',
```

to

```js
    extra: {
      eas: {
        projectId: '8520504e-1cdf-41a1-9cbb-56cd896e6763',
      },
    },
    owner: 'vaibhavdds-team',
```

- [ ] **Step 2: Edit `package.json` name field**

In `D:\SMS\sms-project\teacher-app\package.json`, change:

```json
  "name": "school-desk-teacher-app",
```

to

```json
  "name": "teacher-app-dev",
```

- [ ] **Step 3: Verify the config loads and has the right values**

Run: `cd /d/SMS/sms-project/teacher-app && node -e "console.log(JSON.stringify(require('./app.config.js').expo, null, 2))"`
Expected output includes:

```json
"name": "Teacher App (Dev)",
"slug": "teacher-app-dev",
```

and further down:

```json
"package": "com.vaibhavdd.teacherapp",
```

and:

```json
"eas": { "projectId": "8520504e-1cdf-41a1-9cbb-56cd896e6763" }
```

and:

```json
"owner": "vaibhavdds-team"
```

- [ ] **Step 4: Commit**

```bash
cd /d/SMS/sms-project/teacher-app
git add -A
git commit -m "feat: re-identify teacher-app for the vaibhavdds-team EAS project"
```

---

### Task 4: Local LAN `.env` for physical-device dev-client testing

**Files:**

- Create: `D:\SMS\sms-project\teacher-app\.env` (gitignored — must not be committed)

**Interfaces:**

- Consumes: `src/config/env.ts`'s `loadEnv()` reads `process.env.EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID` (already copied verbatim in Task 2 — not modified here).
- Produces: `EXPO_PUBLIC_API_BASE_URL=http://192.168.29.149:5162/v1` for local `expo start --dev-client` sessions only. Not consumed by `eas build` (see Step 3 note).

- [ ] **Step 1: Create the `.env` file**

Create `D:\SMS\sms-project\teacher-app\.env` with:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.29.149:5162/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCLBnzIqfPTAoo_HnCVMP_nnd57nOMU7GY
EXPO_PUBLIC_GOOGLE_MAPS_MAP_ID=aab697c91ef02136bf693efd
```

(The Maps key/map ID are copied from `sms-teacher-app`'s own `.env` for feature parity. Note: this key may be restricted to the `com.catre.schooldeskteacher` package in the Google Cloud console, so map tiles may fail to load under the new `com.vaibhavdd.teacherapp` package id — this is a known, non-blocking limitation to call out in the final report, not something to fix here.)

- [ ] **Step 2: Verify `.env` is ignored by git**

Run: `cd /d/SMS/sms-project/teacher-app && git status --short`
Expected: `.env` does NOT appear in the output (confirms `.gitignore`, copied in Task 2, is excluding it).

- [ ] **Step 3: Verify `eas.json`'s device-testing profiles still point at staging (no edit needed)**

Run: `grep -A3 '"development"' /d/SMS/sms-project/teacher-app/eas.json` and `grep -A6 '"preview"' /d/SMS/sms-project/teacher-app/eas.json`
Expected: `preview` (and `production-apk`) still have `"EXPO_PUBLIC_API_BASE_URL": "https://staging-api.schooldesk.app/v1"` in their `env` block, copied verbatim from `sms-teacher-app`. Do not add the LAN IP here — a standalone `preview`/`production-apk` build bakes in whatever URL is in `eas.json`'s `env` at build time, and that must stay staging/production, never the LAN IP. The `development` profile has no `env` block by design: a dev-client build always loads its JS live from your `expo start --dev-client` session, which uses the local `.env` you just created — no `eas.json` change is needed for the LAN flow to work.

No commit needed for this task (the only new file, `.env`, is intentionally untracked).

---

### Task 5: Install dependencies and run static checks

**Files:** none created/modified (verification-only task).

**Interfaces:** N/A.

- [ ] **Step 1: Install dependencies**

```bash
cd /d/SMS/sms-project/teacher-app
npm install
```

Expected: install completes without an `ERESOLVE` failure. If it fails on a peer-dependency conflict, rerun with `npm install --legacy-peer-deps` — do not hand-edit version numbers in `package.json` to force resolution.

- [ ] **Step 2: TypeScript check**

```bash
cd /d/SMS/sms-project/teacher-app
npx tsc --noEmit
```

Expected: no errors (the same source tree already passes this in `sms-teacher-app`).

- [ ] **Step 3: Lint**

```bash
cd /d/SMS/sms-project/teacher-app
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Unit tests**

```bash
cd /d/SMS/sms-project/teacher-app
npm test
```

Expected: all suites pass (same test files as `sms-teacher-app`, unmodified).

- [ ] **Step 5: Metro/dev-client smoke check**

```bash
cd /d/SMS/sms-project/teacher-app
npx expo start --dev-client
```

Expected: Metro bundler starts cleanly with no red-screen config errors (e.g. no "invalid app.json" or missing-asset errors). Stop it with Ctrl+C once confirmed — a physical device isn't required for this step, only Task 6/7 need one.

- [ ] **Step 6: Commit**

```bash
cd /d/SMS/sms-project/teacher-app
git add -A
git commit -m "chore: verify install, typecheck, lint, and tests pass in teacher-app" --allow-empty
```

(`--allow-empty` is fine here since this task may produce no file changes if everything already passed — the commit marks the checkpoint.)

---

### Task 6: EAS link verification and Android development build

**Files:** none created/modified.

**Interfaces:** N/A.

- [ ] **Step 1: Confirm EAS login and project link**

```bash
cd /d/SMS/sms-project/teacher-app
npx eas-cli whoami
npx eas-cli project:info
```

Expected: `whoami` shows the `vaibhavdd` account (already confirmed logged in). `project:info` reports project id `8520504e-1cdf-41a1-9cbb-56cd896e6763` under owner `vaibhavdds-team`, matching `app.config.js`.

- [ ] **Step 2: Start a development build for Android**

```bash
cd /d/SMS/sms-project/teacher-app
npx eas-cli build --profile development --platform android
```

Expected: EAS generates a new Android keystore for `com.vaibhavdd.teacherapp` (expected — this is a new package id, not an error) and produces a downloadable `.apk`/build URL on completion.

- [ ] **Step 3: Install the build on two physical Android devices**

Using the build URL/QR code from Step 2, install the development-client APK on both "Mobile A" and "Mobile B".
Expected: app installs and opens on both devices, showing the login screen (no crash, no blank screen).

No commit for this task (no repo changes — it's a build/deploy action).

---

### Task 7: Multi-device acceptance test and final report

**Files:** none created/modified (manual QA task).

**Interfaces:** N/A.

- [ ] **Step 1: Start Metro for dev-client and connect both devices**

```bash
cd /d/SMS/sms-project/teacher-app
npx expo start --dev-client
```

On both Mobile A and Mobile B (same Wi-Fi network as the dev machine, `192.168.29.149`), open the installed dev-client build and connect to this Metro session.

- [ ] **Step 2: Run the acceptance checklist**

1. Log in on Mobile A with a teacher account. Confirm dashboard/data loads.
2. Log in on Mobile B with the **same** teacher account, against the same staging backend. Confirm dashboard/data loads and Mobile A's session is still active (recheck Mobile A after Mobile B logs in).
3. With both devices logged in, navigate a few screens on each independently (e.g. attendance, timetable) — confirm both function without interfering with each other.
4. Turn off internet/Wi-Fi on Mobile B only. Confirm Mobile B still shows its last-loaded (cached) data rather than crashing or blanking.
5. On Mobile A (still online), perform a supported data change (e.g. mark attendance for a class).
6. Re-enable internet on Mobile B. Pull-to-refresh or navigate to trigger a refetch. Confirm Mobile B eventually reflects Mobile A's change (or note if the backend doesn't support that particular sync — report as observed, not assumed).
7. Log out on Mobile A. Confirm whether Mobile B remains logged in or is also logged out — report the actual observed behavior (per the Global Constraints audit note, the client sends a single-token logout, so Mobile B staying logged in is the expected outcome unless the backend independently revokes all sessions).
8. Confirm no data from a different account/tenant appears on either device at any point.
9. Confirm the LAN backend connection itself worked throughout (i.e., requests succeeded against `http://192.168.29.149:5162/v1` — check this via the app not showing a connection-error banner).

- [ ] **Step 3: Produce the final report**

Fill in this exact block based on the real outcomes observed in Step 2 (do not mark anything PASS without having actually observed it):

```text
Mobile A login: PASS/FAIL
Mobile B same-account login: PASS/FAIL
Simultaneous sessions: PASS/FAIL
Offline Mobile B: PASS/FAIL
Reconnection/sync: PASS/FAIL
Cross-device data refresh: PASS/FAIL
Logout/session behavior: PASS/FAIL
LAN backend connectivity: PASS/FAIL
Account/tenant data isolation: PASS/FAIL
```

Also report, as plain text (not the block above): Expo SDK/version (`~54.0.33`), EAS project id (`8520504e-1cdf-41a1-9cbb-56cd896e6763`), Android package id (`com.vaibhavdd.teacherapp`), whether Expo Go works (expected: no — `expo-secure-store`, `expo-location`, and other native modules require a dev client, not Expo Go), the exact commands used to run (`npx expo start --dev-client`) and build (`npx eas-cli build --profile development --platform android`), the backend URL used for device testing (`http://192.168.29.149:5162/v1` for dev-client sessions; `https://staging-api.schooldesk.app/v1` for any standalone preview build), any remaining blockers (e.g. the Google Maps key restriction noted in Task 4), and the final `git log -1 --format=%H` commit hash for `teacher-app`.

No commit needed for this task — it's a report, not a code change. If Step 2 reveals a genuine bug (not a backend policy difference), stop and report it rather than silently working around it; it may need a new, separately-scoped task.
