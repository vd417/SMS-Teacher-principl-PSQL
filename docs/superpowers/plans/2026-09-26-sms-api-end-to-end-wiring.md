# Teacher App ↔ sms-api End-to-End Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove, and where necessary fix, every teacher and principal flow of the teacher app against `sms-api` (PostgreSQL 18 with RLS), using real authentication, real seeded data and real SignalR.

**Architecture:** Five phases, gated in order.
1. Baseline (read-only).
2. A deterministic, idempotent dev seed in `sms-api` (`tools/Sms.DevSeed`).
3. A live capture harness in the app plus the parity matrix. **CHECKPOINT 1:** the user approves the matrix.
4. A strict e2e gate that encodes the approved expectations and is run once to list the failures. **CHECKPOINT 2:** the user approves the fix list, added to this plan as Addendum A.
5. Row-by-row TDD fixes, then final verification. **CHECKPOINT 3:** the user approves the commits, and only then are they pushed.

**Tech Stack:**
- `sms-api`: .NET 10, Npgsql 9.0.3, xUnit 2.9 + FluentAssertions 8 + `WebApplicationFactory`, PostgreSQL 18.
- App: Expo 54 / RN 0.81, TypeScript 5.9, zod 4, jest 29 (babel-jest), `@microsoft/signalr` 10, Node 24.

**Spec:** `docs/superpowers/specs/2026-09-26-sms-api-end-to-end-wiring-design.md`. Executors must read it alongside this plan.

## Global Constraints

Copied from spec §2. Every task must follow them.

1. Never read, print, log or expose passwords, connection strings, user-secrets or `pgpass.conf`. Use them only through `dotnet run` user-secrets, Npgsql's pgpass lookup and the user-set `SMS_MIGRATOR_CONNECTION`.
2. Never run `init` against `sms_dev`. Never reset, drop, truncate, update, delete or overwrite non-seed data.
3. `Sms.PgMigrator status` is allowed. `migrate` is approval-gated, and so is applying any new migration to `sms_dev`.
4. The seed is isolated to the seed tenants and seed users, and it is genuinely idempotent.
5. No endpoints are invented to satisfy the matrix. If a required endpoint is missing, **stop** and raise it as a scope decision.
6. Never loosen a zod schema to accept a bad response.
7. Never fix something only because Swagger or the 2026-07-24 list mentions it.
8. No fix of any kind before the matrix is approved (CHECKPOINT 1), and none before the fix list is approved (CHECKPOINT 2).
9. `lan-apk` in `eas.json` is untouched unless wiring requires a change.
10. Commit locally only. **Never `git push`** until the user approves (CHECKPOINT 3).
11. Existing teacher-app behaviour must not regress. Do not rewrite navigation, auth, offline/NetInfo, session and tenant handling, or UI unless a matrix row requires it. Never remove backend endpoints.
12. Backend changes are additive only (no renaming or removing fields). SQL changes go in new migrations `0005_…` onward, and `0001`–`0004` and the baseline are never edited.
13. Health is checked at `GET /health/ready`.
14. The e2e gate has no SKIP, no mocked API, no mocked SignalR and no test-only endpoint. Sentry is mapped to its existing no-op mock because it is telemetry, not the system under test.

**Paths:**
- App repo: `D:\convert\SMS backend\sms-teacher-app` (branch `main`)
- API repo: `D:\convert\SMS backend\sms-api` (branch `postgres-migration`)

In this plan `APP` and `API` refer to those two roots.

## Review Focus

These are the five failure modes most likely to hurt a real user that the spec implies but no happy-path test would catch. Each has a pinned test in the task named.

1. **A seed row silently skipped by a conflicting non-seed row**, for example a slug or email already taken. Expected: the seed fails loudly and commits nothing. Test: Task 3, `Seed_fails_and_commits_nothing_when_a_seed_row_is_shadowed`.
2. **A weekend run**, where the timetable is Mon–Fri only (`WeekDay` = Mon..Fri). Expected: day-dependent e2e steps use the latest weekday, not today. Test: Task 5, `lastSchoolDay` unit tests.
3. **Tokens leaking into committed capture files.** Expected: every JWT, token, password, hash or cookie is redacted. Test: Task 5, `redact` unit tests.
4. **The API is down or not ready.** Expected: the whole e2e run fails before any test and never goes green. Test: Task 5, `globalSetup` preflight check, which Task 5 Step 7 verifies by running with the API stopped.
5. **A refresh token that still works after rotation, or after logout.** Expected: the old token gets 401. Test: Task 9, `refresh rotates and the old refresh token is rejected` and `logout revokes the refresh token`.

---

## Phase 0 — Baseline

### Task 1: Record the baseline and bring the environment up (read-only)

**Files:**
- Create: `APP/docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md`. Only the header in this task.

**Interfaces:**
- Produces: the matrix doc header, which later tasks append to, and a running API on `http://localhost:5162`.

- [ ] **Step 1: Check both repos are clean and on the expected branch**

```bash
cd "D:/convert/SMS backend/sms-api" && git branch --show-current && git rev-parse --short HEAD && git status --short
cd "D:/convert/SMS backend/sms-teacher-app" && git branch --show-current && git rev-parse --short HEAD && git status --short
```

Expected: `postgres-migration` / `34af78e` with no status lines, and `main` / a HEAD at or after `94205ec` (the spec commits) with no status lines. **If either repo is dirty or its branch has moved, stop and ask the user.**

- [ ] **Step 2: Write the matrix doc header**

```markdown
# sms-api Parity Matrix (Teacher App)

- Spec: `docs/superpowers/specs/2026-09-26-sms-api-end-to-end-wiring-design.md`
- Baseline at implementation start:
  - sms-teacher-app: branch `main`, HEAD `<from step 1>`, clean
  - sms-api: branch `postgres-migration`, HEAD `<from step 1>`, clean
- Source of truth: controller → policy → DTO → SQL proc/schema → live HTTP → app zod schema. `teacher-api.md` is NOT authoritative.

## Rows
(filled in by Task 7)
```

Fill in the two HEADs with the real values from Step 1. This is data you record, not a placeholder.

- [ ] **Step 3: Install app dependencies**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && npm ci
```

Expected: exit 0. `node_modules` is currently absent.

- [ ] **Step 4: Record the app gates as they are today**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && npx jest 2>&1 | tail -5 && npx tsc --noEmit && npx eslint . --max-warnings 1000 | tail -3
```

Record the pass/fail counts in the matrix header under `Pre-existing app gate state:`. Any failures that already exist are baseline and must not be counted as regressions caused by this work.

- [ ] **Step 5: Record the API gate as it is today**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet build Sms.slnx -c Debug 2>&1 | tail -3 && dotnet test Sms.slnx 2>&1 | tail -5
```

Record the counts under `Pre-existing API gate state:`.

- [ ] **Step 6: Check migration status (read-only)**

Ask the user to set `SMS_MIGRATOR_CONNECTION` in their own shell to the **owner** connection for `sms_dev`. The password can be left out so Npgsql uses pgpass. Then run:

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet run --project db/Sms.PgMigrator -- status
```

Expected: a list of applied and pending migrations.
- If anything is pending, **stop** and show the user the list. Run `migrate` only after explicit approval.
- If the database does not exist, **stop**. Creating it and running `init` on an empty database needs the user's approval.
- Never pass `init` to a database that has data.

- [ ] **Step 7: Start the API and check health**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet run --project src/Sms.Api --launch-profile http
```

Run this in the background. Then:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5162/health/ready
```

Expected: `200`. If the profile name differs, list profiles in `src/Sms.Api/Properties/launchSettings.json` and use the one bound to `:5162`.

- [ ] **Step 8: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md && git commit -m "docs(audit): parity matrix header with implementation baseline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 1 — Dev seed (`sms-api`)

**Schema facts this phase relies on** (verified from `db/postgres/04_tables.sql`, `05_constraints.sql`, `06_indexes.sql` and `07_rls_policies.sql`):
- All tables are `"dbo"."<Pascal>"` with quoted, case-sensitive identifiers.
- Modern tables have no foreign keys between them.
- RLS is forced on tenant tables: `rls.is_platform() OR "TenantId" = rls.current_tenant_id()`. The seed session sets `app.is_platform = '1'` so it passes both `USING` and `WITH CHECK`, whether it connects as the owner or as `sms_app`.
- `Tenants`, `UserRoles`, `Plans` and `RefreshTokens` have no RLS.
- `Tenants.Status` must be `'active'`, because `'trial'` returns 403 on school APIs. `Tier` must be `'platinum'`, because transport and geofence need it.
- Email uniqueness is per tenant (`UX_Users_Tenant_Email`). Login matches `lower(trim(Email))` across all tenants. `/me/schools` lists every tenant that has a Users row with that email.
- `Classes.ClassTeacherId` and `TimetableSlots.TeacherId` hold `Teachers.Id`. `BusAssignments.TeacherUserId` holds `Users.Id`.
- A student belongs to a class through `Students.ClassLabel = Classes.Name`, or through matching Grade and Section.
- Unique keys used for idempotency:
  - PK `"Id"` on every table written except `UserRoles`, whose PK is `("UserId","Role")`
  - `IX_Tenants_Slug`
  - `UX_Users_Tenant_Email`
  - `IX_Teachers_UserId`
  - `UX_Teachers_Tenant_EmployeeCode`
  - `UX_Students_Tenant_AdmissionNo`
  - `UQ_ClassSubjects_Class_Name`
  - `UX_TimetableSlots_Class_Day_Period`
  - `IX_SchoolLocations_TenantId`
  - `(TenantId,Name)` on TransportRoutes
  - `IX_BusAssignments_Teacher`
  - `(TenantId,StudentId)` on StudentBusAssignments
  - `(TenantId,ExamId,ClassId)` on ExamClasses

  Because of these, every insert uses `ON CONFLICT DO NOTHING` **with no conflict target**, so any of these keys prevents a duplicate. A post-insert check then proves every seed row with its deterministic Id exists, so a row skipped because a *non-seed* row already holds its key fails the run (Review Focus 1).

### Task 2: DevSeed project, deterministic IDs and the `_dev` guard

**Files:**
- Create: `API/tools/Sms.DevSeed/Sms.DevSeed.csproj`
- Create: `API/tools/Sms.DevSeed/SeedIds.cs`
- Create: `API/tools/Sms.DevSeed/DevSeedGuard.cs`
- Create: `API/tools/Sms.DevSeed/Cli.cs` (minimal in this task; completed in Task 3)
- Modify: `API/Sms.slnx` (add a `/tools/` folder containing the project)
- Modify: `API/tests/Sms.Tests.Unit/Sms.Tests.Unit.csproj` (add a ProjectReference)
- Test: `API/tests/Sms.Tests.Unit/DevSeed/DevSeedGuardTests.cs`, `API/tests/Sms.Tests.Unit/DevSeed/SeedIdsTests.cs`

**Interfaces:**
- Produces: `Sms.DevSeed.SeedIds.Of(string key) : Guid`
- Produces: `Sms.DevSeed.DevSeedGuard.Check(string? connectionString, IReadOnlyList<string> args) : string?` (returns null when allowed, otherwise the refusal message)
- Produces: `DevSeedGuard.ConfirmFlag = "--i-know-this-is-dev"`
- Produces: `Cli.ConnectionEnvVar = "SMS_MIGRATOR_CONNECTION"`

- [ ] **Step 1: Write the failing tests**

`API/tests/Sms.Tests.Unit/DevSeed/SeedIdsTests.cs`:

```csharp
using FluentAssertions;
using Sms.DevSeed;
using Xunit;

namespace Sms.Tests.Unit.DevSeed;

public class SeedIdsTests
{
    [Fact]
    public void Same_key_always_gives_the_same_guid() =>
        SeedIds.Of("teacher.a.user").Should().Be(SeedIds.Of("teacher.a.user"));

    [Fact]
    public void Different_keys_give_different_guids() =>
        SeedIds.Of("teacher.a.user").Should().NotBe(SeedIds.Of("teacher.b.user"));

    [Fact]
    public void Guid_is_stable_across_runs_and_machines() =>
        // Pinned: changing the derivation would orphan every row already seeded into a _dev database.
        SeedIds.Of("tenant.main").Should().Be(SeedIds.Of("tenant.main"))
            .And.NotBe(Guid.Empty);
}
```

`API/tests/Sms.Tests.Unit/DevSeed/DevSeedGuardTests.cs`:

```csharp
using FluentAssertions;
using Sms.DevSeed;
using Xunit;

namespace Sms.Tests.Unit.DevSeed;

public class DevSeedGuardTests
{
    private const string DevCs = "Host=localhost;Database=sms_dev;Username=owner";
    private static readonly string[] Confirmed = [DevSeedGuard.ConfirmFlag];

    [Fact]
    public void Allows_a_dev_database_with_the_confirm_flag() =>
        DevSeedGuard.Check(DevCs, Confirmed).Should().BeNull();

    [Fact]
    public void Refuses_without_the_confirm_flag() =>
        DevSeedGuard.Check(DevCs, []).Should().Contain(DevSeedGuard.ConfirmFlag);

    [Theory]
    [InlineData("Host=localhost;Database=sms;Username=owner")]
    [InlineData("Host=localhost;Database=sms_prod;Username=owner")]
    [InlineData("Host=localhost;Database=sms_dev_backup;Username=owner")]
    [InlineData("Host=localhost;Username=owner")]
    public void Refuses_any_database_not_ending_in_dev(string cs) =>
        DevSeedGuard.Check(cs, Confirmed).Should().StartWith("Refusing to seed database");

    [Fact]
    public void Refuses_when_the_connection_env_var_is_missing() =>
        DevSeedGuard.Check(null, Confirmed).Should().Contain("SMS_MIGRATOR_CONNECTION");

    [Fact]
    public void Refusal_never_echoes_the_connection_string()
    {
        const string secretish = "Host=localhost;Database=sms_prod;Username=owner;Password=hunter2";
        DevSeedGuard.Check(secretish, Confirmed).Should().NotContain("hunter2");
    }
}
```

- [ ] **Step 2: Create the project so the tests compile, then confirm they fail**

`API/tools/Sms.DevSeed/Sms.DevSeed.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <!-- Dev-only seed for a *_dev database: one isolated "SchoolDesk Dev Seed" tenant (+ a minimal second
         tenant for cross-tenant checks). Entry point is Sms.DevSeed.Cli (not a top-level Program) so the
         integration tests can reference it alongside Sms.Api's Program, like Sms.PgMigrator. -->
    <OutputType>Exe</OutputType>
    <StartupObject>Sms.DevSeed.Cli</StartupObject>
    <RootNamespace>Sms.DevSeed</RootNamespace>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Npgsql" Version="9.0.3" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\..\src\Sms.Shared.Kernel\Sms.Shared.Kernel.csproj" />
  </ItemGroup>
</Project>
```

`API/tools/Sms.DevSeed/SeedIds.cs`:

