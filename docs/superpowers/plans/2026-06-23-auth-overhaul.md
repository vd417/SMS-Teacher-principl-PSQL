# Auth Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the teacher app's login production-grade — real password login (email/phone), real OTP, and forgot/reset/change/first-login set-password — wired to the existing `sms-backend` `/v1/auth` endpoints, mirroring `sms-admin`.

**Architecture:** No new architecture. Extend the existing auth layers in order: domain/mapper → `AuthRepository` (types + http impl) → pure helpers (error mapping, password validation) → `AuthProvider` + hooks → screens → navigation. All real logic lives in pure, unit-tested helpers and the http repo; screens are thin and verified by `tsc` + manual run (the jest setup has no reanimated/safe-area mocks, so animated full-screen render tests are intentionally avoided).

**Tech Stack:** Expo / React Native, TypeScript, `@tanstack/react-query`, `zod` (boundary validation), `jest` + `@testing-library/react-native`, React Navigation.

**Spec:** `docs/superpowers/specs/2026-06-23-auth-overhaul-design.md`

## Global Constraints

- **Teacher & principal ONLY.** Do **not** add a `parent` role, parent endpoints, parent UI, or parent login. App `Role` stays `'teacher' | 'principal'`.
- **Mirror `sms-admin/src/api/auth.ts`** for client shape and email-vs-phone routing (`identifier.includes('@') ? {email} : {phone}`).
- **API paths are relative to `/v1`** (the base URL already includes `/v1`); use `/auth/...` exactly as the existing repo does.
- **Responses are envelope-wrapped and unwrapped by `httpClient`**; `204` responses return `undefined`. `zod.parse` any response that has a body.
- **Password rule:** minimum **8** characters; confirm-password must match.
- **Remove all demo auth artifacts:** the hardcoded `123456` hint and the demo role-chips/emails.
- **Exact user-facing copy** (use verbatim):
  - `invalid_credentials` → `Incorrect email/phone or password.`
  - `not_registered` → `This mobile or email isn't registered.`
  - `invalid_code` → `Code is invalid or expired.`
  - `weak_password` → `Password must be at least 8 characters.`
  - HTTP 429 → `Too many attempts. Please wait a moment and try again.`
- **All tests stay green** (currently 68) and **`npx tsc --noEmit` stays clean** after every task.
- **Run a single test file** with `npx jest <path>`; narrow with `-t "<name>"`.

---

### Task 1: Add `mustSetPassword` to the user identity

**Files:**

- Modify: `src/data/domain/index.ts:17-28` (the `User` interface)
- Modify: `src/data/http/auth.schema.ts:13-25` (`meSchema`) and `:44-58` (`toUserFromMe`)
- Test: `src/data/http/__tests__/auth.schema.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `User.mustSetPassword: boolean`; `meSchema` accepts optional `must_set_password: boolean`; `toUserFromMe` sets `mustSetPassword` (default `false`).

- [ ] **Step 1: Write the failing test** — append to `src/data/http/__tests__/auth.schema.test.ts`:

```ts
import { toUserFromMe } from '../auth.schema';

