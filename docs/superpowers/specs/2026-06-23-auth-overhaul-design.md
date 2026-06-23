# Auth Overhaul — Production Login for Teacher & Principal — Design

**Date:** 2026-06-23
**Branch:** `field-alignment-canonical`
**Screens:** `src/screens/LoginScreen.tsx` (rebuilt) + new `ForgotPasswordScreen`, `ChangePasswordScreen`, `SetPasswordScreen`
**Status:** Approved design, ready for implementation plan
**Supersedes:** `docs/superpowers/specs/2026-06-15-otp-login-design.md` (written against the now-deleted mock layer)

## Goal

Make the teacher app's authentication production-grade and fully wired to the live
`sms-backend`, mirroring the canonical client in `sms-admin/src/api/auth.ts`. Today
`LoginScreen` is **OTP-only with a hardcoded demo code `123456`** and demo role-chips;
there is no password-login UI and no forgot/reset-password flow, even though the
`AuthProvider`/repository already carry a `signIn(email, password)` path and the backend
exposes every endpoint we need.

This delivers, against endpoints that **already exist** on the backend:

- **Password login** (primary) accepting **email or mobile number**.
- **OTP login** (alternate) with **real** SMS/email delivery — no demo code.
- **Forgot password** → OTP code → **reset password** (signed-out).
- **Change password** (signed-in, from Profile).
- **First-login forced set-password**, gated on a backend flag and inert until it ships.

## Scope guardrail — teacher & principal ONLY

This app's role model is **`'teacher' | 'principal'`** (`src/data/domain`, `pickRole` in
`src/data/http/auth.schema.ts`). This work does **not** add a `parent` role, parent
endpoints, parent UI, or any parent login. The only identities that can sign in remain
**teacher** and **principal**, matching the backend authz policies (`school.teacher`,
`school.principal`). The role model is not modified by this work.

## Backend surface (source of truth — already implemented)

From `sms-backend/src/Sms.Api/Endpoints/AuthEndpoints.cs` (group `/v1/auth`,
`RequireRateLimiting("auth")`):

| Endpoint                     | Request                          | Success                                           | Notes                                                                                      |
| ---------------------------- | -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `POST /auth/login`           | `{ email\|phone, password }`     | `{ data: { access_token, refresh_token } }`       | identifier with `@` → email field, else phone; `401 invalid_credentials`, `422` if missing |
| `POST /auth/refresh`         | `{ refresh_token }`              | tokens                                            | rotation; `401 invalid_token`                                                              |
| `POST /auth/otp/request`     | `{ identifier }`                 | `{ data: { sent: true } }`                        | real `IOtpSender`; `404 not_registered` for unknown identifier (intentional enumeration)   |
| `POST /auth/otp/verify`      | `{ identifier, code }`           | tokens                                            | `401 invalid_code` (invalid/expired); 10-min expiry                                        |
| `POST /auth/password/forgot` | `{ identifier }`                 | `{ data: { sent: true } }`                        | same OTP machinery as otp/request; `404 not_registered`                                    |
| `POST /auth/password/reset`  | `{ identifier, code, password }` | `204`                                             | `401 invalid_code`, `422 weak_password` (<8 chars)                                         |
| `POST /auth/set-password`    | `{ password }`                   | `204`                                             | **requires auth**; sets password for the bearer's user                                     |
| `GET /auth/me`               | —                                | `{ data: { id, tenant_id, roles, is_platform } }` | identity from JWT claims                                                                   |
| `POST /auth/logout`          | `{ refresh_token }`              | `204`                                             | revokes refresh token                                                                      |

Envelope handling (`unwrap data`, error `{ error: { code, message } }`) is already done by
`src/lib/httpClient.ts`; repos `zod.parse` any response with a body.

## Architecture

No new architecture or abstractions. Extend the three existing auth layers:
`AuthRepository` (types + http impl) → `AuthProvider` (context) → hooks → screens.

### 1. Data layer — `AuthRepository` to parity with admin