```csharp
using System.Security.Cryptography;
using System.Text;

namespace Sms.DevSeed;

/// Deterministic ids: the same key maps to the same Guid on every run, which is what makes
/// INSERT ... ON CONFLICT DO NOTHING idempotent. Never change the prefix: it would orphan seeded rows.
public static class SeedIds
{
    public static Guid Of(string key)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes("sms-devseed/v1/" + key));
        var bytes = hash[..16];
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50); // version nibble (name-based)
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80); // RFC 4122 variant
        return new Guid(bytes, bigEndian: true);
    }
}
```

`API/tools/Sms.DevSeed/DevSeedGuard.cs`:

```csharp
using Npgsql;

namespace Sms.DevSeed;

public static class DevSeedGuard
{
    public const string ConfirmFlag = "--i-know-this-is-dev";

    /// Null when seeding is allowed; otherwise the refusal. Never echoes the connection string.
    public static string? Check(string? connectionString, IReadOnlyList<string> args)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return $"{Cli.ConnectionEnvVar} is not set. Set it to the schema-owner connection of a *_dev database " +
                   "(omit the password to use pgpass).";

        string? db;
        try { db = new NpgsqlConnectionStringBuilder(connectionString).Database; }
        catch (ArgumentException) { return $"{Cli.ConnectionEnvVar} is not a valid Npgsql connection string."; }

        if (string.IsNullOrEmpty(db) || !db.EndsWith("_dev", StringComparison.Ordinal))
            return $"Refusing to seed database '{db}': only a database whose name ends in _dev is allowed.";

        if (!args.Contains(ConfirmFlag))
            return $"Refusing to run without {ConfirmFlag}.";

        return null;
    }
}
```

`API/tools/Sms.DevSeed/Cli.cs` (minimal version, replaced in Task 3):

```csharp
namespace Sms.DevSeed;

public static class Cli
{
    public const string ConnectionEnvVar = "SMS_MIGRATOR_CONNECTION";

    public static int Main(string[] args)
    {
        var error = DevSeedGuard.Check(Environment.GetEnvironmentVariable(ConnectionEnvVar), args);
        if (error is not null) { Console.Error.WriteLine(error); return 1; }
        return 0;
    }
}
```

Add a ProjectReference to the unit test csproj:

```xml
<ProjectReference Include="..\..\tools\Sms.DevSeed\Sms.DevSeed.csproj" />
```

Add this to `Sms.slnx` as a sibling of the `/tests/` folder, matching the existing element style:

```xml
<Folder Name="/tools/">
  <Project Path="tools/Sms.DevSeed/Sms.DevSeed.csproj" />
</Folder>
```

Temporarily make `SeedIds.Of` return `Guid.Empty` to watch the tests fail, then restore it:

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet test tests/Sms.Tests.Unit --filter "FullyQualifiedName~DevSeed"
```

Expected at first: the SeedIds tests FAIL (`Different_keys…`, `…NotBe(Guid.Empty)`).

- [ ] **Step 3: Restore the real implementation and run the tests**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet test tests/Sms.Tests.Unit --filter "FullyQualifiedName~DevSeed"
```

Expected: all 9 tests pass. `Refuses_any_database_not_ending_in_dev` checks the database name **before** the flag, so it returns the "Refusing to seed database" message even though the flag is present.

- [ ] **Step 4: Build the whole solution with warnings as errors**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet build Sms.slnx 2>&1 | tail -3
```

Expected: `0 Warning(s)  0 Error(s)`.

- [ ] **Step 5: Commit**

```bash
cd "D:/convert/SMS backend/sms-api" && git add tools/Sms.DevSeed Sms.slnx tests/Sms.Tests.Unit && git commit -m "feat(devseed): project skeleton, deterministic seed ids and the _dev guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: Seed data, idempotent runner and checksum

**Files:**
- Create: `API/tools/Sms.DevSeed/SeedRow.cs`, `SeedData.cs`, `SeedRunner.cs`, `SeedChecksum.cs`
- Modify: `API/tools/Sms.DevSeed/Cli.cs`
- Create: `API/tools/Sms.DevSeed/README.md`
- Modify: `API/tests/Sms.Tests.Integration/Sms.Tests.Integration.csproj` (add a ProjectReference to `..\..\tools\Sms.DevSeed\Sms.DevSeed.csproj`)
- Test: `API/tests/Sms.Tests.Integration/DevSeed/DevSeedTests.cs`

**Interfaces:**
- Consumes: `SeedIds.Of`, `DevSeedGuard.Check`, `Cli.ConnectionEnvVar` (Task 2); `Sms.Shared.Kernel.Auth.PasswordHasher` (`string Hash(string)`, parameterless constructor).
- Produces: `SeedRow(string Table, IReadOnlyDictionary<string, object> Values)`
- Produces: `SeedData.Build(IPasswordHasher hasher) : IReadOnlyList<SeedRow>`
- Produces: the `SeedData` constants `MainTenantId`, `OtherTenantId`, `PrincipalEmail`, `TeacherAEmail`, `TeacherBEmail`, `MultiEmail`, `OtherTeacherEmail`, `PrincipalPassword`, `TeacherPassword`, `SeedUserIds`, `Tables`
- Produces: `SeedRunner.RunAsync(string cs, IReadOnlyList<SeedRow> rows, CancellationToken ct = default) : Task<SeedReport>`, where `SeedReport.TotalInserted` is an int and `SeedReport.PerTable` is a dictionary of table to `(int Inserted, int Skipped)`
- Produces: `SeedChecksum.ComputeAsync(string cs, CancellationToken ct = default) : Task<IReadOnlyDictionary<string, (long Count, string Md5)>>`

- [ ] **Step 1: Write the failing integration tests**

`API/tests/Sms.Tests.Integration/DevSeed/DevSeedTests.cs`. Copy the `App()` factory settings exactly from `tests/Sms.Tests.Integration/Academics/AttendanceRollCallHttpTests.cs` (lines 14-25: `environment=Production`, `ConnectionStrings:Sql`, `Jwt:SigningKey`), adding whatever other `UseSetting` lines that file uses.

```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;
using Sms.DevSeed;
using Sms.Shared.Kernel.Auth;
using Xunit;

namespace Sms.Tests.Integration.DevSeed;

[Collection("sql")]
public class DevSeedTests(PostgresFixture fx)
{
    private const string Key = "integration-test-signing-key-32-bytes-min!!";

    private WebApplicationFactory<Program> App() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("environment", "Production");
            b.UseSetting("ConnectionStrings:Sql", fx.ConnectionString);
            b.UseSetting("Jwt:SigningKey", Key);
        });

    [Fact]
    public async Task Seed_is_idempotent_and_does_not_alter_seeded_rows()
    {
        var rows = SeedData.Build(new PasswordHasher());
        await SeedRunner.RunAsync(fx.ConnectionString, rows);
        var afterFirst = await SeedChecksum.ComputeAsync(fx.ConnectionString);

        var second = await SeedRunner.RunAsync(fx.ConnectionString, SeedData.Build(new PasswordHasher()));
        var afterSecond = await SeedChecksum.ComputeAsync(fx.ConnectionString);

        second.TotalInserted.Should().Be(0);
        afterSecond.Should().BeEquivalentTo(afterFirst);
        foreach (var table in SeedData.Tables)
            afterFirst[table].Count.Should().Be(rows.Count(r => r.Table == table), $"table {table}");
    }

    [Fact]
    public async Task Seeded_teacher_logs_in_through_the_real_auth_endpoint()
    {
        await SeedRunner.RunAsync(fx.ConnectionString, SeedData.Build(new PasswordHasher()));
        using var app = App();
        var client = app.CreateClient();

        var login = await client.PostAsJsonAsync("/v1/auth/login",
            new { email = SeedData.TeacherAEmail, password = SeedData.TeacherPassword });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        var access = (await login.Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("data").GetProperty("access_token").GetString();

        client.DefaultRequestHeaders.Authorization = new("Bearer", access);
        var me = (await client.GetFromJsonAsync<JsonElement>("/v1/auth/me")).GetProperty("data");
        me.GetProperty("tenant_id").GetGuid().Should().Be(SeedData.MainTenantId);
        me.GetProperty("roles").EnumerateArray().Select(r => r.GetString()).Should().Contain("school.teacher");
        me.GetProperty("employee").GetString().Should().Be("DS-T001");
        me.GetProperty("tier").GetString().Should().Be("platinum");
    }

    [Fact]
    public async Task Seed_fails_and_commits_nothing_when_a_seed_row_is_shadowed()
    {
        // A non-seed tenant already owns the slug a seed tenant wants, so ON CONFLICT DO NOTHING would
        // silently skip it. The runner must detect that and roll everything back.
        var rows = SeedData.Build(new PasswordHasher());
        var shadowSlug = (string)rows.First(r => r.Table == "Tenants").Values["Slug"] + "-shadow-test";
        var shadowed = rows.Select(r => r.Table == "Tenants" && (Guid)r.Values["Id"] == SeedData.MainTenantId
                ? r with { Values = new Dictionary<string, object>(r.Values) { ["Id"] = SeedIds.Of("shadow.tenant"), ["Slug"] = shadowSlug } }
                : r).ToList();
        await using (var conn = new NpgsqlConnection(fx.ConnectionString))
        {
            await conn.OpenAsync();
            await using var cmd = new NpgsqlCommand(
                """INSERT INTO "dbo"."Tenants" ("Id","Name","Slug","Status") VALUES (@id,'Not Seed',@slug,'active') ON CONFLICT DO NOTHING""", conn);
            cmd.Parameters.AddWithValue("id", Guid.NewGuid());
            cmd.Parameters.AddWithValue("slug", shadowSlug);
            await cmd.ExecuteNonQueryAsync();
        }

        var act = () => SeedRunner.RunAsync(fx.ConnectionString, shadowed);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*shadowed*");
        await using var check = new NpgsqlConnection(fx.ConnectionString);
        await check.OpenAsync();
        await using var q = new NpgsqlCommand("""SELECT count(*) FROM "dbo"."Tenants" WHERE "Id" = @id""", check);
        q.Parameters.AddWithValue("id", SeedIds.Of("shadow.tenant"));
        ((long)(await q.ExecuteScalarAsync())!).Should().Be(0);
    }
}
```

Add a ProjectReference from the integration csproj to `tools/Sms.DevSeed`.

- [ ] **Step 2: Run the tests and confirm they fail to compile**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~DevSeed" 2>&1 | tail -5
```

Expected: build errors, because `SeedData`, `SeedRunner` and `SeedChecksum` do not exist yet.

- [ ] **Step 3: Implement `SeedRow` and `SeedData`**

`API/tools/Sms.DevSeed/SeedRow.cs`:

```csharp
namespace Sms.DevSeed;

/// One INSERT into "dbo"."<Table>". Values are never null: omit a column to take its default.
public sealed record SeedRow(string Table, IReadOnlyDictionary<string, object> Values);
```

`API/tools/Sms.DevSeed/SeedData.cs`:

```csharp
using Sms.Shared.Kernel.Auth;

namespace Sms.DevSeed;

/// The whole dev school. Columns and types verified against db/postgres/04_tables.sql (see plan Phase 1).
public static class SeedData
{
    public static readonly Guid MainTenantId = SeedIds.Of("tenant.main");
    public static readonly Guid OtherTenantId = SeedIds.Of("tenant.other");

    public const string PrincipalEmail = "principal@seed.schooldesk.test";
    public const string TeacherAEmail = "teacher.a@seed.schooldesk.test";
    public const string TeacherBEmail = "teacher.b@seed.schooldesk.test";
    public const string MultiEmail = "multi@seed.schooldesk.test";
    public const string OtherTeacherEmail = "other.teacher@seed.schooldesk.test";
    // Dev fixtures, not secrets: documented in README.md and mirrored in the app's e2e/support/config.ts.
    public const string PrincipalPassword = "DevSeed-Principal-2026!";
    public const string TeacherPassword = "DevSeed-Teacher-2026!";

    public const double Lat = 18.5204, Lng = 73.8567;

    /// Insert order; also the checksum table list.
    public static readonly string[] Tables =
    [
        "Tenants", "SchoolLocations", "Users", "UserRoles", "Teachers", "Classes", "Students", "Subjects",
        "ClassSubjects", "TimetableSlots", "Exams", "ExamClasses", "ExamPapers", "LeaveRequests",
        "Announcements", "TransportRoutes", "RouteStops", "Buses", "BusStops", "BusAssignments",
        "StudentBusAssignments",
    ];

    private static readonly string[] Days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    private static readonly (int Period, string Start, string End)[] Periods =
        [(1, "09:00", "09:45"), (2, "09:50", "10:35"), (3, "10:40", "11:25")];

    private static readonly string[] StudentNamesA =
        ["Aarav Shah", "Diya Patil", "Ishaan Rao", "Kavya Joshi", "Rohan Das", "Saanvi Iyer", "Vihaan Nair", "Anaya Gupta", "Arjun Mehta", "Myra Kapoor"];
    private static readonly string[] StudentNamesB =
        ["Aditya Kumar", "Ira Sethi", "Kabir Singh", "Meera Pillai", "Neel Bose", "Riya Desai", "Shaurya Jain", "Tara Menon", "Yash Verma", "Zoya Khan"];

    public static IReadOnlyList<Guid> SeedUserIds =>
        [U("principal"), U("teacher.a"), U("teacher.b"), U("multi.main"), U("multi.other"), U("other.teacher")];

    private static Guid U(string k) => SeedIds.Of($"user.{k}");
    private static Guid T(string k) => SeedIds.Of($"teacher.{k}");
    private static Guid C(string k) => SeedIds.Of($"class.{k}");
    private static Guid S(string cls, int n) => SeedIds.Of($"student.{cls}.{n}");

    private static SeedRow Row(string table, params (string Col, object Val)[] cols) =>
        new(table, cols.ToDictionary(c => c.Col, c => c.Val));

