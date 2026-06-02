import type { MyAttendanceRepository } from '@/data/repositories/types';
import type { SchoolLocation, TeacherAttendanceDay, TeacherAttendanceSummary } from '@/data/domain';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { todayISO } from '@/lib/geofence';

// Hardcoded for the mock. Swapped for a real per-school value via the http repo.
const SCHOOL: SchoolLocation = {
  lat: 40.0,
  lng: -75.0,
  radiusMeters: 10,
  name: 'School Desk Demo Campus',
};

function hoursBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

export function mockMyAttendance(store: Store): MyAttendanceRepository {
  function getDay(date: string): TeacherAttendanceDay {
    return store.tables.myAttendance.find((d) => d.date === date) ?? { date };
  }

  return {
    async schoolLocation() {
      await simulateLatency();
      return { ...SCHOOL };
    },

    async today() {
      await simulateLatency();
      return { ...getDay(todayISO()) };
    },

    async history(limit) {
      await simulateLatency();
      return [...store.tables.myAttendance]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit)
        .map((d) => ({ ...d }));
    },

    async summary(month) {
      await simulateLatency();
      const days = store.tables.myAttendance.filter((d) => d.date.startsWith(month));
      let daysPresent = 0;
      let daysFlagged = 0;
      let totalHours = 0;
      for (const d of days) {
        if (d.checkIn) daysPresent += 1;
        const flagged = d.checkIn?.verified === false || d.checkOut?.verified === false;
        if (flagged) daysFlagged += 1;
        if (d.checkIn && d.checkOut) totalHours += hoursBetween(d.checkIn.at, d.checkOut.at);
      }
      return { daysPresent, daysFlagged, totalHours: Math.round(totalHours * 10) / 10 };
    },

    async punch(event) {
      await simulateLatency();
      // A punch always happens "now", so key the day by the local calendar day
      // (todayISO) — this stays consistent with today(), which also reads todayISO().
      const date = todayISO();
      const existing = getDay(date);
      const updated: TeacherAttendanceDay = {
        date,
        checkIn: event.kind === 'in' ? event : existing.checkIn,
        checkOut: event.kind === 'out' ? event : existing.checkOut,
      };
      store.tables.myAttendance = [
        ...store.tables.myAttendance.filter((d) => d.date !== date),
        updated,
      ];
      await store.persist('myAttendance');
      return { ...updated };
    },
  };
}
