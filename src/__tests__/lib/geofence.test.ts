import { haversineMeters, evaluate, buildCheckEvent, ACCURACY_CAP } from '@/lib/geofence';
import type { SchoolLocation } from '@/data/domain';

const SCHOOL: SchoolLocation = { lat: 40.0, lng: -75.0, radiusMeters: 10, name: 'Test School' };

describe('haversineMeters', () => {
  it('returns ~0 for identical points', () => {
    expect(haversineMeters({ lat: 40, lng: -75 }, { lat: 40, lng: -75 })).toBeCloseTo(0, 5);
  });

  it('approximates a known short distance', () => {
    // 0.001 deg of latitude ≈ 111.2 m
    const d = haversineMeters({ lat: 40.0, lng: -75.0 }, { lat: 40.001, lng: -75.0 });
    expect(d).toBeGreaterThan(108);
    expect(d).toBeLessThan(114);
  });
});

describe('evaluate', () => {
  it('verifies a point inside the bare radius', () => {
    const r = evaluate({ lat: 40.0, lng: -75.0, accuracyMeters: 0 }, SCHOOL);
    expect(r.distanceMeters).toBeCloseTo(0, 5);
    expect(r.verified).toBe(true);
  });

  it('verifies a point just outside radius but inside the accuracy buffer', () => {
    // ~22 m away, but accuracy 30 → buffer 10 + 30 = 40 ⇒ verified
    const r = evaluate({ lat: 40.0002, lng: -75.0, accuracyMeters: 30 }, SCHOOL);
    expect(r.distanceMeters).toBeGreaterThan(15);
    expect(r.verified).toBe(true);
  });

  it('flags a point well outside radius with good accuracy', () => {
    // ~111 m away, accuracy 5 → buffer 15 ⇒ flagged
    const r = evaluate({ lat: 40.001, lng: -75.0, accuracyMeters: 5 }, SCHOOL);
    expect(r.verified).toBe(false);
  });

  it('caps the accuracy buffer so a garbage fix cannot auto-verify', () => {
    // ~111 m away, accuracy 9999 → buffer capped at 10 + ACCURACY_CAP(50) = 60 ⇒ flagged
    const r = evaluate({ lat: 40.001, lng: -75.0, accuracyMeters: 9999 }, SCHOOL);
    expect(ACCURACY_CAP).toBe(50);
    expect(r.verified).toBe(false);
  });
});

describe('buildCheckEvent', () => {
  it('assembles a CheckEvent from a position and school', () => {
    const ev = buildCheckEvent('in', { lat: 40.0, lng: -75.0, accuracyMeters: 3 }, SCHOOL);
    expect(ev.kind).toBe('in');
    expect(ev.lat).toBe(40.0);
    expect(ev.lng).toBe(-75.0);
    expect(ev.accuracyMeters).toBe(3);
    expect(ev.verified).toBe(true);
    expect(typeof ev.at).toBe('string');
    expect(typeof ev.distanceMeters).toBe('number');
  });
});