`src/data/repositories/types.ts`:

```ts
export interface AuthRepository {
  login(identifier: string, password: string): Promise<Session>; // renamed param: email → identifier
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
  me(): Promise<User>;
  logout(refreshToken: string): Promise<void>;
  requestOtp(identifier: string): Promise<OtpChallenge>;
  verifyOtp(identifier: string, code: string): Promise<Session>;
  // NEW (all backend-backed):
  forgotPassword(identifier: string): Promise<void>;
  resetPassword(identifier: string, code: string, password: string): Promise<void>;
  setPassword(password: string): Promise<void>; // authenticated change-password
}
```

`src/data/http/auth.repo.ts`:

- **`login` routes email-vs-phone like admin** — fixes the current always-`email` bug:
  ```ts
  login: async (identifier, password) => {
    const body = identifier.includes('@') ? { email: identifier, password }
                                          : { phone: identifier, password };
    const t = tokenSchema.parse(await http.post('/auth/login', body));
    return sessionFromTokens({ accessToken: t.access_token, refreshToken: t.refresh_token });
  },
  ```
- `forgotPassword(identifier)` → `http.post('/auth/password/forgot', { identifier })` (no body to map).
- `resetPassword(identifier, code, password)` → `http.post('/auth/password/reset', { identifier, code, password })` (204, no body). Does **not** establish a session.
- `setPassword(password)` → `http.post('/auth/set-password', { password })` (204; bearer identifies the user).

`OtpChallenge` is unchanged (`{ channel, destination }`); the `devCode` concept is gone.

### 2. Auth wiring — `AuthProvider` + hooks

`src/features/auth/AuthProvider.tsx` — extend `AuthValue`:

- `signIn(identifier, password)` (param rename; still calls `login` then `establishSession`).
- `forgotPassword(identifier)` → `repos.auth.forgotPassword` (no session change).
- `resetPassword(identifier, code, password)` → `repos.auth.resetPassword` (**no** `establishSession`; user returns to Login to sign in with the new password).
- `changePassword(password)` → `repos.auth.setPassword` (authenticated; no session change).

`src/features/auth/hooks.ts` — add mutation hooks mirroring the existing ones:
`useForgotPassword`, `useResetPassword`, `useChangePassword`. `useLogin`'s arg becomes
`{ identifier, password }`.

### 3. Screens & flows

**`LoginScreen` (rebuilt) — password primary, OTP alternate.**

- Remove demo role-chips and the `123456` hint entirely.
- **Password view (default):** one identifier field (email **or** mobile, `autoCapitalize="none"`),
  a password field (secure entry, show/hide toggle), **Sign In** button, a **"Forgot password?"**
  link, and a **"Sign in with a one-time code instead"** link.
- **OTP view (alternate):** the existing request → verify state machine, with **no dev-code hint**
  ("Code sent to ••••0118" only), plus a **"Use password instead"** link back. Resend/Change
  links retained.
- All existing visual styling (gradient, card, input styles) is reused.

**`ForgotPasswordScreen` (new, unauthenticated stack) — 2 steps:**

1. Enter email/phone → `useForgotPassword` → on success show "We sent a code to {masked}".
   `404 not_registered` → inline "This mobile or email isn't registered."
2. Enter 6-digit code + new password + confirm password (min 8, must match) →
   `useResetPassword` → success toast/confirmation → navigate back to **Login** (no auto-session).
   `401 invalid_code` → "Code is invalid or expired." `422 weak_password` → "Password must be at least 8 characters."

**`ChangePasswordScreen` (new) — reached from `ProfileScreen`** (teacher and principal profiles
both link to it). Fields: new password + confirm (min 8, must match) → `useChangePassword`
(`/auth/set-password` needs only the new password). On success: confirmation; offer sign-out.

**First-login forced set-password (`SetPasswordScreen`, new) — backend-flag gated:**

- `meSchema` gains optional `must_set_password: z.boolean().optional()`; `User`/mapper carry
  `mustSetPassword: boolean` (default `false`).
