# First-time "Create a password" entry point — design

**Date:** 2026-07-24
**Branch:** field-alignment-canonical
**Status:** approved by user, pending write-up of implementation plan

## Context

The auth overhaul ([[auth-overhaul]] memory; `docs/superpowers/specs/2026-06-23-auth-overhaul-design.md`)
shipped a forced post-login "set password" gate (`SetPasswordScreen`, gated by
`session.user.mustSetPassword` in `RootNavigator`). That gate is **inert**: it depends on a
`must_set_password` field on `/auth/me` that the backend doesn't return yet.

Separately, the sibling app `sms-admin` (the canonical web console) solves "a new user has no
password yet" differently — with no forced gate at all. Its `LoginScreen.tsx` shows, under the
sign-in form:

> "First time here?" **Create a password**

which opens the _same_ identifier → 6-digit-code → new-password flow used for "forgot password"
(`passwordForgot` / `passwordReset` against `/auth/password/forgot` and `/auth/password/reset`),
just with copy adjusted for the first-time case.

The teacher app already has this exact mechanism wired end-to-end and live (`ForgotPasswordScreen`,
`useForgotPassword`/`useResetPassword` hooks, backend `/v1/auth/password/forgot`+`/reset`) — it's
only missing the self-service entry point for first-time users. This spec adds that entry point,
mirroring sms-admin, without touching the backend or the inert forced gate.

## Goal

Give a first-time teacher/principal user (who has an account but no password set) a way to create
one from the login screen, using the already-live forgot/reset-password flow — no new backend
work, no new API calls.

## Non-goals

- Does not activate or change the `mustSetPassword` forced gate (`SetPasswordScreen` /
  `RootNavigator`) — that remains a separate, backend-dependent effort.
- Does not change `useForgotPassword`, `useResetPassword`, `AuthRepository`, or any backend contract.
- Does not remove the existing "Forgot password?" link (user chose to keep both links rather than
  collapse to sms-admin's single-link pattern).

## Design

### 1. `ForgotPasswordScreen` gains a `mode` param

`RootStackParamList['ForgotPassword']` changes from `undefined` to
`{ mode?: 'reset' | 'create' } | undefined` (default behaves as `'reset'`, so the existing
"Forgot password?" call site needs no change).

Inside `ForgotPasswordScreen`, read `mode` from route params and use it to select copy only —
no change to state machine, hooks, or validation:

| Element              | `mode: 'reset'` (current copy)                                          | `mode: 'create'`                                                                                                 |
| -------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Card title           | "Reset password"                                                        | "Create your password"                                                                                           |
| Step 1 subtitle      | "Enter your email or mobile number and we'll send a verification code." | "First time here? Enter your email or mobile number and we'll send a verification code to create your password." |
| Step 2 subtitle      | "Enter the code we sent and choose a new password."                     | (same — generic enough to leave as-is)                                                                           |
| Step 2 submit button | "Reset password" / "Resetting…"                                         | "Create password" / "Creating…"                                                                                  |
| Done message         | "Your password has been reset. Sign in with your new password."         | "Your password has been created. Sign in with your new password."                                                |

### 2. `LoginScreen` gains a second link

Below the existing "Forgot password?" link (kept as-is, still navigates with no params / implicit
`mode: 'reset'`), add:

> "First time here?" **Create a password**

navigating to `navigation.navigate('ForgotPassword', { mode: 'create' })`. Styled consistently with
the existing `forgotText`/`altLink` styles already in the stylesheet — reuse rather than introduce
new style tokens where the existing ones fit.

### 3. No other files change

`AuthRepository`, `auth.repo.ts`, `hooks.ts`, `authErrors.ts`, `passwordValidation.ts`,
`RootNavigator.tsx`, and the backend are untouched.

## Testing

- Existing `ForgotPasswordScreen`/`LoginScreen` don't have jest render tests today (per
  [[auth-overhaul]], animated screens aren't render-tested — reanimated/safe-area mocks are
  missing from jest setup). This change follows the same precedent: no new render tests.
- Manual verification: from `LoginScreen`, tap "First time here? Create a password", confirm the
  screen shows create-flavored copy end-to-end through a real OTP send + password set against the
  running backend; confirm the pre-existing "Forgot password?" path is visually unchanged.
- `tsc` and `lint` must stay clean (existing CI gates).

## Open questions

None — user confirmed keeping both links side by side rather than merging into a single
sms-admin-style link.
