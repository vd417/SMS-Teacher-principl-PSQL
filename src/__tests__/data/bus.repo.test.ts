import { createStore } from '@/data/mock/store';
import { mockBus } from '@/data/mock/bus.repo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/latency', () => ({ simulateLatency: () => Promise.resolve() }));

it('assignedBus returns the seeded bus with stops', async () => {
  const repo = mockBus(await createStore());
  const bus = await repo.assignedBus();
  expect(bus.number).toBe('WBA-07');
  expect(bus.stops.length).toBeGreaterThan(1);
});

it('position advances progress and clamps at the last stop', async () => {
  const repo = mockBus(await createStore());
  const bus = await repo.assignedBus();
  const first = await repo.position(bus.id);
  expect(first.progress).toBeGreaterThan(0);
  let last = first;
  for (let i = 0; i < 30; i++) last = await repo.position(bus.id);
  expect(last.currentStopIndex).toBe(bus.stops.length - 1);
  expect(last.progress).toBeLessThanOrEqual(1);
  expect(typeof last.lat).toBe('number');
});

it('saveBoarding round-trips through roster', async () => {
  const repo = mockBus(await createStore());
  const bus = await repo.assignedBus();
  const roster = await repo.roster(bus.id);
  const updated = roster.map((r) => ({ ...r, status: 'boarded' as const }));
  await repo.saveBoarding(bus.id, updated);
  const after = await repo.roster(bus.id);
  expect(after.length).toBe(roster.length);
  for (const r of after) expect(r.status).toBe('boarded');
});
