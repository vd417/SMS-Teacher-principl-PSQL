# Profile Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher, staff member, or principal set and see their own profile photo — self-service upload from the teacher app, stored role-agnostically so every role works the same way.

**Architecture:** Two repos. `sms-backend` (`D:/SMS/sms-project/sms-backend`) gains a `PhotoUrl` column on `dbo.Users` (role-agnostic — every signed-in identity has exactly one `Users` row regardless of role), exposed read-only via the existing `GET /v1/auth/me`, and a new self-service `PATCH /v1/me/photo` endpoint, both following patterns already proven in this codebase (`Tenants.LogoUrl`'s data-URI-or-URL storage, `User_SetPassword`'s self-service update shape). `sms-teacher-app` (`D:/SMS/sms-project/sms-teacher-app`) adds the field through its existing zod boundary, exposes an `updatePhoto` mutation, and wires an upload affordance into `ProfileScreen`'s avatar plus display-only avatars on `HomeScreen`/`PrincipalHomeScreen`, reusing the existing `pickImage.ts` picker.

**Tech Stack:** Backend: C# / ASP.NET Core, Dapper, FluentMigrator, SQL Server, xUnit + FluentAssertions (integration tests against a real SQL fixture). Frontend: React Native (Expo), TypeScript, `@tanstack/react-query`, `zod`, Jest + `@testing-library/react-native`.

## Global Constraints

- No new blob/file storage — `PhotoUrl` is `nvarchar(max)`, holding either a `data:image/...` URI or an `http(s)://` URL, exactly like `Tenants.LogoUrl`.
- Validation mirrors `TenancyService`'s existing `Tenants.LogoUrl` checks exactly: reject (422 `invalid_request`) if longer than 400,000 characters, or if non-empty and not starting with `data:image/`, `http://`, or `https://`. `null`/empty clears the photo.
- `PhotoUrl` lives on `dbo.Users`, not `Teachers`/`Staff` — every role (teacher, staff, principal) must work identically, with no per-role dispatch.
- No changes to `sms-admin`'s onboarding UI in this plan — the backend change is additive (nullable, no new required params on existing create procs).
- Follow existing code conventions exactly: on the backend, the `procs/identity/*.sql` + versioned-migration re-embedding pattern already used for `User_GetById`/`User_SetPassword`; on the frontend, the zod-schema/repo/provider/hook layering already used throughout `src/features/auth/**`, and the two-button (Library/Camera) + inline preview + inline error pattern already used in `AssignmentNewScreen.tsx` for picking images.
- **Known pre-existing uncommitted state in `sms-backend`:** before this plan starts, `UserRecord.cs`, the three `procs/identity/User_GetBy*.sql` files, `AuthDao.cs`'s inline queries, `IProfileDao.cs`, and `ProfileDao.cs` already have _uncommitted_ changes from separate, earlier unfinished work (adding a `CreatedAt` field to `UserRecord` and unused `EmployeeCode` lookup methods to `IProfileDao`/`ProfileDao`). This is expected — leave those changes in place exactly as you find them. Task 1 below gives the exact current content of every file it touches, already accounting for this, so you never need to guess or "clean up" anything unrelated you see sitting in these files.

---

### Task 1: `PhotoUrl` on `dbo.Users`, read-only through `GET /v1/auth/me`

**Files:**

- Create: `db/Sms.Migrations/M0097_Users_PhotoUrl.cs` (in `sms-backend`)
- Modify: `src/Sms.Shared.Kernel/Auth/UserRecord.cs`
- Modify: `db/Sms.Migrations/procs/identity/User_GetById.sql`, `User_GetByEmail.sql`, `User_GetByPhone.sql`
- Modify: `src/Sms.Infrastructure/DAO/AuthDao.cs`
- Modify: `src/Sms.Application/Services/Auth/AuthService.cs`
- Test: `tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs`

All paths below are relative to `D:/SMS/sms-project/sms-backend`.

**Interfaces:**