    public static IReadOnlyList<SeedRow> Build(IPasswordHasher hasher)
    {
        var rows = new List<SeedRow>();
        var main = MainTenantId;
        var other = OtherTenantId;

        // Tenants: active + platinum (trial is blocked by BillingStateMiddleware; transport/geofence need platinum).
        rows.Add(Row("Tenants", ("Id", main), ("Name", "SchoolDesk Dev Seed"), ("Slug", "devseed-main"),
            ("Status", "active"), ("Tier", "platinum"), ("PlanName", "Platinum"), ("Lat", Lat), ("Lng", Lng),
            ("GeofenceRadiusMeters", 200), ("ContactEmail", PrincipalEmail)));
        rows.Add(Row("Tenants", ("Id", other), ("Name", "Dev Seed Other School"), ("Slug", "devseed-other"),
            ("Status", "active"), ("Tier", "platinum"), ("PlanName", "Platinum")));

        rows.Add(Row("SchoolLocations", ("Id", SeedIds.Of("location.main")), ("TenantId", main),
            ("Lat", Lat), ("Lng", Lng), ("RadiusMeters", 200), ("Name", "Dev Seed Campus")));

        // Users + roles. multi@ exists in both tenants → /me/schools returns 2 and switch-school is testable.
        var principalHash = hasher.Hash(PrincipalPassword);
        var teacherHash = hasher.Hash(TeacherPassword);
        void AddUser(string key, Guid tenant, string email, string name, string hash, string role)
        {
            rows.Add(Row("Users", ("Id", U(key)), ("TenantId", tenant), ("Email", email), ("Name", name),
                ("PasswordHash", hash), ("Status", "active")));
            rows.Add(Row("UserRoles", ("UserId", U(key)), ("Role", role)));
        }
        AddUser("principal", main, PrincipalEmail, "Priya Deshmukh", principalHash, "school.principal");
        AddUser("teacher.a", main, TeacherAEmail, "Asha Kulkarni", teacherHash, "school.teacher");
        AddUser("teacher.b", main, TeacherBEmail, "Bharat Menon", teacherHash, "school.teacher");
        AddUser("multi.main", main, MultiEmail, "Maya Fernandes", teacherHash, "school.teacher");
        AddUser("multi.other", other, MultiEmail, "Maya Fernandes", teacherHash, "school.teacher");
        AddUser("other.teacher", other, OtherTeacherEmail, "Omar Qureshi", teacherHash, "school.teacher");

        void AddTeacher(string key, Guid tenant, string userKey, string name, string email, string code,
            string designation, string subjects, string classTeacher) =>
            rows.Add(Row("Teachers", ("Id", T(key)), ("TenantId", tenant), ("UserId", U(userKey)), ("Name", name),
                ("Email", email), ("EmployeeCode", code), ("Designation", designation),
                ("SubjectsCsv", subjects), ("ClassTeacher", classTeacher), ("Status", "active")));
        AddTeacher("a", main, "teacher.a", "Asha Kulkarni", TeacherAEmail, "DS-T001", "Mathematics Teacher", "Mathematics", "IX-A");
        AddTeacher("b", main, "teacher.b", "Bharat Menon", TeacherBEmail, "DS-T002", "Science Teacher", "Science", "IX-B");
        AddTeacher("multi", main, "multi.main", "Maya Fernandes", MultiEmail, "DS-T003", "English Teacher", "English", "");
        AddTeacher("other", other, "other.teacher", "Omar Qureshi", OtherTeacherEmail, "OS-T001", "Mathematics Teacher", "Mathematics", "IX-A");

        // Classes: StudentCount left at its default on purpose; whether the API reports the live count is a matrix check.
        void AddClass(string key, Guid tenant, string name, string section, string classTeacherKey, string room) =>
            rows.Add(Row("Classes", ("Id", C(key)), ("TenantId", tenant), ("Name", name), ("Grade", "IX"),
                ("Section", section), ("Subject", "Mathematics"), ("Room", room), ("ClassTeacherId", T(classTeacherKey))));
        AddClass("ix-a", main, "IX-A", "A", "a", "R101");
        AddClass("ix-b", main, "IX-B", "B", "b", "R102");
        AddClass("other.ix-a", other, "IX-A", "A", "other", "R1");

        void AddStudents(string cls, Guid tenant, string label, string section, string prefix, string[] names)
        {
            for (var i = 0; i < names.Length; i++)
                rows.Add(Row("Students", ("Id", S(cls, i + 1)), ("TenantId", tenant), ("AdmissionNo", $"{prefix}-{i + 1:00}"),
                    ("Name", names[i]), ("Grade", "IX"), ("Section", section), ("ClassLabel", label), ("Roll", i + 1),
                    ("GuardianName", $"Guardian of {names[i]}"), ("GuardianPhone", $"+9190000{i + 1:00}{section}0".Replace("A", "1").Replace("B", "2")),
                    ("Status", "active")));
        }
        AddStudents("ix-a", main, "IX-A", "A", "DS-A", StudentNamesA);
        AddStudents("ix-b", main, "IX-B", "B", "DS-B", StudentNamesB);
        AddStudents("other.ix-a", other, "IX-A", "A", "OS-A", ["Other Student One", "Other Student Two", "Other Student Three"]);

        var subjects = new[] { ("Mathematics", "MATH", "a"), ("Science", "SCI", "b"), ("English", "ENG", "multi") };
        foreach (var (name, shortName, teacher) in subjects)
            rows.Add(Row("Subjects", ("Id", SeedIds.Of($"subject.{name}")), ("TenantId", main), ("Name", name),
                ("Short", shortName), ("TeacherId", T(teacher))));
        foreach (var cls in new[] { "ix-a", "ix-b" })
            foreach (var (name, _, _) in subjects)
                rows.Add(Row("ClassSubjects", ("Id", SeedIds.Of($"classsubject.{cls}.{name}")), ("TenantId", main),
                    ("ClassId", C(cls)), ("SubjectId", SeedIds.Of($"subject.{name}")), ("Name", name)));

        // Timetable Mon–Fri. IX-A: P1 Maths (A = class teacher AND first period), P2 Science (B), P3 English (multi).
        // IX-B: P1 Science (B), P2 Maths (A), P3 English (multi). B is never first-period/class teacher of IX-A → 403 on its roll-call.
        var plan = new (string Cls, string Label, int Period, string Subject, string Teacher)[]
        {
            ("ix-a", "IX-A", 1, "Mathematics", "a"), ("ix-a", "IX-A", 2, "Science", "b"), ("ix-a", "IX-A", 3, "English", "multi"),
            ("ix-b", "IX-B", 1, "Science", "b"), ("ix-b", "IX-B", 2, "Mathematics", "a"), ("ix-b", "IX-B", 3, "English", "multi"),
        };
        foreach (var day in Days)
            foreach (var p in plan)
            {
                var (_, start, end) = Periods.Single(x => x.Period == p.Period);
                rows.Add(Row("TimetableSlots", ("Id", SeedIds.Of($"slot.{p.Cls}.{day}.{p.Period}")), ("TenantId", main),
                    ("Day", day), ("Period", p.Period), ("Subject", p.Subject), ("ClassId", C(p.Cls)), ("ClassName", p.Label),
                    ("Room", p.Cls == "ix-a" ? "R101" : "R102"), ("StartTime", start), ("EndTime", end), ("TeacherId", T(p.Teacher))));
            }
        foreach (var day in Days)
            rows.Add(Row("TimetableSlots", ("Id", SeedIds.Of($"slot.other.{day}.1")), ("TenantId", other), ("Day", day),
                ("Period", 1), ("Subject", "Mathematics"), ("ClassId", C("other.ix-a")), ("ClassName", "IX-A"),
                ("StartTime", "09:00"), ("EndTime", "09:45"), ("TeacherId", T("other"))));

        var exam = SeedIds.Of("exam.ut1");
        rows.Add(Row("Exams", ("Id", exam), ("TenantId", main), ("Name", "Dev Seed Unit Test 1"), ("Type", "unit"),
            ("Grades", "IX"), ("FromDate", new DateOnly(2026, 11, 2)), ("ToDate", new DateOnly(2026, 11, 6)),
            ("SubjectCount", 2), ("Published", true)));
        foreach (var cls in new[] { "ix-a", "ix-b" })
            rows.Add(Row("ExamClasses", ("Id", SeedIds.Of($"examclass.{cls}")), ("TenantId", main), ("ExamId", exam), ("ClassId", C(cls))));
        void AddPaper(string key, string cls, string name, string subject, DateOnly date, string invigilator) =>
            rows.Add(Row("ExamPapers", ("Id", SeedIds.Of($"paper.{key}")), ("TenantId", main), ("ExamId", exam),
                ("ClassId", C(cls)), ("Name", name), ("Subject", subject), ("SubjectId", SeedIds.Of($"subject.{subject}")),
                ("Date", date), ("StartTime", "09:00"), ("DurationMin", 60), ("MaxMarks", 50), ("Status", "upcoming"),
                ("Invigilator1", invigilator), ("Topics", "Algebra")));
        AddPaper("ix-a.math", "ix-a", "IX-A Mathematics", "Mathematics", new DateOnly(2026, 11, 2), "Asha Kulkarni");
        AddPaper("ix-a.sci", "ix-a", "IX-A Science", "Science", new DateOnly(2026, 11, 3), "Bharat Menon");
        AddPaper("ix-b.math", "ix-b", "IX-B Mathematics", "Mathematics", new DateOnly(2026, 11, 2), "Asha Kulkarni");

        rows.Add(Row("LeaveRequests", ("Id", SeedIds.Of("leave.b.pending")), ("TenantId", main), ("RequesterId", U("teacher.b")),
            ("Type", "casual"), ("FromDate", new DateOnly(2026, 11, 10)), ("ToDate", new DateOnly(2026, 11, 11)),
            ("Reason", "Dev seed pending leave"), ("Status", "pending"), ("AppliedOn", new DateOnly(2026, 9, 26)),
            ("Priority", "medium")));

        rows.Add(Row("Announcements", ("Id", SeedIds.Of("announcement.welcome")), ("TenantId", main), ("Title", "Dev Seed Welcome"),
            ("Body", "Welcome to the SchoolDesk dev seed school."), ("Date", new DateTime(2026, 9, 26, 8, 0, 0, DateTimeKind.Utc)),
            ("From", "Priya Deshmukh"), ("Role", "principal"), ("Type", "info"), ("Audience", "all"), ("CreatorUserId", U("principal"))));

        // Transport: one route, one bus, teacher A on duty, IX-A students 1–5 riding.
        var route = SeedIds.Of("route.1");
        var bus = SeedIds.Of("bus.ds01");
        rows.Add(Row("TransportRoutes", ("Id", route), ("TenantId", main), ("Name", "Dev Seed Route 1")));
        var stops = new[] { ("Shivaji Nagar", 18.5308, 73.8475, "07:30"), ("FC Road", 18.5236, 73.8412, "07:40"), ("Campus Gate", Lat, Lng, "07:55") };
        for (var i = 0; i < stops.Length; i++)
        {
            var (name, lat, lng, time) = stops[i];
            rows.Add(Row("RouteStops", ("Id", SeedIds.Of($"routestop.{i + 1}")), ("TenantId", main), ("RouteId", route),
                ("Name", name), ("Seq", i + 1), ("Lat", lat), ("Lng", lng)));
            rows.Add(Row("BusStops", ("Id", SeedIds.Of($"busstop.{i + 1}")), ("TenantId", main), ("BusId", bus),
                ("Name", name), ("Time", time), ("Seq", i + 1), ("Lat", lat), ("Lng", lng)));
        }
        rows.Add(Row("Buses", ("Id", bus), ("TenantId", main), ("BusNo", "DS-01"), ("RouteName", "Dev Seed Route 1"),
            ("RouteId", route), ("Driver", "Dev Seed Driver"), ("DriverPhone", "+919000000999"), ("Capacity", 40)));
        rows.Add(Row("BusAssignments", ("Id", SeedIds.Of("busassignment.a")), ("TenantId", main),
            ("TeacherUserId", U("teacher.a")), ("BusId", bus)));
        for (var i = 1; i <= 5; i++)
            rows.Add(Row("StudentBusAssignments", ("Id", SeedIds.Of($"studentbus.{i}")), ("TenantId", main),
                ("StudentId", S("ix-a", i)), ("BusId", bus), ("StopId", SeedIds.Of($"busstop.{(i - 1) % 3 + 1}")), ("RouteId", route)));

        return rows;
    }
}
```

**Before running anything:** open `04_tables.sql` and tick off every column name used above against its table's DDL. The expected columns are listed in the Phase 1 facts. If any column differs, correct the seed, not the schema.

- [ ] **Step 4: Implement `SeedRunner` and `SeedChecksum`**

`API/tools/Sms.DevSeed/SeedRunner.cs`:

```csharp
using Npgsql;

namespace Sms.DevSeed;

public sealed record SeedReport(IReadOnlyDictionary<string, (int Inserted, int Skipped)> PerTable)
{
    public int TotalInserted => PerTable.Values.Sum(v => v.Inserted);
}

public static class SeedRunner
{
    /// One transaction. INSERT ... ON CONFLICT DO NOTHING only (never UPDATE/DELETE/TRUNCATE), then proves every
    /// seed row exists under its deterministic key — a row skipped because a NON-seed row holds one of its unique
    /// keys throws and rolls the whole run back.
    public static async Task<SeedReport> RunAsync(string cs, IReadOnlyList<SeedRow> rows, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await PlatformContext.ApplyAsync(conn, tx, ct);

        var stats = new Dictionary<string, (int Inserted, int Skipped)>();
        foreach (var row in rows)
        {
            var cols = row.Values.Keys.ToList();
            var sql = $"INSERT INTO \"dbo\".\"{row.Table}\" ({string.Join(", ", cols.Select(c => $"\"{c}\""))}) " +
                      $"VALUES ({string.Join(", ", cols.Select((_, i) => $"@p{i}"))}) ON CONFLICT DO NOTHING";
            await using var cmd = new NpgsqlCommand(sql, conn, tx);
            for (var i = 0; i < cols.Count; i++) cmd.Parameters.AddWithValue($"p{i}", row.Values[cols[i]]);
            var inserted = await cmd.ExecuteNonQueryAsync(ct) == 1;
            stats.TryGetValue(row.Table, out var s);
            stats[row.Table] = inserted ? (s.Inserted + 1, s.Skipped) : (s.Inserted, s.Skipped + 1);
        }

        foreach (var row in rows)
            if (!await ExistsAsync(conn, tx, row, ct))
                throw new InvalidOperationException(
                    $"Seed row {row.Table}/{Describe(row)} was shadowed by a conflicting non-seed row; nothing was committed.");

        await tx.CommitAsync(ct);
        return new SeedReport(stats);
    }

    private static async Task<bool> ExistsAsync(NpgsqlConnection conn, NpgsqlTransaction tx, SeedRow row, CancellationToken ct)
    {
        var keys = row.Values.ContainsKey("Id") ? new[] { "Id" } : new[] { "UserId", "Role" };
        var where = string.Join(" AND ", keys.Select((k, i) => $"\"{k}\" = @k{i}"));
        await using var cmd = new NpgsqlCommand($"SELECT count(*) FROM \"dbo\".\"{row.Table}\" WHERE {where}", conn, tx);
        for (var i = 0; i < keys.Length; i++) cmd.Parameters.AddWithValue($"k{i}", row.Values[keys[i]]);
        return (long)(await cmd.ExecuteScalarAsync(ct))! == 1;
    }

    private static string Describe(SeedRow row) =>
        row.Values.TryGetValue("Id", out var id) ? id.ToString()! : $"{row.Values["UserId"]}:{row.Values["Role"]}";
}

