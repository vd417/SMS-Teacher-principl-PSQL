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
    const names = (await a.repos.students.listByClass(ixA.id, { limit: 50 })).items.map(
      (s) => s.name
    );
    for (const n of SEED.otherSchoolStudentNames) expect(names).not.toContain(n);
  });
  test('mismatched X-Tenant-Id → bare 403', async () => {
    const res = await raw(a, 'GET', '/classes', {
      headers: { 'X-Tenant-Id': other.auth.tenantId },
    });
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
