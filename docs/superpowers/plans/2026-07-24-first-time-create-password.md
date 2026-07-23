# First-time "Create a password" entry point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "First time here? Create a password" link to the teacher app's `LoginScreen`, reusing the already-live forgot/reset-password flow (`ForgotPasswordScreen`) with copy adjusted for the first-time case.

**Architecture:** `ForgotPasswordScreen` gains a `mode: 'reset' | 'create'` route param (default `'reset'`) that only swaps display copy, sourced from a new pure helper `getForgotPasswordCopy(mode)`. `LoginScreen` gets a second link that navigates with `{ mode: 'create' }`. No backend, API, hook, or state-machine changes.

**Tech Stack:** React Native (Expo), TypeScript, React Navigation (native-stack), Jest for pure-function unit tests.

## Global Constraints

- No changes to `AuthRepository`, `auth.repo.ts`, `hooks.ts` (`useForgotPassword`/`useResetPassword`), `authErrors.ts`, `passwordValidation.ts`, `RootNavigator.tsx`, or the backend.
- Do not remove the existing "Forgot password?" link — both links coexist (user's explicit choice).
- `tsc` and `lint` must stay clean.
- Existing precedent: animated screens (`ForgotPasswordScreen`, `LoginScreen`) have no jest render tests (reanimated/safe-area mocks missing from jest setup) — put testable logic in a pure helper instead of adding render tests.
- Copy must exactly match the spec's table (`docs/superpowers/specs/2026-07-24-first-time-create-password-design.md`):
  - Title: "Reset password" / "Create your password"
  - Step 1 subtitle: "Enter your email or mobile number and we'll send a verification code." / "First time here? Enter your email or mobile number and we'll send a verification code to create your password."
  - Step 2 subtitle: "Enter the code we sent and choose a new password." (same for both modes)
  - Submit button: "Reset password" / "Resetting…" vs "Create password" / "Creating…"
  - Done message: "Your password has been reset. Sign in with your new password." / "Your password has been created. Sign in with your new password."

---

### Task 1: Pure copy-selection helper

**Files:**

- Create: `src/features/auth/forgotPasswordCopy.ts`
- Test: `src/features/auth/__tests__/forgotPasswordCopy.test.ts`

**Interfaces:**

- Consumes: nothing (pure function, no dependencies on other tasks).
- Produces: `export type ForgotPasswordMode = 'reset' | 'create';` and `export function getForgotPasswordCopy(mode: ForgotPasswordMode | undefined): ForgotPasswordCopy` where

  ```ts
  export interface ForgotPasswordCopy {
    title: string;
    step1Subtitle: string;
    step2Subtitle: string;
    submitLabel: string;
    submitLabelPending: string;
    doneMessage: string;
  }
  ```

  Task 3 (`ForgotPasswordScreen`) and Task 2 (`LoginScreen`, indirectly via the mode param) rely on this exact type and function name. `mode: undefined` behaves identically to `mode: 'reset'`.

- [ ] **Step 1: Write the failing test**

Create `src/features/auth/__tests__/forgotPasswordCopy.test.ts`:

```ts
import { getForgotPasswordCopy } from '../forgotPasswordCopy';

test('defaults to reset copy when mode is undefined', () => {
  const copy = getForgotPasswordCopy(undefined);
  expect(copy.title).toBe('Reset password');
  expect(copy.step1Subtitle).toBe(
    "Enter your email or mobile number and we'll send a verification code."
  );
  expect(copy.step2Subtitle).toBe('Enter the code we sent and choose a new password.');
  expect(copy.submitLabel).toBe('Reset password');
  expect(copy.submitLabelPending).toBe('Resetting…');
  expect(copy.doneMessage).toBe('Your password has been reset. Sign in with your new password.');
});

test('returns reset copy for mode "reset"', () => {
  const copy = getForgotPasswordCopy('reset');
  expect(copy.title).toBe('Reset password');
  expect(copy.submitLabel).toBe('Reset password');
});

test('returns create copy for mode "create"', () => {
  const copy = getForgotPasswordCopy('create');
  expect(copy.title).toBe('Create your password');
  expect(copy.step1Subtitle).toBe(
    "First time here? Enter your email or mobile number and we'll send a verification code to create your password."
  );
  expect(copy.step2Subtitle).toBe('Enter the code we sent and choose a new password.');
  expect(copy.submitLabel).toBe('Create password');
  expect(copy.submitLabelPending).toBe('Creating…');
  expect(copy.doneMessage).toBe('Your password has been created. Sign in with your new password.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/auth/__tests__/forgotPasswordCopy.test.ts`
Expected: FAIL — cannot find module `../forgotPasswordCopy`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/auth/forgotPasswordCopy.ts`:

```ts
export type ForgotPasswordMode = 'reset' | 'create';

export interface ForgotPasswordCopy {
  title: string;
  step1Subtitle: string;
  step2Subtitle: string;
  submitLabel: string;
  submitLabelPending: string;
  doneMessage: string;
}

const STEP2_SUBTITLE = 'Enter the code we sent and choose a new password.';

const COPY: Record<ForgotPasswordMode, ForgotPasswordCopy> = {
  reset: {
    title: 'Reset password',
    step1Subtitle: "Enter your email or mobile number and we'll send a verification code.",
    step2Subtitle: STEP2_SUBTITLE,
    submitLabel: 'Reset password',
    submitLabelPending: 'Resetting…',
    doneMessage: 'Your password has been reset. Sign in with your new password.',
  },
  create: {
    title: 'Create your password',
    step1Subtitle:
      "First time here? Enter your email or mobile number and we'll send a verification code to create your password.",
    step2Subtitle: STEP2_SUBTITLE,
    submitLabel: 'Create password',
    submitLabelPending: 'Creating…',
    doneMessage: 'Your password has been created. Sign in with your new password.',
  },
};

/** Selects display copy for ForgotPasswordScreen based on entry point; defaults to 'reset'. */
export function getForgotPasswordCopy(mode: ForgotPasswordMode | undefined): ForgotPasswordCopy {
  return COPY[mode ?? 'reset'];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/auth/__tests__/forgotPasswordCopy.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/forgotPasswordCopy.ts src/features/auth/__tests__/forgotPasswordCopy.test.ts
git commit -m "feat(auth): pure copy helper for reset vs create-password modes"
```

---

### Task 2: Navigation param type for `ForgotPassword`

**Files:**

- Modify: `src/navigation/types.ts:96`

**Interfaces:**

- Consumes: nothing new.
- Produces: `RootStackParamList['ForgotPassword']` typed as `{ mode?: 'reset' | 'create' } | undefined`, which Task 3 and Task 4 both type against via `RouteProp<RootStackParamList, 'ForgotPassword'>` / `NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>`.

There is no separate test for a type-only change; correctness is verified by `tsc` in Step 2.

- [ ] **Step 1: Change the param type**

In `src/navigation/types.ts`, change line 96 from:

```ts
ForgotPassword: undefined;
```

to:

```ts
  ForgotPassword: { mode?: 'reset' | 'create' } | undefined;
```

- [ ] **Step 2: Run typecheck to confirm no breakage**

Run: `npx tsc --noEmit`
Expected: 0 errors (the existing `navigation.navigate('ForgotPassword')` call in `LoginScreen.tsx:171` remains valid because the param type is optional/`| undefined`).

- [ ] **Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat(auth): add optional mode param to ForgotPassword route"
```

---

### Task 3: `ForgotPasswordScreen` reads `mode` and uses copy helper

**Files:**

- Modify: `src/screens/ForgotPasswordScreen.tsx`

**Interfaces:**

- Consumes: `getForgotPasswordCopy` from `@/features/auth/forgotPasswordCopy` (Task 1); `RootStackParamList['ForgotPassword']` (Task 2).
- Produces: no new exports; screen behavior only. Task 4 (`LoginScreen`) navigates to this screen with `{ mode: 'create' }` and relies on this task rendering the create-flavored copy in response.

No new automated test — per Global Constraints, this animated screen has no render-test harness. Verification is manual (Task 5 covers combined manual verification) plus `tsc`/lint here.

- [ ] **Step 1: Add route typing and copy lookup**

In `src/screens/ForgotPasswordScreen.tsx`, update the imports (after line 17, alongside the existing `useNavigation` import) to also pull in `useRoute` and `RouteProp`:

```ts
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
```

Add the import for the copy helper near the other `@/features/auth` imports:

```ts
import { getForgotPasswordCopy } from '@/features/auth/forgotPasswordCopy';
```

Add a route type alongside the existing `Nav` type (around line 25):

```ts
type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
type Route = RouteProp<RootStackParamList, 'ForgotPassword'>;
```

Inside the component, after `const navigation = useNavigation<Nav>();` (line 29), add:

```ts
const route = useRoute<Route>();
const copy = getForgotPasswordCopy(route.params?.mode);
```

- [ ] **Step 2: Replace hardcoded copy with `copy.*`**

Replace the card title (line 82):

```ts
            <Text style={styles.cardTitle}>Reset password</Text>
```

with:

```ts
            <Text style={styles.cardTitle}>{copy.title}</Text>
```

Replace the done-state subtitle (lines 86-88):

```ts
                <Text style={styles.cardSubtitle}>
                  Your password has been reset. Sign in with your new password.
                </Text>
```

with:

```ts
                <Text style={styles.cardSubtitle}>{copy.doneMessage}</Text>
```

Replace the step-1 subtitle (lines 95-97):

```ts
                <Text style={styles.cardSubtitle}>
                  Enter your email or mobile number and we&rsquo;ll send a verification code.
                </Text>
```

with:

```ts
                <Text style={styles.cardSubtitle}>{copy.step1Subtitle}</Text>
```

Replace the step-2 subtitle (lines 128-130):

```ts
                <Text style={styles.cardSubtitle}>
                  Enter the code we sent and choose a new password.
                </Text>
```

with:

```ts
                <Text style={styles.cardSubtitle}>{copy.step2Subtitle}</Text>
```

Replace the submit button label (lines 121-123):

```ts
                  <Text style={styles.primaryBtnText}>
                    {forgot.isPending ? 'Sending…' : 'Send code'}
                  </Text>
```

Leave this one as-is — "Send code" is the step-1 action (requesting the OTP), not the reset/create action, and is identical copy in both modes per the spec table (only the step-2 submit button differs). Do not change this block.

Replace the step-2 submit button label (lines 190-192):

```ts
                  <Text style={styles.primaryBtnText}>
                    {reset.isPending ? 'Resetting…' : 'Reset password'}
                  </Text>
```

with:

```ts
                  <Text style={styles.primaryBtnText}>
                    {reset.isPending ? copy.submitLabelPending : copy.submitLabel}
                  </Text>
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/screens/ForgotPasswordScreen.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ForgotPasswordScreen.tsx
git commit -m "feat(auth): ForgotPasswordScreen renders mode-specific copy"
```

---

### Task 4: `LoginScreen` adds the "First time here?" link

**Files:**

- Modify: `src/screens/LoginScreen.tsx`

**Interfaces:**

- Consumes: `RootStackParamList['ForgotPassword']` (Task 2); navigates into the screen updated in Task 3.
- Produces: nothing consumed by later tasks (this is the last task).

- [ ] **Step 1: Add the new link below "Forgot password?"**

In `src/screens/LoginScreen.tsx`, the existing "Forgot password?" link is at lines 171-173:

```ts
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.forgotText, styles.forgotRight]}>Forgot password?</Text>
                </TouchableOpacity>
```

Immediately after this block (still inside the `mode === 'password'` branch, before the `Sign In` `TouchableOpacity` that follows), add:

```ts
                <TouchableOpacity
                  style={styles.firstTimeRow}
                  onPress={() => navigation.navigate('ForgotPassword', { mode: 'create' })}
                >
                  <Text style={styles.firstTimeText}>First time here? </Text>
                  <Text style={styles.forgotText}>Create a password</Text>
                </TouchableOpacity>
```

- [ ] **Step 2: Add the new styles**

In the `styles` `StyleSheet.create` block, next to the existing `forgotRight` style (around line 394-397):

```ts
  forgotRight: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
```

add:

```ts
  firstTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  firstTimeText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
  },
```

- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/screens/LoginScreen.tsx`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat(auth): add first-time create-password link to LoginScreen"
```

---

### Task 5: Full verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run full test suite**

Run: `npx jest`
Expected: all tests pass, including the 3 new tests from Task 1.

- [ ] **Step 2: Run full typecheck and lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: 0 errors.

- [ ] **Step 3: Manual smoke test against the running app**

With the Expo web/dev server running and pointed at a live `sms-backend`:

1. Open `LoginScreen`. Confirm both "Forgot password?" (top-right of the password field) and "First time here? Create a password" (below it) are visible and distinct.
2. Tap "Forgot password?" — confirm the screen still reads "Reset password" as the title, "Enter your email or mobile number and we'll send a verification code." as the step-1 subtitle, and the step-2 button reads "Reset password" / "Resetting…". This confirms the default/reset path is visually unchanged.
3. Go back, tap "First time here? Create a password" — confirm the screen now reads "Create your password" as the title, the first-time-flavored step-1 subtitle, and the step-2 button reads "Create password" / "Creating…".
4. Complete the create-password flow end-to-end with a seeded test account: enter identifier, send code, receive the real OTP, enter code + new password, confirm the done message reads "Your password has been created. Sign in with your new password.", and sign in with the new password.

- [ ] **Step 4: Commit (only if Step 3 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were required, commit them with a message describing what was fixed.