internal static class PlatformContext
{
    /// Forced RLS applies even to the table owner; platform context satisfies USING and WITH CHECK.
    public static async Task ApplyAsync(NpgsqlConnection conn, NpgsqlTransaction tx, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand("SELECT set_config('app.is_platform', '1', true)", conn, tx);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
```

`API/tools/Sms.DevSeed/SeedChecksum.cs`:

```csharp
using Npgsql;

namespace Sms.DevSeed;

/// Per-table row count + md5 of the seed-owned rows (seed tenants / seed users only) — proves a re-run changed nothing.
public static class SeedChecksum
{
    public static async Task<IReadOnlyDictionary<string, (long Count, string Md5)>> ComputeAsync(string cs, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await PlatformContext.ApplyAsync(conn, tx, ct);

        var result = new Dictionary<string, (long, string)>();
        foreach (var table in SeedData.Tables)
        {
            var filter = table switch
            {
                "Tenants" => "\"Id\" = ANY(@tenants)",
                "UserRoles" => "\"UserId\" = ANY(@users)",
                _ => "\"TenantId\" = ANY(@tenants)",
            };
            await using var cmd = new NpgsqlCommand(
                $"SELECT count(*), coalesce(md5(string_agg(t::text, '|' ORDER BY t::text)), '') FROM \"dbo\".\"{table}\" t WHERE {filter}",
                conn, tx);
            cmd.Parameters.AddWithValue("tenants", new[] { SeedData.MainTenantId, SeedData.OtherTenantId });
            cmd.Parameters.AddWithValue("users", SeedData.SeedUserIds.ToArray());
            await using var r = await cmd.ExecuteReaderAsync(ct);
            await r.ReadAsync(ct);
            result[table] = (r.GetInt64(0), r.GetString(1));
        }
        await tx.RollbackAsync(ct);
        return result;
    }
}
```

**Note on the idempotency test's row count:** `Seed_is_idempotent…` requires `count == rows.Count(table)`. For `Users` and `UserRoles` the checksum filter covers exactly the six seed users, and for every other table it covers exactly the two seed tenants, so the counts match only if no other test has written into the seed tenants. No other test uses these deterministic IDs.

- [ ] **Step 5: Complete the CLI**

Replace `API/tools/Sms.DevSeed/Cli.cs`:

```csharp
using Npgsql;
using Sms.Shared.Kernel.Auth;

namespace Sms.DevSeed;

/// Usage: SMS_MIGRATOR_CONNECTION=<owner cs of a *_dev db> dotnet run --project tools/Sms.DevSeed -- --i-know-this-is-dev
/// Exit codes: 0 seeded (or already seeded), 1 refused, 2 failed (nothing committed).
public static class Cli
{
    public const string ConnectionEnvVar = "SMS_MIGRATOR_CONNECTION";

    public static async Task<int> Main(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable(ConnectionEnvVar);
        var error = DevSeedGuard.Check(cs, args);
        if (error is not null) { Console.Error.WriteLine(error); return 1; }

        try
        {
            var report = await SeedRunner.RunAsync(cs!, SeedData.Build(new PasswordHasher()));
            foreach (var table in SeedData.Tables)
                if (report.PerTable.TryGetValue(table, out var s))
                    Console.WriteLine($"{table,-22} inserted {s.Inserted,3}  skipped {s.Skipped,3}");
            Console.WriteLine($"Total inserted: {report.TotalInserted}");
            return 0;
        }
        catch (Exception ex) when (ex is NpgsqlException or InvalidOperationException)
        {
            // Npgsql messages never contain the password; the connection string itself is never printed.
            Console.Error.WriteLine($"FAILED, nothing committed: {ex.Message}");
            return 2;
        }
    }
}
```

- [ ] **Step 6: Run the tests**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~DevSeed" 2>&1 | tail -5
```

Expected: 3 passed. If `Seeded_teacher_logs_in…` fails because `employee` is null, check the `ProfileDao` lookup (Teachers.UserId = the user's Id). The seed sets `UserId`, so a failure here is a real finding: record it for the matrix and do not work around it.

- [ ] **Step 7: Write the README**

`API/tools/Sms.DevSeed/README.md`:

````markdown
# Sms.DevSeed

Seeds an isolated demo school into a **`*_dev`** PostgreSQL database for teacher-app end-to-end testing.

```bash
# In your own shell: owner role of the _dev db; omit Password to use pgpass. Never commit this.
export SMS_MIGRATOR_CONNECTION="Host=localhost;Port=5432;Database=sms_dev;Username=<owner>"
dotnet run --project tools/Sms.DevSeed -- --i-know-this-is-dev
```

- It refuses any database whose name does not end in `_dev`, and it refuses to run without `--i-know-this-is-dev`.
- It is idempotent: it uses deterministic ids and `INSERT … ON CONFLICT DO NOTHING`. A second run inserts 0 rows.
- It never runs UPDATE, DELETE or TRUNCATE.
- It fails, and commits nothing, if a non-seed row already holds one of its unique keys.

## Seeded logins (dev fixtures, not secrets)

| Email | Password | Tenant | Role | Notes |
|---|---|---|---|---|
| principal@seed.schooldesk.test | DevSeed-Principal-2026! | SchoolDesk Dev Seed | school.principal | |
| teacher.a@seed.schooldesk.test | DevSeed-Teacher-2026! | SchoolDesk Dev Seed | school.teacher | Class teacher of IX-A, IX-A period 1, bus DS-01 duty |
| teacher.b@seed.schooldesk.test | DevSeed-Teacher-2026! | SchoolDesk Dev Seed | school.teacher | Class teacher of IX-B; IX-A period 2 only, so IX-A roll-call returns 403 |
| multi@seed.schooldesk.test | DevSeed-Teacher-2026! | both schools | school.teacher | Exercises /me/schools and switch-school |
| other.teacher@seed.schooldesk.test | DevSeed-Teacher-2026! | Dev Seed Other School | school.teacher | Cross-tenant negative checks |

Data: classes IX-A and IX-B with 10 students each; a Mon–Fri timetable with periods 1–3; exam "Dev Seed Unit Test 1" with 3 papers; one pending leave from teacher B; one announcement; a geofence at 18.5204, 73.8567 (200 m); bus DS-01 on "Dev Seed Route 1" (3 stops, 5 riders).
````

- [ ] **Step 8: Run the full API test suite**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet test Sms.slnx 2>&1 | tail -5
```

Expected: the same counts as the Task 1 baseline, plus the 12 new tests passing.

- [ ] **Step 9: Commit**

```bash
cd "D:/convert/SMS backend/sms-api" && git add tools/Sms.DevSeed tests/Sms.Tests.Integration && git commit -m "feat(devseed): isolated idempotent dev school seed with shadow detection and checksum

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Seed `sms_dev` and prove the second run changes nothing

**Files:** none are changed. This task produces evidence only.

**Interfaces:**
- Consumes: the Task 3 CLI.
- Produces: a seeded `sms_dev`, which Tasks 6 onward require.

- [ ] **Step 1: Confirm the user has `SMS_MIGRATOR_CONNECTION` set** in the shell running the tool (from Task 1 Step 6). Do not print it.

- [ ] **Step 2: First run**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet run --project tools/Sms.DevSeed -- --i-know-this-is-dev
```

Expected: exit 0 and `Total inserted: <N>`, where N > 0 is the full row count, about 220.

- [ ] **Step 3: Second run**

Run the same command again. Expected: exit 0, and every table shows `inserted 0`, so `Total inserted: 0`.

- [ ] **Step 4: Log in through the running API**

```bash
curl -s -X POST http://localhost:5162/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"teacher.a@seed.schooldesk.test","password":"DevSeed-Teacher-2026!"}' -o /dev/null -w "%{http_code}\n"
```

Expected: `200`. The command prints only the status code, never the token body.

- [ ] **Step 5: Record the results in the matrix doc**

Add a `Seed evidence:` section to the matrix doc with the first-run total, the second-run total of 0, and the login status. Then commit in the app repo:

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md && git commit -m "docs(audit): record dev seed evidence

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Phase 2 — Capture harness and parity matrix (app)

### Task 5: The e2e harness (real HTTP layer, real SignalR, preflight check, redaction)

**Files:**
- Create: `APP/jest.e2e.config.js`, `APP/jest.capture.config.js`
- Create: `APP/e2e/support/setup.ts`, `globalSetup.ts`, `config.ts`, `session.ts`, `raw.ts`, `redact.ts`, `dates.ts`, `hub.ts`
- Create tests: `APP/e2e/support/__tests__/redact.test.ts`, `APP/e2e/support/__tests__/dates.test.ts`. These pure unit tests match the existing `npm test` pattern and run there.
- Modify: `APP/package.json` (scripts)

**Interfaces:**
- Consumes (existing app code):
  - `createHttpClient(config: HttpClientConfig): HttpClient` from `@/lib/httpClient`
  - `authSnapshot.get()` and `.clear()` from `@/lib/authSnapshot`
  - `createHttpRepositories(http): Repositories` from `@/data/repositories/factory`
  - `Repositories` from `@/data/repositories/types`
  - `Session` from `@/data/domain`
  - `liveHubUrl(base)` and `liveEventType(payload)` from `@/lib/liveEvents`
  - `transportHubUrl(base)` from `@/lib/transportHub`
- Produces:
  - `apiBaseUrl(): string`
  - `SEED` constants
  - `loginAs(email, password): Promise<Actor>` and `actorFor(session): Actor`, where `Actor = { session, http, repos, auth: { accessToken; tenantId } }`
  - `raw(actor | null, method, path, opts?): Promise<{ status: number; body: unknown }>`
  - `redact(v: unknown): unknown`
  - `lastSchoolDay(now?: Date): string`
  - `connectLive(token)` and `connectFleet(token)`, both returning `Promise<HubRecorder>`
  - `isLive(type)` and `isEvent(name)`, predicates over `HubEvent = { event: string; payload: unknown }`

- [ ] **Step 1: Write the failing unit tests**

`APP/e2e/support/__tests__/redact.test.ts`:

```ts
import { redact } from '../redact';

test('redacts sensitive keys at any depth', () => {
  expect(
    redact({ data: { access_token: 'a', refresh_token: 'b', user: { password_hash: 'h', name: 'Asha' } } }),
  ).toEqual({ data: { access_token: '[REDACTED]', refresh_token: '[REDACTED]', user: { password_hash: '[REDACTED]', name: 'Asha' } } });
});

test('redacts JWT-shaped strings inside ordinary values', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';
  expect(redact({ note: `Bearer ${jwt}`, list: [jwt] })).toEqual({ note: 'Bearer [REDACTED_JWT]', list: ['[REDACTED_JWT]'] });
});

test('leaves ordinary data untouched', () => {
  expect(redact({ data: [{ id: 'x', name: 'IX-A', student_count: 10, cookieJar: undefined }] })).toEqual({
    data: [{ id: 'x', name: 'IX-A', student_count: 10, cookieJar: '[REDACTED]' }],
  });
});
```

`APP/e2e/support/__tests__/dates.test.ts`:

```ts
import { lastSchoolDay } from '../dates';

test('a weekday returns itself', () => {
  expect(lastSchoolDay(new Date(2026, 8, 23))).toBe('2026-09-23'); // Wed
});
test('Saturday and Sunday fall back to Friday', () => {
  expect(lastSchoolDay(new Date(2026, 8, 26))).toBe('2026-09-25'); // Sat
  expect(lastSchoolDay(new Date(2026, 8, 27))).toBe('2026-09-25'); // Sun
});
test('crosses a month boundary', () => {
  expect(lastSchoolDay(new Date(2026, 10, 1))).toBe('2026-10-30'); // Sun 1 Nov → Fri 30 Oct
});
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && npx jest e2e/support
```

Expected: FAIL with "Cannot find module '../redact'" and "Cannot find module '../dates'".

- [ ] **Step 3: Implement `redact.ts` and `dates.ts`**

`APP/e2e/support/redact.ts`:

```ts
const SENSITIVE_KEY = /token|password|secret|cookie|authorization|hash|otp/i;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

/** Deep copy with credentials removed. Applied to every captured body before it is written to disk. */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(JWT, '[REDACTED_JWT]');
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v)]),
    );
  }
  return value;
}
```

`APP/e2e/support/dates.ts`:

```ts
/** Latest Mon–Fri on or before `now` (local), as YYYY-MM-DD. The seed timetable is Mon–Fri only (WeekDay). */
export function lastSchoolDay(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
```

- [ ] **Step 4: Run the tests**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && npx jest e2e/support
```

Expected: 6 passed.

- [ ] **Step 5: Write the configs and the rest of the harness**

`APP/jest.e2e.config.js`:

```js
/**
 * Live end-to-end gate against a running sms-api (see docs/superpowers/specs/2026-09-26-sms-api-end-to-end-wiring-design.md §7).
 * NOT part of `npm test`. Plain Node environment: real fetch, real @microsoft/signalr — no API or SignalR mocks.
 * Sentry is mapped to its no-op mock because it is telemetry, not the system under test.
 */
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/e2e/**/*.e2e.test.ts'],
  setupFiles: ['<rootDir>/e2e/support/setup.ts'],
  globalSetup: '<rootDir>/e2e/support/globalSetup.ts',
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sentry/react-native$': '<rootDir>/jest/sentryMock.js',
  },
  testTimeout: 30000,
  maxWorkers: 1,
};
```

`APP/jest.capture.config.js`:

```js
/** Parity-matrix live capture (Task 6). Same real stack as the e2e gate; writes redacted JSON evidence. */
const base = require('./jest.e2e.config.js');

module.exports = { ...base, testMatch: ['<rootDir>/e2e/capture/**/*.capture.test.ts'] };
```

`APP/e2e/support/setup.ts`:

```ts
// src/config/env.ts reads __DEV__ at import time; jest-expo defines it, plain Node does not.
(globalThis as { __DEV__?: boolean }).__DEV__ = true;
```

`APP/e2e/support/globalSetup.ts`:

```ts
/** Fails the whole run (non-zero exit, no test executes) when sms-api is unreachable or not ready. */
export default async function globalSetup(): Promise<void> {
  const base = process.env.E2E_API_BASE_URL;
  if (!base) throw new Error('E2E_API_BASE_URL is required, e.g. http://localhost:5162/v1');
  const origin = base.replace(/\/$/, '').replace(/\/v\d+$/, '');
  let status = 0;
  try {
    status = (await fetch(`${origin}/health/ready`)).status;
  } catch (e) {
    throw new Error(`sms-api preflight failed: ${origin}/health/ready unreachable (${(e as Error).message})`);
  }
  if (status !== 200) throw new Error(`sms-api preflight failed: /health/ready returned ${status}`);
}
```

`APP/e2e/support/config.ts`:

```ts
export function apiBaseUrl(): string {
  const url = process.env.E2E_API_BASE_URL;
  if (!url) throw new Error('E2E_API_BASE_URL is required, e.g. http://localhost:5162/v1');
  if (!/\/v\d+\/?$/.test(url)) throw new Error('E2E_API_BASE_URL must end with /v1');
  return url.replace(/\/$/, '');
}

/** Mirrors sms-api tools/Sms.DevSeed (SeedData.cs + README). Dev fixtures, not secrets. */
export const SEED = {
  principal: { email: 'principal@seed.schooldesk.test', password: 'DevSeed-Principal-2026!', name: 'Priya Deshmukh' },
  teacherA: { email: 'teacher.a@seed.schooldesk.test', password: 'DevSeed-Teacher-2026!', name: 'Asha Kulkarni', employee: 'DS-T001' },
  teacherB: { email: 'teacher.b@seed.schooldesk.test', password: 'DevSeed-Teacher-2026!', name: 'Bharat Menon', employee: 'DS-T002' },
  multi: { email: 'multi@seed.schooldesk.test', password: 'DevSeed-Teacher-2026!' },
  otherTeacher: { email: 'other.teacher@seed.schooldesk.test', password: 'DevSeed-Teacher-2026!' },
  mainSchool: 'SchoolDesk Dev Seed',
  otherSchool: 'Dev Seed Other School',
  classA: 'IX-A',
  classB: 'IX-B',
  studentsPerClass: 10,
  otherSchoolStudentNames: ['Other Student One', 'Other Student Two', 'Other Student Three'],
  examPaperA: 'IX-A Mathematics',
  announcementTitle: 'Dev Seed Welcome',
  pendingLeaveReason: 'Dev seed pending leave',
  busNo: 'DS-01',
  busRiders: 5,
  geo: { lat: 18.5204, lng: 73.8567, radiusMeters: 200 },
} as const;
```

`APP/e2e/support/session.ts`:

```ts
import type { Session } from '@/data/domain';
import { createHttpRepositories } from '@/data/repositories/factory';
import type { Repositories } from '@/data/repositories/types';
import { authSnapshot } from '@/lib/authSnapshot';
import { createHttpClient, type HttpClient } from '@/lib/httpClient';
import { apiBaseUrl } from './config';

export interface Actor {
  session: Session;
  http: HttpClient;
  repos: Repositories;
  auth: { accessToken: string; tenantId: string };
}

/** auth.repo writes the module-level authSnapshot during login, so each actor then gets its own client bound to its
 *  own tokens (several users are signed in at once). NEVER call loginAs concurrently (no Promise.all): two in-flight
 *  logins would race on the shared snapshot and cross tokens. */
export async function loginAs(email: string, password: string): Promise<Actor> {
  const bootstrap = createHttpRepositories(createHttpClient({ baseUrl: apiBaseUrl(), getAuth: () => authSnapshot.get() }));
  try {
    return actorFor(await bootstrap.auth.login(email, password));
  } finally {
    authSnapshot.clear();
  }
}

export function actorFor(session: Session): Actor {
  const auth = { accessToken: session.accessToken, tenantId: session.tenant.id };
  const http = createHttpClient({ baseUrl: apiBaseUrl(), getAuth: () => auth });
  return { session, http, repos: createHttpRepositories(http), auth };
}
```

`APP/e2e/support/raw.ts`:

```ts
import { apiBaseUrl } from './config';
import type { Actor } from './session';

/** Raw call used where the test must see the HTTP status or the unparsed body (authorization and capture). */
export async function raw(
  actor: Actor | null,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers };
  if (actor) {
    headers.Authorization = `Bearer ${actor.auth.accessToken}`;
    headers['X-Tenant-Id'] ??= actor.auth.tenantId;
  }
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}
```

`APP/e2e/support/hub.ts`:

```ts
import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import { liveEventType, liveHubUrl } from '@/lib/liveEvents';
import { transportHubUrl } from '@/lib/transportHub';
import { apiBaseUrl } from './config';

export interface HubEvent {
  event: string;
  payload: unknown;
}
type Pred = (e: HubEvent) => boolean;

export interface HubRecorder {
  conn: HubConnection;
  seen: HubEvent[];
  /** Resolves with the first matching event (already seen or future); rejects after `ms`. */
  waitFor(pred: Pred, ms?: number): Promise<HubEvent>;
  stop(): Promise<void>;
}

async function connect(url: string, token: string, events: string[]): Promise<HubRecorder> {
  const conn = new HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory: () => token, withCredentials: false })
    .configureLogging(LogLevel.None)
    .build();
  const seen: HubEvent[] = [];
  const waiters: { pred: Pred; resolve: (e: HubEvent) => void }[] = [];
  for (const name of events) {
    conn.on(name, (payload: unknown) => {
      const e = { event: name, payload };
      seen.push(e);
      for (const w of [...waiters]) {
        if (w.pred(e)) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(e);
        }
      }
    });
  }
  await conn.start();
  return {
    conn,
    seen,
    stop: () => conn.stop(),
    waitFor(pred, ms = 10000) {
      const hit = seen.find(pred);
      if (hit) return Promise.resolve(hit);
      return new Promise<HubEvent>((resolve, reject) => {
        const waiter = {
          pred,
          resolve: (e: HubEvent) => {
            clearTimeout(timer);
            resolve(e);
          },
        };
        const timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`no matching hub event within ${ms} ms`));
        }, ms);
        waiters.push(waiter);
      });
    },
  };
}

export const connectLive = (token: string) => connect(liveHubUrl(apiBaseUrl()), token, ['live_event']);
export const connectFleet = (token: string) =>
  connect(transportHubUrl(apiBaseUrl()), token, ['position_update', 'trip_started', 'trip_ended', 'fleet_update']);

export const isLive = (type: string): Pred => (e) => e.event === 'live_event' && liveEventType(e.payload) === type;
export const isEvent = (name: string): Pred => (e) => e.event === name;
```

Add these scripts to `APP/package.json`, keeping the existing ones:

```json
"e2e:sms-api": "jest -c jest.e2e.config.js --runInBand",
"capture:sms-api": "jest -c jest.capture.config.js --runInBand"
```

- [ ] **Step 6: Add a preflight smoke test and run it against the live API**

`APP/e2e/00-preflight.e2e.test.ts`:

```ts
import { SEED } from './support/config';
import { loginAs } from './support/session';

test('the real HTTP layer logs in a seed teacher against sms-api', async () => {
  const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
  expect(a.session.user.role).toBe('teacher');
  expect(a.session.tenant.name).toBe(SEED.mainSchool);
});
```

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npm run e2e:sms-api
```

Expected: 1 passed.

- [ ] **Step 7: Check that a down API fails the run (Review Focus 4)**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5999/v1 npm run e2e:sms-api; echo "exit=$?"
```

Expected: `sms-api preflight failed: … unreachable`, `exit=1`, and 0 tests executed.

- [ ] **Step 8: Run the app gates**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && npx jest && npx tsc --noEmit && npx eslint e2e jest.e2e.config.js jest.capture.config.js
```

Expected: the baseline count plus 6 new tests passing, no tsc errors, and no new lint errors.

- [ ] **Step 9: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e jest.e2e.config.js jest.capture.config.js package.json && git commit -m "test(e2e): live sms-api harness — real http layer, real SignalR, preflight, redaction

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Live GET capture as teacher A, teacher B and the principal

**Files:**
- Create: `APP/e2e/capture/rows.ts`, `APP/e2e/capture/capture.capture.test.ts`
- Output (committed as evidence): `APP/docs/superpowers/audits/sms-api-capture/<role>/<ROW-ID>.json` and `APP/docs/superpowers/audits/sms-api-capture/summary.json`

**Interfaces:**
- Consumes: `loginAs`, `raw`, `redact`, `lastSchoolDay`, `SEED` (Task 5); `Repositories` methods listed in the matrix row table below.
- Produces: one redacted JSON file per role and row, shaped `{ rowId, role, method, path, status, zod: 'ok' | 'n/a' | string, body }`, plus `summary.json`, an array of `{ rowId, role, status, zod }`.

- [ ] **Step 1: Write the row table**

`APP/e2e/capture/rows.ts`:

```ts
import type { Repositories } from '@/data/repositories/types';

export interface CaptureCtx {
  date: string;
  classAId: string;
  studentAId: string;
  paperAId: string;
  busId: string;
  staffPersonId: string;
  threadId: string | null;
  routeId: string | null;
}

export interface CaptureRow {
  id: string;
  path: (c: CaptureCtx) => string;
  /** Same call through the app's real repo (zod-parsed). Omitted for rows with no zod schema (TS cast only). */
  repo?: (r: Repositories, c: CaptureCtx) => Promise<unknown>;
}

// Every GET the app makes. IDs match the parity matrix. Writes are exercised by the e2e gate (Task 9+), not here.
export const ROWS: CaptureRow[] = [
  { id: 'AUTH-05', path: () => '/auth/me', repo: (r) => r.auth.me() },
  { id: 'AUTH-10', path: () => '/me/schools', repo: (r) => r.auth.listMySchools() },
  { id: 'CLS-01', path: () => '/classes', repo: (r) => r.classes.list() },
  { id: 'CLS-02', path: (c) => `/classes/${c.classAId}`, repo: (r, c) => r.classes.get(c.classAId) },
  { id: 'STU-01', path: (c) => `/classes/${c.classAId}/students`, repo: (r, c) => r.students.listByClass(c.classAId) },
  { id: 'STU-02', path: (c) => `/students/${c.studentAId}`, repo: (r, c) => r.students.get(c.studentAId) },
  { id: 'ATT-01', path: (c) => `/classes/${c.classAId}/attendance?date=${c.date}`, repo: (r, c) => r.attendance.forClass(c.classAId, c.date) },
  { id: 'ATT-02', path: (c) => `/classes/${c.classAId}/attendance/roll-call?date=${c.date}`, repo: (r, c) => r.attendance.rollCall(c.classAId, c.date) },
  { id: 'ATT-03', path: (c) => `/classes/${c.classAId}/timetable/day?date=${c.date}`, repo: (r, c) => r.attendance.dayTimetable(c.classAId, c.date) },
  {
    id: 'ATT-04',
    path: (c) => `/classes/${c.classAId}/attendance/periods?date=${c.date}&period=1&subject=Mathematics`,
    repo: (r, c) => r.attendance.forPeriod(c.classAId, c.date, 1, 'Mathematics'),
  },
  { id: 'TT-01', path: () => '/timetable', repo: (r) => r.timetable.list() },
  { id: 'EXM-01', path: () => '/exams', repo: (r) => r.exams.listTerms() },
  { id: 'EXM-02', path: () => '/exam-papers', repo: (r) => r.exams.list() },
  { id: 'EXM-03', path: (c) => `/exam-papers/${c.paperAId}`, repo: (r, c) => r.exams.get(c.paperAId) },
  { id: 'GRD-01', path: (c) => `/exam-papers/${c.paperAId}/grades`, repo: (r, c) => r.grades.listByExam(c.paperAId) },
  { id: 'ASG-01', path: () => '/assignments', repo: (r) => r.assignments.list() },
  { id: 'CHT-01', path: () => '/threads', repo: (r) => r.chat.contacts() },
  { id: 'CHT-02', path: (c) => `/threads/${c.threadId ?? '00000000-0000-0000-0000-000000000000'}/messages`, repo: (r, c) => r.chat.messages(c.threadId ?? '00000000-0000-0000-0000-000000000000') },
  { id: 'ANN-01', path: () => '/announcements', repo: (r) => r.announcements.list() },
  { id: 'NTF-01', path: () => '/notifications', repo: (r) => r.notifications.list() },
  { id: 'CAL-01', path: () => '/calendar', repo: (r) => r.calendar.list() },
  { id: 'LIB-01', path: () => '/library', repo: (r) => r.library.list() },
  { id: 'PAY-01', path: () => '/payslips', repo: (r) => r.payroll.list() },
  { id: 'LEV-01', path: () => '/leave', repo: (r) => r.leave.list() },
  { id: 'APR-01', path: () => '/approvals?status=pending', repo: (r) => r.approvals.list('pending') },
  { id: 'DSH-01', path: () => '/dashboard/stats', repo: (r) => r.dashboard.stats() },
  { id: 'PRN-01', path: () => '/principal/overview', repo: (r) => r.principal.overview() },
  { id: 'PRN-02', path: (c) => `/principal/attendance?date=${c.date}`, repo: (r, c) => r.principal.attendance(c.date) },
  { id: 'PRN-03', path: (c) => `/principal/staff/${c.staffPersonId}/attendance/history`, repo: (r, c) => r.principal.staffAttendanceHistory(c.staffPersonId) },
  { id: 'PRN-04', path: () => '/transport/fleet', repo: (r) => r.principal.transportFleet() },
  { id: 'PRN-05', path: () => '/transport/buses', repo: (r) => r.principal.listTransportBuses() },
  { id: 'GEO-01', path: (c) => `/transport/routes/${c.routeId ?? '00000000-0000-0000-0000-000000000000'}/geometry` },
  { id: 'TCH-01', path: () => '/teachers?status=active', repo: (r) => r.teachers.list() },
  { id: 'STF-01', path: () => '/staff', repo: (r) => r.staff.list() },
  { id: 'BUS-01', path: () => '/bus/assigned', repo: (r) => r.bus.assignedBus() },
  { id: 'BUS-02', path: (c) => `/bus/${c.busId}/position`, repo: (r, c) => r.bus.position(c.busId) },
  { id: 'BUS-03', path: (c) => `/bus/${c.busId}/roster`, repo: (r, c) => r.bus.roster(c.busId) },
  { id: 'BUS-05', path: () => '/bus/traveling', repo: (r) => r.bus.myRoutes() },
  { id: 'MYA-01', path: () => '/me/attendance/school-location', repo: (r) => r.myAttendance.schoolLocation() },
  { id: 'MYA-02', path: (c) => `/me/attendance/today?date=${c.date}`, repo: (r) => r.myAttendance.today() },
  { id: 'MYA-03', path: () => '/me/attendance/history?limit=30', repo: (r) => r.myAttendance.history(30) },
  { id: 'MYA-04', path: (c) => `/me/attendance/summary?month=${c.date.slice(0, 7)}`, repo: (r, c) => r.myAttendance.summary(c.date.slice(0, 7)) },
];
```

If `tsc` reports that a repo method's arity differs from the one used here, for example `myAttendance.today()`, fix the **call** to match `src/data/repositories/types.ts`. Never change the repo to fit the capture.

- [ ] **Step 2: Write the capture runner**

`APP/e2e/capture/capture.capture.test.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEED } from '../support/config';
import { lastSchoolDay } from '../support/dates';
import { raw } from '../support/raw';
import { redact } from '../support/redact';
import { loginAs, type Actor } from '../support/session';
import { ROWS, type CaptureCtx } from './rows';

