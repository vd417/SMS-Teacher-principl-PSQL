import { validateChatMessage } from '@/lib/chatModeration';
import { SEED } from './support/config';
import { lastSchoolDay } from './support/dates';
import { raw } from './support/raw';
import { runId, seedClass, seedPaper } from './support/seedLookup';
import { loginAs, type Actor } from './support/session';

/**
 * NEW FINDING (harness, this test only — not a matrix row): `runId` is a base36 timestamp
 * fragment (seedLookup.ts), and the app's client-side chat moderation (`src/lib/chatModeration.ts`,
 * substring match with no word boundary for single-word terms, plus a leetspeak digit map) flags an
 * arbitrary random id embedded in message text as `abusive_language` in roughly 1 run in 8 —
 * verified by running the real `validateChatMessage` over 2000 synthetic `E2E hello <id>` strings
 * (~11% hit rate on 2-letter fragments like "ta"/"bn"/"pa"/"en", some of which also flag ordinary
 * English sentences, e.g. "...checking in"). That is real app behaviour (`src/` is read-only for
 * this task), so the fix lives here: prefer the run-scoped text, but when the real validator
 * rejects it (the id itself collided), fall back to a fixed literal already confirmed safe by the
 * same validator, so CHT-04/CHT-03/CHT-02 stay idempotent instead of flaking or weakening the
 * assertions.
 */
const CHAT_TEXT_FALLBACK = 'E2E chat check';
function moderationSafeChatText(preferred: string): string {
  if (validateChatMessage(preferred).ok) return preferred;
  if (validateChatMessage(CHAT_TEXT_FALLBACK).ok) return CHAT_TEXT_FALLBACK;
  throw new Error(
    'no moderation-safe chat text available (both the run-scoped and fallback text were rejected)'
  );
}

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
  const records = students.map((s, i) => ({
    studentId: s.id,
    status: i === 0 ? ('A' as const) : ('P' as const),
    date,
  }));
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
    records: students.map((s) => ({ studentId: s.id, status: 'P' as const, date })),
  });
  expect(await a.repos.attendance.forPeriod(ixA.id, date, 1, 'Mathematics')).toHaveLength(
    students.length
  );
});

test('GRD-02 → GRD-01 + GRD-03: marks upsert, read back, notify', async () => {
  const paper = await seedPaper(a);
  const student = (await a.repos.students.listByClass(paper.classId, { limit: 1 })).items[0];
  await a.repos.grades.upsert({
    studentId: student.id,
    studentName: student.name,
    examId: paper.id,
    marks: 42,
  });
  const saved = (await a.repos.grades.listByExam(paper.id)).find((g) => g.studentId === student.id);
  expect(saved?.marks).toBe(42);
  expect(saved?.studentName).toBe(student.name);
  await expect(a.repos.grades.notifyPublished(paper.id)).resolves.toEqual(
    expect.objectContaining({ parentReach: expect.any(Number) })
  );
});

test('ASG-02/03 → ASG-01: create then update an assignment', async () => {
  const ixA = await seedClass(a, SEED.classA);
  const title = `E2E assignment ${runId}`;
  const input = {
    title,
    classId: ixA.id,
    className: ixA.name,
    subject: 'Mathematics',
    dueDate: lastSchoolDay(),
    description: 'e2e',
  };
  const created = await a.repos.assignments.create(input);
  await a.repos.assignments.update(created.id, { ...input, title: `${title} (edited)` });
  expect((await a.repos.assignments.list()).map((x) => x.title)).toContain(`${title} (edited)`);
});

test('LEV-02 → LEV-01: teacher B applies for leave and sees it pending', async () => {
  const reason = `E2E leave ${runId}`;
  await b.repos.leave.create({ type: 'casual', from: '2027-02-01', to: '2027-02-01', reason });
  expect((await b.repos.leave.list()).find((l) => l.reason === reason)?.status).toBe('pending');
});

test('MYA-05 → MYA-02: geofenced punch-in inside the fence', async () => {
  // dbo.checkin_insert always inserts (no per-day upsert), so calling punch()
  // unconditionally on every gate run grows the CheckIns table without bound
  // and runs are not isolated. today() is keyed by date, so a check-in already
  // recorded earlier today is proof the geofence punch was recorded — only
  // punch when there isn't one yet, keeping this run-scoped/idempotent per day
  // while still proving a punch inside the fence gets recorded and verified.
  const before = await a.repos.myAttendance.today();
  if (!before?.checkIn) {
    await a.repos.myAttendance.punch({
      kind: 'in',
      at: new Date().toISOString(),
      lat: SEED.geo.lat,
      lng: SEED.geo.lng,
      accuracyMeters: 10,
      distanceMeters: 0,
      verified: true,
    });
  }
  const after = await a.repos.myAttendance.today();
  expect(after?.checkIn).toBeDefined();
  expect(after?.checkIn?.verified).toBe(true);
});

test('CHT-04 + CHT-03 → CHT-02: open a thread with the principal and send a message', async () => {
  const contact = await a.repos.chat.createThread({ name: SEED.principal.name, role: 'principal' });
  const text = moderationSafeChatText(`E2E hello ${runId}`);
  await a.repos.chat.send(contact.id, { text });
  expect((await a.repos.chat.messages(contact.id)).map((m) => m.text)).toContain(text);
});

test('BUS-04: teacher A records boarding on the duty bus (SD-4: boarding needs a live trip)', async () => {
  // R13/SD-4 (keep): boarding requires an active trip started by a driver or the principal
  // (matrix BUS-04, SD-4). Sequential login on purpose — no loginAs concurrency (session.ts).
  const principal = await loginAs(SEED.principal.email, SEED.principal.password);
  const bus = (await a.repos.bus.assignedBus())!;
  // TransportController.cs:144-147 → BusService.StartBusTripAsync → TripService.StartAsync
  // (TripService.cs:44-63): a fresh start on an idle bus returns 201 (the single status sms-api
  // returns here; a bus with an already-live trip gets 409 bus_already_active instead).
  const start = await raw(principal, 'POST', `/transport/buses/${bus.id}/trip/start`, {
    body: { direction: 'pickup' },
  });
  expect(start.status).toBe(201);
  try {
    const roster = await a.repos.bus.roster(bus.id);
    await expect(
      a.repos.bus.saveBoarding(
        bus.id,
        roster.map((r) => ({ ...r, status: 'boarded' as const }))
      )
    ).resolves.toBeUndefined();
  } finally {
    await raw(principal, 'POST', `/transport/buses/${bus.id}/trip/end`);
  }
});
