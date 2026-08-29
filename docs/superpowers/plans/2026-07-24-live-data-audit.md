# Live-Data Audit (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one consolidated findings report (`docs/superpowers/audits/2026-07-24-live-data-findings.md`) classifying every screen's data source across `sms-teacher-app` as (a) app-side wiring gap, (b) backend gap, or (c) acceptable derived value — no code changes in this plan.

**Architecture:** This is a research/audit plan, not a code-change plan — there is no TDD cycle because no production code is touched. Each task audits one screen group, tracing screen → hook → repo → zod schema → backend endpoint, and appends its findings to the shared report file. The final task consolidates and cross-checks the whole report for consistency.

**Tech Stack:** N/A (read-only audit of existing TypeScript/React Native + C# ASP.NET codebases).

## Global Constraints

- Classification scheme (from spec, verbatim): **(a)** app-side wiring gap — backend has the data, app isn't using it. **(b)** backend gap — data doesn't exist on backend. **(c)** acceptable derived value — genuinely client-computed for UX, not fabrication; document why.
- Cross-check every backend claim against `sms-backend/src/Sms.Api/Swagger/ApiAudienceMap.cs` and the actual endpoint/handler file — do not rely on the 31-day-old memory notes as fact, only as a starting hint list.
- No code changes in this plan. If a screen looks broken (not just data-sourcing), note it in the report but do not fix it here.
- Every finding row must include: screen file, hook/repo file:line, classification, and (for b) the specific backend field/endpoint that would be needed.

---

### Task 1: Set up the shared findings report + audit auth/account screens

**Files:**

- Create: `docs/superpowers/audits/2026-07-24-live-data-findings.md`
- Read: `src/screens/LoginScreen.tsx`, `src/screens/ForgotPasswordScreen.tsx`, `src/screens/SetPasswordScreen.tsx`, `src/screens/ChangePasswordScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/screens/MoreScreen.tsx`
- Read (data path): `src/features/auth/**`, `src/data/http/auth.repo.ts`, `src/data/http/auth.schema.ts`

**Interfaces:**

- Produces: the report file with a header + a Markdown table (columns: `Screen | Field/Value | Source (hook→repo→endpoint) | Classification | Notes`) — every later task appends rows to this same table, one section per screen group.

- [ ] **Step 1: Create the report file with header and table skeleton**

```markdown
# Live-Data Findings — sms-teacher-app (2026-07-24)

Classification: (a) app-side wiring gap · (b) backend gap · (c) acceptable derived value

| Screen | Field/Value | Source (hook → repo → endpoint) | Class | Notes |
| ------ | ----------- | ------------------------------- | ----- | ----- |
```

- [ ] **Step 2: Trace each auth/account screen's data and append rows**

For each of the 7 screens listed above: open the screen, identify every piece of displayed data, follow it to its hook, then repo function, then confirm the backend endpoint exists and returns that field (check `sms-backend/src/Sms.Api/Swagger/ApiAudienceMap.cs` plus the relevant `sms-backend` endpoint file, e.g. `AuthEndpoints.cs`). Append one row per data point to the table. Pay special attention to `ProfileScreen.tsx` (the known `/auth/me` profile-fields gap from prior memory — re-verify against current `sms-backend` code, don't assume it's still missing).

- [ ] **Step 3: Self-check this section**

Re-read the appended rows: does every row have a non-empty Class column? Does every (b) row name the specific missing field/endpoint? Fix any row that doesn't.

- [ ] **Step 4: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for auth/account screens"
```

---

### Task 2: Audit home/dashboard + attendance screens

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md` (append rows)
- Read: `src/screens/HomeScreen.tsx`, `src/screens/MyAttendanceScreen.tsx`, `src/screens/AttendanceScreen.tsx`, `src/screens/AttendancePickClassScreen.tsx`
- Read (data path): whatever hooks/repos these screens import (e.g. dashboard-stats, attendance repo)

**Interfaces:**

- Consumes: table skeleton from Task 1.
- Produces: additional rows in the same table.

- [ ] **Step 1: Trace HomeScreen and MyAttendanceScreen**

Confirm the dashboard-stats fields (per prior memory, only `attendanceToday` % is real — verify this is still true and no new hardcoded pills crept back in) and MyAttendanceScreen's data source. Append rows.

- [ ] **Step 2: Trace AttendanceScreen and AttendancePickClassScreen**

Confirm the date stepper still uses `todayISO()` (from `src/lib/date.ts`) and not a hardcoded date; confirm class list and student roster come from the paginated `students.listByClass` repo call (per prior memory, this is the one cursor-paginated endpoint). Append rows.

- [ ] **Step 3: Self-check this section**

Same check as Task 1 Step 3, scoped to this section's rows.

- [ ] **Step 4: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for home/attendance screens"
```

---

### Task 3: Audit classes/students/academics screens

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md` (append rows)
- Read: `src/screens/ClassesScreen.tsx`, `src/screens/ClassDetailScreen.tsx`, `src/screens/StudentScreen.tsx`, `src/screens/AssignmentsScreen.tsx`, `src/screens/AssignmentNewScreen.tsx`, `src/screens/GradesScreen.tsx`, `src/screens/MarksEntryScreen.tsx`, `src/screens/MarksPickClassScreen.tsx`

**Interfaces:**

- Consumes: table skeleton from Task 1.
- Produces: additional rows in the same table.

- [ ] **Step 1: Trace class/student screens**

Append rows for `ClassesScreen`, `ClassDetailScreen`, `StudentScreen`.

- [ ] **Step 2: Trace assignments/grades/marks screens**

Append rows for `AssignmentsScreen`, `AssignmentNewScreen`, `GradesScreen`, `MarksEntryScreen`, `MarksPickClassScreen`.

- [ ] **Step 3: Self-check this section**

Same check pattern as prior tasks.

- [ ] **Step 4: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for classes/academics screens"
```

---

### Task 4: Audit exams screens

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md` (append rows)
- Read: `src/screens/ExamsScreen.tsx`, `src/screens/ExamDetailScreen.tsx`, `src/screens/ExamNewScreen.tsx`

**Interfaces:**

- Consumes: table skeleton from Task 1.
- Produces: additional rows in the same table.

- [ ] **Step 1: Trace exam screens, re-verify the known exam-papers gap**

Prior memory states exam-papers have no `topics`/`class_name` from the backend. Re-check the current `sms-backend` exams endpoint/schema to see if this is still true, and append rows classifying each field accordingly.

- [ ] **Step 2: Self-check this section**

Same check pattern as prior tasks.

- [ ] **Step 3: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for exams screens"
```

---

### Task 5: Audit communication screens (announcements, chat)

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md` (append rows)
- Read: `src/screens/AnnouncementsScreen.tsx`, `src/screens/ChatScreen.tsx`, `src/screens/ChatThreadScreen.tsx`

**Interfaces:**

- Consumes: table skeleton from Task 1.
- Produces: additional rows in the same table.

- [ ] **Step 1: Trace announcements**

Append rows for `AnnouncementsScreen`.

- [ ] **Step 2: Trace chat screens, re-verify the known thread-initials/online-status gap**

Prior memory states thread initials are derived client-side and online status is hardcoded `false`. Re-check whether `sms-backend` now exposes presence/online data or real avatar initials source, and classify accordingly.

- [ ] **Step 3: Self-check this section**

Same check pattern as prior tasks.

- [ ] **Step 4: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for communication screens"
```

---

### Task 6: Audit remaining screens (bus, library, leave, payslip, schedule)

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md` (append rows)
- Read: `src/screens/BusScreen.tsx`, `src/screens/bus/BusMap.tsx`, `src/screens/bus/BusMap.web.tsx`, `src/screens/bus/BusRouteFallback.tsx`, `src/screens/LibraryScreen.tsx`, `src/screens/LeaveScreen.tsx`, `src/screens/PayslipScreen.tsx`, `src/screens/ScheduleScreen.tsx`

**Interfaces:**

- Consumes: table skeleton from Task 1.
- Produces: additional rows in the same table.

- [ ] **Step 1: Trace bus screens**

Append rows for `BusScreen` and the three `bus/*` components (geofence check-in data per prior [[principal-role-mobile-spec]] context).

- [ ] **Step 2: Trace library/leave/payslip/schedule**

Append rows. Re-verify the known approvals-source gap: prior memory states approvals come from `LeaveResponse` with synthesized `title`/`priority`/`requesterName='Staff member'` — check if `LeaveScreen`'s underlying repo still does this and whether backend now provides real values.

- [ ] **Step 3: Self-check this section**

Same check pattern as prior tasks.

- [ ] **Step 4: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for bus/library/leave/payslip/schedule screens"
```

---

### Task 7: Audit principal-role screens

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md` (append rows)
- Read: `src/screens/principal/ApprovalsScreen.tsx`, `src/screens/principal/ClassTimetableScreen.tsx`, `src/screens/principal/PrincipalAttendanceScreen.tsx`, `src/screens/principal/PrincipalHomeScreen.tsx`, `src/screens/principal/PrincipalMoreScreen.tsx`, `src/screens/principal/SchoolTimetableScreen.tsx`, `src/screens/principal/TeacherDirectoryScreen.tsx`

**Interfaces:**

- Consumes: table skeleton from Task 1.
- Produces: additional rows in the same table.

- [ ] **Step 1: Trace all 7 principal screens**

Append rows for each. Pay attention to `PrincipalHomeScreen`'s greeting/name source (should match the `/auth/me` fix path checked in Task 1) and `TeacherDirectoryScreen` (likely a full-list backend call per [[teacher-app-live-api]] — confirm it's not a hardcoded roster).