- Consumes: nothing new (extends the existing `UserRecord`/`GetMeAsync` already in the codebase).
- Produces: `UserRecord.PhotoUrl` (`string?`, final constructor parameter) and `photo_url` on the JSON object `GetMeAsync` returns — consumed by Task 2 (the write endpoint doesn't need to read it back itself, but the same field) and by Task 3's frontend `meSchema`.

- [ ] **Step 1: Add the migration**

Create `db/Sms.Migrations/M0097_Users_PhotoUrl.cs`:

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(97, "Users.PhotoUrl for self-service profile photos (role-agnostic)")]
public sealed class M0097_Users_PhotoUrl : Migration
{
    public override void Up()
    {
        Execute.Sql(@"
IF COL_LENGTH('dbo.Users', 'PhotoUrl') IS NULL
    ALTER TABLE dbo.Users ADD PhotoUrl nvarchar(max) NULL;
");
    }

    public override void Down()
    {
        Execute.Sql(@"
IF COL_LENGTH('dbo.Users', 'PhotoUrl') IS NOT NULL
    ALTER TABLE dbo.Users DROP COLUMN PhotoUrl;
");
    }
}
```

- [ ] **Step 2: Add `PhotoUrl` to `UserRecord`**

In `src/Sms.Shared.Kernel/Auth/UserRecord.cs`, the file currently reads (this already includes the pre-existing uncommitted `CreatedAt` addition mentioned in Global Constraints):

```csharp
namespace Sms.Shared.Kernel.Auth;

public sealed record UserRecord(
    Guid Id, Guid? TenantId, string? Email, string? StudentId, string? Phone,
    string? PasswordHash, bool IsPlatform, string Status, string? Name, bool MustSetPassword,
    DateTime CreatedAt);
```

Change the last line to add `PhotoUrl` as the final parameter:

```csharp
public sealed record UserRecord(
    Guid Id, Guid? TenantId, string? Email, string? StudentId, string? Phone,
    string? PasswordHash, bool IsPlatform, string Status, string? Name, bool MustSetPassword,
    DateTime CreatedAt, string? PhotoUrl);
```

- [ ] **Step 3: Add `PhotoUrl` to the three identity stored procs**

Every query returning `UserRecord` must select every one of its columns, or Dapper throws "no matching constructor". Each of these three files currently reads (already including the pre-existing uncommitted `u.CreatedAt` addition):

`db/Sms.Migrations/procs/identity/User_GetById.sql`:

```sql
CREATE OR ALTER PROCEDURE dbo.User_GetById
    @Id uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 u.Id, u.TenantId, u.Email, u.StudentId, u.Phone,
           u.PasswordHash, u.IsPlatform, u.Status, u.Name, u.MustSetPassword, u.CreatedAt
    FROM dbo.Users u
    WHERE u.Id = @Id;
END
```

Change its `SELECT` line to:

```sql
    SELECT TOP 1 u.Id, u.TenantId, u.Email, u.StudentId, u.Phone,
           u.PasswordHash, u.IsPlatform, u.Status, u.Name, u.MustSetPassword, u.CreatedAt, u.PhotoUrl
```

`db/Sms.Migrations/procs/identity/User_GetByEmail.sql`:

```sql
CREATE OR ALTER PROCEDURE dbo.User_GetByEmail
    @Email nvarchar(256)
AS
BEGIN
    SET NOCOUNT ON;
    -- Prefer platform accounts, then earliest row. Callers that must
    -- password-match across multi-tenant emails should list all peers.
    SELECT TOP 1 u.Id, u.TenantId, u.Email, u.StudentId, u.Phone,
           u.PasswordHash, u.IsPlatform, u.Status, u.Name, u.MustSetPassword, u.CreatedAt
    FROM dbo.Users u
    WHERE u.Email = @Email
    ORDER BY CASE WHEN u.IsPlatform = 1 THEN 0 ELSE 1 END, u.CreatedAt;
END
```

Change its `SELECT` line the same way (add `, u.PhotoUrl` after `u.CreatedAt`).

`db/Sms.Migrations/procs/identity/User_GetByPhone.sql`:

```sql
CREATE OR ALTER PROCEDURE dbo.User_GetByPhone
    @Phone nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 u.Id, u.TenantId, u.Email, u.StudentId, u.Phone,
           u.PasswordHash, u.IsPlatform, u.Status, u.Name, u.MustSetPassword, u.CreatedAt
    FROM dbo.Users u
    WHERE u.Phone = @Phone
    ORDER BY CASE WHEN u.IsPlatform = 1 THEN 0 ELSE 1 END, u.CreatedAt;
END
```

Change its `SELECT` line the same way.

- [ ] **Step 4: Re-apply the three procs via the new migration**

In `M0097_Users_PhotoUrl.cs`'s `Up()`, after the `ALTER TABLE` above, add:

```csharp
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.identity.User_GetById"))
            Execute.Sql(sql);
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.identity.User_GetByEmail"))
            Execute.Sql(sql);
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.identity.User_GetByPhone"))
            Execute.Sql(sql);
```

(This is the same "modify the embedded .sql file, then re-run `EmbeddedProcs` from a new migration" pattern already used by `M0086`/`M0095`/`M0096` in this repo — the proc body picked up is whatever the file currently contains, i.e. the version with `PhotoUrl` from Step 3.)

- [ ] **Step 5: Add `PhotoUrl` to `AuthDao`'s inline queries**

In `src/Sms.Infrastructure/DAO/AuthDao.cs`, the three inline-SQL methods currently read (already including the pre-existing uncommitted `CreatedAt` addition):

```csharp
    public Task<IReadOnlyList<UserRecord>> ListByEmailAsync(string email, CancellationToken ct = default) =>
        QueryInlineAsync<UserRecord>(
            "SELECT Id, TenantId, Email, StudentId, Phone, PasswordHash, IsPlatform, Status, Name, MustSetPassword, CreatedAt " +
            "FROM dbo.Users WHERE Email = @Email " +
            "ORDER BY CASE WHEN IsPlatform = 1 THEN 0 ELSE 1 END, CreatedAt",
            new { Email = email }, ct);

    public Task<IReadOnlyList<UserRecord>> ListByPhoneAsync(string phone, CancellationToken ct = default) =>
        QueryInlineAsync<UserRecord>(
            "SELECT Id, TenantId, Email, StudentId, Phone, PasswordHash, IsPlatform, Status, Name, MustSetPassword, CreatedAt " +
            "FROM dbo.Users WHERE Phone = @Phone " +
            "ORDER BY CASE WHEN IsPlatform = 1 THEN 0 ELSE 1 END, CreatedAt",
            new { Phone = phone }, ct);

    public async Task<UserRecord?> GetByEmailAndTenantAsync(string email, Guid tenantId, CancellationToken ct = default) =>
        (await QueryInlineAsync<UserRecord>(
            "SELECT Id, TenantId, Email, StudentId, Phone, PasswordHash, IsPlatform, Status, Name, MustSetPassword, CreatedAt " +
            "FROM dbo.Users WHERE Email = @Email AND TenantId = @TenantId",
            new { Email = email, TenantId = tenantId }, ct)).FirstOrDefault();
```

Add `, PhotoUrl` after `CreatedAt` in each of the three `SELECT` strings (six occurrences of `CreatedAt` total across the three methods — the ones in the `SELECT` list, not the ones in `ORDER BY`).

- [ ] **Step 6: Write the failing integration test**

Add to `tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs`, at the end of the class (before the final closing `}`):

```csharp
    [Fact]
    public async Task Me_returns_photo_url_when_set_directly_on_the_row()
    {
        var hasher = new PasswordHasher();
        var ctx = new TenantContext(); ctx.Set(null, Guid.NewGuid(), true);
        var factory = new SqlConnectionFactory(fx.ConnectionString, ctx);
        var email = $"photo{Guid.NewGuid():N}@x.com";
        const string photoUrl = "https://cdn.example.com/avatars/a.png";
        await using (var c = await factory.OpenAsync())
            await c.ExecuteAsync(
                "INSERT dbo.Users (Id, Email, PasswordHash, IsPlatform, PhotoUrl) VALUES (NEWID(),@e,@h,1,@p)",
                new { e = email, h = hasher.Hash("Pass123!"), p = photoUrl });

        await using var app = AppWithDb();
        var client = app.CreateClient();
        var login = await client.PostAsJsonAsync("/v1/auth/login", new { email, password = "Pass123!" });
        var token = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync())
            .RootElement.GetProperty("data").GetProperty("access_token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var me = await client.GetAsync("/v1/auth/me");
        me.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = System.Text.Json.JsonDocument.Parse(await me.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("data").GetProperty("photo_url").GetString().Should().Be(photoUrl);
    }

    [Fact]
    public async Task Me_returns_null_photo_url_when_unset()
    {
        var hasher = new PasswordHasher();
        var ctx = new TenantContext(); ctx.Set(null, Guid.NewGuid(), true);
        var factory = new SqlConnectionFactory(fx.ConnectionString, ctx);
        var email = $"nophoto{Guid.NewGuid():N}@x.com";
        await using (var c = await factory.OpenAsync())
            await c.ExecuteAsync(
                "INSERT dbo.Users (Id, Email, PasswordHash, IsPlatform) VALUES (NEWID(),@e,@h,1)",
                new { e = email, h = hasher.Hash("Pass123!") });

        await using var app = AppWithDb();
        var client = app.CreateClient();
        var login = await client.PostAsJsonAsync("/v1/auth/login", new { email, password = "Pass123!" });
        var token = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync())
            .RootElement.GetProperty("data").GetProperty("access_token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var me = await client.GetAsync("/v1/auth/me");
        using var doc = System.Text.Json.JsonDocument.Parse(await me.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("data").GetProperty("photo_url").ValueKind
            .Should().Be(System.Text.Json.JsonValueKind.Null);
    }
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~AuthFlowTests.Me_returns"`
Expected: FAIL — both new tests fail because `GetMeAsync`'s response has no `photo_url` property yet (`GetProperty("photo_url")` throws `KeyNotFoundException`-style errors from `JsonDocument`).

- [ ] **Step 8: Expose `photo_url` on `GET /v1/auth/me`**

In `src/Sms.Application/Services/Auth/AuthService.cs`, find `GetMeAsync`'s response object:

```csharp
        return ApiResult<object>.Ok(new
        {
            id = sub,
            tenant_id = user.FindFirst("tenant_id")?.Value,
            roles,
            is_platform = user.FindFirst("is_platform")?.Value == "1",
            name = record.Name,
            email = record.Email,
            phone = record.Phone,
            tenant_name = tenantName,
            must_set_password = record.MustSetPassword,
            title,
            classroom,
        });
```

Add `photo_url = record.PhotoUrl,` as a new line (position doesn't matter — anonymous object property order has no effect on the serialized JSON's correctness):

```csharp
        return ApiResult<object>.Ok(new
        {
            id = sub,
            tenant_id = user.FindFirst("tenant_id")?.Value,
            roles,
            is_platform = user.FindFirst("is_platform")?.Value == "1",
            name = record.Name,
            email = record.Email,
            phone = record.Phone,
            tenant_name = tenantName,
            must_set_password = record.MustSetPassword,
            title,
            classroom,
            photo_url = record.PhotoUrl,
        });
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~AuthFlowTests"`
Expected: PASS, all tests in the file green (including the three pre-existing tests — confirms nothing broke).

- [ ] **Step 10: Build the whole solution**

Run: `dotnet build`
Expected: no errors. (This surfaces any other call site constructing or consuming `UserRecord` that Step 2's constructor change might affect — there should be none besides what Steps 3-5 already updated, since `sm-backend`'s only other `UserRecord`-querying class, `AuthRepository.cs` in `Sms.Shared.Kernel`, calls the same stored procs generically and needs no code change.)

- [ ] **Step 11: Commit**

```bash
cd D:/SMS/sms-project/sms-backend
git add db/Sms.Migrations/M0097_Users_PhotoUrl.cs db/Sms.Migrations/procs/identity/User_GetById.sql db/Sms.Migrations/procs/identity/User_GetByEmail.sql db/Sms.Migrations/procs/identity/User_GetByPhone.sql src/Sms.Shared.Kernel/Auth/UserRecord.cs src/Sms.Infrastructure/DAO/AuthDao.cs src/Sms.Application/Services/Auth/AuthService.cs tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs
git commit -m "feat(auth): add Users.PhotoUrl, expose read-only via GET /auth/me"
```

(This commit will also pick up the pre-existing uncommitted `CreatedAt`/`EmployeeCode` changes sitting in these same files, per the note in Global Constraints — that's expected and fine; they're unused but harmless, from separate unfinished work.)

---

### Task 2: Self-service `PATCH /v1/me/photo`

**Files:**

- Create: `db/Sms.Migrations/M0098_User_SetPhoto.cs`, `db/Sms.Migrations/procs/identity/User_SetPhoto.sql`
- Modify: `src/Sms.Infrastructure/SQL/AuthQueries.cs`
- Modify: `src/Sms.Application/Interfaces/DAO/IAuthDao.cs`
- Modify: `src/Sms.Infrastructure/DAO/AuthDao.cs`
- Modify: `src/Sms.Application/DTOs/Auth/LoginModels.cs`
- Modify: `src/Sms.Application/Services/Auth/AuthService.cs`
- Modify: `src/Sms.Api/Controllers/LoginController.cs`
- Test: `tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs`

All paths below are relative to `D:/SMS/sms-project/sms-backend`.

**Interfaces:**

- Consumes: `UserRecord.PhotoUrl` and `photo_url` on `GET /auth/me` (Task 1).
- Produces: `PATCH /v1/me/photo` — consumed by Task 3's `httpAuth.updatePhoto`.

- [ ] **Step 1: Add the proc**

Create `db/Sms.Migrations/procs/identity/User_SetPhoto.sql`:

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

- [ ] **Step 2: Add the migration**

Create `db/Sms.Migrations/M0098_User_SetPhoto.cs`:

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(98, "User_SetPhoto proc for self-service profile photo updates")]
public sealed class M0098_User_SetPhoto : Migration
{
    public override void Up()
    {
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.identity.User_SetPhoto"))
            Execute.Sql(sql);
    }

    public override void Down()
    {
        Execute.Sql("DROP PROCEDURE IF EXISTS dbo.User_SetPhoto;");
    }
}
```

- [ ] **Step 3: Register the proc name**

In `src/Sms.Infrastructure/SQL/AuthQueries.cs`, the file currently reads:

```csharp
namespace Sms.Infrastructure.SQL;

/// Stored procedure names for auth data access.
public static class AuthQueries
{
    public const string GetByEmail = "dbo.User_GetByEmail";
    public const string GetByPhone = "dbo.User_GetByPhone";
    public const string GetById = "dbo.User_GetById";
    public const string GetRoles = "dbo.UserRoles_GetByUser";
    public const string SetPassword = "dbo.User_SetPassword";
    public const string OtpInsert = "dbo.Otp_Insert";
    public const string OtpGetActive = "dbo.Otp_GetActive";
    public const string OtpConsume = "dbo.Otp_Consume";
    public const string OtpConsumeAll = "dbo.Otp_ConsumeAllForIdentifier";
}
```

Add one new constant after `SetPassword`:

```csharp
    public const string SetPassword = "dbo.User_SetPassword";
    public const string SetPhoto = "dbo.User_SetPhoto";
```

- [ ] **Step 4: Add the DAO method**

In `src/Sms.Application/Interfaces/DAO/IAuthDao.cs`, find the `SetPasswordAsync` declaration and add a new one right after it:

```csharp
    Task SetPasswordAsync(Guid userId, string passwordHash, CancellationToken ct = default);
    Task SetPhotoAsync(Guid userId, string? photoUrl, CancellationToken ct = default);
```

In `src/Sms.Infrastructure/DAO/AuthDao.cs`, find:

```csharp
    public Task SetPasswordAsync(Guid userId, string passwordHash, CancellationToken ct = default) =>
        ExecuteProcAsync(AuthQueries.SetPassword, new { UserId = userId, PasswordHash = passwordHash }, ct);
```

Add right after it:

```csharp
    public Task SetPhotoAsync(Guid userId, string? photoUrl, CancellationToken ct = default) =>
        ExecuteProcAsync(AuthQueries.SetPhoto, new { UserId = userId, PhotoUrl = photoUrl }, ct);
```

- [ ] **Step 5: Add the request DTO**

In `src/Sms.Application/DTOs/Auth/LoginModels.cs`, find:

```csharp
public sealed record SetPasswordRequest(string Password);
```

Add right after it:

```csharp
public sealed record UpdatePhotoRequest(string? PhotoUrl);
```

- [ ] **Step 6: Write the failing integration tests**

Add to `tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs`, after the two tests from Task 1:

```csharp
    [Fact]
    public async Task UpdatePhoto_sets_and_then_clears_the_signed_in_users_photo()
    {
        var hasher = new PasswordHasher();
        var ctx = new TenantContext(); ctx.Set(null, Guid.NewGuid(), true);
        var factory = new SqlConnectionFactory(fx.ConnectionString, ctx);
        var email = $"setphoto{Guid.NewGuid():N}@x.com";
        await using (var c = await factory.OpenAsync())
            await c.ExecuteAsync(
                "INSERT dbo.Users (Id, Email, PasswordHash, IsPlatform) VALUES (NEWID(),@e,@h,1)",
                new { e = email, h = hasher.Hash("Pass123!") });

        await using var app = AppWithDb();
        var client = app.CreateClient();
        var login = await client.PostAsJsonAsync("/v1/auth/login", new { email, password = "Pass123!" });
        var token = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync())
            .RootElement.GetProperty("data").GetProperty("access_token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var set = await client.PatchAsJsonAsync("/v1/me/photo", new { photo_url = "https://cdn.example.com/a.png" });
        set.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var me1 = await client.GetAsync("/v1/auth/me");
        using (var doc1 = System.Text.Json.JsonDocument.Parse(await me1.Content.ReadAsStringAsync()))
            doc1.RootElement.GetProperty("data").GetProperty("photo_url").GetString()
                .Should().Be("https://cdn.example.com/a.png");

        var clear = await client.PatchAsJsonAsync("/v1/me/photo", new { photo_url = (string?)null });
        clear.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var me2 = await client.GetAsync("/v1/auth/me");
        using var doc2 = System.Text.Json.JsonDocument.Parse(await me2.Content.ReadAsStringAsync());
        doc2.RootElement.GetProperty("data").GetProperty("photo_url").ValueKind
            .Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task UpdatePhoto_rejects_a_value_that_is_not_a_data_uri_or_http_url()
    {
        var hasher = new PasswordHasher();
        var ctx = new TenantContext(); ctx.Set(null, Guid.NewGuid(), true);
        var factory = new SqlConnectionFactory(fx.ConnectionString, ctx);
        var email = $"badphoto{Guid.NewGuid():N}@x.com";
        await using (var c = await factory.OpenAsync())
            await c.ExecuteAsync(
                "INSERT dbo.Users (Id, Email, PasswordHash, IsPlatform) VALUES (NEWID(),@e,@h,1)",
                new { e = email, h = hasher.Hash("Pass123!") });

        await using var app = AppWithDb();
        var client = app.CreateClient();
        var login = await client.PostAsJsonAsync("/v1/auth/login", new { email, password = "Pass123!" });
        var token = System.Text.Json.JsonDocument.Parse(await login.Content.ReadAsStringAsync())
            .RootElement.GetProperty("data").GetProperty("access_token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var res = await client.PatchAsJsonAsync("/v1/me/photo", new { photo_url = "not-a-valid-value" });
        res.StatusCode.Should().Be((HttpStatusCode)422);
    }
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~AuthFlowTests.UpdatePhoto"`
Expected: FAIL — `PATCH /v1/me/photo` doesn't exist yet (404).

- [ ] **Step 8: Implement `AuthService.UpdatePhotoAsync`**

In `src/Sms.Application/Services/Auth/AuthService.cs`, add to the `IAuthService` interface (after `SetPasswordAsync`):

```csharp
    Task<ApiResult> SetPasswordAsync(SetPasswordRequest req, CancellationToken ct = default);
    Task<ApiResult> UpdatePhotoAsync(UpdatePhotoRequest req, CancellationToken ct = default);
```

Add the implementation right after `SetPasswordAsync`'s body (which currently reads):

```csharp
    public async Task<ApiResult> SetPasswordAsync(SetPasswordRequest req, CancellationToken ct = default)
    {
        if (tenant.UserId is not { } uid)
            return ApiResult.Fail(new Error("unauthorized", "unauthorized"), 401);
        await users.SetPasswordAsync(uid, hasher.Hash(req.Password), ct);
        return ApiResult.NoContent();
    }
```

Add:

```csharp
    public async Task<ApiResult> UpdatePhotoAsync(UpdatePhotoRequest req, CancellationToken ct = default)
    {
        if (tenant.UserId is not { } uid)
            return ApiResult.Fail(new Error("unauthorized", "unauthorized"), 401);

        if (req.PhotoUrl is { Length: > 400_000 })
            return ApiResult.Fail(new Error("invalid_request", "photo is too large (max ~300KB)"), 422);
        if (req.PhotoUrl is { Length: > 0 } &&
            !req.PhotoUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) &&
            !req.PhotoUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !req.PhotoUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return ApiResult.Fail(new Error("invalid_request", "photo must be an image data URL or http(s) URL"), 422);

        var photoUrl = string.IsNullOrWhiteSpace(req.PhotoUrl) ? null : req.PhotoUrl.Trim();
        await users.SetPhotoAsync(uid, photoUrl, ct);
        return ApiResult.NoContent();
    }
```

(This validation is copied verbatim in spirit from `TenancyService.InviteTeamMemberAsync`'s existing `Tenants`/Team `PhotoUrl` checks — same limits, same messages, same error code, for consistency across the codebase.)

- [ ] **Step 9: Add the controller route**

In `src/Sms.Api/Controllers/LoginController.cs`, find:

```csharp
    [HttpPost("set-password")]
    [Authorize]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest req, CancellationToken ct) =>
        FromResult(await auth.SetPasswordAsync(req, ct));
```

Add right after it:

```csharp
    [HttpPatch("~/v1/me/photo")]
    [Authorize]
    public async Task<IActionResult> UpdatePhoto([FromBody] UpdatePhotoRequest req, CancellationToken ct) =>
        FromResult(await auth.UpdatePhotoAsync(req, ct));
```

(The `~/` prefix overrides the controller's `[Route("v1/auth")]` base so this one action is reachable at `v1/me/photo` instead of `v1/auth/me/photo` — the same technique used elsewhere in ASP.NET Core attribute routing when one action needs a different base path than its controller.)

- [ ] **Step 10: Run the tests to verify they pass**

Run: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~AuthFlowTests"`
Expected: PASS, all tests in the file green (7 tests total: 3 pre-existing + 2 from Task 1 + 2 from this task).

- [ ] **Step 11: Build the whole solution**

Run: `dotnet build`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
cd D:/SMS/sms-project/sms-backend
git add db/Sms.Migrations/M0098_User_SetPhoto.cs db/Sms.Migrations/procs/identity/User_SetPhoto.sql src/Sms.Infrastructure/SQL/AuthQueries.cs src/Sms.Application/Interfaces/DAO/IAuthDao.cs src/Sms.Infrastructure/DAO/AuthDao.cs src/Sms.Application/DTOs/Auth/LoginModels.cs src/Sms.Application/Services/Auth/AuthService.cs src/Sms.Api/Controllers/LoginController.cs tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs
git commit -m "feat(auth): add self-service PATCH /me/photo endpoint"
```

---

### Task 3: Frontend data layer — `photoUrl` through the zod boundary + `updatePhoto` repo method

**Files:**

- Modify: `src/data/http/auth.schema.ts`
- Modify: `src/data/http/__tests__/auth.schema.test.ts`
- Modify: `src/data/domain/index.ts`
- Modify: `src/data/repositories/types.ts`
- Modify: `src/data/http/auth.repo.ts`
- Modify: `src/data/http/__tests__/auth.repo.test.ts`

All paths below are relative to `D:/SMS/sms-project/sms-teacher-app`.

**Interfaces:**

- Consumes: `GET /v1/auth/me`'s `photo_url` field, `PATCH /v1/me/photo` (Tasks 1-2, backend).
- Produces: `User.photoUrl: string | null`, `AuthRepository.updatePhoto(photoUrl: string | null): Promise<void>` — consumed by Task 4's `AuthProvider`.

- [ ] **Step 1: Write the failing schema tests**

Add to `src/data/http/__tests__/auth.schema.test.ts`, after the existing `toUserFromMe maps must_set_password...` test:

```ts
test('toUserFromMe maps photo_url (present, null, and absent)', () => {
  const withPhoto = toUserFromMe(
    meSchema.parse({
      id: 'u1',
      tenant_id: 't1',
      roles: ['teacher'],
      photo_url: 'https://cdn.example.com/a.png',
    })
  );
  expect(withPhoto.photoUrl).toBe('https://cdn.example.com/a.png');

  const explicitNull = toUserFromMe(
    meSchema.parse({ id: 'u2', tenant_id: 't1', roles: ['teacher'], photo_url: null })
  );
  expect(explicitNull.photoUrl).toBeNull();

  const absent = toUserFromMe(meSchema.parse({ id: 'u3', tenant_id: 't1', roles: ['teacher'] }));
  expect(absent.photoUrl).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts -t "photo_url"`
Expected: FAIL — `meSchema` currently strips the unrecognized `photo_url` input field (zod's default behavior for unknown keys), and `toUserFromMe` doesn't set `photoUrl` on its return value, so `withPhoto.photoUrl` is `undefined` at runtime — the assertion `expect(withPhoto.photoUrl).toBe('https://cdn.example.com/a.png')` fails with "expected 'https://cdn.example.com/a.png', received undefined".

- [ ] **Step 3: Add `photo_url` to `meSchema` and map it in `toUserFromMe`**

In `src/data/http/auth.schema.ts`, find:

```ts
export const meSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  roles: z.array(z.string()).default([]),
  name: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  employee: z.string().nullable().optional(),
  classroom: z.string().nullable().optional(),
  joined: z.string().nullable().optional(),
  tenant_name: z.string().nullable().optional(),
  must_set_password: z.boolean().nullable().optional(),
});
```

Add `photo_url` after `must_set_password`:

```ts
export const meSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  roles: z.array(z.string()).default([]),
  name: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  employee: z.string().nullable().optional(),
  classroom: z.string().nullable().optional(),
  joined: z.string().nullable().optional(),
  tenant_name: z.string().nullable().optional(),
  must_set_password: z.boolean().nullable().optional(),
  photo_url: z.string().nullable().optional(),
});
```

Find `toUserFromMe`:

```ts
export function toUserFromMe(me: MeWire): User {
  const name = me.name ?? '';
  return {
    id: me.id,
    name,
    initials: initialsFrom(name),
    title: me.title ?? '',
    email: me.email ?? '',
    phone: me.phone ?? '',
    employee: me.employee ?? '',
    classroom: me.classroom ?? '',
    joined: me.joined ?? '',
    role: pickRole(me.roles),
    mustSetPassword: me.must_set_password ?? false,
  };
}
```

Add `photoUrl` to the returned object:

```ts
export function toUserFromMe(me: MeWire): User {
  const name = me.name ?? '';
  return {
    id: me.id,
    name,
    initials: initialsFrom(name),
    title: me.title ?? '',
    email: me.email ?? '',
    phone: me.phone ?? '',
    employee: me.employee ?? '',
    classroom: me.classroom ?? '',
    joined: me.joined ?? '',
    role: pickRole(me.roles),
    mustSetPassword: me.must_set_password ?? false,
    photoUrl: me.photo_url ?? null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/data/http/__tests__/auth.schema.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Add `photoUrl` to the `User` domain type**

In `src/data/domain/index.ts`, find:

```ts
export interface User {
  id: string;
  name: string;
  initials: string;
  title: string;
  email: string;
  phone: string;
  employee: string;
  classroom: string;
  joined: string;
  role: Role;
  /** Backend signals the account has no password yet → force a set-password screen. */
  mustSetPassword: boolean;
}
```

Add `photoUrl` after `mustSetPassword`:

```ts
export interface User {
  id: string;
  name: string;
  initials: string;
  title: string;
  email: string;
  phone: string;
  employee: string;
  classroom: string;
  joined: string;
  role: Role;
  /** Backend signals the account has no password yet → force a set-password screen. */
  mustSetPassword: boolean;
  photoUrl: string | null;
}
```

- [ ] **Step 6: Add `updatePhoto` to the `AuthRepository` interface**

In `src/data/repositories/types.ts`, find the `AuthRepository` interface's last line:

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
  // A signed-in identity can own more than one Users row (invited to several
  // schools under the same email/phone). listMySchools lists all of them;
  // switchSchool reissues tokens scoped to one specific row/tenant.
  listMySchools(): Promise<SchoolChoice[]>;
  switchSchool(tenantId: string): Promise<Session>;
}
```

Add `updatePhoto` as a new final member:

```ts
  listMySchools(): Promise<SchoolChoice[]>;
  switchSchool(tenantId: string): Promise<Session>;
  updatePhoto(photoUrl: string | null): Promise<void>;
}
```

- [ ] **Step 7: Write the failing repo test**

Add to `src/data/http/__tests__/auth.repo.test.ts`, at the end of the file (this file's `recordingHttp()` mocks `patch` — check its current signature; if it's `patch: async () => undefined,` as it is today, change it to record calls the same way `post` already does, so this test can assert on the body):

First, find `recordingHttp()`'s `patch` line:

```ts
    patch: async () => undefined,
```

Change it to:

```ts
    patch: async (path: string, body: unknown) => {
      calls.push({ path, body });
      return undefined;
    },
```

Then add the test:

```ts
test('updatePhoto patches /me/photo with photo_url', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).updatePhoto('https://cdn.example.com/a.png');
  expect(calls[0]).toEqual({
    path: '/me/photo',
    body: { photo_url: 'https://cdn.example.com/a.png' },
  });
});

test('updatePhoto with null clears the photo', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).updatePhoto(null);
  expect(calls[0]).toEqual({ path: '/me/photo', body: { photo_url: null } });
});
```

- [ ] **Step 8: Run the tests to verify they fail**

Run: `npx jest src/data/http/__tests__/auth.repo.test.ts -t "updatePhoto"`
Expected: FAIL — `httpAuth(http).updatePhoto` is not a function.

- [ ] **Step 9: Implement `updatePhoto` in `httpAuth`**

In `src/data/http/auth.repo.ts`, find the end of the returned object:

```ts
    switchSchool: async (tenantId) => {
      const prevSnapshot = authSnapshot.get();
      try {
        const t = tokenSchema.parse(await http.post('/me/switch-school', { tenant_id: tenantId }));
        return await sessionFromTokens(
          { accessToken: t.access_token, refreshToken: t.refresh_token },
          tenantId
        );
      } catch (err) {
        // A failed switch (e.g. the /auth/me follow-up rejecting) must not leave
        // the snapshot holding a new token paired with a tenant that doesn't
        // resolve — that would 403 every subsequent request until app restart.
        authSnapshot.set(prevSnapshot);
        throw err;
      }
    },
  };
}
```

Add `updatePhoto` right before the closing `};`/`}`:

```ts
    switchSchool: async (tenantId) => {
      const prevSnapshot = authSnapshot.get();
      try {
        const t = tokenSchema.parse(await http.post('/me/switch-school', { tenant_id: tenantId }));
        return await sessionFromTokens(
          { accessToken: t.access_token, refreshToken: t.refresh_token },
          tenantId
        );
      } catch (err) {
        authSnapshot.set(prevSnapshot);
        throw err;
      }
    },
    updatePhoto: async (photoUrl) => {
      await http.patch('/me/photo', { photo_url: photoUrl });
    },
  };
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx jest src/data/http/__tests__/auth.repo.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 11: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (`AuthRepository` now requires `updatePhoto` — `httpAuth`'s return value already implements it as of Step 9, so this should be clean.)

- [ ] **Step 12: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/data/http/auth.schema.ts src/data/http/__tests__/auth.schema.test.ts src/data/domain/index.ts src/data/repositories/types.ts src/data/http/auth.repo.ts src/data/http/__tests__/auth.repo.test.ts
git commit -m "feat(auth): add photoUrl to User and updatePhoto to AuthRepository"
```

---

### Task 4: `AuthProvider` — `updatePhoto` + `useUpdatePhoto` hook

**Files:**

- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/__tests__/AuthProvider.test.tsx`
- Modify: `src/features/auth/hooks.ts`

All paths below are relative to `D:/SMS/sms-project/sms-teacher-app`.

**Interfaces:**

- Consumes: `AuthRepository.updatePhoto` (Task 3).
- Produces: `AuthValue.updatePhoto: (photoUrl: string | null) => Promise<void>`, `useUpdatePhoto()` — consumed by Task 6's `ProfileScreen`.

- [ ] **Step 1: Write the failing provider test**

Add to `src/features/auth/__tests__/AuthProvider.test.tsx` (check the file's existing imports/harness first — it already has `RepositoryProvider`, `fakeRepos`-style mocking, `useAuth`, `render`/`screen`/`waitFor`/`fireEvent` from the multi-school-picker tests earlier in this file; follow that exact same harness style):

```tsx
test('updatePhoto calls the repo and patches session.user.photoUrl in place', async () => {
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
      photoUrl: null,
    },
    tenant: { id: 't1', name: 'School One' },
  }));
  const mockListSchools = jest.fn(async () => [{ id: 't1', name: 'School One', logoUrl: null }]);
  const mockUpdatePhoto = jest.fn(async () => undefined);
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools, updatePhoto: mockUpdatePhoto },
  } as unknown as Repositories;

  const Probe = () => {
    const { status, session, signIn, updatePhoto } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`photo:${session?.user.photoUrl ?? 'none'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => updatePhoto('https://cdn.example.com/a.png')}>
          <Text>set-photo</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());
  expect(screen.getByText('photo:none')).toBeTruthy();

  fireEvent.press(screen.getByText('set-photo'));
  await waitFor(() => expect(screen.getByText('photo:https://cdn.example.com/a.png')).toBeTruthy());
  expect(mockUpdatePhoto).toHaveBeenCalledWith('https://cdn.example.com/a.png');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx -t "updatePhoto"`
Expected: FAIL — `updatePhoto` is `undefined` on the value `useAuth()` returns.

- [ ] **Step 3: Implement `updatePhoto` in `AuthProvider`**

In `src/features/auth/AuthProvider.tsx`, add `updatePhoto` to the `AuthValue` interface, right after `switchSchool`:

```ts
switchSchool: (tenantId: string) => Promise<void>;
updatePhoto: (photoUrl: string | null) => Promise<void>;
```

Add the callback right after the existing `switchSchool` callback:

```tsx
const switchSchool = useCallback(
  async (tenantId: string) => {
    const s = await repos.auth.switchSchool(tenantId);
    await establishSession(s);
    setPendingSchools(null);
  },
  [repos, establishSession]
);

const updatePhoto = useCallback(
  async (photoUrl: string | null) => {
    await repos.auth.updatePhoto(photoUrl);
    setSession((prev) => (prev ? { ...prev, user: { ...prev.user, photoUrl } } : prev));
  },
  [repos]
);
```

Add `updatePhoto` to the `value` object and its dependency array:

```tsx
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
    updatePhoto,
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
    updatePhoto,
  ]
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/features/auth/__tests__/AuthProvider.test.tsx`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Add the `useUpdatePhoto` hook**

In `src/features/auth/hooks.ts`, add at the end of the file (matching the existing `useSwitchSchool` style):

```ts
export function useUpdatePhoto() {
  const { updatePhoto } = useAuth();
  return useMutation({ mutationFn: (photoUrl: string | null) => updatePhoto(photoUrl) });
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/features/auth/AuthProvider.tsx src/features/auth/__tests__/AuthProvider.test.tsx src/features/auth/hooks.ts
git commit -m "feat(auth): add updatePhoto to AuthProvider and a useUpdatePhoto hook"
```

---

### Task 5: `Avatar` component gains photo-with-fallback rendering

**Files:**

- Modify: `src/components/ui/Avatar.tsx`
- Test: `src/components/ui/__tests__/Avatar.test.tsx` (new)

All paths below are relative to `D:/SMS/sms-project/sms-teacher-app`.

**Interfaces:**

- Consumes: nothing new.
- Produces: `Avatar`'s new `photoUri?: string | null` prop — consumed by Task 6 (`ProfileScreen`) and Task 7 (`HomeScreen`/`PrincipalHomeScreen`).

- [ ] **Step 1: Write the failing component test**

Create `src/components/ui/__tests__/Avatar.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

test('renders initials when no photoUri is given', () => {
  render(<Avatar initials="AR" />);
  expect(screen.getByText('AR')).toBeTruthy();
  expect(screen.queryByTestId('avatar-photo')).toBeNull();
});

test('renders the photo and hides initials when photoUri is set', () => {
  render(<Avatar initials="AR" photoUri="https://cdn.example.com/a.png" />);
  expect(screen.getByTestId('avatar-photo')).toBeTruthy();
  expect(screen.queryByText('AR')).toBeNull();
});

test('falls back to initials when photoUri is explicitly null', () => {
  render(<Avatar initials="AR" photoUri={null} />);
  expect(screen.getByText('AR')).toBeTruthy();
  expect(screen.queryByTestId('avatar-photo')).toBeNull();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/components/ui/__tests__/Avatar.test.tsx`
Expected: FAIL — `photoUri` prop doesn't exist on `Avatar` yet (TypeScript error) and/or the photo branch doesn't render.

- [ ] **Step 3: Implement the `photoUri` prop**

Replace the full contents of `src/components/ui/Avatar.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface AvatarProps {
  initials: string;
  photoUri?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  photoUri,
  size = 44,
  backgroundColor = Colors.primary,
  textColor = Colors.white,
  fontSize,
}) => {
  const computedFontSize = fontSize ?? Math.floor(size * 0.36);
  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
    },
  ];

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={[containerStyle, styles.photo]}
        testID="avatar-photo"
      />
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={[styles.text, { color: textColor, fontSize: computedFontSize }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  photo: {
    resizeMode: 'cover',
  },
  text: {
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/ui/__tests__/Avatar.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Every existing `<Avatar initials={...} .../>` call site still compiles since `photoUri` is optional.)

- [ ] **Step 6: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/components/ui/Avatar.tsx src/components/ui/__tests__/Avatar.test.tsx
git commit -m "feat(ui): Avatar renders a photo when given, falls back to initials"
```

---

### Task 6: `ProfileScreen` — upload/change/remove your own photo

**Files:**

- Modify: `src/screens/ProfileScreen.tsx`

All paths below are relative to `D:/SMS/sms-project/sms-teacher-app`.

**Interfaces:**

- Consumes: `useAuth().session.user.photoUrl` (Task 3), `useUpdatePhoto()` (Task 4), `Avatar`'s `photoUri` prop (Task 5), `pickImageFromLibrary`/`takePhotoFromCamera` (existing, `src/lib/pickImage.ts`).
- Produces: nothing consumed by later tasks — this is a leaf UI task.

- [ ] **Step 1: Add the imports and local state**

In `src/screens/ProfileScreen.tsx`, find the import block:

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Card } from '../components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLogout } from '@/features/auth/hooks';
import { useDashboardStats } from '@/features/dashboard/hooks';
import { useMySchools } from '@/features/auth/useMySchools';
import type { ProfileStackParamList } from '../navigation/types';
```

Change to:

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Card } from '../components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLogout, useUpdatePhoto } from '@/features/auth/hooks';
import { useDashboardStats } from '@/features/dashboard/hooks';
import { useMySchools } from '@/features/auth/useMySchools';
import { pickImageFromLibrary, takePhotoFromCamera } from '@/lib/pickImage';
import type { ProfileStackParamList } from '../navigation/types';
```

- [ ] **Step 2: Add the photo-picking state and handler**

Find, inside the `ProfileScreen` component:

```tsx
const { session } = useAuth();
const user = session?.user;
const tenantName = session?.tenant.name ?? 'School';
const { data: stats } = useDashboardStats();
```

Change to:

```tsx
const { session } = useAuth();
const user = session?.user;
const tenantName = session?.tenant.name ?? 'School';
const { data: stats } = useDashboardStats();
const updatePhoto = useUpdatePhoto();
const [photoError, setPhotoError] = useState<string | null>(null);
const [pickerOpen, setPickerOpen] = useState(false);

const handlePickPhoto = async (source: 'library' | 'camera') => {
  setPhotoError(null);
  try {
    const uri = source === 'camera' ? await takePhotoFromCamera() : await pickImageFromLibrary();
    if (!uri) return;
    await updatePhoto.mutateAsync(uri);
    setPickerOpen(false);
  } catch {
    setPhotoError('Could not update your photo. Check permissions and try again.');
  }
};

const handleRemovePhoto = async () => {
  setPhotoError(null);
  try {
    await updatePhoto.mutateAsync(null);
    setPickerOpen(false);
  } catch {
    setPhotoError('Could not remove your photo. Try again.');
  }
};
```

- [ ] **Step 3: Wire the avatar to open the picker, and render the picker row**

Find the hero section's avatar:

```tsx
<Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroContent}>
  <Avatar initials={user?.initials ?? '?'} size={80} backgroundColor="rgba(255,255,255,0.2)" />
  <Text style={styles.heroName}>{user?.name ?? ''}</Text>
  <Text style={styles.heroTitle}>{user?.title ?? ''}</Text>
  <Text style={styles.heroSchool}>{tenantName}</Text>
</Animated.View>
```

Replace with:

```tsx
<Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroContent}>
  <TouchableOpacity
    onPress={() => setPickerOpen((open) => !open)}
    activeOpacity={0.8}
    testID="profile-avatar-button"
  >
    <View>
      <Avatar
        initials={user?.initials ?? '?'}
        photoUri={user?.photoUrl}
        size={80}
        backgroundColor="rgba(255,255,255,0.2)"
      />
      <View style={styles.avatarEditBadge}>
        {updatePhoto.isPending ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Ionicons name="camera" size={14} color={Colors.white} />
        )}
      </View>
    </View>
  </TouchableOpacity>
  <Text style={styles.heroName}>{user?.name ?? ''}</Text>
  <Text style={styles.heroTitle}>{user?.title ?? ''}</Text>
  <Text style={styles.heroSchool}>{tenantName}</Text>

  {pickerOpen && (
    <View style={styles.photoPickerRow}>
      <TouchableOpacity
        style={styles.photoPickerBtn}
        onPress={() => handlePickPhoto('library')}
        disabled={updatePhoto.isPending}
      >
        <Ionicons name="images-outline" size={16} color={Colors.white} />
        <Text style={styles.photoPickerBtnText}>Library</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.photoPickerBtn}
        onPress={() => handlePickPhoto('camera')}
        disabled={updatePhoto.isPending}
      >
        <Ionicons name="camera-outline" size={16} color={Colors.white} />
        <Text style={styles.photoPickerBtnText}>Camera</Text>
      </TouchableOpacity>
      {user?.photoUrl && (
        <TouchableOpacity
          style={styles.photoPickerBtn}
          onPress={handleRemovePhoto}
          disabled={updatePhoto.isPending}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.white} />
          <Text style={styles.photoPickerBtnText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  )}
  {photoError && <Text style={styles.photoErrorText}>{photoError}</Text>}
</Animated.View>
```

- [ ] **Step 4: Add the new styles**

Find the `styles` object's `heroContent` entry:

```ts
  heroContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
```

Add four new style entries right after it:

```ts
  heroContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  photoPickerBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
  },
  photoErrorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.coral,
    marginTop: 8,
    textAlign: 'center',
  },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx jest`
Expected: PASS, all suites green (regression check — no existing test targets `ProfileScreen` directly, per the same note in the multi-school-picker plan's equivalent step).

- [ ] **Step 7: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/screens/ProfileScreen.tsx
git commit -m "feat(profile): add photo upload/change/remove to the avatar"
```

