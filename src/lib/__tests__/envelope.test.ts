import { unwrapData, unwrapList } from '../envelope';

test('unwrapData returns the data member', () => {
  expect(unwrapData({ data: { id: '1' } })).toEqual({ id: '1' });
});

test('unwrapData throws on a non-enveloped payload', () => {
  expect(() => unwrapData({ id: '1' })).toThrow();
});

test('unwrapList returns rows + nextCursor from CursorPage', () => {
  expect(unwrapList({ data: [{ id: '1' }], next_cursor: 'c2' })).toEqual({
    data: [{ id: '1' }],
    nextCursor: 'c2',
  });
});

test('unwrapList treats a bare DataEnvelope list as a single page', () => {
  expect(unwrapList({ data: [{ id: '1' }] })).toEqual({ data: [{ id: '1' }], nextCursor: null });
});

test('unwrapList throws when data is not an array', () => {
  expect(() => unwrapList({ data: { id: '1' } })).toThrow();
});
