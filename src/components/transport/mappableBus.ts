import type { BusStop, FleetBusStatus } from '@/data/domain';

/** The subset of bus fields FleetMap needs to plot a marker — satisfied by both FleetBus and a read-only MyRouteBus row. */
export interface MappableBus {
  busId: string;
  busNo: string;
  status: FleetBusStatus;
  lat?: number;
  lng?: number;
  stops?: BusStop[];
}