---

### Task 7: Display the photo on `HomeScreen` and `PrincipalHomeScreen`

**Files:**

- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/principal/PrincipalHomeScreen.tsx`

All paths below are relative to `D:/SMS/sms-project/sms-teacher-app`.

**Interfaces:**

- Consumes: `session.user.photoUrl` (Task 3), `Avatar`'s `photoUri` prop (Task 5).
- Produces: nothing consumed by later tasks — this is a leaf UI task.

- [ ] **Step 1: Wire `HomeScreen`'s own avatar**

In `src/screens/HomeScreen.tsx`, find:

```tsx
<Avatar initials={user?.initials ?? '?'} size={50} />
```

Change to:

```tsx
<Avatar initials={user?.initials ?? '?'} photoUri={user?.photoUrl} size={50} />
```

- [ ] **Step 2: Wire `PrincipalHomeScreen`'s own avatar (not the other two)**

In `src/screens/principal/PrincipalHomeScreen.tsx`, this file has three `<Avatar>` usages. Only change the first one — the signed-in principal's own avatar. Find:

```tsx
<Avatar initials={user?.initials ?? '?'} size={50} />
```

Change to:

```tsx
<Avatar initials={user?.initials ?? '?'} photoUri={user?.photoUrl} size={50} />
```

Leave the other two usages (`<Avatar initials={a.requesterInitials} size={34} />` and
`<Avatar initials={s.initials} size={34} />`) exactly as they are — those render _other people's_
avatars (approval requesters, staff/student list rows), for whom no photo data is fetched by this
plan; adding `photoUri` there would require joining photo data onto those separate list endpoints,
which is out of scope here.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npx jest`
Expected: PASS, all suites green.

