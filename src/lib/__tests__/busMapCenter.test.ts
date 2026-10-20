import { busMapCenter } from '../busMapCenter';

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
