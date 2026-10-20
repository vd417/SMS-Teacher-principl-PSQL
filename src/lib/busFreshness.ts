export type BusFreshnessKind = 'LIVE' | 'DELAYED' | 'OFFLINE';

export interface BusFreshness {
  kind: BusFreshnessKind;
  label: BusFreshnessKind;
}

const LIVE_MS = 60_000;
const DELAYED_MS = 5 * 60_000;

export function busFreshness(input: {
  lat?: number | null;
  lng?: number | null;
  lastPingAt?: string | null;
  nowMs?: number;
}): BusFreshness {
  const now = input.nowMs ?? Date.now();
  const hasCoords =
    typeof input.lat === 'number' &&
    Number.isFinite(input.lat) &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lng);
  if (!hasCoords || !input.lastPingAt) return { kind: 'OFFLINE', label: 'OFFLINE' };

  const ping = Date.parse(input.lastPingAt);
  if (!Number.isFinite(ping)) return { kind: 'OFFLINE', label: 'OFFLINE' };

  const age = now - ping;
  if (age <= LIVE_MS) return { kind: 'LIVE', label: 'LIVE' };
  if (age <= DELAYED_MS) return { kind: 'DELAYED', label: 'DELAYED' };
  return { kind: 'OFFLINE', label: 'OFFLINE' };
}

export function formatBusStatusLine(input: {
  freshness: BusFreshness;
  nextStopName?: string | null;
  etaMinutes?: number | null;
}): string {
  const { freshness, nextStopName, etaMinutes } = input;
  const stop = typeof nextStopName === 'string' ? nextStopName.trim() : '';
  const eta = typeof etaMinutes === 'number' && Number.isFinite(etaMinutes) ? etaMinutes : null;

  if (freshness.kind === 'OFFLINE') return 'OFFLINE';
  if (stop && eta != null) return `${freshness.label} · En route to ${stop} · ~${eta} min`;
  if (stop) return `${freshness.label} · En route to ${stop}`;
  if (nextStopName === null || etaMinutes === null) {
    return `${freshness.label} · GPS received, no ETA yet`;
  }
  return freshness.label;
}