- [ ] **Step 5: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add src/screens/HomeScreen.tsx src/screens/principal/PrincipalHomeScreen.tsx
git commit -m "feat(home): show the signed-in user's own photo instead of initials"
```

---

### Task 8: Manual verification against the real backend

**Files:** none (verification only).

- [ ] **Step 1: Run the backend migrations**

```bash
cd D:/SMS/sms-project/sms-backend
dotnet run --project src/Sms.Api --launch-profile http
```

Confirm the console log shows migrations `M0097`/`M0098` (or whatever numbers they ended up as, if renumbered due to concurrent work) applying cleanly on startup with no errors.

- [ ] **Step 2: Start the teacher app**

```bash
cd D:/SMS/sms-project/sms-teacher-app
npx expo start --web --port 8081 --clear
```

- [ ] **Step 3: Verify upload, display, and removal**

Open `http://localhost:8081`, sign in with any test account. On the Profile screen: tap the avatar, choose Library, pick an image. Expected: the avatar updates to show the picked photo within a couple seconds (no page reload needed), and the same photo appears on the Home screen's header avatar (or the Principal Home screen's, if signed in as a principal).

- [ ] **Step 4: Verify persistence**

Log out and log back in with the same account. Expected: the photo is still there (confirms it round-trips through the backend, not just local state).

- [ ] **Step 5: Verify removal**

Tap the avatar again, choose Remove. Expected: the avatar reverts to showing initials, and this also persists across a fresh login.

- [ ] **Step 6: Verify a second account with no photo set shows initials**

Log in as a different test account that has never had a photo set. Expected: initials render as before, no crash, no broken image icon.
