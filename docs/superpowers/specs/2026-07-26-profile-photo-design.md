# Profile photo — design spec

## Context

Neither `dbo.Users` nor the role-specific directory tables (`dbo.Teachers`,
`dbo.Staff`) have any photo/avatar concept today. The teacher app's `Avatar`
component only ever renders initials. The only `PhotoUrl` field anywhere in
`sms-backend` belongs to `TeamMemberResponse` (Catre's internal ops-team
directory in the Tenancy module) — a different entity entirely, not
reusable for school teachers/staff/principals.

The codebase already has a proven pattern for exactly this shape:
`Tenants.LogoUrl` — an `nvarchar(max)` column holding either a `data:image/`
URI or an `http(s)://` URL, capped at ~400,000 characters, validated in
`TenancyService`. `User_SetPassword` is the established pattern for a
self-service "update my own row" endpoint/proc pair.

Principals have no row in `Teachers` or `Staff` at all (the same reason
their Employee ID and Classroom are always blank — see
`2026-07-24-backend-live-data-fixes-design.md`). Putting `PhotoUrl` on
`dbo.Users` instead of a per-role table sidesteps that gap entirely: every
role (teacher, staff, principal) gets a photo through the same code path,
no role dispatch needed.

## Non-goals

- No new blob/file storage or CDN — reuses the existing in-DB data-URI
  pattern (`Tenants.LogoUrl`), consistent with this codebase's current
  scale and conventions.
- No polymorphic "Profiles" table — consistent with the explicit decision
  already made in `2026-07-24-backend-live-data-fixes-design.md`.
- No changes to `sms-admin`'s onboarding UI. The backend field is additive
  (nullable, no new required params on existing create procs), so
  `sms-admin` can start passing a photo during onboarding whenever its own
  team builds that — out of scope here.
- No client-side image compression beyond what `pickImage.ts` already does
  (`quality: 0.6` on both camera and library picks).

## Backend (sms-backend)

**Migration** (next number after `M0096_User_GetById_Add_CreatedAt`):

```sql
ALTER TABLE dbo.Users ADD PhotoUrl nvarchar(max) NULL;
```

**`UserRecord`** (`src/Sms.Shared.Kernel/Auth/UserRecord.cs`) gains
`string? PhotoUrl` as its final constructor parameter (after `CreatedAt`,
added earlier in this same effort). Every query returning `UserRecord` must
select it:

