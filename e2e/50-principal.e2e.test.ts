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
  expect(o.staff.map((s) => s.name)).toEqual(
    expect.arrayContaining([SEED.teacherA.name, SEED.teacherB.name])
  );
});

test('PRN-02: school attendance has both seed classes with 10 students each', async () => {
  // Matrix row PRN-02 (B-2, SD-2): expected to fail until the backend returns active headcount /
  // distinct-present-that-day instead of raw period-mark counts. lastSchoolDay() may be a day with
  // no marked periods, in which case `total` is currently 0 instead of the seed's 10.
  const att = await p.repos.principal.attendance(lastSchoolDay());
  for (const name of [SEED.classA, SEED.classB]) {
    expect(att.classes.find((c) => c.className === name)?.total).toBe(SEED.studentsPerClass);
  }
});

test("PRN-01/PRN-02 coupling (R17): today's student_total is active headcount, and PRN-01 students_present_pct matches it", async () => {
  // Controller ruling R17, citing matrix B-2 (blast radius) / SD-2 (default semantics): B-2's
  // `ResolveStudentTotalsAsync` (ReportingRepository.cs:208-222) feeds both PRN-02 `student_total`
  // and PRN-01 `kpis.students_present_pct` (L236-238), so this must hold for TODAY on any day of
  // the week, not just a school day. SD-2: `total` = active headcount across IX-A + IX-B (2 * 10);
  // `present` = distinct students marked present/late in any period that day.
  const p2 = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const today = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;

  const att = await p.repos.principal.attendance(today);
  const o = await p.repos.principal.overview();

  expect(att.studentTotal).toBe(2 * SEED.studentsPerClass);
  expect(o.kpis.studentsPresentPct).toBe(Math.round((att.presentTotal / att.studentTotal) * 100));
});

test('PRN-03: staff attendance history for teacher A resolves', async () => {
  const o = await p.repos.principal.overview();
  const teacherA = o.staff.find((s) => s.name === SEED.teacherA.name)!;
  const history = await p.repos.principal.staffAttendanceHistory(teacherA.teacherId);
  // expect.any(Array) can fail on HTTP-sourced objects due to a jest realm mismatch
  // (phase3-preamble / known harness facts) — use Array.isArray instead, same strength.
  expect(Array.isArray(history)).toBe(true);
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

  // PRN-06 row note: dbo.busassignment_assign upserts on the unique (TenantId, TeacherUserId)
  // index (ON CONFLICT DO UPDATE), so no unassignBusTeacher call is needed before reassigning.
  // NEW FINDING (backend, not in the matrix): a raw HTTP probe (PUT
  // /transport/buses/{busId}/teacher, principal auth, real bus and teacher ids) returns 500
  // `internal_error` — reproduced even for a no-op reassign of the already-duty teacher A, so this
  // is not specific to teacher B or to changing the assignment. Matrix PRN-06 predicted 200 from a
  // static code read only ("pending e2e"); this is the live result. Using raw() here (not the repo
  // method, which throws on non-2xx) so the failure is a clean assertion instead of an uncaught
  // AppError, and restoring via raw() in finally is best-effort: the bus's DB state never actually
  // changes (the 500 happens before/during the write), so there is nothing to undo, but the
  // restore call is still attempted per R17 in case a future backend fix makes the assign succeed.
  let primaryError: unknown;
  try {
    const assign = await raw(p, 'PUT', `/transport/buses/${bus.busId}/teacher`, {
      body: { teacher_user_id: b.session.user.id },
    });
    expect(assign.status).toBe(200);
    expect(
      (await p.repos.principal.transportFleet()).find((x) => x.busId === bus.busId)?.teacherName
    ).toBe(SEED.teacherB.name);
  } catch (e) {
    primaryError = e;
  } finally {
    // Restore must never fail silently: a swallowed restore failure here is how a
    // broken restore went unnoticed and left the dev seed poisoned for later runs.
    // A primary failure above still takes priority in what gets rethrown, but a
    // restore failure is never discarded — it is thrown when there is no primary
    // error, and logged loudly when there is one so it isn't lost.
    try {
      const restore = await raw(p, 'PUT', `/transport/buses/${bus.busId}/teacher`, {
        body: { teacher_user_id: a.session.user.id },
      });
      if (restore.status !== 200 && !primaryError) {
        throw new Error(
          `PRN-06 restore failed: PUT /transport/buses/${bus.busId}/teacher returned ` +
            `${restore.status} while restoring teacher A duty. Seed may be left dirty.`
        );
      }
      if (restore.status !== 200 && primaryError) {
        console.error(
          `PRN-06 restore ALSO failed (status ${restore.status}) while an earlier ` +
            `assertion in this test was already failing; seed may be left dirty.`
        );
      }
    } catch (restoreErr) {
      if (!primaryError) throw restoreErr;

      console.error('PRN-06 restore ALSO threw:', restoreErr);
    }
  }
  if (primaryError) throw primaryError;
  expect(
    (await p.repos.principal.transportFleet()).find((x) => x.busId === bus.busId)?.teacherName
  ).toBe(SEED.teacherA.name);
});

test('PRN-08/09: add then remove a traveling teacher', async () => {
  // Matrix row PRN-04 (B-3): FleetBusResponse/FleetSnapshotBuilder never return
  // traveling_teachers, so `travelingTeachers` on the fetched fleet row is expected to be
  // undefined here — this assertion is expected to fail until B-3 lands.
  const bus = (await p.repos.principal.transportFleet()).find((x) => x.busNo === SEED.busNo)!;
  await p.repos.principal.addTravelingTeacher(bus.busId, b.session.user.id);
  try {
    const teacherIds = (await p.repos.principal.transportFleet())
      .find((x) => x.busId === bus.busId)
      ?.travelingTeachers?.map((t) => t.teacherUserId);
    expect(Array.isArray(teacherIds) ? teacherIds : []).toContain(b.session.user.id);
  } finally {
    await p.repos.principal.removeTravelingTeacher(bus.busId, b.session.user.id);
  }
});

test('GEO-01: route geometry returns the approved status for the seed route', async () => {
  const buses = await raw(p, 'GET', '/transport/buses');
  const row = (buses.body as { data: Record<string, unknown>[] }).data.find(
    (x) => x.bus_no === SEED.busNo
  )!;
  const res = await raw(p, 'GET', `/transport/routes/${String(row.route_id)}/geometry`);
  // Matrix row GEO-01: with the REAL route id (not the bus id the app currently sends, A-7), the
  // principal capture (docs/superpowers/audits/sms-api-capture/principal/GEO-01.json) returned 200.
  expect(res.status).toBe(200);
});

test('ANN-02: principal posts an announcement; teacher A sees it', async () => {
  const title = `E2E notice ${runId}`;
  const created = await p.repos.announcements.create({ title, body: 'e2e', type: 'info' });
  // Matrix row ANN-02 (B-5): CommsRepository.CreateAnnouncementAsync stores/returns
  // `From = role` (e.g. "school.principal") instead of the creator's display name, so this
  // assertion is expected to fail until B-5 lands.
  expect(created.from).toBe(SEED.principal.name);
  expect((await a.repos.announcements.list()).map((x) => x.title)).toContain(title);
});