test('toUserFromMe maps must_set_password (defaults to false when absent)', () => {
  const withFlag = toUserFromMe(
    meSchema.parse({ id: 'u1', tenant_id: 't1', roles: ['teacher'], must_set_password: true })
  );
  expect(withFlag.mustSetPassword).toBe(true);

  const withoutFlag = toUserFromMe(
    meSchema.parse({ id: 'u2', tenant_id: 't1', roles: ['teacher'] })
  );
  expect(withoutFlag.mustSetPassword).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts -t "must_set_password"`
Expected: FAIL — `mustSetPassword` is `undefined` / not on the `User` type (or `toUserFromMe` not exported into scope is fine — it is exported).

- [ ] **Step 3: Add the field to the `User` domain type** — in `src/data/domain/index.ts`, add to the `User` interface (after `role: Role;`):

```ts
role: Role;
/** Backend signals the account has no password yet → force a set-password screen. */
mustSetPassword: boolean;
```

- [ ] **Step 4: Extend `meSchema` and `toUserFromMe`** — in `src/data/http/auth.schema.ts`, add to `meSchema` (after `tenant_name: z.string().optional(),`):

```ts
  tenant_name: z.string().optional(),
  must_set_password: z.boolean().optional(),
```

and in `toUserFromMe`'s returned object (after `role: pickRole(me.roles),`):

```ts
    role: pickRole(me.roles),
    mustSetPassword: me.must_set_password ?? false,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts`
Expected: PASS (existing tests + the new one). Note: the existing `toSessionFromMe` tests still pass because the new field defaults to `false`.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/domain/index.ts src/data/http/auth.schema.ts src/data/http/__tests__/auth.schema.test.ts
git commit -m "feat(auth): carry must_set_password through /me identity mapping"
```

---

### Task 2: Extend `AuthRepository` — identifier login + password endpoints

**Files:**

- Modify: `src/data/repositories/types.ts:73-81` (`AuthRepository` interface)
- Modify: `src/data/http/auth.repo.ts` (whole file)
- Test: `src/data/http/__tests__/auth.repo.test.ts` (create)

**Interfaces:**

- Consumes: `HttpClient` (`post`/`get`), `tokenSchema`, `meSchema`, `toSessionFromMe` (from Task 1's updated schema).
- Produces:
  - `login(identifier: string, password: string): Promise<Session>` (param renamed from `email`; routes `@`→`email`, else `phone`).
  - `forgotPassword(identifier: string): Promise<void>` → `POST /auth/password/forgot`.
  - `resetPassword(identifier: string, code: string, password: string): Promise<void>` → `POST /auth/password/reset`.
  - `setPassword(password: string): Promise<void>` → `POST /auth/set-password`.

- [ ] **Step 1: Write the failing test** — create `src/data/http/__tests__/auth.repo.test.ts`:

```ts
import { httpAuth } from '../auth.repo';
import type { HttpClient } from '@/lib/httpClient';

// Records every POST so we can assert path + body. /auth/me returns a minimal identity
// so the token→session path resolves.
function recordingHttp() {
  const calls: { path: string; body: unknown }[] = [];
  const http = {
    get: async (path: string) =>
      path === '/auth/me' ? { id: 'u1', tenant_id: 't1', roles: ['teacher'] } : undefined,
    getList: async () => ({ items: [], nextCursor: null }),
    post: async (path: string, body: unknown) => {
      calls.push({ path, body });
      if (path === '/auth/login' || path === '/auth/otp/verify')
        return { access_token: 'a', refresh_token: 'r' };
      return undefined;
    },
    put: async () => undefined,
    patch: async () => undefined,
    delete: async () => undefined,
  } as unknown as HttpClient;
  return { http, calls };
}

test('login routes an email identifier to the email field', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).login('asha@x.com', 'secret123');
  expect(calls[0]).toEqual({
    path: '/auth/login',
    body: { email: 'asha@x.com', password: 'secret123' },
  });
});

test('login routes a phone identifier to the phone field', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).login('9876540118', 'secret123');
  expect(calls[0]).toEqual({
    path: '/auth/login',
    body: { phone: '9876540118', password: 'secret123' },
  });
});

test('forgotPassword posts the identifier', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).forgotPassword('asha@x.com');
  expect(calls[0]).toEqual({ path: '/auth/password/forgot', body: { identifier: 'asha@x.com' } });
});

test('resetPassword posts identifier, code and new password', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).resetPassword('asha@x.com', '123456', 'newpass12');
  expect(calls[0]).toEqual({
    path: '/auth/password/reset',
    body: { identifier: 'asha@x.com', code: '123456', password: 'newpass12' },
  });
});

test('setPassword posts only the new password', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).setPassword('newpass12');
  expect(calls[0]).toEqual({ path: '/auth/set-password', body: { password: 'newpass12' } });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/http/__tests__/auth.repo.test.ts`
Expected: FAIL — `forgotPassword`/`resetPassword`/`setPassword` are not functions; `login` sends `{ email }` even for the phone case.

- [ ] **Step 3: Update the `AuthRepository` interface** — in `src/data/repositories/types.ts`, replace the `AuthRepository` interface body with:

```ts
export interface AuthRepository {
  login(identifier: string, password: string): Promise<Session>;
  // The backend returns tokens only; identity is fetched separately via me().
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
  me(): Promise<User>;
  logout(refreshToken: string): Promise<void>;
  requestOtp(identifier: string): Promise<OtpChallenge>;
  verifyOtp(identifier: string, code: string): Promise<Session>;
  forgotPassword(identifier: string): Promise<void>;
  resetPassword(identifier: string, code: string, password: string): Promise<void>;
  setPassword(password: string): Promise<void>;
}
```

- [ ] **Step 4: Implement in the http repo** — in `src/data/http/auth.repo.ts`, replace the `login` method and add the three new methods inside the returned object:

```ts
    login: async (identifier, password) => {
      // Mirror sms-admin: an '@' routes the lookup to email, otherwise to phone.
      const body = identifier.includes('@')
        ? { email: identifier, password }
        : { phone: identifier, password };
      const t = tokenSchema.parse(await http.post('/auth/login', body));
      return sessionFromTokens({ accessToken: t.access_token, refreshToken: t.refresh_token });
    },
    forgotPassword: async (identifier) => {
      await http.post('/auth/password/forgot', { identifier });
    },
    resetPassword: async (identifier, code, password) => {
      await http.post('/auth/password/reset', { identifier, code, password });
    },
    setPassword: async (password) => {
      await http.post('/auth/set-password', { password });
    },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/data/http/__tests__/auth.repo.test.ts`
Expected: PASS (all 5).

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in `AuthProvider.tsx`/`hooks.ts`/`LoginScreen.tsx` if they reference the old `login(email,...)` name — those are fixed in later tasks. If any appear here from the interface change, note them; otherwise expect clean. (The interface rename is parameter-name-only, so existing callers still type-check.)

- [ ] **Step 7: Commit**

```bash
git add src/data/repositories/types.ts src/data/http/auth.repo.ts src/data/http/__tests__/auth.repo.test.ts
git commit -m "feat(auth): identifier-routed login + forgot/reset/set-password repo methods"
```

---

### Task 3: Pure auth-error → message helper

**Files:**

- Create: `src/features/auth/authErrors.ts`
- Test: `src/features/auth/__tests__/authErrors.test.ts` (create)

**Interfaces:**

- Consumes: `AppError` from `@/lib/errors`.
- Produces: `authErrorMessage(err: unknown, fallback?: string): string`.

- [ ] **Step 1: Write the failing test** — create `src/features/auth/__tests__/authErrors.test.ts`:

```ts
import { AppError } from '@/lib/errors';
import { authErrorMessage } from '../authErrors';

const appErr = (code: string, status = 400) => new AppError({ code, status, message: 'raw' });

test('maps known auth codes to user-facing copy', () => {
  expect(authErrorMessage(appErr('invalid_credentials', 401))).toBe(
    'Incorrect email/phone or password.'
  );
  expect(authErrorMessage(appErr('not_registered', 404))).toBe(
    "This mobile or email isn't registered."
  );
  expect(authErrorMessage(appErr('invalid_code', 401))).toBe('Code is invalid or expired.');
  expect(authErrorMessage(appErr('weak_password', 422))).toBe(
    'Password must be at least 8 characters.'
  );
});

test('429 rate limiting overrides the code message', () => {
  expect(authErrorMessage(appErr('whatever', 429))).toBe(
    'Too many attempts. Please wait a moment and try again.'
  );
});

test('falls back for unknown codes and non-errors', () => {
  expect(authErrorMessage(appErr('mystery', 400))).toBe('raw'); // uses the AppError message
  expect(authErrorMessage('not an error')).toBe('Something went wrong. Please try again.');
  expect(authErrorMessage(new Error('boom'))).toBe('boom');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/auth/__tests__/authErrors.test.ts`
Expected: FAIL — `authErrors` module not found.

- [ ] **Step 3: Implement the helper** — create `src/features/auth/authErrors.ts`:

```ts
import { AppError } from '@/lib/errors';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email/phone or password.',
  not_registered: "This mobile or email isn't registered.",
  invalid_code: 'Code is invalid or expired.',
  weak_password: 'Password must be at least 8 characters.',
};

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

/** Maps an unknown error (usually an AppError from httpClient) to user-facing copy. */
export function authErrorMessage(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (err instanceof AppError) {
    if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/auth/__tests__/authErrors.test.ts`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/authErrors.ts src/features/auth/__tests__/authErrors.test.ts
git commit -m "feat(auth): pure error-code to user-message helper"
```

---

### Task 4: Pure new-password validation helper

**Files:**

- Create: `src/features/auth/passwordValidation.ts`
- Test: `src/features/auth/__tests__/passwordValidation.test.ts` (create)

**Interfaces:**

- Consumes: nothing.
- Produces: `validateNewPassword(password: string, confirm: string): string | null` — returns an error message or `null` when valid.

- [ ] **Step 1: Write the failing test** — create `src/features/auth/__tests__/passwordValidation.test.ts`:

```ts
import { validateNewPassword } from '../passwordValidation';

test('accepts an 8+ char password that matches its confirmation', () => {
  expect(validateNewPassword('newpass12', 'newpass12')).toBeNull();
});

test('rejects short passwords', () => {
  expect(validateNewPassword('short', 'short')).toBe('Password must be at least 8 characters.');
});

test('rejects a mismatched confirmation', () => {
  expect(validateNewPassword('newpass12', 'newpass99')).toBe('Passwords do not match.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/auth/__tests__/passwordValidation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper** — create `src/features/auth/passwordValidation.ts`:

```ts
/** Validates a new password + confirmation. Returns an error message, or null when valid. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/features/auth/__tests__/passwordValidation.test.ts`
Expected: PASS (all 3).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/passwordValidation.ts src/features/auth/__tests__/passwordValidation.test.ts
git commit -m "feat(auth): pure new-password validation helper"
```

---

### Task 5: Wire `AuthProvider` + hooks for the new flows

**Files:**

- Modify: `src/features/auth/AuthProvider.tsx` (`AuthValue` + callbacks + `value`)
- Modify: `src/features/auth/hooks.ts`
- Test: `src/features/auth/__tests__/AuthProvider.test.tsx` (create)

**Interfaces:**

- Consumes: `repos.auth.{login,forgotPassword,resetPassword,setPassword}` (Task 2).
- Produces (on the `useAuth()` value):
  - `signIn(identifier: string, password: string): Promise<void>` (param renamed).
  - `forgotPassword(identifier: string): Promise<void>` (no session change).
  - `resetPassword(identifier: string, code: string, password: string): Promise<void>` (no session change).
  - `changePassword(password: string): Promise<void>` (authenticated; no session change).
  - Hooks: `useLogin()` (arg `{ identifier, password }`), `useForgotPassword()`, `useResetPassword()` (arg `{ identifier, code, password }`), `useChangePassword()`.

- [ ] **Step 1: Write the failing test** — create `src/features/auth/__tests__/AuthProvider.test.tsx`:

```ts
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

const mockForgot = jest.fn(async () => {});
const fakeRepos = { auth: { forgotPassword: mockForgot } } as unknown as Repositories;

const Probe = () => {
  const { status, forgotPassword } = useAuth();
  return (
    <>
      <Text>{`status:${status}`}</Text>
      <TouchableOpacity onPress={() => forgotPassword('asha@x.com')}>
        <Text>forgot</Text>
      </TouchableOpacity>
    </>
  );
};

test('forgotPassword delegates to the repo without establishing a session', async () => {
  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('forgot'));
  await waitFor(() => expect(mockForgot).toHaveBeenCalledWith('asha@x.com'));
  // Still unauthenticated — forgot-password must not log the user in.
  expect(screen.getByText('status:unauthenticated')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx`
Expected: FAIL — `forgotPassword` is not on the `useAuth()` value (type error / undefined call).

- [ ] **Step 3: Extend `AuthValue` and callbacks** — in `src/features/auth/AuthProvider.tsx`:

Update the `AuthValue` interface:

```ts
interface AuthValue {
  status: Status;
  session: Session | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestOtp: (identifier: string) => Promise<OtpChallenge>;
  signInWithOtp: (identifier: string, code: string) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<void>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
}
```

Rename the `signIn` parameter (`email` → `identifier`):

```ts
const signIn = useCallback(
  async (identifier: string, password: string) => {
    const s = await repos.auth.login(identifier, password);
    await establishSession(s);
  },
  [repos, establishSession]
);
```

Add the three new callbacks (after `signInWithOtp`):

```ts
const forgotPassword = useCallback(
  (identifier: string) => repos.auth.forgotPassword(identifier),
  [repos]
);

const resetPassword = useCallback(
  (identifier: string, code: string, password: string) =>
    repos.auth.resetPassword(identifier, code, password),
  [repos]
);

const changePassword = useCallback((password: string) => repos.auth.setPassword(password), [repos]);
```

Add them to the memoized `value`:

```ts
const value = useMemo(
  () => ({
    status,
    session,
    signIn,
    signOut,
    requestOtp,
    signInWithOtp,
    forgotPassword,
    resetPassword,
    changePassword,
  }),
  [
    status,
    session,
    signIn,
    signOut,
    requestOtp,
    signInWithOtp,
    forgotPassword,
    resetPassword,
    changePassword,
  ]
);
```

- [ ] **Step 4: Update hooks** — in `src/features/auth/hooks.ts`, replace `useLogin` and append the new hooks:

```ts
export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      signIn(identifier, password),
  });
}

export function useForgotPassword() {
  const { forgotPassword } = useAuth();
  return useMutation({ mutationFn: (identifier: string) => forgotPassword(identifier) });
}

export function useResetPassword() {
  const { resetPassword } = useAuth();
  return useMutation({
    mutationFn: ({
      identifier,
      code,
      password,
    }: {
      identifier: string;
      code: string;
      password: string;
    }) => resetPassword(identifier, code, password),
  });
}

export function useChangePassword() {
  const { changePassword } = useAuth();
  return useMutation({ mutationFn: (password: string) => changePassword(password) });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: the only remaining error is in `src/screens/LoginScreen.tsx` (still calls `useLogin`? it currently does not — it uses OTP hooks). If `LoginScreen` does not yet use `useLogin`, expect clean. Any error about `signIn(email,...)` callers is resolved here. Fix stragglers if present.

- [ ] **Step 7: Commit**

```bash
git add src/features/auth/AuthProvider.tsx src/features/auth/hooks.ts src/features/auth/__tests__/AuthProvider.test.tsx
git commit -m "feat(auth): provider + hooks for forgot/reset/change password"
```

---

### Task 6: Navigation — routes and types for the new screens

**Files:**

- Modify: `src/navigation/types.ts` (`RootStackParamList`, `ProfileStackParamList`)
- Test: none (type-only change; verified by `tsc`). Folded into the screens that consume these routes (Tasks 7–10).

**Interfaces:**

- Produces: `RootStackParamList` gains `ForgotPassword: undefined` and `SetPassword: undefined`; `ProfileStackParamList` gains `ChangePasswordScreen: undefined`.

- [ ] **Step 1: Add the route params** — in `src/navigation/types.ts`:

Add to `ProfileStackParamList` (after `SettingsScreen: undefined;`):

```ts
ChangePasswordScreen: undefined;
```

Replace `RootStackParamList` with:

```ts
export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  SetPassword: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean (no consumer references the new routes yet).

- [ ] **Step 3: Commit**

```bash
git add src/navigation/types.ts
git commit -m "feat(auth): navigation route params for forgot/set/change password"
```

---

### Task 7: Rebuild `LoginScreen` — password primary, OTP alternate

**Files:**

- Modify: `src/screens/LoginScreen.tsx` (rebuild the body; keep the existing styles you reuse)
- Test: `tsc` + manual run (animated screen; no jest render — see plan header). Logic it depends on is already unit-tested (Tasks 2–4).

**Interfaces:**

- Consumes: `useLogin()` (`{ identifier, password }`), `useRequestOtp()`, `useVerifyOtp()` (existing), `authErrorMessage` (Task 3), `useNavigation` for `ForgotPassword`.
- Produces: the production login UI. No exported API change.

- [ ] **Step 1: Replace the screen** — overwrite `src/screens/LoginScreen.tsx` with a two-mode screen. Keep all existing `StyleSheet` entries; add the few noted new ones. Implementation:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useLogin, useRequestOtp, useVerifyOtp } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import type { RootStackParamList } from '../navigation/types';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type Mode = 'password' | 'otp';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LoginNav>();

  const login = useLogin();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [mode, setMode] = useState<Mode>('password');

  // password mode
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // otp mode
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');

  const loginErr = login.error ? authErrorMessage(login.error) : null;
  const requestErr = requestOtp.error ? authErrorMessage(requestOtp.error) : null;
  const verifyErr = verifyOtp.error ? authErrorMessage(verifyOtp.error) : null;

  const handleSignIn = () => login.mutate({ identifier: identifier.trim(), password });

  const handleSendOtp = () => {
    verifyOtp.reset();
    setOtpCode('');
    requestOtp.mutate(otpIdentifier.trim(), {
      onSuccess: (challenge) => {
        setOtpDestination(challenge.destination);
        setOtpSent(true);
      },
    });
  };
  const handleVerifyOtp = () =>
    verifyOtp.mutate({ identifier: otpIdentifier.trim(), code: otpCode });
  const handleChangeIdentifier = () => {
    setOtpSent(false);
    setOtpCode('');
    setOtpDestination('');
    verifyOtp.reset();
    requestOtp.reset();
  };
  const switchMode = (next: Mode) => {
    setMode(next);
    login.reset();
    requestOtp.reset();
    verifyOtp.reset();
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>School Desk</Text>
            <Text style={styles.appTagline}>School Management System</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back 👋</Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'password'
                ? 'Sign in with your email or mobile number'
                : otpSent
                  ? 'Enter the code we sent you'
                  : 'Sign in with a one-time code to your mobile or email'}
            </Text>

            {mode === 'password' ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email or Mobile Number</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder="Email or mobile number"
                      placeholderTextColor={Colors.inkSoft}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor={Colors.inkSoft}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={Colors.inkMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {loginErr && <Text style={styles.errorText}>{loginErr}</Text>}
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.forgotText, styles.forgotRight]}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.signInBtn, login.isPending && styles.signInBtnLoading]}
                  activeOpacity={0.9}
                  disabled={login.isPending}
                  onPress={handleSignIn}
                >
                  {login.isPending ? (
                    <Text style={styles.signInBtnText}>Signing in…</Text>
                  ) : (
                    <>
                      <Text style={styles.signInBtnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.altLink} onPress={() => switchMode('otp')}>
                  <Text style={styles.altLinkText}>Sign in with a one-time code instead</Text>
                </TouchableOpacity>
              </View>
            ) : !otpSent ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number or Email</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={otpIdentifier}
                      onChangeText={setOtpIdentifier}
                      placeholder="Mobile number or email"
                      placeholderTextColor={Colors.inkSoft}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {requestErr && <Text style={styles.errorText}>{requestErr}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.signInBtn, requestOtp.isPending && styles.signInBtnLoading]}
                  activeOpacity={0.9}
                  disabled={requestOtp.isPending}
                  onPress={handleSendOtp}
                >
                  {requestOtp.isPending ? (
                    <Text style={styles.signInBtnText}>Sending…</Text>
                  ) : (
                    <>
                      <Text style={styles.signInBtnText}>Send OTP</Text>
                      <Ionicons name="paper-plane-outline" size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.altLink} onPress={() => switchMode('password')}>
                  <Text style={styles.altLinkText}>Use password instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <Text style={styles.otpSentText}>Code sent to {otpDestination}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="keypad-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={Colors.inkSoft}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  {verifyErr && <Text style={styles.errorText}>{verifyErr}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.signInBtn, verifyOtp.isPending && styles.signInBtnLoading]}
                  activeOpacity={0.9}
                  disabled={verifyOtp.isPending}
                  onPress={handleVerifyOtp}
                >
                  {verifyOtp.isPending ? (
                    <Text style={styles.signInBtnText}>Verifying…</Text>
                  ) : (
                    <>
                      <Text style={styles.signInBtnText}>Verify & Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.otpLinksRow}>
                  <TouchableOpacity onPress={handleSendOtp} disabled={requestOtp.isPending}>
                    <Text style={styles.forgotText}>Resend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleChangeIdentifier}>
                    <Text style={styles.forgotText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.altLink} onPress={() => switchMode('password')}>
                  <Text style={styles.altLinkText}>Use password instead</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
            <Text style={styles.footerText}>Westbrook Academy · v1.0.0</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};
```

- [ ] **Step 2: Update styles** — in the `StyleSheet.create({...})`, remove the now-unused `roleRow`, `roleChip`, `roleChipActive`, `roleChipText`, `roleChipTextActive`, and `otpHintText` entries, and add:

```ts
  forgotRight: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  altLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  altLinkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
```

(Keep `forgotText`, `signInBtn*`, `inputWrap`, `textInput`, `otpSentText`, `otpLinksRow`, `errorText`, and all layout styles.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run the full test suite (no regressions)**

Run: `npx jest`
Expected: all green.

- [ ] **Step 5: Manual verification**

Start the app (`npm run start`), and confirm on the Login screen: (a) password mode shows identifier+password, a "Forgot password?" link, and a "Sign in with a one-time code instead" link; (b) **no** role chips and **no** "123456" hint anywhere; (c) toggling to OTP shows the send→verify flow with "Use password instead". (Live sign-in is verified end-to-end in Task 11.)

- [ ] **Step 6: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat(auth): production login screen — password primary, OTP alternate"
```

---

### Task 8: `ForgotPasswordScreen` (request code → reset)

**Files:**

- Create: `src/screens/ForgotPasswordScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (register the route in the unauthenticated stack)
- Test: `tsc` + manual run; depends on already-tested `useForgotPassword`/`useResetPassword`, `validateNewPassword`, `authErrorMessage`.

**Interfaces:**

- Consumes: `useForgotPassword()`, `useResetPassword()` (Task 5), `validateNewPassword` (Task 4), `authErrorMessage` (Task 3), `useNavigation`.
- Produces: `ForgotPasswordScreen` component (default + named export).

- [ ] **Step 1: Create the screen** — `src/screens/ForgotPasswordScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useForgotPassword, useResetPassword } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { validateNewPassword } from '@/features/auth/passwordValidation';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const forgotErr = forgot.error ? authErrorMessage(forgot.error) : null;
  const resetErr = reset.error ? authErrorMessage(reset.error) : null;

  const handleSend = () => forgot.mutate(identifier.trim(), { onSuccess: () => setSent(true) });

  const handleReset = () => {
    const v = validateNewPassword(password, confirm);
    setLocalErr(v);
    if (v) return;
    reset.mutate(
      { identifier: identifier.trim(), code: code.trim(), password },
      { onSuccess: () => setDone(true) }
    );
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reset password</Text>

            {done ? (
              <View>
                <Text style={styles.cardSubtitle}>
                  Your password has been reset. Sign in with your new password.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.primaryBtnText}>Back to sign in</Text>
                </TouchableOpacity>
              </View>
            ) : !sent ? (
              <View>
                <Text style={styles.cardSubtitle}>
                  Enter your email or mobile number and we'll send a verification code.
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={Colors.inkMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="Email or mobile number"
                    placeholderTextColor={Colors.inkSoft}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {forgotErr && <Text style={styles.errorText}>{forgotErr}</Text>}
                <TouchableOpacity
                  style={[styles.primaryBtn, forgot.isPending && styles.btnLoading]}
                  disabled={forgot.isPending}
                  onPress={handleSend}
                >
                  <Text style={styles.primaryBtnText}>
                    {forgot.isPending ? 'Sending…' : 'Send code'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.cardSubtitle}>
                  Enter the code we sent and choose a new password.
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="keypad-outline"
                    size={18}
                    color={Colors.inkMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="6-digit code"
                    placeholderTextColor={Colors.inkSoft}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={Colors.inkMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="New password (min 8 chars)"
                    placeholderTextColor={Colors.inkSoft}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={Colors.inkMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.inkSoft}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {(localErr || resetErr) && (
                  <Text style={styles.errorText}>{localErr ?? resetErr}</Text>
                )}
                <TouchableOpacity
                  style={[styles.primaryBtn, reset.isPending && styles.btnLoading]}
                  disabled={reset.isPending}
                  onPress={handleReset}
                >
                  <Text style={styles.primaryBtnText}>
                    {reset.isPending ? 'Resetting…' : 'Reset password'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendRow}
                  onPress={handleSend}
                  disabled={forgot.isPending}
                >
                  <Text style={styles.forgotText}>Resend code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
  card: { backgroundColor: Colors.white, borderRadius: Radii.xl, padding: 28, ...Shadows.pop },
  cardTitle: { fontFamily: FontFamily.extraBold, fontSize: 24, color: Colors.ink, marginBottom: 6 },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Shadows.card,
  },
  btnLoading: { opacity: 0.8 },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  forgotText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  resendRow: { alignItems: 'center', marginTop: 16 },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.coral,
    marginTop: 2,
    marginBottom: 6,
  },
});
```

- [ ] **Step 2: Register the route** — in `src/navigation/RootNavigator.tsx`, import the screen and add it to the unauthenticated branch:

```tsx
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
```

and inside the `status !== 'authenticated'` fragment, after the `Login` screen:

```tsx
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
```

- [ ] **Step 3: Type-check + full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean; all tests green.

- [ ] **Step 4: Manual verification**

From Login → "Forgot password?" → enter an identifier → "Send code" → enter code + new password + confirm → "Reset password" → success message → "Back to sign in". Mismatch/short password shows the inline validation message before any network call. (Live reset verified in Task 11.)

- [ ] **Step 5: Commit**

```bash
git add src/screens/ForgotPasswordScreen.tsx src/navigation/RootNavigator.tsx
git commit -m "feat(auth): forgot/reset-password screen wired to backend"
```

---

### Task 9: `ChangePasswordScreen` + Profile entry

**Files:**

- Create: `src/screens/ChangePasswordScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx` (add a "Change Password" menu item)
- Modify: `src/navigation/MainTabNavigator.tsx` and `src/navigation/PrincipalTabNavigator.tsx` (register the screen in each Profile stack)
- Test: `tsc` + manual run; depends on already-tested `useChangePassword`, `validateNewPassword`, `authErrorMessage`.

**Interfaces:**

- Consumes: `useChangePassword()` (Task 5), `validateNewPassword` (Task 4), `authErrorMessage` (Task 3), `ProfileStackParamList.ChangePasswordScreen` (Task 6).
- Produces: `ChangePasswordScreen` component.

- [ ] **Step 1: Create the screen** — `src/screens/ChangePasswordScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useChangePassword } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { validateNewPassword } from '@/features/auth/passwordValidation';

export const ChangePasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const change = useChangePassword();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const serverErr = change.error ? authErrorMessage(change.error) : null;

  const handleSubmit = () => {
    const v = validateNewPassword(password, confirm);
    setLocalErr(v);
    if (v) return;
    change.mutate(password, { onSuccess: () => setDone(true) });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={styles.card}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.present} />
              <Text style={styles.doneTitle}>Password changed</Text>
              <Text style={styles.doneText}>Your password has been updated.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Choose a new password for your account.</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.inkMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="New password (min 8 chars)"
                  placeholderTextColor={Colors.inkSoft}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.inkMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.inkSoft}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              {(localErr || serverErr) && (
                <Text style={styles.errorText}>{localErr ?? serverErr}</Text>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, change.isPending && styles.btnLoading]}
                disabled={change.isPending}
                onPress={handleSubmit}
              >
                <Text style={styles.primaryBtnText}>
                  {change.isPending ? 'Saving…' : 'Update password'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.ink },
  scroll: { padding: 20 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: 24,
    alignItems: 'stretch',
    ...Shadows.card,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 18,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.card,
  },
  btnLoading: { opacity: 0.8 },
  primaryBtnText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
  errorText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.coral, marginBottom: 6 },
  doneTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.ink,
    marginTop: 12,
    textAlign: 'center',
  },
  doneText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Add the Profile menu item** — in `src/screens/ProfileScreen.tsx`, add to the `MENU_ITEMS` array (before the `Settings` entry):

```ts
  {
    icon: 'key-outline',
    label: 'Change Password',
    screen: 'ChangePasswordScreen',
    color: Colors.blue,
  },
```

(The existing `handleMenuPress`/`navigation.navigate(screen as keyof ProfileStackParamList)` already routes it — no other change needed.)

- [ ] **Step 3: Register the screen in both Profile stacks** — in `src/navigation/MainTabNavigator.tsx`, import and add the screen to `ProfileStackNavigator`:

```tsx
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
```

```tsx
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
```

Do the same in `src/navigation/PrincipalTabNavigator.tsx` (import + add the `ChangePasswordScreen` line inside its `ProfileStackNavigator`).

- [ ] **Step 4: Type-check + full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean; all tests green.

- [ ] **Step 5: Manual verification**

As both a teacher and a principal account: Profile → "Change Password" → enter mismatched passwords (inline error, no network) → enter a valid matching 8+ char password → "Update password" → success → "Done" returns to Profile. (Live change verified in Task 11.)

- [ ] **Step 6: Commit**

```bash
git add src/screens/ChangePasswordScreen.tsx src/screens/ProfileScreen.tsx src/navigation/MainTabNavigator.tsx src/navigation/PrincipalTabNavigator.tsx
git commit -m "feat(auth): signed-in change-password screen from Profile (teacher + principal)"
```

---

### Task 10: First-login forced set-password gate

**Files:**

- Create: `src/screens/SetPasswordScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (gate on `session.user.mustSetPassword`)
- Test: `tsc` + manual run; the gate logic is a single boolean branch, the screen reuses tested hooks/helpers.

**Interfaces:**

- Consumes: `useChangePassword()` (Task 5), `validateNewPassword` (Task 4), `authErrorMessage` (Task 3), `useAuth().signOut`, `User.mustSetPassword` (Task 1), `RootStackParamList.SetPassword` (Task 6).
- Produces: `SetPasswordScreen` component; `RootNavigator` renders it instead of the tabs while `mustSetPassword` is true.

- [ ] **Step 1: Create the screen** — `src/screens/SetPasswordScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useAuth } from '@/features/auth/AuthProvider';
import { useChangePassword } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { validateNewPassword } from '@/features/auth/passwordValidation';

// Shown after sign-in when the backend flags an account as having no password yet.
// On success we sign the user out so they re-enter with the password they just set
// (re-login refreshes /me and clears the mustSetPassword flag).
export const SetPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { signOut, session } = useAuth();
  const change = useChangePassword();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);

  const serverErr = change.error ? authErrorMessage(change.error) : null;

  const handleSubmit = () => {
    const v = validateNewPassword(password, confirm);
    setLocalErr(v);
    if (v) return;
    change.mutate(password, { onSuccess: () => signOut() });
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set your password</Text>
            <Text style={styles.cardSubtitle}>
              Welcome{session?.user.name ? `, ${session.user.name}` : ''}. Create a password to
              finish setting up your account.
            </Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.inkMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="New password (min 8 chars)"
                placeholderTextColor={Colors.inkSoft}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.inkMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.inkSoft}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
            {(localErr || serverErr) && (
              <Text style={styles.errorText}>{localErr ?? serverErr}</Text>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, change.isPending && styles.btnLoading]}
              disabled={change.isPending}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryBtnText}>
                {change.isPending ? 'Saving…' : 'Set password & continue'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutRow} onPress={() => signOut()}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  card: { backgroundColor: Colors.white, borderRadius: Radii.xl, padding: 28, ...Shadows.pop },
  cardTitle: { fontFamily: FontFamily.extraBold, fontSize: 24, color: Colors.ink, marginBottom: 6 },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.card,
  },
  btnLoading: { opacity: 0.8 },
  primaryBtnText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
  errorText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.coral, marginBottom: 6 },
  signOutRow: { alignItems: 'center', marginTop: 18 },
  signOutText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
});
```

- [ ] **Step 2: Gate it in `RootNavigator`** — in `src/navigation/RootNavigator.tsx`, import the screen and branch on the flag. Replace the authenticated portion of the navigator:

```tsx
import { SetPasswordScreen } from '../screens/SetPasswordScreen';
```

```tsx
const isPrincipal = session?.user.role === 'principal';
const mustSetPassword = session?.user.mustSetPassword === true;

return (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {status !== 'authenticated' ? (
      <>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </>
    ) : mustSetPassword ? (
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
    ) : isPrincipal ? (
      <Stack.Screen name="Principal" component={PrincipalTabNavigator} />
    ) : (
      <Stack.Screen name="Main" component={MainTabNavigator} />
    )}
  </Stack.Navigator>
);
```

- [ ] **Step 3: Type-check + full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean; all tests green. Because `mustSetPassword` defaults to `false` (Task 1), the gate is inert with today's backend `/me`.

- [ ] **Step 4: Manual verification**

Confirm normal sign-in still lands on the tabs (flag is `false`). To exercise the gate without a backend change, temporarily make `toUserFromMe` return `mustSetPassword: true`, rebuild, confirm the `SetPasswordScreen` blocks the app and "Sign out" works — then **revert** that temporary change.

- [ ] **Step 5: Commit**

```bash
git add src/screens/SetPasswordScreen.tsx src/navigation/RootNavigator.tsx
git commit -m "feat(auth): first-login set-password gate (inert until backend flag ships)"
```

---

### Task 11: Supersede stale docs + full end-to-end verification

**Files:**

- Modify: `docs/superpowers/specs/2026-06-15-otp-login-design.md` (mark superseded)
- Test: full suite + `tsc` + live smoke against `sms-backend`

**Interfaces:** none.

- [ ] **Step 1: Mark the old OTP spec superseded** — at the very top of `docs/superpowers/specs/2026-06-15-otp-login-design.md`, insert:

```markdown
> **SUPERSEDED (2026-06-23):** This design was written against the now-deleted mock
> layer and a fixed demo code. Production auth — real password login, real OTP, and
> forgot/reset/change/set-password — is specified in
> `2026-06-23-auth-overhaul-design.md` and implemented per
> `docs/superpowers/plans/2026-06-23-auth-overhaul.md`.
```

- [ ] **Step 2: Full test suite + type-check**

Run: `npx jest && npx tsc --noEmit`
Expected: all green (original 68 + the new auth tests), tsc clean.

- [ ] **Step 3: Lint**

Run: `npm run lint` (if defined) — expected: no new errors. Otherwise skip.

- [ ] **Step 4: Live end-to-end smoke** — with `sms-backend` running (`dotnet run --project src/Sms.Api --launch-profile http`, base `http://localhost:5162`, `EXPO_PUBLIC_API_BASE_URL` = `http://localhost:5162/v1`) and a seeded `school.teacher` user that has a password, verify in the app:
  1. **Password login** with the **email** identifier → lands on the teacher tabs.
  2. Sign out; **password login** with the **phone** identifier → lands on the tabs.
  3. Force a 401 (let the access token expire or revoke server-side) → app silently refreshes and the request succeeds.
  4. **OTP login** → "Send OTP" → read the code the backend `IOtpSender` emits (dev sender logs it) → "Verify & Sign In" → tabs.
  5. **Forgot password** → send code → reset with the code + a new 8+ char password → return to Login → sign in with the new password.
  6. **Change password** from Profile → success → sign out → sign in with the new password.
  7. Confirm **no** `123456` and **no** demo chips appear anywhere.

  Record any deviation as a follow-up; do not mark the task complete while a step fails.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-06-15-otp-login-design.md
git commit -m "docs(auth): supersede 2026-06-15 OTP spec; auth overhaul verified end-to-end"
```

- [ ] **Step 6: Update project memory (out-of-band)** — update the `teacher-app-live-api` memory note to record that production auth (password email/phone, real OTP, forgot/reset/change, flag-gated set-password) is wired, and that `must_set_password` on `/auth/me` remains a backend dependency for the first-login flow.

---

## Notes for the implementer

- **Backend dependency (not a blocker):** the first-login set-password gate (Task 10) only activates once `GET /v1/auth/me` returns `must_set_password: true`. Until then it is inert by design. Do not add backend code as part of this plan.
- **OTP/forgot delivery** depends on a configured `IOtpSender` in the running backend; the app shows "code sent" regardless. If the dev backend uses a console/log sender, read the code from its output during Task 11.
- **No parent role.** If any step tempts you toward a parent/guardian concept, stop — it is explicitly out of scope.
