// We test the mapper by importing the internal toBus via a tiny re-export.
// Add `export { toBus, type BusDTO };` at the end of bus.repo.ts in Step 3.
import { toBus, type BusDTO } from '@/data/http/bus.repo';

describe('BusDTO canonical contract', () => {
  const dto: BusDTO = {
    id: 'b1',
    bus_no: 'WBA-07',
    route_name: 'North Loop',
    driver: 'R. Singh',
    driver_phone: '9876500000',
    stops: [{ id: 'st1', name: 'Gate 1', time: '07:45', seq: 1, lat: 40, lng: -75 }],
  };

  it('maps bus_no -> number and stop seq -> order', () => {
    const bus = toBus(dto);
    expect(bus.number).toBe('WBA-07');
    expect(bus.routeName).toBe('North Loop');
    expect(bus.driverPhone).toBe('9876500000');
    expect(bus.stops[0]).toEqual({
      id: 'st1',
      name: 'Gate 1',
      time: '07:45',
      order: 1,
      lat: 40,
      lng: -75,
    });
  });
});
