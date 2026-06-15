# OTP Login (Mobile / Email) — Design

**Date:** 2026-06-15
**Screen:** `src/screens/LoginScreen.tsx`
**Status:** Approved design, ready for implementation plan

## Goal

Add a second sign-in path on the existing login screen: a one-time-password (OTP)
flow that accepts **either a mobile number or an email**. The flow first checks the
identifier against the known account data. If it is **already registered**, an OTP is
"sent"; if it is **not registered**, no OTP is sent and an inline error is shown.

This sits **inline, below the existing email/password Sign In button** — the
password flow is unchanged.

## Account data the OTP checks against

The two existing mock accounts (from `src/data/mock/seed.ts`):

| Role      | Email                    | Phone               |
| --------- | ------------------------ | ------------------- |
| Teacher   | `aanya.k@westbrook.edu`  | `+1 (415) 555-0118` |
| Principal | `sunita.r@westbrook.edu` | `+1 (415) 555-0100` |

## Behavior decisions (locked)

- **Identifier:** one field accepting mobile **or** email; channel auto-detected
  (contains `@` → email, else phone).
- **Lookup required before send:** unknown identifier → no OTP, inline error
  **"This mobile or email isn't registered."**
- **Demo OTP code:** fixed **`123456`**. Shown on screen as a "Demo code: 123456" hint
  after a successful send (no real SMS/email gateway exists).
- **Verification strictness:** wrong code → inline **"Invalid code. Try again."**
  Only `123456` is accepted.

## UI — inline on `LoginScreen`

Placement: after the **Sign In** button, an `── or ──` divider, then the OTP block.
Demo-account chips and the Biometrics button remain below, unchanged.

The OTP block is a small state machine (local `useState`), two states:

### State 1 — request

- One input row (reuses existing `inputWrap` / `textInput` styles), phone-portrait
  icon, placeholder **"Mobile number or email"**, `autoCapitalize="none"`.
- A **Send OTP** button (secondary style, like the existing outlined buttons).
- On press → `requestOtp(identifier)` mutation.
  - Error (not registered / empty) → message under the input.
  - Success → transition to State 2.

### State 2 — verify

- A line: **"Code sent to ••••0118"** (masked destination from the response) plus the
  **"Demo code: 123456"** hint.
- A 6-digit OTP input (`keyboardType="number-pad"`, `maxLength={6}`).
- A **Verify & Sign In** button → `verifyOtp(identifier, code)` mutation.
  - Error → "Invalid code. Try again." under the input.
  - Success → session established, app navigates as it does for password login.
- **Resend** (re-runs request) and **Change** (back to State 1, clears code) links.

Loading states mirror the existing Sign In button (`isPending` → "Sending…" /
"Verifying…", button disabled).

## Data layer

Extend `AuthRepository` (`src/data/repositories/types.ts`):

```ts
export interface OtpChallenge {
  channel: 'sms' | 'email';
  destination: string; // masked, e.g. "••••0118" or "a••@westbrook.edu"
  devCode?: string; // demo-only; the code to display. Absent in real backend.
}

export interface AuthRepository {
  login(email: string, password: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  me(): Promise<User>;
  logout(): Promise<void>;
  requestOtp(identifier: string): Promise<OtpChallenge>;
  verifyOtp(identifier: string, code: string): Promise<Session>;
}
```

### Mock (`src/data/mock/auth.repo.ts`)

- Build a lookup over both accounts (`seed.session`, `principalSession`) keyed by
  normalized email and normalized phone.
  - Email normalize: `trim().toLowerCase()`.
  - Phone normalize: strip everything except digits (so `+1 (415) 555-0118` →
    `14155550118`); match on the normalized form.
- `requestOtp(identifier)`:
  - empty → `AppError('invalid', 400, 'Enter a mobile number or email')`.
  - not found → `AppError('not_found', 404, "This mobile or email isn't registered.")`.
  - found → return `OtpChallenge` with masked `destination`, `channel`, `devCode: '123456'`.
    Record the target account's email in a module-scoped pending map keyed by
    normalized identifier so `verifyOtp` resolves the right account.
- `verifyOtp(identifier, code)`:
  - `code !== '123456'` → `AppError('invalid', 401, 'Invalid code. Try again.')`.
  - else → `store.setCurrentAccount(targetEmail)`; return `store.session`.
- Reuses `simulateLatency()` like the other methods.

### HTTP (`src/data/http/auth.repo.ts`)

For real-backend readiness (kept in parity with mock; not exercised by the demo):

```ts
requestOtp: (identifier) =>
  http.post<OtpChallengeDTO>('/auth/otp/request', { identifier }).then(toOtpChallenge),
verifyOtp: (identifier, code) =>
  http.post<SessionDTO>('/auth/otp/verify', { identifier, code }).then(toSession),
```

Add `OtpChallengeDTO` + `toOtpChallenge` mapper in `src/data/http/mappers.ts`
(snake_case → camelCase, consistent with existing mappers).

## Auth wiring

`AuthProvider` (`src/features/auth/AuthProvider.tsx`):

- Extract the post-login session-establishment steps (token save, session persist,
  `authSnapshot.set`, state updates) from `signIn` into a private
  `establishSession(s: Session)` helper.
- `signIn` calls `repos.auth.login(...)` then `establishSession`.
- Add `requestOtp(identifier)` → `repos.auth.requestOtp(identifier)` (no session change).
- Add `signInWithOtp(identifier, code)` → `repos.auth.verifyOtp(...)` then
  `establishSession`.
- Extend `AuthValue` with `requestOtp` and `signInWithOtp`.

Hooks (`src/features/auth/hooks.ts`):

```ts
export function useRequestOtp() {
  const { requestOtp } = useAuth();
  return useMutation({ mutationFn: (identifier: string) => requestOtp(identifier) });
}
export function useVerifyOtp() {
  const { signInWithOtp } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, code }: { identifier: string; code: string }) =>
      signInWithOtp(identifier, code),
  });
}
```

## Error handling summary

| Case                      | Where   | Message                                  |
| ------------------------- | ------- | ---------------------------------------- |
| Empty identifier          | request | "Enter a mobile number or email"         |
| Identifier not registered | request | "This mobile or email isn't registered." |
| Wrong / non-`123456` code | verify  | "Invalid code. Try again."               |

Errors render inline under the relevant input (read from the mutation's `error`),
styled to match the screen.

## Testing

- Mock unit tests (`src/data/mock/__tests__/` pattern, if present): `requestOtp`
  resolves for a known email and a known phone (with formatting), rejects unknown and
  empty; `verifyOtp` accepts `123456` and returns the matching account session, rejects
  other codes.
- Mapper test parity for `toOtpChallenge` alongside existing canonical mapper tests.

## Out of scope

- Real SMS/email delivery and rate limiting.
- OTP expiry/countdown timer (resend is allowed immediately).
- New account registration (flow is sign-in for existing accounts only).