- `RootNavigator`: when `status === 'authenticated' && session.user.mustSetPassword`, render
  **only** `SetPasswordScreen` (reusing `useChangePassword`) until it succeeds, then proceed to
  the normal tab navigator.
- **Inert until the backend ships the flag:** absent field → `false` → normal app. No blocker on
  this work. Listed as a backend dependency below.

### 4. Navigation

`src/navigation/RootNavigator.tsx` + `src/navigation/types.ts`:

- Unauthenticated stack adds `ForgotPassword`.
- Authenticated branch: gate on `mustSetPassword` → `SetPassword` screen before tabs.
- `ChangePassword` reachable from Profile (added to the relevant tab/stack param lists).

## Error handling

`httpClient` already parses the error envelope into an `AppError` with `code`. Map by code,
rendered inline in the existing error-text style:

| Backend code          | Where              | User message                                                         |
| --------------------- | ------------------ | -------------------------------------------------------------------- |
| `invalid_credentials` | login              | "Incorrect email/phone or password."                                 |
| `not_registered`      | otp/forgot request | "This mobile or email isn't registered."                             |
| `invalid_code`        | otp verify / reset | "Code is invalid or expired."                                        |
| `weak_password`       | reset / set        | "Password must be at least 8 characters."                            |
| (HTTP 429 rate limit) | any auth call      | "Too many attempts. Please wait a moment and try again."             |
| network/offline       | any                | existing offline handling (`OfflineBanner`) + generic inline message |

Client-side validation before submit: non-empty identifier; password ≥ 8 on set/reset;
confirm-password must match.

## Testing

Within the existing jest suite (currently 68 tests, must stay green; `tsc` clean):

- **`auth.schema` mappers:** `must_set_password` maps to `mustSetPassword` (present → value,
  absent → `false`); existing `pickRole`/`maskIdentifier` tests unchanged.
- **`auth.repo`:** `login` sends `{ phone }` for a non-`@` identifier and `{ email }` for an `@`
  identifier; `forgotPassword`/`resetPassword`/`setPassword` POST to the correct paths with the
  correct bodies; `resetPassword` resolves without establishing a session.
- **`AuthProvider`:** `resetPassword` does not change `status`/`session`; `changePassword` does
  not change session; `signIn` still establishes a session.
- **Screen tests** (if the screen-test pattern exists in the repo): password view ↔ OTP view
  toggle; forgot-password 2-step happy path and error messages.

## Definition of done (production / docs fold-in)

1. **No demo/mock auth artifacts remain:** no `123456`, no seeded demo emails or role-chips,
   no dev-code hints anywhere in the auth UI.
2. **Live end-to-end loop verified** against `sms-backend`:
   password login with **email** and with **phone** → authenticated → forced 401 → silent
   refresh+retry → logout; OTP login; forgot → reset → login; change password from Profile.
3. **Docs:** this spec supersedes `2026-06-15-otp-login-design.md` (mark it superseded or delete);
   update the `teacher-app-live-api` memory note to reflect the production auth surface.
4. All tests green, `tsc` clean.

## Dependencies / blockers

- **First-login forced set-password** needs the backend to expose a `must_set_password` (or
  equivalent `has_password=false`) signal on `GET /auth/me`. Until then the flow ships **inert**
  (flag undefined → never triggers). No other flow is blocked.
- Real OTP/forgot delivery depends on a configured `IOtpSender` (SMS/email gateway) in the
  deployed backend. The app behaves correctly regardless (it shows "code sent"); delivery is a
  backend/ops concern, not an app blocker.

## Out of scope

- New-account registration / self-signup (sign-in for existing accounts only).
- Biometric login.
- OTP expiry countdown timer in the UI (resend allowed immediately; backend enforces 10-min expiry).
- Any backend changes (the `must_set_password` flag is a backend dependency, not part of this app work).
- Any parent role or parent-facing functionality (explicitly excluded — see scope guardrail).