const OUT = join(__dirname, '..', '..', 'docs', 'superpowers', 'audits', 'sms-api-capture');

function firstId(body: unknown, pred: (row: Record<string, unknown>) => boolean): string | null {
  const data = (body as { data?: unknown })?.data;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const hit = list.find(pred);
  return hit ? String(hit.id ?? hit.bus_id ?? '') || null : null;
}

async function buildCtx(teacherA: Actor, principal: Actor): Promise<CaptureCtx> {
  const date = lastSchoolDay();
  const classes = await raw(teacherA, 'GET', '/classes');
  const classAId = firstId(classes.body, (c) => c.name === SEED.classA);
  if (!classAId) throw new Error('seed class IX-A not visible to teacher A — seed missing or a CLS-01 finding');
  const students = await raw(teacherA, 'GET', `/classes/${classAId}/students`);
  const papers = await raw(teacherA, 'GET', '/exam-papers');
  const buses = await raw(principal, 'GET', '/transport/buses');
  const busRow = ((buses.body as { data?: Record<string, unknown>[] })?.data ?? []).find((b) => b.bus_no === SEED.busNo);
  const overview = await raw(principal, 'GET', '/principal/overview');
  const staff = ((overview.body as { data?: { staff?: Record<string, unknown>[] } })?.data?.staff ?? [])[0];
  const threads = await raw(teacherA, 'GET', '/threads');
  return {
    date,
    classAId,
    studentAId: firstId(students.body, () => true) ?? '',
    paperAId: firstId(papers.body, (p) => p.name === SEED.examPaperA) ?? '',
    busId: String(busRow?.id ?? busRow?.bus_id ?? ''),
    staffPersonId: String(staff?.teacher_id ?? staff?.person_id ?? staff?.id ?? ''),
    threadId: firstId(threads.body, () => true),
    routeId: busRow ? String(busRow.route_id ?? '') || null : null,
  };
}