- `procs/identity/User_GetById.sql`, `User_GetByEmail.sql`,
  `User_GetByPhone.sql` — add `u.PhotoUrl` to the `SELECT` list (same
  migration-re-embedding pattern as `M0096`, or folded into it if that
  migration hasn't shipped yet).
- `AuthDao.ListByEmailAsync`, `ListByPhoneAsync`, `GetByEmailAndTenantAsync`
  (inline SQL) — add `PhotoUrl` to their `SELECT` column lists.

**`AuthService.GetMeAsync`** adds one line to its anonymous response object:

```csharp
photo_url = record.PhotoUrl,
```

No change to `ResolveProfileAsync` — this field is role-agnostic.

**Self-service update endpoint**: `PATCH /v1/me/photo` (or an equivalent
route addressable from `LoginController`, alongside `SetPassword`/`GetMe` —
route-override syntax if needed to place it outside the `v1/auth` prefix
the controller otherwise uses).

Request body: `{ photo_url: string | null }`.

Validation (mirrors `TenancyService`'s existing `Tenants.LogoUrl` checks
exactly):

- `photo_url` longer than 400,000 characters → `422 invalid_request`.
- Non-empty and not a `null`/empty clear: must start with `data:image/`,
  `http://`, or `https://` → otherwise `422 invalid_request`.
- `null` or empty string clears the photo (sets column to `NULL`).

Implementation:

- `IAuthService.UpdatePhotoAsync(ClaimsPrincipal user, string? photoUrl, CancellationToken ct)`
  → validates, resolves the caller's `sub` claim, calls
  `IAuthDao.SetPhotoAsync`.
- `IAuthDao.SetPhotoAsync(Guid userId, string? photoUrl, CancellationToken ct)`
  → `ExecuteProcAsync(AuthQueries.SetPhoto, new { UserId = userId, PhotoUrl = photoUrl }, ct)`.
- New proc `dbo.User_SetPhoto`, mirroring `User_SetPassword`:

```sql
CREATE OR ALTER PROCEDURE dbo.User_SetPhoto
    @UserId uniqueidentifier,
    @PhotoUrl nvarchar(max) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Users SET PhotoUrl = @PhotoUrl WHERE Id = @UserId;
END
```

- `AuthQueries.SetPhoto = "dbo.User_SetPhoto"`.

## Frontend (sms-teacher-app)

**Data layer:**

- `meSchema` (`src/data/http/auth.schema.ts`) gains
  `photo_url: z.string().nullable().optional()`.
- `User` (`src/data/domain`) gains `photoUrl: string | null`.
- `toUserFromMe` maps `photoUrl: me.photo_url ?? null`.
- `AuthRepository` (`src/data/repositories/types.ts`) gains
  `updatePhoto(photoUrl: string | null): Promise<void>`.
- `httpAuth` (`src/data/http/auth.repo.ts`) implements it:
  `PATCH /me/photo` with `{ photo_url: photoUrl }`.
- `AuthProvider` exposes `updatePhoto` on `AuthValue`; on success it patches
  `session.user.photoUrl` in place (no full re-login/`establishSession`
  round-trip needed — this is a display-only field, unlike a tenant
  switch).
- A `useUpdatePhoto()` mutation hook in `src/features/auth/hooks.ts`,
  matching the existing `useChangePassword`/`useLogout` style.

**UI:**

- `Avatar` component (`src/components`) gains an optional `photoUri?: string | null`
  prop. When present, renders an `Image` (`source={{ uri: photoUri }}`,
  same sizing as the existing initials circle); falls back to the current
  initials rendering when absent — same fallback pattern used for school
  logos in `SchoolPickerScreen` earlier this session.
- `ProfileScreen`: tapping the hero avatar opens an action sheet — "Take
  Photo", "Choose from Library", "Remove Photo" (only shown when a photo is
  currently set), "Cancel". Take Photo / Choose from Library call the
  existing `takePhotoFromCamera()`/`pickImageFromLibrary()` from
  `pickImage.ts`, then `useUpdatePhoto().mutateAsync(uri)`. Remove Photo
  calls the same mutation with `null`. A small spinner overlays the avatar
  while the mutation is in flight; a failure shows an inline error below
  the avatar and leaves the previous photo in place (optimistic update is
  not used — wait for the server round-trip before updating the displayed
  photo, since a failed upload must not silently show a stale/wrong image).
- `HomeScreen` and `PrincipalHomeScreen` pass `session.user.photoUrl` into
  their existing `Avatar` usage (display-only, no tap handler there).

## Error handling

- Oversized or malformed `photo_url` (should be rare — `pickImage.ts`
  already downsamples via `quality: 0.6` before this point): backend
  `422`, surfaced via the existing `authErrorMessage()` helper as an inline
  error near the avatar on `ProfileScreen`.
- Network failure during upload: same inline error path; the avatar keeps
  showing whatever photo (or initials) it had before the attempt.
- Permission denial (camera/library) from `pickImage.ts`: already returns
  `null` today: the action sheet simply closes with no photo change, no
  error shown — consistent with how `AssignmentNewScreen` already handles
  this today.

## Testing

**Backend** (extends the existing `AuthFlowTests` integration-test pattern
against the SQL fixture):

- `PATCH /v1/me/photo` with a valid `data:image/...` URI, then
  `GET /v1/auth/me` returns the same value in `photo_url`.
- `PATCH /v1/me/photo` with `null` clears a previously-set photo.
- `PATCH /v1/me/photo` with an oversized or malformed value returns `422`.

**Frontend:**

- `auth.schema.test.ts`: `meSchema` parses `photo_url` (present, `null`,
  absent) the same way the existing null-tolerance tests cover other
  optional fields.
- `auth.repo.test.ts`: `updatePhoto` posts the correct path/body.
- A new `Avatar` component test: renders the image when `photoUri` is
  set, renders initials when it's absent — mirrors the
  `school-logo`/`school-logo-fallback` testID pattern added to
  `SchoolPickerScreen` earlier this session.
