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
  });
  const bus = toFleetBus(row);
  expect(bus.busNo).toBe('WBA-07');
  expect(bus.status).toBe('on_route');
  expect(bus.teacherName).toBe('Asha Rao');
  expect(bus.studentsRiding).toBe(12);
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
