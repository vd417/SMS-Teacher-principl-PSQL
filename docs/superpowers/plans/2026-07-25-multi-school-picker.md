# Multi-School Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user whose email/phone maps to multiple schools (multiple `Users` rows across tenants — e.g. a principal invited to several schools) pick which school to enter right after login, and switch schools later from Profile, instead of the backend silently picking one arbitrary school.

**Architecture:** Pure frontend change in `sms-teacher-app`. The backend already exposes `GET /v1/me/schools` (list every school the signed-in identity has a row in) and `POST /v1/me/switch-school` (reissue tokens scoped to one of those rows) — both already proven in `sms-admin`, no backend changes. After a normal `login()`, the app calls `/me/schools`; if it returns 2+ schools, a new `'selecting-school'` auth status gates the user into a `SchoolPickerScreen` before the normal `Main`/`Principal` navigators mount. The same picker and the same underlying `switchSchool()` call are reused from a new "Switch School" row in Profile.

**Tech Stack:** React Native (Expo), TypeScript, `@tanstack/react-query`, `zod`, `@react-navigation/native-stack`, Jest + `@testing-library/react-native`.

## Global Constraints

- No backend changes — `GET /v1/me/schools` and `POST /v1/me/switch-school` already exist and are role-agnostic.
- No change to single-school user behavior — the picker only activates when `/me/schools` returns more than 1 school.
- No "remember last school" persistence across restarts — out of scope (see spec's Non-goals).
- `/me/schools` is cursor-paginated on the backend (`CursorOk`) — fetch via `http.getList`, not `http.get`. Only the first page is read (a personal school-membership list realistically never spans pages); this is a known, accepted simplification, not a bug to fix here.
- Follow existing code conventions exactly: `Colors`/`Radii`/`Shadows`/`FontFamily` theme tokens, `Ionicons` icon set, `FadeInDown` entrance animation on screen sections, the `authErrorMessage()` helper for error copy, the `recordingHttp()` / `fakeRepos` + `Probe` component test harnesses already used in this codebase's auth tests.

---

### Task 1: `SchoolChoice` schema + `AuthRepository` interface

**Files:**

- Modify: `src/data/repositories/types.ts`
- Modify: `src/data/http/auth.schema.ts`
- Test: `src/data/http/__tests__/auth.schema.test.ts`

**Interfaces:**

- Consumes: nothing new.
- Produces: `SchoolChoice` type (`{ id: string; name: string }`), `schoolChoiceSchema` (zod), and the two new `AuthRepository` method signatures `listMySchools(): Promise<SchoolChoice[]>` and `switchSchool(tenantId: string): Promise<Session>` that Task 2 implements and Task 3 consumes.

- [ ] **Step 1: Add `SchoolChoice` to the domain types and `AuthRepository` interface**

In `src/data/repositories/types.ts`, find the existing `AuthRepository` interface (currently ending with `setPassword(password: string): Promise<void>;`) and change it to:

```ts
export interface SchoolChoice {
  id: string;
  name: string;
}

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
  // A signed-in identity can own more than one Users row (invited to several
  // schools under the same email/phone). listMySchools lists all of them;
  // switchSchool reissues tokens scoped to one specific row/tenant.
  listMySchools(): Promise<SchoolChoice[]>;
  switchSchool(tenantId: string): Promise<Session>;
}
```

- [ ] **Step 2: Write the failing schema test**

Add to `src/data/http/__tests__/auth.schema.test.ts` (append after the existing tests, keep the existing `import` line but add `schoolChoiceSchema` to it):

```ts
import {
  pickRole,
  meSchema,
  schoolChoiceSchema,
  toSessionFromMe,
  toUserFromMe,
  initialsFrom,
  maskIdentifier,
} from '../auth.schema';
```

```ts
test('schoolChoiceSchema extracts id/name and strips the rest of a full ClientResponse row', () => {
  const fullClientResponseRow = {
    id: 't1',
    name: 'Westbrook Academy',
    slug: 'westbrook',
    country: 'IN',
    status: 'active',
    plan_id: 'p1',
    plan_name: 'Gold',
    tier: 'gold',
    mrr: 50000,
    students_count: 340,
    staff_count: 28,
    storage_gb: 4.2,
    limits: { students: 500, staff: 50 },
    created: '2024-01-01T00:00:00Z',
    health_score: 88,
  };
  const school = schoolChoiceSchema.parse(fullClientResponseRow);
  expect(school).toEqual({ id: 't1', name: 'Westbrook Academy' });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts -t "schoolChoiceSchema"`
Expected: FAIL — `schoolChoiceSchema` is not exported from `../auth.schema`.

- [ ] **Step 4: Add `schoolChoiceSchema` to `auth.schema.ts`**

In `src/data/http/auth.schema.ts`, add after the existing `meSchema`/`MeWire` block (before the `// ─── Mapping` comment):

```ts
// GET /me/schools returns full ClientResponse rows (id, name, slug, plan info,
// counts, ...) — we only need id/name for the picker. zod strips unknown keys
// by default, so parsing with this narrow schema is safe against the fuller shape.
export const schoolChoiceSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type SchoolChoiceWire = z.infer<typeof schoolChoiceSchema>;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts`
Expected: PASS, all tests in the file green (including the pre-existing ones — confirms nothing was broken).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`AuthRepository` now declares two methods no implementation provides yet — this is expected to fail here since `httpAuth()` in `auth.repo.ts` doesn't implement them until Task 2. If `tsc` reports exactly that missing-methods error on `httpAuth`'s return value and nothing else, that's expected at this point in the plan — proceed. If it reports anything else, stop and investigate.)

- [ ] **Step 7: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/data/repositories/types.ts src/data/http/auth.schema.ts src/data/http/__tests__/auth.schema.test.ts
git commit -m "feat(auth): add SchoolChoice type and schoolChoiceSchema for multi-school support"
```

---

### Task 2: `listMySchools` / `switchSchool` in the HTTP auth repository

**Files:**

- Modify: `src/data/http/auth.repo.ts`
- Modify: `src/data/http/__tests__/auth.repo.test.ts`

**Interfaces:**

- Consumes: `SchoolChoice`, `schoolChoiceSchema` (Task 1); `HttpClient.getList<T>(path, opts?): Promise<Page<T>>` and `HttpClient.post` (existing, see `src/lib/httpClient.ts`); the existing internal `sessionFromTokens` helper already defined in this file.
- Produces: `httpAuth(http).listMySchools()` and `httpAuth(http).switchSchool(tenantId)`, fully implementing the `AuthRepository` interface from Task 1 — consumed by Task 3's `AuthProvider`.

- [ ] **Step 1: Write the failing repo tests**

The existing `recordingHttp()` helper in `src/data/http/__tests__/auth.repo.test.ts` mocks `get`/`getList`/`post`/`put`/`patch`/`delete` but its `getList` always returns an empty page and its `get`/`post` don't know about `/me/schools` or `/me/switch-school`. Replace the whole `recordingHttp` function with:

```ts
function recordingHttp() {
  const calls: { path: string; body: unknown }[] = [];
  const http = {
    get: async (path: string) =>
      path === '/auth/me' ? { id: 'u1', tenant_id: 't1', roles: ['teacher'] } : undefined,
    getList: async (path: string) =>
      path === '/me/schools'
        ? {
            items: [
              { id: 't1', name: 'School One' },
              { id: 't2', name: 'School Two' },
            ],
            nextCursor: null,
          }
        : { items: [], nextCursor: null },
    post: async (path: string, body: unknown) => {
      calls.push({ path, body });
      if (path === '/auth/login' || path === '/auth/otp/verify' || path === '/me/switch-school')
        return { access_token: 'a', refresh_token: 'r' };
      return undefined;
    },
    put: async () => undefined,
    patch: async () => undefined,
    delete: async () => undefined,
  } as unknown as HttpClient;
  return { http, calls };
}
```

Then add these two tests at the end of the file:

```ts
test('listMySchools maps the paginated /me/schools rows to id/name', async () => {
  const { http } = recordingHttp();
  const schools = await httpAuth(http).listMySchools();
  expect(schools).toEqual([
    { id: 't1', name: 'School One' },
    { id: 't2', name: 'School Two' },
  ]);
});

test('switchSchool posts tenant_id and resolves a full session via /auth/me', async () => {
  const { http, calls } = recordingHttp();
  const session = await httpAuth(http).switchSchool('t2');
  expect(calls[0]).toEqual({ path: '/me/switch-school', body: { tenant_id: 't2' } });
  expect(session.tenant.id).toBe('t1'); // recordingHttp's /auth/me always returns tenant_id: 't1'
  expect(session.accessToken).toBe('a');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/data/http/__tests__/auth.repo.test.ts -t "listMySchools|switchSchool"`
Expected: FAIL — `listMySchools`/`switchSchool` are not functions on the object `httpAuth(http)` returns.

- [ ] **Step 3: Implement `listMySchools` and `switchSchool`**

In `src/data/http/auth.repo.ts`, add the `schoolChoiceSchema` import and the two new methods to the returned object (after the existing `setPassword` method, keeping it the last-but-one and adding a trailing comma):

```ts
import type { AuthRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import {
  tokenSchema,
  meSchema,
  schoolChoiceSchema,
  toSessionFromMe,
  toUserFromMe,
  maskIdentifier,
} from './auth.schema';
```

```ts
    setPassword: async (password) => {
      await http.post('/auth/set-password', { password });
    },
    listMySchools: async () => {
      const page = await http.getList<unknown>('/me/schools');
      return page.items.map((x) => schoolChoiceSchema.parse(x));
    },
    switchSchool: async (tenantId) => {
      const t = tokenSchema.parse(
        await http.post('/me/switch-school', { tenant_id: tenantId })
      );
      return sessionFromTokens({ accessToken: t.access_token, refreshToken: t.refresh_token });
    },
  };
}
```

(The `return {` object and its closing `};`/`}` are already in the file — this step only adds the two new properties before the existing closing braces; don't duplicate them.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/data/http/__tests__/auth.repo.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — `httpAuth`'s return value now fully satisfies `AuthRepository`.

- [ ] **Step 6: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/data/http/auth.repo.ts src/data/http/__tests__/auth.repo.test.ts
git commit -m "feat(auth): implement listMySchools and switchSchool in the HTTP auth repo"
```

---

### Task 3: `AuthProvider` — `selecting-school` status and `switchSchool`

**Files:**

- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/hooks.ts`
- Test: `src/features/auth/__tests__/AuthProvider.test.tsx`

**Interfaces:**

- Consumes: `AuthRepository.listMySchools()` / `.switchSchool(tenantId)` (Tasks 1-2); `SchoolChoice` type (Task 1).
- Produces: `AuthValue.pendingSchools: SchoolChoice[] | null`, `AuthValue.switchSchool: (tenantId: string) => Promise<void>`, new `Status` value `'selecting-school'` — consumed by Task 4's `RootNavigator`/`SchoolPickerScreen` and Task 5's Profile screen.

- [ ] **Step 1: Write the failing provider tests**

Add to `src/features/auth/__tests__/AuthProvider.test.tsx` (new imports plus two new tests; keep the existing `forgotPassword` test and its `fakeRepos`/`mockForgot` untouched — these new tests define their own local `fakeRepos`):

```tsx
test('signIn with multiple schools stops at selecting-school and exposes pendingSchools', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
    },
    tenant: { id: 't1', name: 'School One' },
  }));
  const mockListSchools = jest.fn(async () => [
    { id: 't1', name: 'School One' },
    { id: 't2', name: 'School Two' },
  ]);
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools },
  } as unknown as Repositories;

  const Probe2 = () => {
    const { status, pendingSchools, signIn } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`pending:${pendingSchools?.length ?? 'null'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe2 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:selecting-school')).toBeTruthy());
  expect(screen.getByText('pending:2')).toBeTruthy();
});

test('switchSchool establishes the session and returns to authenticated', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
    },
    tenant: { id: 't1', name: 'School One' },
  }));
  const mockListSchools = jest.fn(async () => [
    { id: 't1', name: 'School One' },
    { id: 't2', name: 'School Two' },
  ]);
  const mockSwitchSchool = jest.fn(async (tenantId: string) => ({
    accessToken: 'a2',
    refreshToken: 'r2',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'principal' as const,
      mustSetPassword: false,
    },
    tenant: { id: tenantId, name: 'School Two' },
  }));
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools, switchSchool: mockSwitchSchool },
  } as unknown as Repositories;

  const Probe3 = () => {
    const { status, session, signIn, switchSchool } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`tenant:${session?.tenant.id ?? 'none'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => switchSchool('t2')}>
          <Text>pick-t2</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe3 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:selecting-school')).toBeTruthy());
  fireEvent.press(screen.getByText('pick-t2'));
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());
  expect(mockSwitchSchool).toHaveBeenCalledWith('t2');
  expect(screen.getByText('tenant:t2')).toBeTruthy();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx -t "selecting-school|switchSchool"`
Expected: FAIL — `pendingSchools`/`switchSchool` are `undefined` on the value `useAuth()` returns, and `status` never becomes `'selecting-school'`.

- [ ] **Step 3: Implement the provider changes**

In `src/features/auth/AuthProvider.tsx`:

Change the `Status` type and `AuthValue` interface:

```ts
type Status = 'loading' | 'authenticated' | 'unauthenticated' | 'selecting-school';
interface AuthValue {
  status: Status;
  session: Session | null;
  pendingSchools: SchoolChoice[] | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestOtp: (identifier: string) => Promise<OtpChallenge>;
  signInWithOtp: (identifier: string, code: string) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<void>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  switchSchool: (tenantId: string) => Promise<void>;
}
```

Add the import (top of file, alongside the other `@/data/domain` import):

```ts
import type { Session } from '@/data/domain';
import type { SchoolChoice } from '@/data/repositories/types';
```

Add new state (alongside the existing `status`/`session` state):

```ts
const [pendingSchools, setPendingSchools] = useState<SchoolChoice[] | null>(null);
```

Replace the `signIn` callback with:

```ts
const signIn = useCallback(
  async (identifier: string, password: string) => {
    const s = await repos.auth.login(identifier, password);
    let schools: SchoolChoice[] = [];
    try {
      schools = await repos.auth.listMySchools();
    } catch {
      // A secondary-endpoint failure must not block sign-in — fall back to
      // today's single-school behavior below.
    }
    if (schools.length > 1) {
      setPendingSchools(schools);
      setStatus('selecting-school');
      return;
    }
    await establishSession(s);
  },
  [repos, establishSession]
);
```

Apply the identical treatment to `signInWithOtp`:

```ts
const signInWithOtp = useCallback(
  async (identifier: string, code: string) => {
    const s = await repos.auth.verifyOtp(identifier, code);
    let schools: SchoolChoice[] = [];
    try {
      schools = await repos.auth.listMySchools();
    } catch {
      // See signIn's identical comment.
    }
    if (schools.length > 1) {
      setPendingSchools(schools);
      setStatus('selecting-school');
      return;
    }
    await establishSession(s);
  },
  [repos, establishSession]
);
```

Add the new `switchSchool` callback (near `signIn`/`signInWithOtp`):

```ts
const switchSchool = useCallback(
  async (tenantId: string) => {
    const s = await repos.auth.switchSchool(tenantId);
    await establishSession(s);
    setPendingSchools(null);
  },
  [repos, establishSession]
);
```

Add `pendingSchools` and `switchSchool` to the `value` object and its dependency array:

```ts
const value = useMemo(
  () => ({
    status,
    session,
    pendingSchools,
    signIn,
    signOut,
    requestOtp,
    signInWithOtp,
    forgotPassword,
    resetPassword,
    changePassword,
    switchSchool,
  }),
  [
    status,
    session,
    pendingSchools,
    signIn,
    signOut,
    requestOtp,
    signInWithOtp,
    forgotPassword,
    resetPassword,
    changePassword,
    switchSchool,
  ]
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx`
Expected: PASS, all tests in the file (including the pre-existing `forgotPassword` one) green.

- [ ] **Step 5: Expose a `useSwitchSchool` mutation hook**

In `src/features/auth/hooks.ts`, add (matching the existing `useLogout`/`useChangePassword` style):

```ts
export function useSwitchSchool() {
  const { switchSchool } = useAuth();
  return useMutation({ mutationFn: (tenantId: string) => switchSchool(tenantId) });
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/features/auth/AuthProvider.tsx src/features/auth/hooks.ts src/features/auth/__tests__/AuthProvider.test.tsx
git commit -m "feat(auth): add selecting-school status and switchSchool to AuthProvider"
```

---

### Task 4: `SchoolPickerScreen` + navigation wiring for the post-login gate

**Files:**

- Create: `src/screens/SchoolPickerScreen.tsx`
- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/RootNavigator.tsx`

**Interfaces:**

- Consumes: `useAuth()` → `pendingSchools`, `switchSchool` (Task 3); `authErrorMessage` (existing, `src/features/auth/authErrors.ts`); `Colors`/`Radii`/`Shadows`/`FontFamily` theme tokens (existing, `src/theme`).
- Produces: `SchoolPickerScreen` component, `RootStackParamList.SchoolPicker: undefined` — Task 5's Profile "Switch School" flow navigates to the same screen/route.

- [ ] **Step 1: Add the `SchoolPicker` route to `RootStackParamList`**

In `src/navigation/types.ts`, change:

```ts
export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: { mode?: 'reset' | 'create' } | undefined;
  SetPassword: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
```

to:

```ts
export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: { mode?: 'reset' | 'create' } | undefined;
  SetPassword: undefined;
  SchoolPicker: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
```

- [ ] **Step 2: Write `SchoolPickerScreen`**

Create `src/screens/SchoolPickerScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/authErrors';

export const SchoolPickerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { pendingSchools, switchSchool } = useAuth();
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (tenantId: string) => {
    setError(null);
    setPickingId(tenantId);
    try {
      await switchSchool(tenantId);
    } catch (err) {
      setError(authErrorMessage(err));
      setPickingId(null);
    }
  };

  const schools = pendingSchools ?? [];

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <View
        style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Choose a school</Text>
          <Text style={styles.subtitle}>Your account is linked to more than one school</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
          {schools.map((school, i) => {
            const isPicking = pickingId === school.id;
            const disabled = pickingId !== null;
            return (
              <TouchableOpacity
                key={school.id}
                style={[styles.row, i < schools.length - 1 && styles.rowBorder]}
                onPress={() => handlePick(school.id)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <View style={styles.rowIconWrap}>
                  <Ionicons name="school-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.rowLabel}>{school.name}</Text>
                {isPicking ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Shadows.pop,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.white,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.pop,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.coral,
    marginTop: 16,
    textAlign: 'center',
  },
});
```

- [ ] **Step 3: Wire the `selecting-school` gate into `RootNavigator`**

In `src/navigation/RootNavigator.tsx`, add the import:

```ts
import { SchoolPickerScreen } from '../screens/SchoolPickerScreen';
```

Change the render logic from:

```tsx
return (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {status !== 'authenticated' ? (
      <>
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

to:

```tsx
return (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {status === 'selecting-school' ? (
      <Stack.Screen name="SchoolPicker" component={SchoolPickerScreen} />
    ) : status !== 'authenticated' ? (
      <>
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

(Placed before the `status !== 'authenticated'` check since `'selecting-school'` is itself `!== 'authenticated'` and would otherwise fall into the Login branch.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/screens/SchoolPickerScreen.tsx src/navigation/types.ts src/navigation/RootNavigator.tsx
git commit -m "feat(auth): add SchoolPickerScreen and wire the selecting-school navigation gate"
```

---

### Task 5: "Switch School" entry in Profile

**Files:**

- Modify: `src/navigation/types.ts`
- Modify: `src/navigation/MainTabNavigator.tsx`
- Modify: `src/navigation/PrincipalTabNavigator.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/screens/SchoolPickerScreen.tsx`
- Create: `src/features/auth/useMySchools.ts`

**Interfaces:**

- Consumes: `repos.auth.listMySchools()` (Task 2); `useAuth()` → `status`, `switchSchool` (Task 3); `SchoolPickerScreen` (Task 4, reused via a dedicated modal route so it's reachable from the `ProfileStack` without duplicating UI).
- Produces: `useMySchools()` hook (`{ data: SchoolChoice[] | undefined, ... }` from `useQuery`) reusable by any future screen that needs the school list.

- [ ] **Step 1: Add the `useMySchools` query hook**

Create `src/features/auth/useMySchools.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useAuth, useTenantId } from './AuthProvider';
import { queryKeys } from '@/lib/queryClient';

/** All schools the signed-in identity has a Users row in. Empty/single-item for
 * the common single-school case — callers should treat length <= 1 as "no picker
 * needed" rather than rendering a list of one. */
export function useMySchools() {
  const repos = useRepositories();
  const { status } = useAuth();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.mySchools(tenantId),
    queryFn: () => repos.auth.listMySchools(),
    enabled: status === 'authenticated',
  });
}
```

- [ ] **Step 2: Add the `mySchools` query key**

In `src/lib/queryClient.ts`, add to the `queryKeys` object (alongside the other tenant-scoped keys):

```ts
  mySchools: (tenantId: string) => ['mySchools', tenantId] as const,
```

- [ ] **Step 3: Add a `SchoolSwitcher` modal route reachable from `ProfileStack`**

In `src/navigation/types.ts`, change:

```ts
export type ProfileStackParamList = {
  ProfileScreen: undefined;
  MyAttendanceScreen: undefined;
  SettingsScreen: undefined;
  ChangePasswordScreen: undefined;
  PayslipScreen: undefined;
  LeaveScreen: undefined;
};
```

to:

```ts
export type ProfileStackParamList = {
  ProfileScreen: undefined;
  MyAttendanceScreen: undefined;
  SettingsScreen: undefined;
  ChangePasswordScreen: undefined;
  PayslipScreen: undefined;
  LeaveScreen: undefined;
  SwitchSchool: undefined;
};
```

There are two separate `ProfileStack` definitions — one per role — and both need
the new screen, since either role could have multiple school memberships:

In `src/navigation/MainTabNavigator.tsx` (teacher tabs), add the import alongside
the other screen imports (after `import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';`):

```ts
import { SchoolPickerScreen } from '../screens/SchoolPickerScreen';
```

Then in the `ProfileStackNavigator` component (around line 88-97), add the new
screen registration:

```tsx
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
    <ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
    <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />
    <ProfileStack.Screen name="PayslipScreen" component={PayslipScreen} />
    <ProfileStack.Screen name="LeaveScreen" component={LeaveScreen} />
    <ProfileStack.Screen name="SwitchSchool" component={SchoolPickerScreen} />
  </ProfileStack.Navigator>
);
```

Apply the identical change to `src/navigation/PrincipalTabNavigator.tsx` (principal
tabs): add the same `SchoolPickerScreen` import, and in its `ProfileStackNavigator`
(around line 76-83) add the same `<ProfileStack.Screen name="SwitchSchool" component={SchoolPickerScreen} />`
line before the closing `</ProfileStack.Navigator>`:

```tsx
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
    <ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
    <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />
    <ProfileStack.Screen name="SwitchSchool" component={SchoolPickerScreen} />
  </ProfileStack.Navigator>
);
```

`SchoolPickerScreen` already reads `pendingSchools`/`switchSchool` from `useAuth()` (Task 4) — when reached from Profile rather than the login gate, `pendingSchools` will be `null` (it's only set by `signIn`/`signInWithOtp`), so update `SchoolPickerScreen` to fall back to `useMySchools()`'s data when `pendingSchools` is `null`:

In `src/screens/SchoolPickerScreen.tsx`, change:

```ts
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/authErrors';
```

to:

```ts
import { useAuth } from '@/features/auth/AuthProvider';
import { useMySchools } from '@/features/auth/useMySchools';
import { authErrorMessage } from '@/features/auth/authErrors';
```

and change:

```ts
const { pendingSchools, switchSchool } = useAuth();
```

to:

```ts
const { pendingSchools, switchSchool } = useAuth();
const { data: fetchedSchools } = useMySchools();
```

and change:

```ts
const schools = pendingSchools ?? [];
```

to:

```ts
const schools = pendingSchools ?? fetchedSchools ?? [];
```

- [ ] **Step 4: Add the "Switch School" menu row in `ProfileScreen`**

In `src/screens/ProfileScreen.tsx`, add the import:

```ts
import { useMySchools } from '@/features/auth/useMySchools';
```

Inside the `ProfileScreen` component, after the existing `const { data: stats } = useDashboardStats();` line, add:

```tsx
const { data: mySchools } = useMySchools();
const menuItems =
  (mySchools?.length ?? 0) > 1
    ? [
        ...MENU_ITEMS,
        {
          icon: 'business-outline',
          label: 'Switch School',
          screen: 'SwitchSchool',
          color: Colors.primary,
        },
      ]
    : MENU_ITEMS;
```

Change the menu render block from `MENU_ITEMS.map((item, i) => (` / `i < MENU_ITEMS.length - 1` to `menuItems.map((item, i) => (` / `i < menuItems.length - 1`:

```tsx
        <Card padding={0} style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={() => handleMenuPress(item.screen)}
              activeOpacity={0.7}
            >
```

(`handleMenuPress` already does `navigation.navigate(screen as keyof ProfileStackParamList)` — no change needed there; `'SwitchSchool'` is now a valid member of that type from Step 3.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx jest`
Expected: PASS, all suites green (no existing test touches `ProfileScreen`/navigators directly, so this is a regression check, not new coverage for this step).

- [ ] **Step 7: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/navigation/types.ts src/navigation/MainTabNavigator.tsx src/navigation/PrincipalTabNavigator.tsx src/screens/ProfileScreen.tsx src/screens/SchoolPickerScreen.tsx src/features/auth/useMySchools.ts src/lib/queryClient.ts
git commit -m "feat(profile): add Switch School entry, reusing SchoolPickerScreen"
```

---

### Task 6: Manual verification against the real backend

**Files:** none (verification only).

- [ ] **Step 1: Start the local backend and teacher app**

```bash
cd D:/SMS/sms-project/sms-backend && dotnet run --project src/Sms.Api --launch-profile http
```

In a second terminal:

```bash
cd D:/SMS/sms-project/sms-teacher-app && npx expo start --web --port 8081 --clear
```

- [ ] **Step 2: Log in as the known multi-school test account**

Open `http://localhost:8081`, sign in with `rina@yopmail.com` (all 3 of her school rows already have the same password set from this session's earlier DB fix, and the CORS allow-list already includes `localhost:8081`).

Expected: after signing in, `SchoolPickerScreen` appears listing 3 schools (`sss`, `scc`, `kipm`) instead of dropping straight into the app.

- [ ] **Step 3: Pick the school with real data**

Tap `scc` in the picker.

Expected: the app proceeds into the principal tabs (she's `school.principal` on all 3 rows) and the dashboard now shows real numbers (45 classes, 2 students, 2 teachers) instead of the all-zero `sss` tenant seen before this feature.

- [ ] **Step 4: Verify the Profile switcher**

Navigate to Profile. Expected: a "Switch School" row appears (since she has 3 schools). Tap it, pick `kipm`, confirm the app now reflects `kipm`'s data (2 classes, 1 student, 0 teachers) without needing to log out.

- [ ] **Step 5: Verify the single-school path is unaffected**

Log in as any teacher/principal account that has only one `Users` row (any other seeded test account). Expected: no picker appears — straight into the app, matching pre-existing behavior. If no such account is readily available, this can be confirmed by code inspection (Task 3's `schools.length > 1` check) rather than blocking on finding one.
