import {
  assignRouteColors,
  BUS_BODY_COLOR,
  busStatusColor,
  placeBusIcons,
  routeColor,
} from '../busIcons';

test('assignRouteColors gives each visible route a different admin route color', () => {
  const colors = [...assignRouteColors(['north', 'south', 'east']).values()];
  expect(new Set(colors).size).toBe(3);
  expect(colors[0]).toBe('#2563eb');
  for (const color of colors) {
    expect(color.toLowerCase()).not.toBe(BUS_BODY_COLOR.toLowerCase());
  }
});

test('bus status matches the admin live map', () => {
  expect(busStatusColor(20)).toBe('#16a34a');
  expect(busStatusColor(3)).toBe('#64748b');
  expect(busStatusColor(undefined)).toBe('#64748b');
});

test('routeColor stays stable for the same route', () => {
  expect(routeColor('route-a')).toBe(routeColor('route-a'));
});

test('placeBusIcons puts each bus on its own route when there is no GPS ping', () => {
  const icons = placeBusIcons(
    [
      { busId: 'b1', busNo: 'BUS-1', routeId: 'north' },
      { busId: 'b2', busNo: 'BUS-2', routeId: 'north' },
      { busId: 'b3', busNo: 'BUS-3', routeId: 'south' },
    ],
    [
      {
        routeId: 'north',
        path: [
          { lat: 19, lng: 73 },
          { lat: 19.2, lng: 73.2 },
        ],
      },
      {
        routeId: 'south',
        path: [
          { lat: 18, lng: 72 },
          { lat: 18.4, lng: 72.4 },
        ],
      },
    ]
  );

  expect(icons.map((icon) => icon.busNo).sort()).toEqual(['BUS-1', 'BUS-2', 'BUS-3']);
  const north = icons.filter((icon) => icon.routeId === 'north');
  expect(north[0].color).toBe(north[1].color);
  expect(north[0].lat).not.toBe(north[1].lat);
  expect(icons.find((icon) => icon.busId === 'b3')?.color).not.toBe(north[0].color);
  expect(typeof north[0].heading).toBe('number');
});

test('placeBusIcons keeps a live GPS ping instead of the route position', () => {
  const [icon] = placeBusIcons(
    [{ busId: 'b1', busNo: 'BUS-1', routeId: 'north', lat: 12.5, lng: 77.5 }],
    [
      {
        routeId: 'north',
        path: [
          { lat: 19, lng: 73 },
          { lat: 20, lng: 74 },
        ],
      },
    ]
  );
  expect(icon).toMatchObject({ lat: 12.5, lng: 77.5, busNo: 'BUS-1' });
});

test('placeBusIcons uses the GPS heading and marks a bus moving above 3 km/h', () => {
  const [moving, stopped] = placeBusIcons(
    [
      {
        busId: 'b1',
        busNo: 'BUS-1',
        routeId: 'north',
        lat: 12.5,
        lng: 77.5,
        heading: 135,
        speedKmh: 20,
      },
      { busId: 'b2', busNo: 'BUS-2', routeId: 'north', lat: 12.6, lng: 77.6, speedKmh: 0 },
    ],
    [
      {
        routeId: 'north',
        path: [
          { lat: 19, lng: 73 },
          { lat: 20, lng: 74 },
        ],
      },
    ]
  );
  expect(moving).toMatchObject({ heading: 135, moving: true, speedKmh: 20 });
  expect(stopped).toMatchObject({ moving: false, speedKmh: 0 });
});
