# Multi-school picker — design spec

## Context

Some users (e.g. a principal invited to multiple schools under the same email/phone)
have more than one `Users` row sharing the same identifier, one per tenant. Today,
`POST /v1/auth/login` deterministically-but-arbitrarily picks one of those rows
(ordered by `IsPlatform`, then `CreatedAt`), and the teacher app has no way to show
or change that choice. A user with real data in one school and an empty stub in
another has no way to reach the populated one.

The backend already solves the hard part for `sms-admin`: `GET /v1/me/schools`
(list every school the signed-in identity has a row in) and
`POST /v1/me/switch-school` (reissue tokens scoped to a specific one of those rows)
are both role-agnostic — no backend changes are needed for this spec. This is
purely a `sms-teacher-app` frontend feature: consume those two endpoints to (a) let
the user pick a school right after login when they have more than one, and (b)
let them switch later from Profile without logging out.

## Non-goals

- No backend changes.
- No change to which school a _single-school_ user lands on — this only activates
  when `/me/schools` returns 2+ schools.
- No persistence of "last selected school" across app restarts — every fresh login
  re-runs the picker if still multi-school. (A "remember my choice" enhancement is
  a natural follow-up, not in scope here.)
- No changes to sms-admin (already has this).

## Data layer

`src/data/repositories/types.ts` — add to `AuthRepository`:

```ts
export interface SchoolChoice {
  id: string;
  name: string;
}

export interface AuthRepository {
  // ...existing members unchanged...
  listMySchools(): Promise<SchoolChoice[]>;
  switchSchool(tenantId: string): Promise<Session>;
}
```

`src/data/http/auth.schema.ts` — add:

```ts
export const schoolChoiceSchema = z.object({
  id: z.string(),
  name: z.string(),
});
```

(`GET /me/schools` returns full `ClientResponse` rows with many more fields — zod
strips unknown keys by default, so parsing with this narrow schema is sufficient.)

`src/data/http/auth.repo.ts` — add, reusing the existing internal
`sessionFromTokens` helper:

```ts
listMySchools: async () => {
  const rows = await http.get<unknown[]>('/me/schools');
  return rows.map((x) => schoolChoiceSchema.parse(x));
},
switchSchool: async (tenantId) => {
  const t = tokenSchema.parse(
    await http.post('/me/switch-school', { tenant_id: tenantId })
  );
  return sessionFromTokens({ accessToken: t.access_token, refreshToken: t.refresh_token });
},
```

(`http.get` already unwraps the `{ data: [...] }` envelope and returns the bare
array — confirmed against `classes.repo.ts`'s `list()`, which follows the same
pattern.)

## Auth flow (`src/features/auth/AuthProvider.tsx`)

- `Status` gains a new value: `'selecting-school'`.
- New state: `pendingSchools: SchoolChoice[] | null`.
- New exposed method: `switchSchool(tenantId: string): Promise<void>` — calls
  `repos.auth.switchSchool(tenantId)`, then `establishSession(s)` (existing
  helper), then clears `pendingSchools` and sets `status = 'authenticated'`.
  This single method serves both the post-login picker and the later
  Profile-triggered switch — no separate code path for the two triggers.
- `signIn` (and `signInWithOtp`, same treatment) changes to:
  1. `const s = await repos.auth.login(identifier, password);` (unchanged call)
  2. `const schools = await repos.auth.listMySchools();`
  3. If `schools.length > 1`: `setPendingSchools(schools); setStatus('selecting-school');`
     return without calling `establishSession` — the tokens/session from step 1
     are discarded; whichever school she picks gets a fresh `switchSchool` call.
  4. Else: `await establishSession(s);` (today's behavior, unchanged).
- `AuthValue` interface gains `pendingSchools: SchoolChoice[] | null` and
  `switchSchool: (tenantId: string) => Promise<void>`.

## Navigation (`src/navigation/RootNavigator.tsx`)

New branch, following the existing `mustSetPassword` gate pattern:

```tsx
status === 'selecting-school'
  ? <Stack.Screen name="SchoolPicker" component={SchoolPickerScreen} />
  : ...
```

Add `SchoolPicker: undefined` to the root stack's param list.

## UI

**`src/screens/SchoolPickerScreen.tsx`** (new) — full-screen, no back button (she
must pick one to proceed when reached via the login gate). Reads
`pendingSchools` and `switchSchool` from `useAuth()`. Renders a simple list
(school name, tap row to select), a loading spinner on the row being switched
to, and surfaces errors from `switchSchool` inline (same error-display
convention as `LoginScreen`).

**Profile entry point** (`src/screens/ProfileScreen.tsx`): add a "Switch School"
row, visible only when a `useMySchools()` query (new hook wrapping
`repos.auth.listMySchools()`, `enabled: status === 'authenticated'`) returns 2+
schools. Tapping it navigates to the _same_ `SchoolPickerScreen` (add it to
`ProfileStackParamList` too, or promote it to a modal reachable from both
stacks — implementer's call, whichever fits the existing navigation
structure with least friction). On selection it calls the same
`switchSchool()` from `useAuth()`; `RootNavigator` re-rendering on the new
`session.user.role` handles moving between principal/teacher tab sets
automatically — no explicit navigation reset needed.

## Error handling

- `listMySchools()` failing after a successful `login()`: don't block sign-in
  entirely for a secondary-endpoint failure — catch it, log it, and fall back to
  today's behavior (`establishSession(s)` with whatever `login()` returned).
- `switchSchool()` failing (e.g. network drop mid-pick): keep the user on
  `SchoolPickerScreen` with an inline error and let them retry; do not clear
  `pendingSchools`.

## Testing

- `auth.schema.ts`: parse test for `schoolChoiceSchema` against a full
  `ClientResponse`-shaped payload (extra fields present) confirming it strips
  cleanly.
- `auth.repo.ts`: test `listMySchools` and `switchSchool` against a mocked
  `http` client (existing `auth.repo.test.ts` pattern).
- `AuthProvider`: test that `signIn` with a mocked `listMySchools` returning 2
  schools lands in `status === 'selecting-school'` with `pendingSchools` set,
  and that `switchSchool` transitions to `'authenticated'` with the new
  session's tenant/role.
- Manual: verify against the real local backend with `rina@yopmail.com` (now has
  all 3 rows password-set from this session's DB fix) — should see the picker
  with 3 schools, and picking `scc` should show its real classes/students data.
