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

  // HUB-02 cleanup: if a previous, aborted run left DS-01 with a live trip, /trip/start would
  // return 409 bus_already_active (TripService.cs:44-63) instead of the fresh-start 201 this suite
  // asserts. Unconditionally end any trip on DS-01 first: EndBusTripAsync returns 409
  // no_active_trip when the bus is already idle (harmless, ignored here) or 200 when it actually
  // ends a stale trip — either way DS-01 is idle before the HUB-02 test runs its own /trip/start.
  const bus = (await p.repos.principal.transportFleet()).find((x) => x.busNo === SEED.busNo)!;
  await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/end`);
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
  const date = lastSchoolDay();
  const students = (await a.repos.students.listByClass(ixA.id, { limit: 50 })).items;
  await a.repos.attendance.save(
    ixA.id,
    date,
    students.map((s) => ({ studentId: s.id, status: 'P' as const, date }))
  );

  await expect(principalHub.waitFor(isLive('attendance'), 10000)).resolves.toBeDefined();
  await expect(otherHub.waitFor(isLive('attendance'), 3000)).rejects.toThrow(
    /no matching hub event/
  );
});

test('HUB-01: principal announcement → teacher A receives live_event announcement; School B does not', async () => {
  const teacherHub = await track(connectLive(a.auth.accessToken));
  const otherHub = await track(connectLive(other.auth.accessToken));
  await p.repos.announcements.create({ title: `E2E live ${runId}`, body: 'e2e', type: 'info' });

  await expect(teacherHub.waitFor(isLive('announcement'), 10000)).resolves.toBeDefined();
  await expect(otherHub.waitFor(isLive('announcement'), 3000)).rejects.toThrow(
    /no matching hub event/
  );
});

test('HUB-02: principal joins DS-01; a trip ping delivers position_update for that bus', async () => {
  const bus = (await p.repos.principal.transportFleet()).find((x) => x.busNo === SEED.busNo)!;
  const fleetHub = await track(connectFleet(p.auth.accessToken));
  expect(await fleetHub.conn.invoke<boolean>('JoinBus', bus.busId)).toBe(true);

  // HUB-02 (this file's controller ruling): narrowed from the brief's toContain sets to the single
  // status each service call returns, read from sms-api TransportController.cs:144-156 and the
  // BusService/TripService methods behind it (this worktree, read-only):
  // - StartBusTripAsync → TripService.StartAsync (TripService.cs:44-63): a fresh start on an idle
  //   bus returns ApiResult<TripResponse>.Ok(..., 201); an already-live trip on the bus gets 409
  //   bus_already_active instead (handled by the beforeAll cleanup above, not asserted here).
  // - IngestBusTripPingsAsync → TripService.IngestOperatorPingsAsync → IngestPingsCoreAsync, which
  //   always ends in ApiResult.NoContent() → 204.
  const start = await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/start`, {
    body: { direction: 'pickup' },
  });
  expect(start.status).toBe(201);
  try {
    const ping = await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/pings`, {
      body: {
        pings: [
          {
            lat: 18.5236,
            lng: 73.8412,
            speed_kmh: 25,
            heading: 90,
            at: new Date().toISOString(),
            accuracy: 5,
          },
        ],
      },
    });
    expect(ping.status).toBe(204);
    const evt = await fleetHub.waitFor(isEvent('position_update'), 10000);
    expect(JSON.stringify(evt.payload)).toContain(bus.busId);
  } finally {
    await raw(p, 'POST', `/transport/buses/${bus.busId}/trip/end`);
  }
});
