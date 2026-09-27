import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { seedClass, seedPaper } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

/**
 * `expect.any(Array)` resolves via `other instanceof Array` (@jest/expect's `Any.asymmetricMatch`,
 * unlike `expect.any(Object)`/`expect.any(Number)`, which use realm-safe `typeof` checks). Node's
 * built-in `fetch`'s `Response.json()` parses in a different realm than jest-environment-node's
 * per-file sandbox, so every array this harness gets over HTTP has `Array.isArray(x) === true` but
 * `x instanceof Array === false` here, and `expect.any(Array)` always fails regardless of payload.
 * This is a jest/node harness artifact (verified: Array.isArray true, instanceof false), not a
 * matrix/API contract issue, so this checks array-ness the realm-safe way instead.
 */
async function expectResolvesArray(p: Promise<unknown>): Promise<void> {
  const v = await p;
  expect(Array.isArray(v)).toBe(true);
}

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
    expect(page.items.map((s) => s.name)).not.toEqual(
      expect.arrayContaining([...SEED.otherSchoolStudentNames])
    );
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
    for (const [cls, period] of [
      [SEED.classA, 1],
      [SEED.classB, 2],
    ] as const) {
      expect(slots.filter((s) => s.className === cls && s.period === period)).toHaveLength(5);
    }
  });

  test('EXM-01/02/03 + GRD-01: the published term and the IX-A maths paper', async () => {
    expect((await a.repos.exams.listTerms()).map((t) => t.name)).toContain('Dev Seed Unit Test 1');
    const paper = await seedPaper(a);
    expect(paper).toMatchObject({ subject: 'Mathematics', maxMarks: 50, status: 'upcoming' });
    expect(await a.repos.exams.get(paper.id)).toMatchObject({ id: paper.id });
    await expectResolvesArray(a.repos.grades.listByExam(paper.id));
  });

  test('ANN-01: the seed announcement is visible', async () => {
    expect((await a.repos.announcements.list()).map((x) => x.title)).toContain(
      SEED.announcementTitle
    );
  });

  test('BUS-01/03: duty bus DS-01 with 3 stops and 5 riders', async () => {
    // bus.assignedBus() returns Promise<Bus> (src/data/repositories/types.ts), not Bus | null —
    // for teacher A (the DS-01 duty teacher, matrix BUS-01) this resolves, it does not throw.
    const bus = await a.repos.bus.assignedBus();
    expect(bus).toMatchObject({ number: SEED.busNo });
    expect(bus.stops).toHaveLength(3);
    expect(await a.repos.bus.roster(bus.id)).toHaveLength(SEED.busRiders);
  });

  test('MYA-01: geofence from the seed', async () => {
    expect(await a.repos.myAttendance.schoolLocation()).toMatchObject({
      lat: SEED.geo.lat,
      lng: SEED.geo.lng,
      radiusMeters: SEED.geo.radiusMeters,
    });
  });

  test('remaining GETs parse through their real schemas', async () => {
    await expectResolvesArray(a.repos.assignments.list());
    await expectResolvesArray(a.repos.chat.contacts());
    await expectResolvesArray(a.repos.notifications.list());
    await expectResolvesArray(a.repos.calendar.list());
    await expectResolvesArray(a.repos.library.list());
    await expectResolvesArray(a.repos.payroll.list());
    await expectResolvesArray(a.repos.leave.list());
    await expect(a.repos.dashboard.stats()).resolves.toEqual(
      expect.objectContaining({ totalClasses: expect.any(Number) })
    );
    await expectResolvesArray(a.repos.teachers.list());
    await expectResolvesArray(a.repos.staff.list());
    await expectResolvesArray(a.repos.bus.myRoutes());
  });
});