test('capture every GET row as teacher A, teacher B and principal (redacted evidence for the parity matrix)', async () => {
  const actors: Record<string, Actor> = {
    teacherA: await loginAs(SEED.teacherA.email, SEED.teacherA.password),
    teacherB: await loginAs(SEED.teacherB.email, SEED.teacherB.password),
    principal: await loginAs(SEED.principal.email, SEED.principal.password),
  };
  const ctx = await buildCtx(actors.teacherA, actors.principal);
  const summary: { rowId: string; role: string; status: number; zod: string }[] = [];

  for (const [role, actor] of Object.entries(actors)) {
    mkdirSync(join(OUT, role), { recursive: true });
    for (const row of ROWS) {
      const path = row.path(ctx);
      const res = await raw(actor, 'GET', path);
      let zod = 'n/a';
      if (row.repo && res.status >= 200 && res.status < 300) {
        try {
          await row.repo(actor.repos, ctx);
          zod = 'ok';
        } catch (e) {
          zod = `error: ${(e as Error).message.slice(0, 500)}`;
        }
      }
      writeFileSync(
        join(OUT, role, `${row.id}.json`),
        JSON.stringify(redact({ rowId: row.id, role, method: 'GET', path, status: res.status, zod, body: res.body }), null, 2),
      );
      summary.push({ rowId: row.id, role, status: res.status, zod });
    }
  }
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  expect(summary).toHaveLength(ROWS.length * 3);
});
```

The context IDs are resolved from raw JSON using the most likely snake_case keys (`id`, `bus_id`, `route_id`, `teacher_id`). If an ID resolves to `''`, record that in the matrix as a finding for the row that failed to produce it. Do not guess another key without reading the DTO.

- [ ] **Step 3: Run the capture**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npm run capture:sms-api
```

Expected: 1 passed, plus `docs/superpowers/audits/sms-api-capture/{teacherA,teacherB,principal}/*.json` and `summary.json`.