- [ ] **Step 2: Self-check this section**

Same check pattern as prior tasks.

- [ ] **Step 3: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): findings for principal screens"
```

---

### Task 8: Consolidate, cross-check, and summarize

**Files:**

- Modify: `docs/superpowers/audits/2026-07-24-live-data-findings.md`

**Interfaces:**

- Consumes: the full table from Tasks 1-7.
- Produces: a summary section at the top of the report (after the header, before the table) with counts per classification and a short prioritized list of (b) backend-gap items, since those need `sms-backend` work.

- [ ] **Step 1: Read the full report top to bottom**

Check for: duplicate rows (same screen/field audited twice), inconsistent classification of the same underlying gap (e.g. the profile-fields gap should be classified identically everywhere it appears), and any row missing a Notes explanation for class (b) or (c).

- [ ] **Step 2: Fix inconsistencies found in Step 1**

Edit rows directly in the table.

- [ ] **Step 3: Add the summary section**

```markdown
## Summary

- Total findings: N
- (a) App-side wiring gaps: N
- (b) Backend gaps: N
- (c) Acceptable derived values: N

### Backend gaps requiring sms-backend changes (priority order)

1. ...
2. ...
```

Fill in the actual counts and the actual prioritized list from the table — no placeholder text.

- [ ] **Step 4: Commit**

```bash
cd D:/SMS/sms-project/sms-teacher-app
git add docs/superpowers/audits/2026-07-24-live-data-findings.md
git commit -m "docs(audit): consolidate and summarize live-data findings"
```

- [ ] **Step 5: Report back to user**

Present the summary section (counts + prioritized backend-gap list) directly in the conversation, and note that Phase 2 (app-side fixes), Phase 3 (backend fixes), and Phase 4 (live verification) will each get their own plan sized from these findings, per the approved spec.
