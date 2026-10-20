import { busFreshness, formatBusStatusLine } from '../busFreshness';

const now = Date.parse('2026-10-19T06:00:00.000Z');

test('busFreshness is LIVE only when coordinates are fresh', () => {
  expect(
    busFreshness({
      lat: 19.1,
      lng: 72.8,
      lastPingAt: '2026-10-19T05:59:40.000Z',
      nowMs: now,
    }).kind
  ).toBe('LIVE');
});

test('busFreshness is DELAYED for a recent but stale ping', () => {
  expect(
    busFreshness({
      lat: 19.1,
      lng: 72.8,
      lastPingAt: '2026-10-19T05:57:00.000Z',
      nowMs: now,
    }).kind
  ).toBe('DELAYED');
});

test('busFreshness is OFFLINE when there is no ping or coordinates', () => {
  expect(busFreshness({ nowMs: now }).kind).toBe('OFFLINE');
  expect(
    busFreshness({
      lastPingAt: '2026-10-19T05:00:00.000Z',
      lat: 19.1,
      lng: 72.8,
      nowMs: now,
    }).kind
  ).toBe('OFFLINE');
});

test('formatBusStatusLine never interpolates missing next-stop fields as undefined', () => {
  expect(formatBusStatusLine({ freshness: { kind: 'LIVE', label: 'LIVE' } })).toBe('LIVE');
  expect(
    formatBusStatusLine({
      freshness: { kind: 'LIVE', label: 'LIVE' },
      nextStopName: 'MG Road',
      etaMinutes: 4,
    })
  ).toBe('LIVE · En route to MG Road · ~4 min');
  expect(
    formatBusStatusLine({
      freshness: { kind: 'DELAYED', label: 'DELAYED' },
      nextStopName: null,
      etaMinutes: null,
    })
  ).toBe('DELAYED · GPS received, no ETA yet');
});