- [ ] **Step 4: Check the captured files for credentials**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && grep -rEl "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|DevSeed-|\"(access|refresh)_token\": \"[^[]" docs/superpowers/audits/sms-api-capture || echo "clean"
```

Expected: `clean`.

- [ ] **Step 5: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e/capture docs/superpowers/audits/sms-api-capture && git commit -m "test(capture): redacted live GET capture per role for the parity matrix

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Build the parity matrix (static trace, live results, old-gap re-check). ⛔ CHECKPOINT 1

**Files:**
- Modify: `APP/docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md`
- Modify: `APP/docs/superpowers/audits/2026-07-24-live-data-findings.md` (add one line at the top: `Superseded by 2026-09-26-sms-api-parity-matrix.md.`)

**Interfaces:**
- Consumes: the Task 6 capture files; the source in `APP/src/data/http/*.ts` and `API/src/**`.
- Produces: the approved matrix, whose row IDs, categories and **expected statuses per role** are used by Tasks 9–14 and Addendum A.

- [ ] **Step 1: Add the row table**

Use exactly these columns:

```markdown
| ID | App call (repo.method · HTTP · path · sent fields) | Zod schema (fields/types/optional) | Backend route (file:line · attribute) | Policy · expected status T-A / T-B / P | Request DTO | Response DTO (→ service → DAO → proc) | Live T-A / T-B / P (status · zod · value vs seed) | Category | Fix owner | Notes |
```

Add one row per ID below, 73 in total, in this order:
- AUTH-01 `login` … AUTH-12 `updatePhoto`, in the repo order from spec §6 / auth.repo: 01 login, 02 otp/request, 03 otp/verify, 04 refresh, 05 me, 06 logout, 07 password/forgot, 08 password/reset, 09 set-password, 10 me/schools, 11 switch-school, 12 me/photo
- CLS-01..02
- STU-01..03 (03 is PATCH photo)
- ATT-01..06 (05 is POST class attendance, 06 is POST periods)
- TT-01
- EXM-01..06 (04 POST, 05 PATCH, 06 DELETE)
- GRD-01..03
- ASG-01..04 (02 POST, 03 PATCH, 04 is the `POST /homework` path if `assignments.repo.ts` calls it; if it doesn't, delete row 04 and note that)
- CHT-01..04
- ANN-01..02
- NTF-01..02
- CAL-01, LIB-01, PAY-01
- LEV-01..02
- APR-01..02
- DSH-01
- PRN-01..09
- GEO-01, TCH-01, STF-01
- BUS-01..05 (04 is POST boarding)
- MYA-01..05 (05 is POST punch)
- HUB-01 `/hubs/live` `live_event`
- HUB-02 `/hubs/transport-fleet` `JoinBus`/`position_update`

- [ ] **Step 2: Do the static trace, one row at a time**

For each row:
1. Open the repo file and record the path, method and sent fields.
2. Open the zod schema (in `mappers.ts`, `transport.mappers.ts`, `auth.schema.ts` or a local schema in the repo file) and record its fields, types and optionality.
3. Find the route in `API/src/Sms.Api/Controllers`. Search for the path segment, for example `rg -n '"roll-call' src/Sms.Api/Controllers`. Record `file:line` and the attribute.
4. Record the class-level or method-level `[Authorize(Policy=…)]`. Map it with `Shared.Kernel/Authz/AuthorizationPolicies.cs`: `teacher.app` means teacher, principal, admin or owner; `school.principal` means principal, admin or owner. From that, write the expected status for T-A, T-B and P, for example `200/200/200` or `403/403/200`. For roll-call write, use the service rule: class teacher, first-period teacher or leadership, so T-A gets 204 and T-B gets 403 `not_roll_call_teacher`.
5. Open the request and response DTO records and record the fields in snake_case.
6. Follow the response through the service, the DAO and the SQL proc in `db/postgres/*_procs.sql` or the inline SQL in the DAO. For every field the app renders, note where its value comes from, e.g. `student_count ← Classes.StudentCount (stored)` versus `← COUNT(Students)`.

- [ ] **Step 3: Fill in the live results for GET rows** from `sms-api-capture/summary.json` and the per-role files. For every value the app renders, compare it with the seed. For example:
- IX-A `student_count` should be 10
- `/principal/attendance` class totals should be 10
- `/bus/assigned` should be DS-01 with 3 stops
- the roster should have 5 riders
- the school location should be 18.5204, 73.8567, 200

Mark a value ⚠️ **incorrect data** when it contradicts the seed. For write rows, write `live: pending e2e (Task 11/13)` for now. Task 15 fills those in.

- [ ] **Step 4: Assign categories and the fix owner** using spec §5: ✅ / ⛔ / 🔀 / ⚠️ / 🔒, and `app` / `backend` / `none`. For every ⛔ row, write whether the feature needs the route. If it does, it becomes a **scope decision for the user**, not a fix.

- [ ] **Step 5: Add the "not-used" table**

List every route in the teacher Swagger audience that the app never calls:

```bash
cd "D:/convert/SMS backend/sms-api" && rg -n '"v1/' src/Sms.Api/Swagger/ApiAudienceMap.cs
```

Cross-check each against the matrix rows. Record each one as `💤 route · controller:line · informational`.

- [ ] **Step 6: Re-check the old gaps**

Go through all 32 backend gaps in `2026-07-24-live-data-findings.md`. For each, add a row to a `## 2026-07-24 gap re-check` table: `old finding · status (fixed / still present / not applicable / blocked by missing product requirement) · evidence (capture file or file:line) · matrix row`.

- [ ] **Step 7: Write the summary block** at the top of the doc: counts per category, the proposed fix list (row ID, owner, one line each), the scope decisions needed, and anything blocked.

- [ ] **Step 8: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add docs/superpowers/audits && git commit -m "docs(audit): complete sms-api parity matrix and 2026-07-24 gap re-check

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: ⛔ STOP — CHECKPOINT 1.** Present the summary block to the user and link the matrix. Do not continue until the user approves the categories, the expected statuses and the proposed fix list, and answers every scope decision.

---

## Phase 3 — The e2e gate (encodes the approved matrix)

These tests encode the **approved** expectations. Any status in these tests that differs from the approved matrix's "expected" column must be changed to match the matrix, and the matrix row ID must be cited in a comment. Tests are expected to fail wherever an approved fix row is still open. That is intended: the failures become the fix list's red tests.

**Shared helper**, used by Tasks 11, 13 and 14. Create it in Task 9.

`APP/e2e/support/seedLookup.ts`:

```ts
import type { Class, Exam } from '@/data/domain';
import { SEED } from './config';
import type { Actor } from './session';

export async function seedClass(actor: Actor, name: string): Promise<Class> {
  const c = (await actor.repos.classes.list()).find((x) => x.name === name);
  if (!c) throw new Error(`seed class ${name} not visible to ${actor.session.user.name}`);
  return c;
}

export async function seedPaper(actor: Actor): Promise<Exam> {
  const p = (await actor.repos.exams.list()).find((x) => x.title === SEED.examPaperA);
  if (!p) throw new Error(`seed paper ${SEED.examPaperA} not visible`);
  return p;
}

export const runId = `${Date.now().toString(36)}`;
```

### Task 9: Auth flows

**Files:**
- Create: `APP/e2e/support/seedLookup.ts` (above), `APP/e2e/10-auth.e2e.test.ts`

**Interfaces:**
- Consumes: `loginAs`, `actorFor`, `raw`, `SEED` (Task 5).
- Produces: `seedClass`, `seedPaper` and `runId`, used by Tasks 11–14.

- [ ] **Step 1: Write the test**

```ts
import { SEED } from './support/config';
import { raw } from './support/raw';
import { actorFor, loginAs } from './support/session';

describe('auth against sms-api (matrix AUTH-*)', () => {
  test('login → /auth/me maps the teacher and the tenant', async () => {
    const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
    expect(a.session.user).toMatchObject({ name: SEED.teacherA.name, role: 'teacher', employee: SEED.teacherA.employee });
    expect(a.session.tenant).toMatchObject({ name: SEED.mainSchool, tier: 'platinum' });
  });

  test('principal login maps role principal', async () => {
    const p = await loginAs(SEED.principal.email, SEED.principal.password);
    expect(p.session.user.role).toBe('principal');
    expect(p.session.user.title).toBe('Principal');
  });

  test('wrong password → invalid_credentials', async () => {
    await expect(loginAs(SEED.teacherA.email, 'wrong-password')).rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  test('refresh rotates and the old refresh token is rejected', async () => {
    const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
    const next = await a.repos.auth.refresh(a.session.refreshToken);
    expect(next.refreshToken).not.toBe(a.session.refreshToken);
    const reuse = await raw(null, 'POST', '/auth/refresh', { body: { refresh_token: a.session.refreshToken } });
    expect(reuse.status).toBe(401);
  });

  test('logout revokes the refresh token', async () => {
    const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
    await a.repos.auth.logout(a.session.refreshToken);
    const after = await raw(null, 'POST', '/auth/refresh', { body: { refresh_token: a.session.refreshToken } });
    expect(after.status).toBe(401);
  });

  test('multi-school user lists both schools and switch-school moves the tenant', async () => {
    const m = await loginAs(SEED.multi.email, SEED.multi.password);
    const schools = await m.repos.auth.listMySchools();
    expect(schools.map((s) => s.name).sort()).toEqual([SEED.otherSchool, SEED.mainSchool].sort());
    const other = schools.find((s) => s.name === SEED.otherSchool)!;
    const switched = actorFor(await m.repos.auth.switchSchool(other.id));
    expect(switched.session.tenant.name).toBe(SEED.otherSchool);
    expect((await switched.repos.classes.list()).map((c) => c.name)).toEqual(['IX-A']);
  });

});
```

- [ ] **Step 2: Run the test**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npx jest -c jest.e2e.config.js e2e/10-auth
```

Record which tests fail. Each failure must map to an approved fix row, or it becomes a new finding for CHECKPOINT 2.

- [ ] **Step 3: Commit** (a red test is allowed here, because it encodes an approved expectation)

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e && git commit -m "test(e2e): auth flows against sms-api (AUTH-*)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Teacher reads against known seed values

**Files:**
- Create: `APP/e2e/20-teacher-reads.e2e.test.ts`

**Interfaces:**
- Consumes: `loginAs`, `SEED`, `lastSchoolDay`, `seedClass`, `seedPaper`.

- [ ] **Step 1: Write the test**

```ts
import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { seedClass, seedPaper } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

let a: Actor;
beforeAll(async () => {
  a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
});

describe('teacher A reads (matrix CLS/STU/ATT/TT/EXM/…)', () => {
  test('CLS-01/02: both seed classes with live student counts', async () => {
    const ixA = await seedClass(a, SEED.classA);
    const ixB = await seedClass(a, SEED.classB);
    expect(ixA.studentCount).toBe(SEED.studentsPerClass);
    expect(ixB.studentCount).toBe(SEED.studentsPerClass);
    expect(await a.repos.classes.get(ixA.id)).toMatchObject({ id: ixA.id, name: SEED.classA });
  });

  test('STU-01/02: IX-A roster is exactly the 10 seeded students', async () => {
    const ixA = await seedClass(a, SEED.classA);
    const page = await a.repos.students.listByClass(ixA.id, { limit: 50 });
    expect(page.items).toHaveLength(SEED.studentsPerClass);
    expect(page.items.map((s) => s.name)).not.toEqual(expect.arrayContaining([...SEED.otherSchoolStudentNames]));
    expect(await a.repos.students.get(page.items[0].id)).toMatchObject({ id: page.items[0].id });
  });

  test('ATT-02/03: roll-call lets the class teacher mark; the day has periods 1–3', async () => {
    const ixA = await seedClass(a, SEED.classA);
    const date = lastSchoolDay();
    expect(await a.repos.attendance.rollCall(ixA.id, date)).toMatchObject({ canMark: true });
    const slots = await a.repos.attendance.dayTimetable(ixA.id, date);
    expect(slots.map((s) => s.period).sort()).toEqual([1, 2, 3]);
  });

  test('TT-01: teacher A teaches IX-A P1 and IX-B P2 every weekday', async () => {
    const slots = await a.repos.timetable.list();
    for (const [cls, period] of [[SEED.classA, 1], [SEED.classB, 2]] as const) {
      expect(slots.filter((s) => s.className === cls && s.period === period)).toHaveLength(5);
    }
  });

  test('EXM-01/02/03 + GRD-01: the published term and the IX-A maths paper', async () => {
    expect((await a.repos.exams.listTerms()).map((t) => t.name)).toContain('Dev Seed Unit Test 1');
    const paper = await seedPaper(a);
    expect(paper).toMatchObject({ subject: 'Mathematics', maxMarks: 50, status: 'upcoming' });
    expect(await a.repos.exams.get(paper.id)).toMatchObject({ id: paper.id });
    await expect(a.repos.grades.listByExam(paper.id)).resolves.toEqual(expect.any(Array));
  });

  test('ANN-01: the seed announcement is visible', async () => {
    expect((await a.repos.announcements.list()).map((x) => x.title)).toContain(SEED.announcementTitle);
  });

  test('BUS-01/03: duty bus DS-01 with 3 stops and 5 riders', async () => {
    const bus = await a.repos.bus.assignedBus();
    expect(bus).toMatchObject({ number: SEED.busNo });
    expect(bus!.stops).toHaveLength(3);
    expect(await a.repos.bus.roster(bus!.id)).toHaveLength(SEED.busRiders);
  });

  test('MYA-01: geofence from the seed', async () => {
    expect(await a.repos.myAttendance.schoolLocation()).toMatchObject({
      lat: SEED.geo.lat,
      lng: SEED.geo.lng,
      radiusMeters: SEED.geo.radiusMeters,
    });
  });

  test('remaining GETs parse through their real schemas', async () => {
    await expect(a.repos.assignments.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.chat.contacts()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.notifications.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.calendar.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.library.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.payroll.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.leave.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.dashboard.stats()).resolves.toEqual(expect.objectContaining({ totalClasses: expect.any(Number) }));
    await expect(a.repos.teachers.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.staff.list()).resolves.toEqual(expect.any(Array));
    await expect(a.repos.bus.myRoutes()).resolves.toEqual(expect.any(Array));
  });
});
```

If `bus.assignedBus()` returns `Bus | null` and not `Bus`, keep the `!` as written. If `tsc` shows that `roster` returns something other than an array (for example `{ records }`), assert on that shape's riders array instead, and cite BUS-03.

- [ ] **Step 2: Run the test**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npx jest -c jest.e2e.config.js e2e/20-teacher-reads
```

Record the failures against matrix rows.

- [ ] **Step 3: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e && git commit -m "test(e2e): teacher reads asserted against seed values

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: Teacher writes with read-back

**Files:**
- Create: `APP/e2e/30-teacher-writes.e2e.test.ts`

**Interfaces:**
- Consumes: `loginAs`, `SEED`, `lastSchoolDay`, `seedClass`, `seedPaper`, `runId`.

- [ ] **Step 1: Write the test** (every write is idempotent or scoped to this run)

```ts
import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { runId, seedClass, seedPaper } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

let a: Actor;
let b: Actor;
beforeAll(async () => {
  a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
  b = await loginAs(SEED.teacherB.email, SEED.teacherB.password);
});

test('ATT-05 → ATT-01: class attendance saves and reads back (idempotent upsert for the day)', async () => {
  const ixA = await seedClass(a, SEED.classA);
  const date = lastSchoolDay();
  const students = (await a.repos.students.listByClass(ixA.id, { limit: 50 })).items;
  const records = students.map((s, i) => ({ studentId: s.id, status: i === 0 ? ('A' as const) : ('P' as const) }));
  await a.repos.attendance.save(ixA.id, date, records);
  const back = await a.repos.attendance.forClass(ixA.id, date);
  expect(back.find((r) => r.studentId === students[0].id)?.status).toBe('A');
  expect(back.filter((r) => r.status === 'P')).toHaveLength(students.length - 1);
});

test('ATT-06 → ATT-04: period attendance saves and reads back', async () => {
  const ixA = await seedClass(a, SEED.classA);
  const date = lastSchoolDay();
  const students = (await a.repos.students.listByClass(ixA.id, { limit: 50 })).items;
  await a.repos.attendance.savePeriod(ixA.id, {
    date,
    period: 1,
    subject: 'Mathematics',
    records: students.map((s) => ({ studentId: s.id, status: 'P' as const })),
  });
  expect(await a.repos.attendance.forPeriod(ixA.id, date, 1, 'Mathematics')).toHaveLength(students.length);
});

test('GRD-02 → GRD-01 + GRD-03: marks upsert, read back, notify', async () => {
  const paper = await seedPaper(a);
  const student = (await a.repos.students.listByClass(paper.classId, { limit: 1 })).items[0];
  await a.repos.grades.upsert({ studentId: student.id, examId: paper.id, marks: 42 });
  expect((await a.repos.grades.listByExam(paper.id)).find((g) => g.studentId === student.id)?.marks).toBe(42);
  await expect(a.repos.grades.notifyPublished(paper.id)).resolves.toEqual(
    expect.objectContaining({ parentReach: expect.any(Number) }),
  );
});

test('ASG-02/03 → ASG-01: create then update an assignment', async () => {
  const ixA = await seedClass(a, SEED.classA);
  const title = `E2E assignment ${runId}`;
  const input = { title, classId: ixA.id, className: ixA.name, subject: 'Mathematics', dueDate: lastSchoolDay(), description: 'e2e' };
  const created = await a.repos.assignments.create(input as Parameters<typeof a.repos.assignments.create>[0]);
  await a.repos.assignments.update(created.id, { ...input, title: `${title} (edited)` } as Parameters<typeof a.repos.assignments.update>[1]);
  expect((await a.repos.assignments.list()).map((x) => x.title)).toContain(`${title} (edited)`);
});

test('LEV-02 → LEV-01: teacher B applies for leave and sees it pending', async () => {
  const reason = `E2E leave ${runId}`;
  await b.repos.leave.create({ type: 'casual', from: '2027-02-01', to: '2027-02-01', reason });
  expect((await b.repos.leave.list()).find((l) => l.reason === reason)?.status).toBe('pending');
});

test('MYA-05 → MYA-02: geofenced punch-in inside the fence', async () => {
  await a.repos.myAttendance.punch({
    kind: 'in',
    at: new Date().toISOString(),
    lat: SEED.geo.lat,
    lng: SEED.geo.lng,
    accuracyMeters: 10,
    distanceMeters: 0,
    verified: true,
  });
  expect((await a.repos.myAttendance.today())?.checkIn).toBeDefined();
});

test('CHT-04 + CHT-03 → CHT-02: open a thread with the principal and send a message', async () => {
  const contact = await a.repos.chat.createThread({ name: SEED.principal.name, role: 'principal' });
  const text = `E2E hello ${runId}`;
  await a.repos.chat.send(contact.id, { text });
  expect((await a.repos.chat.messages(contact.id)).map((m) => m.text)).toContain(text);
});

test('BUS-04: teacher A records boarding on the duty bus', async () => {
  const bus = (await a.repos.bus.assignedBus())!;
  const roster = await a.repos.bus.roster(bus.id);
  await expect(
    a.repos.bus.saveBoarding(bus.id, roster.map((r) => ({ ...r, status: 'boarded' as const }))),
  ).resolves.toBeUndefined();
});
```

The `as Parameters<…>` casts on the assignment calls exist only because `NewAssignmentInput`'s optional fields weren't confirmed when this plan was written. Remove them if `tsc` passes without them. If `myAttendance.today()` takes arguments (check `types.ts`), pass `lastSchoolDay()`. If `chat.createThread` with an existing name returns the existing thread, the test still holds.

- [ ] **Step 2: Run the test**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npx jest -c jest.e2e.config.js e2e/30-teacher-writes
```

Record the failures against matrix rows. Fill in the write rows' `Live` column in the matrix.

- [ ] **Step 3: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e docs/superpowers/audits && git commit -m "test(e2e): teacher writes with read-back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: Tenant and role checks through the real HTTP API

**Files:**
- Create: `APP/e2e/40-tenancy-rbac.e2e.test.ts`

**Interfaces:**
- Consumes: `loginAs`, `raw`, `SEED`, `lastSchoolDay`, `seedClass`.

- [ ] **Step 1: Write the test.** Each expected status is copied from the approved matrix, and the row ID is cited.

```ts
import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { raw } from './support/raw';
import { seedClass } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

let a: Actor, b: Actor, p: Actor, other: Actor;
let otherClassId: string, otherStudentId: string;

beforeAll(async () => {
  // Sequential on purpose: loginAs uses the module-level authSnapshot (see session.ts).
  a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
  b = await loginAs(SEED.teacherB.email, SEED.teacherB.password);
  p = await loginAs(SEED.principal.email, SEED.principal.password);
  other = await loginAs(SEED.otherTeacher.email, SEED.otherTeacher.password);
  const oc = await seedClass(other, SEED.classA);
  otherClassId = oc.id;
  otherStudentId = (await other.repos.students.listByClass(oc.id)).items[0].id;
});

describe('School B is invisible to School A', () => {
  test('CLS-02: School B class by id → 404 for teacher A', async () => {
    expect((await raw(a, 'GET', `/classes/${otherClassId}`)).status).toBe(404);
  });
  test('STU-02: School B student by id → 404 for teacher A', async () => {
    expect((await raw(a, 'GET', `/students/${otherStudentId}`)).status).toBe(404);
  });
  test('CLS-01/STU-01: no School B rows in any teacher A list', async () => {
    const classIds = (await a.repos.classes.list()).map((c) => c.id);
    expect(classIds).not.toContain(otherClassId);
    const ixA = await seedClass(a, SEED.classA);
    const names = (await a.repos.students.listByClass(ixA.id, { limit: 50 })).items.map((s) => s.name);
    for (const n of SEED.otherSchoolStudentNames) expect(names).not.toContain(n);
  });
  test('mismatched X-Tenant-Id → bare 403', async () => {
    const res = await raw(a, 'GET', '/classes', { headers: { 'X-Tenant-Id': other.auth.tenantId } });
    expect(res.status).toBe(403);
  });
});

describe('roles', () => {
  test('ATT-05: teacher B cannot mark IX-A roll-call → 403 not_roll_call_teacher', async () => {
    const ixA = await seedClass(b, SEED.classA);
    const res = await raw(b, 'POST', `/classes/${ixA.id}/attendance`, {
      body: { date: lastSchoolDay(), records: [] },
    });
    expect(res.status).toBe(403);
    expect((res.body as { error?: { code?: string } }).error?.code).toBe('not_roll_call_teacher');
  });
  test.each([
    ['PRN-01', '/principal/overview'],
    ['PRN-04', '/transport/fleet'],
    ['PRN-05', '/transport/buses'],
    ['APR-01', '/approvals?status=pending'],
  ])('%s: teacher → 403, principal → 200 (%s)', async (_id, path) => {
    expect((await raw(a, 'GET', path)).status).toBe(403);
    expect((await raw(p, 'GET', path)).status).toBe(200);
  });
});
```

If the approved matrix says the roll-call check runs only for non-empty `records`, send one real student record instead. The expected result stays `403 not_roll_call_teacher`.

- [ ] **Step 2: Run the test**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npx jest -c jest.e2e.config.js e2e/40-tenancy-rbac
```

- [ ] **Step 3: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e && git commit -m "test(e2e): cross-tenant and role checks through the real API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: Principal flows

**Files:**
- Create: `APP/e2e/50-principal.e2e.test.ts`

**Interfaces:**
- Consumes: `loginAs`, `raw`, `SEED`, `lastSchoolDay`, `runId`.

- [ ] **Step 1: Write the test**

```ts
import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { raw } from './support/raw';
import { runId } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

let p: Actor, a: Actor, b: Actor;
beforeAll(async () => {
  // Sequential on purpose: loginAs uses the module-level authSnapshot (see session.ts).
  p = await loginAs(SEED.principal.email, SEED.principal.password);
  a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
  b = await loginAs(SEED.teacherB.email, SEED.teacherB.password);
});

test('PRN-01: overview lists the seed teaching staff', async () => {
  const o = await p.repos.principal.overview();
  expect(o.staff.map((s) => s.name)).toEqual(expect.arrayContaining([SEED.teacherA.name, SEED.teacherB.name]));
});

test('PRN-02: school attendance has both seed classes with 10 students each', async () => {
  const att = await p.repos.principal.attendance(lastSchoolDay());
  for (const name of [SEED.classA, SEED.classB]) {
    expect(att.classes.find((c) => c.className === name)?.total).toBe(SEED.studentsPerClass);
  }
});

test('PRN-03: staff attendance history for teacher A resolves', async () => {
  const o = await p.repos.principal.overview();
  const teacherA = o.staff.find((s) => s.name === SEED.teacherA.name)!;
  await expect(p.repos.principal.staffAttendanceHistory(teacherA.teacherId)).resolves.toEqual(expect.any(Array));
});

test('APR-01/02 → LEV-01: principal approves teacher B leave; B sees it approved', async () => {
  const reason = `E2E approval ${runId}`;
  await b.repos.leave.create({ type: 'casual', from: '2027-03-01', to: '2027-03-01', reason });
  const pending = (await p.repos.approvals.list('pending')).find((x) => x.reason === reason);
  expect(pending).toBeDefined();
  await p.repos.approvals.decide(pending!.id, 'approved', 'e2e');
  expect((await b.repos.leave.list()).find((l) => l.reason === reason)?.status).toBe('approved');
});

test('PRN-04/05/06/07: fleet + reassign duty teacher and restore', async () => {
  const fleet = await p.repos.principal.transportFleet();
  const bus = fleet.find((x) => x.busNo === SEED.busNo)!;
  expect(bus.teacherName).toBe(SEED.teacherA.name);
  const rows = await p.repos.principal.listTransportBuses();
  expect(rows.find((r) => r.busNo === SEED.busNo)?.studentsAssigned).toBe(SEED.busRiders);

  await p.repos.principal.assignBusTeacher(bus.busId, b.session.user.id);
  expect((await p.repos.principal.transportFleet()).find((x) => x.busId === bus.busId)?.teacherName).toBe(SEED.teacherB.name);
  // restore seed state so the gate stays repeatable
  await p.repos.principal.assignBusTeacher(bus.busId, a.session.user.id);
  expect((await p.repos.principal.transportFleet()).find((x) => x.busId === bus.busId)?.teacherName).toBe(SEED.teacherA.name);
});

test('PRN-08/09: add then remove a traveling teacher', async () => {
  const bus = (await p.repos.principal.transportFleet()).find((x) => x.busNo === SEED.busNo)!;
  await p.repos.principal.addTravelingTeacher(bus.busId, b.session.user.id);
  expect((await p.repos.principal.transportFleet()).find((x) => x.busId === bus.busId)?.travelingTeachers?.map((t) => t.teacherUserId))
    .toContain(b.session.user.id);
  await p.repos.principal.removeTravelingTeacher(bus.busId, b.session.user.id);
});

test('GEO-01: route geometry returns the approved status for the seed route', async () => {
  const buses = await raw(p, 'GET', '/transport/buses');
  const row = ((buses.body as { data: Record<string, unknown>[] }).data).find((x) => x.bus_no === SEED.busNo)!;
  const res = await raw(p, 'GET', `/transport/routes/${String(row.route_id)}/geometry`);
  // Expected status comes from matrix GEO-01. Without a GoogleRoutes key the API may report "unavailable";
  // the app maps that to straight-line rendering (commit 054c5cf). Replace 200 with the approved value.
  expect(res.status).toBe(200);
});

test('ANN-02: principal posts an announcement; teacher A sees it', async () => {
  const title = `E2E notice ${runId}`;
  await p.repos.announcements.create({ title, body: 'e2e', type: 'info' });
  expect((await a.repos.announcements.list()).map((x) => x.title)).toContain(title);
});
```

`PRN-06` reassignment has to succeed despite the unique `(TenantId, TeacherUserId)` index on `BusAssignments`. Teacher B has no other bus, so it's allowed. If the approved matrix shows that `assignBusTeacher` needs `unassignBusTeacher` first, call it before each assign.

- [ ] **Step 2: Run the test**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npx jest -c jest.e2e.config.js e2e/50-principal
```

- [ ] **Step 3: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e && git commit -m "test(e2e): principal flows incl. approvals and transport reassignment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: Realtime

**Files:**
- Create: `APP/e2e/60-realtime.e2e.test.ts`

**Interfaces:**
- Consumes: `connectLive`, `connectFleet`, `isLive`, `isEvent`, `HubRecorder` (Task 5); `loginAs`, `raw`, `SEED`, `lastSchoolDay`, `seedClass`, `runId`.

- [ ] **Step 1: Write the test**

```ts
import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { connectFleet, connectLive, isEvent, isLive, type HubRecorder } from './support/hub';
import { raw } from './support/raw';
import { runId, seedClass } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

let a: Actor, p: Actor, other: Actor;
const open: HubRecorder[] = [];
beforeAll(async () => {
  // Sequential on purpose: loginAs uses the module-level authSnapshot (see session.ts).
  a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
  p = await loginAs(SEED.principal.email, SEED.principal.password);
  other = await loginAs(SEED.otherTeacher.email, SEED.otherTeacher.password);
});
afterAll(async () => {
  await Promise.all(open.map((h) => h.stop()));
});
const track = async (h: Promise<HubRecorder>) => {
  const r = await h;
  open.push(r);
  return r;
};

test('HUB-01: teacher attendance POST → principal receives live_event attendance; School B does not', async () => {
  const principalHub = await track(connectLive(p.auth.accessToken));
  const otherHub = await track(connectLive(other.auth.accessToken));
  const ixA = await seedClass(a, SEED.classA);
  const students = (await a.repos.students.listByClass(ixA.id, { limit: 50 })).items;
  await a.repos.attendance.save(ixA.id, lastSchoolDay(), students.map((s) => ({ studentId: s.id, status: 'P' as const })));

  await expect(principalHub.waitFor(isLive('attendance'), 10000)).resolves.toBeDefined();
  await expect(otherHub.waitFor(isLive('attendance'), 3000)).rejects.toThrow(/no matching hub event/);
});

test('HUB-01: principal announcement → teacher A receives live_event announcement; School B does not', async () => {
  const teacherHub = await track(connectLive(a.auth.accessToken));
  const otherHub = await track(connectLive(other.auth.accessToken));
  await p.repos.announcements.create({ title: `E2E live ${runId}`, body: 'e2e', type: 'info' });

  await expect(teacherHub.waitFor(isLive('announcement'), 10000)).resolves.toBeDefined();
  await expect(otherHub.waitFor(isLive('announcement'), 3000)).rejects.toThrow(/no matching hub event/);
});

test('HUB-02: principal joins DS-01; a trip ping delivers position_update for that bus', async () => {
  const bus = (await p.repos.principal.transportFleet()).find((x) => x.busNo === SEED.busNo)!;
  const fleetHub = await track(connectFleet(p.auth.accessToken));
  expect(await fleetHub.conn.invoke<boolean>('JoinBus', bus.busId)).toBe(true);

  const start = await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/start`, { body: { direction: 'pickup' } });
  expect([200, 201, 204]).toContain(start.status);
  try {
    const ping = await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/pings`, {
      body: { pings: [{ lat: 18.5236, lng: 73.8412, speed_kmh: 25, heading: 90, at: new Date().toISOString(), accuracy: 5 }] },
    });
    expect([200, 202, 204]).toContain(ping.status);
    const evt = await fleetHub.waitFor(isEvent('position_update'), 10000);
    expect(JSON.stringify(evt.payload)).toContain(bus.busId);
  } finally {
    await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/end`);
  }
});
```

The trip endpoints are verified in `TransportController.cs:144-156`: `POST buses/{busId}/trip/start` with body `{direction}`, `…/trip/pings` with `BulkPingRequest{ pings: PingItem[] }` where `PingItem(lat, lng, speed_kmh, heading, at, accuracy?)`, and `…/trip/end`. They are principal-only. The status sets in the `toContain` checks must be narrowed to the single status recorded in the approved matrix for each call, with the row ID cited, before the gate counts as final.

- [ ] **Step 2: Run the test**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npx jest -c jest.e2e.config.js e2e/60-realtime
```

- [ ] **Step 3: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add e2e && git commit -m "test(e2e): realtime live_event and transport-fleet position_update

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 15: First full gate run and the fix list. ⛔ CHECKPOINT 2

**Files:**
- Modify: `APP/docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md`
- Modify: this plan (append Addendum A)

- [ ] **Step 1: Run the whole gate**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npm run e2e:sms-api 2>&1 | tee "$TEMP/e2e-run1.txt" | tail -40
```

- [ ] **Step 2: Map every failure to a matrix row.** A failure with no approved fix row is a **new finding**: add it to the matrix with a category.

- [ ] **Step 3: Append "Addendum A — Fix tasks" to this plan.** Write one task per approved fix row, or per tightly related group, using the **Fix task template** below with its concrete test code and implementation filled in for that row.

- [ ] **Step 4: Commit** the matrix and plan updates.

- [ ] **Step 5: ⛔ STOP — CHECKPOINT 2.** Show the user the red list, any new findings and Addendum A. Continue only after approval.

---

## Phase 4 — Fixes (Addendum A, after CHECKPOINT 2)

### Fix task template (every Addendum A task follows this exactly)

**Backend fix (fix owner `backend`)**
1. **Write the failing integration test** in `API/tests/Sms.Tests.Integration/<Module>/<Area>HttpTests.cs`, named `<ROW-ID>_<behaviour>`.
   - Use the `[Collection("sql")]`, `App()` and `Client(app, userId, tenantId, role)` pattern from `AttendanceRollCallHttpTests.cs`. Tokens come from `JwtTokenService.IssueAccess`, and data is seeded as `sms_app` with `set_config('app.tenant_id', …)`.
   - Assert the **exact** corrected value, for example `student_count == 3` for 3 seeded students.
   - For auth rows, assert both the allowed role and the denied role.
   - For rows touching tenant data, add a second tenant and assert its rows never appear.
2. Run `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~<ROW-ID>"` and confirm it FAILs for the stated reason.
3. **Fix the layer that is actually wrong**, whether that's the proc, DAO, service or DTO. The change must be additive: no renamed or removed fields.
   - A SQL change becomes a new file `API/db/postgres/migrations/000N_<row-id>_<desc>.sql`, numbered next after the highest existing file (0005 first). Its first line is a comment citing the row ID. It uses `CREATE OR REPLACE FUNCTION` for proc changes and never edits `0001`–`0004` or the baseline.
4. Run the filtered test until it passes. Then run `dotnet test Sms.slnx` to confirm no regressions against the Task 1 baseline.
5. If a migration was added:
   - **Clean database:** the integration fixture runs `init` on a fresh `sms_test_*` database with the new migration, so step 4 already covers this.
   - **Upgrade:** create a disposable `sms_migtest_<guid>` database, run `Sms.PgMigrator init` **without** the new file, by temporarily pointing `--migrations-dir` at a copy that stops at the previous migration. Then run `migrate` with the real directory. Both must exit 0. Drop the disposable database afterwards.
   - Run `Sms.PgMigrator status` against `sms_dev` and report the pending migration to the user. **Apply it only with approval.**
6. Commit in `API` with the message `fix(<module>): <ROW-ID> <what>` plus the co-author line.

**App fix (fix owner `app`)**
1. **Write the failing repo test** in `APP/src/data/http/__tests__/<repo>.repo.test.ts`, following the `mockFetch` pattern already in `attendance.repo.test.ts`. The fixture body must be copied from `docs/superpowers/audits/sms-api-capture/<role>/<ROW-ID>.json`, the real redacted sms-api shape. Name the test `<ROW-ID>: <behaviour>`.
2. Run `npx jest src/data/http/__tests__/<repo>.repo.test.ts -t "<ROW-ID>"` and confirm it FAILs.
3. Make the minimal change in the repo or mapper. Change a zod schema **only** if the matrix row records that `sms-api`'s correct contract differs, and never to accept a wrong value.
4. Run `npx jest`, `npx tsc --noEmit` and `npx eslint .` to confirm no regressions against the Task 1 baseline.
5. Commit in `APP` with the message `fix(<area>): <ROW-ID> <what>` plus the co-author line.

**Every fix task, either owner**
- Re-run the e2e test that was red for this row and confirm it is now green.
- Update the matrix row: category → `fixed (<commit>)`.

---

## Phase 5 — Finish

### Task 16: Retire the old smoke script and document local running

**Files:**
- Delete: `APP/scripts/smoke/teacher-smoke.mjs`
- Modify: `APP/package.json` (remove `smoke:teacher`)
- Modify: `APP/README.md` (add a section)

- [ ] **Step 1: Remove the script and the npm script**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git rm scripts/smoke/teacher-smoke.mjs
```

Delete the `"smoke:teacher"` line from `package.json`.

- [ ] **Step 2: Add this section to the README**

````markdown
## Running against sms-api locally (PostgreSQL)

1. In `../sms-api`: set `SMS_MIGRATOR_CONNECTION` (owner role of `sms_dev`, in your own shell), then run
   `dotnet run --project db/Sms.PgMigrator -- status` and apply pending migrations only after reviewing them.
2. Seed: `dotnet run --project tools/Sms.DevSeed -- --i-know-this-is-dev` (logins in `tools/Sms.DevSeed/README.md`).
3. API: `dotnet run --project src/Sms.Api --launch-profile http`, then check `curl http://localhost:5162/health/ready` returns 200.
4. App: create `.env` with `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:5162/v1` (Android emulator: `http://10.0.2.2:5162/v1`).
5. End-to-end gate: `E2E_API_BASE_URL=http://localhost:5162/v1 npm run e2e:sms-api`. It uses the real HTTP layer and
   real SignalR, with no skips. Parity evidence: `npm run capture:sms-api`, written to `docs/superpowers/audits/sms-api-capture/`.
````

- [ ] **Step 3: Check that nothing still references the removed script**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && grep -rn "teacher-smoke\|smoke:teacher" --exclude-dir=node_modules --exclude-dir=docs . || echo "none"
```

Expected: `none`.

- [ ] **Step 4: Commit**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && git add -A scripts package.json README.md && git commit -m "chore: replace GET-only smoke script with the sms-api e2e gate; document local run

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 17: Final verification against the definition of done. ⛔ CHECKPOINT 3

**Files:**
- Modify: `APP/docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md` (final status section)

- [ ] **Step 1: Every matrix row is ✅, `fixed (<commit>)`, or `deferred (user sign-off <date>)`**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && grep -nE "\| (⛔|🔀|⚠️|🔒) " docs/superpowers/audits/2026-09-26-sms-api-parity-matrix.md || echo "no open rows"
```

Expected: `no open rows`, or only rows marked deferred with sign-off.

- [ ] **Step 2: Run the API gate**

```bash
cd "D:/convert/SMS backend/sms-api" && dotnet test Sms.slnx 2>&1 | tail -5
```

Expected: no failures beyond the Task 1 baseline.

- [ ] **Step 3: Verify migrations**

For each new migration, confirm the clean-database and upgrade runs from the template both passed. Then:

```bash
cd "D:/convert/SMS backend/sms-api" && ls db/postgres/migrations && dotnet run --project db/Sms.PgMigrator -- status
```

Expected: the files are numbered contiguously from 0005, `0001`–`0004` are unchanged (`git diff 34af78e -- db/postgres/migrations/000[1-4]*` is empty), and `status` on `sms_dev` shows them applied (after approval) or lists them as pending for the user.

- [ ] **Step 4: Run the app gates**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && npx jest && npx tsc --noEmit && npx eslint .
```

Expected: no failures or errors beyond the Task 1 baseline.

- [ ] **Step 5: Run the e2e gate twice from a clean start**
1. Stop the API.
2. Re-run the seed. It should report 0 inserted, which confirms the seed is intact.
3. Start the API fresh and check `/health/ready`.
4. Run:

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && E2E_API_BASE_URL=http://localhost:5162/v1 npm run e2e:sms-api && E2E_API_BASE_URL=http://localhost:5162/v1 npm run e2e:sms-api
```

Expected: both runs pass, every suite is green, and `0 skipped`.

- [ ] **Step 6: Check for skips and mocks in the gate**

```bash
cd "D:/convert/SMS backend/sms-teacher-app" && grep -rnE "\.skip|xit\(|xtest\(|xdescribe|jest\.mock\(" e2e || echo "none"; grep -n "signalr" jest.e2e.config.js || echo "no signalr mapping"
```

Expected: `none` and `no signalr mapping`.

- [ ] **Step 7: Do the manual device check**

The user or I start Expo against `http://<LAN-IP>:5162/v1`, either through `.env` or the `lan-apk` profile if its IP matches. Log in as `teacher.a@seed.schooldesk.test`, open Home, Attendance and Bus duty, and log out. Then log in as `principal@seed.schooldesk.test` and open Home, Approvals and Transport. Record the results in the matrix's final section.

- [ ] **Step 8: Commit** the final matrix status in `APP`.

- [ ] **Step 9: ⛔ STOP — CHECKPOINT 3.** Show the user:
- `git log --oneline 34af78e..HEAD` in `API` and `git log --oneline b9da198..HEAD` in `APP`
- the gate outputs from Steps 2–6
- any deferred rows

**Do not `git push` either repo** until the user explicitly approves.
