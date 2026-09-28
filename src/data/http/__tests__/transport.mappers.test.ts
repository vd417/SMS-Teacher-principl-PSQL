import {
  fleetBusSchema,
  toFleetBus,
  transportBusSchema,
  toTransportBusRow,
} from '@/data/http/transport.mappers';

test('toFleetBus maps fleet wire row', () => {
  const row = fleetBusSchema.parse({
    bus_id: 'b1',
    bus_no: 'WBA-07',
    route_name: 'North Loop',
    driver: 'Ravi',
    driver_phone: '9999999999',
    stop_count: 5,
    students_riding: 12,
    status: 'on_route',
    lat: 12.97,
    lng: 77.59,
    speed_kmh: 22,
    next_stop_name: 'MG Road',
    teacher_user_id: 't1',
    teacher_name: 'Asha Rao',
    conductor_staff_id: 'c1',
    traveling_teachers: [{ teacher_user_id: 't2', teacher_name: 'Bob Iyer' }],
    stops: [
      { id: 's1', name: 'Gate 1', time: '07:45', seq: 0, lat: 12.9, lng: 77.5 },
      { id: 's2', name: 'MG Road', time: '08:00', seq: 1, lat: 12.97, lng: 77.59 },
    ],
  });
  const bus = toFleetBus(row);
  expect(bus.busNo).toBe('WBA-07');
  expect(bus.status).toBe('on_route');
  expect(bus.teacherName).toBe('Asha Rao');
  expect(bus.studentsRiding).toBe(12);
  expect(bus.conductorStaffId).toBe('c1');
  expect(bus.travelingTeachers).toEqual([{ teacherUserId: 't2', teacherName: 'Bob Iyer' }]);
  expect(bus.stops).toEqual([
    { id: 's1', name: 'Gate 1', time: '07:45', order: 0, lat: 12.9, lng: 77.5 },
    { id: 's2', name: 'MG Road', time: '08:00', order: 1, lat: 12.97, lng: 77.59 },
  ]);
});

test('toFleetBus tolerates a missing traveling_teachers list and stops', () => {
  const row = fleetBusSchema.parse({
    bus_id: 'b3',
    bus_no: 'WBA-03',
    stop_count: 2,
    students_riding: 4,
    status: 'idle',
  });
  const bus = toFleetBus(row);
  expect(bus.travelingTeachers).toBeUndefined();
  expect(bus.stops).toBeUndefined();
});

test('toTransportBusRow maps admin bus list row', () => {
  const row = transportBusSchema.parse({
    bus_id: 'b2',
    bus_no: 'WBA-02',
    students_assigned: 8,
    teacher_name: 'Bob',
  });
  const bus = toTransportBusRow(row);
  expect(bus.busId).toBe('b2');
  expect(bus.studentsAssigned).toBe(8);
  expect(bus.teacherName).toBe('Bob');
});

test('A-7: toFleetBus maps route_id, which /transport/fleet already sends but the old schema stripped', () => {
  const row = fleetBusSchema.parse({
    bus_id: 'b1',
    bus_no: 'WBA-07',
    route_id: 'route-1',
    stop_count: 5,
    students_riding: 12,
    status: 'idle',
  });
  expect(toFleetBus(row).routeId).toBe('route-1');
});

test('A-7: toTransportBusRow maps route_id, which /transport/buses already sends but the old schema stripped', () => {
  const row = transportBusSchema.parse({
    bus_id: 'b2',
    bus_no: 'WBA-02',
    route_id: 'route-2',
    students_assigned: 8,
  });
  expect(toTransportBusRow(row).routeId).toBe('route-2');
});

describe('B-3: traveling teacher with no stored name', () => {
  it('parses a null teacher_name and maps it to an empty string', () => {
    // TravelingTeacherResponse.TeacherName is string? (BusModule.cs:63): a teacher with
    // no Users.Name and no Teachers.Name sends null. The whole fleet parse must not throw.
    const row = {
      bus_id: '11111111-1111-1111-1111-111111111111',
      bus_no: 'DS-01',
      status: 'idle',
      traveling_teachers: [
        { teacher_user_id: '22222222-2222-2222-2222-222222222222', teacher_name: null },
      ],
    };
    const bus = toFleetBus(fleetBusSchema.parse(row));
    expect(bus.travelingTeachers).toEqual([
      { teacherUserId: '22222222-2222-2222-2222-222222222222', teacherName: '' },
    ]);
  });
});
