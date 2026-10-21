import { busMapCenter, fleetMapFocus } from '../busMapCenter';

test('busMapCenter prefers a live position with coordinates', () => {
  expect(
    busMapCenter(
      {
        lat: 19.2,
        lng: 72.9,
      },
      [{ lat: 18, lng: 72 }]
    )
  ).toEqual({ lat: 19.2, lng: 72.9 });
});

test('busMapCenter falls back to the first stop when GPS is missing', () => {
  expect(busMapCenter(undefined, [{ lat: 18.1, lng: 73.2 }])).toEqual({ lat: 18.1, lng: 73.2 });
});

test('busMapCenter returns undefined when there is no GPS and no stops', () => {
  expect(busMapCenter({ lat: undefined, lng: undefined }, [])).toBeUndefined();
});

test('fleetMapFocus uses the CRM route when no bus has sent a GPS ping', () => {
  expect(fleetMapFocus([], [{ lat: 19.01, lng: 73.02 }], [{ lat: 18, lng: 72 }])).toEqual({
    lat: 19.01,
    lng: 73.02,
  });
});

test('fleetMapFocus uses a stop when the route geometry has not loaded', () => {
  expect(fleetMapFocus([], [], [{ lat: 18.4, lng: 73.8 }])).toEqual({ lat: 18.4, lng: 73.8 });
});
