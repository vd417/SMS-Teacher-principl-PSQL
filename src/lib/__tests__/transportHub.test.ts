import {
  applyPositionToBusPosition,
  applyPositionToBusRows,
  applyPositionToFleet,
  parseBusPositionPush,
  transportHubUrl,
} from '../transportHub';
import type { BusPosition, FleetBus, MyRouteBus } from '@/data/domain';

describe('transportHubUrl', () => {
  it('strips the /v1 API prefix so the hub sits on the API origin', () => {
    expect(transportHubUrl('http://localhost:5162/v1')).toBe(
      'http://localhost:5162/hubs/transport-fleet'
    );
    expect(transportHubUrl('http://localhost:5162/v1/')).toBe(
      'http://localhost:5162/hubs/transport-fleet'
    );
  });
});

describe('parseBusPositionPush', () => {
  it('accepts a valid push payload', () => {
    const push = parseBusPositionPush({
      bus_id: 'b1',
      lat: 12.97,
      lng: 77.59,
      speed_kmh: 30,
      next_stop_name: 'MG Road',
      last_ping_at: '2026-09-05T08:30:00Z',
    });
    expect(push?.bus_id).toBe('b1');
    expect(push?.speed_kmh).toBe(30);
  });

  it('accepts last_update_at from the live snapshot payload', () => {
    const push = parseBusPositionPush({
      bus_id: 'b1',
      lat: 12.97,
      lng: 77.59,
      last_update_at: '2026-09-05T08:30:00Z',
    });
    expect(push?.last_ping_at).toBe('2026-09-05T08:30:00Z');
  });

  it('rejects a payload missing bus_id', () => {
    expect(parseBusPositionPush({ lat: 1, lng: 2 })).toBeNull();
  });

  it('rejects garbage payloads', () => {
    expect(parseBusPositionPush(null)).toBeNull();
    expect(parseBusPositionPush('nope')).toBeNull();
  });
});

const basePosition: BusPosition = {
  busId: 'b1',
  currentStopIndex: 1,
  progress: 0.3,
  lat: 1,
  lng: 1,
  nextStopName: 'Old Stop',
  etaMinutes: 10,
};

describe('applyPositionToBusPosition', () => {
  it('merges a matching push into the cached position', () => {
    const push = parseBusPositionPush({
      bus_id: 'b1',
      lat: 2,
      lng: 2,
      speed_kmh: 25,
      next_stop_name: 'New Stop',
      last_ping_at: '2026-09-05T08:30:00Z',
    })!;
    const updated = applyPositionToBusPosition(basePosition, push);
    expect(updated).toMatchObject({
      lat: 2,
      lng: 2,
      speedKmh: 25,
      nextStopName: 'New Stop',
      lastPingAt: '2026-09-05T08:30:00Z',
      currentStopIndex: 1,
      etaMinutes: 10,
    });
  });

  it('leaves the cache untouched for a different bus', () => {
    const push = parseBusPositionPush({ bus_id: 'other', lat: 9, lng: 9 })!;
    expect(applyPositionToBusPosition(basePosition, push)).toBe(basePosition);
  });

  it('passes through when there is nothing cached yet', () => {
    const push = parseBusPositionPush({ bus_id: 'b1', lat: 9, lng: 9 })!;
    expect(applyPositionToBusPosition(undefined, push)).toBeUndefined();
  });
});

const baseFleet: FleetBus[] = [
  {
    busId: 'b1',
    busNo: 'WBA-01',
    stopCount: 3,
    studentsRiding: 5,
    status: 'on_route',
    lat: 1,
    lng: 1,
  },
  { busId: 'b2', busNo: 'WBA-02', stopCount: 4, studentsRiding: 2, status: 'idle', lat: 5, lng: 5 },
];

describe('applyPositionToFleet', () => {
  it('patches only the matching bus row', () => {
    const push = parseBusPositionPush({ bus_id: 'b2', lat: 6, lng: 6, speed_kmh: 12 })!;
    const updated = applyPositionToFleet(baseFleet, push);
    expect(updated?.find((b) => b.busId === 'b2')).toMatchObject({ lat: 6, lng: 6, speedKmh: 12 });
    expect(updated?.find((b) => b.busId === 'b1')).toEqual(baseFleet[0]);
  });

  it('passes through when there is no cached fleet yet', () => {
    const push = parseBusPositionPush({ bus_id: 'b1', lat: 9, lng: 9 })!;
    expect(applyPositionToFleet(undefined, push)).toBeUndefined();
  });
});

const baseMyRoutes: MyRouteBus[] = [
  { busId: 'b1', busNo: 'WBA-01', isDutyTeacher: true, lat: 1, lng: 1 },
  { busId: 'b2', busNo: 'WBA-02', isDutyTeacher: false, lat: 5, lng: 5 },
];

describe('applyPositionToBusRows with MyRouteBus rows', () => {
  it('patches only the matching route bus, regardless of duty status', () => {
    const push = parseBusPositionPush({ bus_id: 'b2', lat: 6, lng: 6, speed_kmh: 12 })!;
    const updated = applyPositionToBusRows(baseMyRoutes, push);
    expect(updated?.find((b) => b.busId === 'b2')).toMatchObject({ lat: 6, lng: 6, speedKmh: 12 });
    expect(updated?.find((b) => b.busId === 'b1')).toEqual(baseMyRoutes[0]);
  });
});
