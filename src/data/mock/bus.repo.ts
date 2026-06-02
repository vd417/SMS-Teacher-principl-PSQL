import type { BusRepository } from '@/data/repositories/types';
import type { BusPosition } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';

const STEP = 0.34; // progress added per poll, so the marker visibly moves

export function mockBus(store: Store): BusRepository {
  // In-memory simulation state for the session (resets on reload).
  let stopIndex = 0;
  let progress = 0;

  return {
    async assignedBus() {
      await simulateLatency();
      const bus = store.tables.buses[0];
      if (!bus) throw new AppError({ code: 'not_found', status: 404, message: 'No bus assigned' });
      return bus;
    },

    async position(busId): Promise<BusPosition> {
      await simulateLatency();
      const bus = store.tables.buses.find((b) => b.id === busId) ?? store.tables.buses[0];
      const lastIndex = bus.stops.length - 1;

      // Advance the simulation.
      progress += STEP;
      if (progress >= 1) {
        if (stopIndex < lastIndex - 1) {
          stopIndex += 1;
          progress = 0;
        } else {
          stopIndex = lastIndex - 1 >= 0 ? lastIndex - 1 : 0;
          progress = 1; // arrived at final stop
        }
      }

      const from = bus.stops[stopIndex];
      const to = bus.stops[Math.min(stopIndex + 1, lastIndex)];
      const lat = from.lat + (to.lat - from.lat) * progress;
      const lng = from.lng + (to.lng - from.lng) * progress;
      const currentStopIndex = progress >= 1 ? Math.min(stopIndex + 1, lastIndex) : stopIndex;

      return {
        busId: bus.id,
        currentStopIndex,
        progress,
        lat,
        lng,
        nextStopName: to.name,
        etaMinutes: Math.max(1, Math.round((1 - progress) * 8)),
      };
    },

    async roster(busId) {
      await simulateLatency();
      // Single-bus mock: roster is the whole busBoarding table.
      void busId;
      return store.tables.busBoarding.map((r) => ({ ...r }));
    },

    async saveBoarding(busId, records) {
      await simulateLatency();
      void busId;
      store.tables.busBoarding = records.map((r) => ({ ...r }));
      await store.persist('busBoarding');
    },
  };
}
