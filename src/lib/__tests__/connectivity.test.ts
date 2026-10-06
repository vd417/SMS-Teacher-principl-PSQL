import { ConnectivityStore, DEBOUNCE_MS, RECONNECTING_MS } from '../connectivity';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('goes offline only after the debounce window', () => {
  const s = new ConnectivityStore();
  s.handleRaw(false);
  expect(s.getSnapshot().status).toBe('online'); // not yet — debounced
  jest.advanceTimersByTime(DEBOUNCE_MS);
  expect(s.getSnapshot().status).toBe('offline');
});

test('reconnect goes offline -> reconnecting -> online and records lastOnlineAt', () => {
  const s = new ConnectivityStore();
  s.handleRaw(false);
  jest.advanceTimersByTime(DEBOUNCE_MS);
  expect(s.getSnapshot().status).toBe('offline');

  s.handleRaw(true);
  jest.advanceTimersByTime(DEBOUNCE_MS);
  expect(s.getSnapshot().status).toBe('reconnecting');

  jest.advanceTimersByTime(RECONNECTING_MS);
  expect(s.getSnapshot().status).toBe('online');
  expect(s.getSnapshot().lastOnlineAt).toBeGreaterThan(0);
});

test('a rapid offline->online blip never flickers to offline', () => {
  const s = new ConnectivityStore();
  s.handleRaw(false);
  jest.advanceTimersByTime(DEBOUNCE_MS / 2); // still within debounce
  s.handleRaw(true); // supersedes the pending offline
  jest.advanceTimersByTime(DEBOUNCE_MS);
  expect(s.getSnapshot().status).toBe('online');
});

test('subscribers are notified on status change and can unsubscribe', () => {
  const s = new ConnectivityStore();
  const cb = jest.fn();
  const unsub = s.subscribe(cb);
  s.handleRaw(false);
  jest.advanceTimersByTime(DEBOUNCE_MS);
  expect(cb).toHaveBeenCalled();
  cb.mockClear();
  unsub();
  s.handleRaw(true);
  jest.advanceTimersByTime(DEBOUNCE_MS + RECONNECTING_MS);
  expect(cb).not.toHaveBeenCalled();
});

test('getSnapshot is referentially stable between changes', () => {
  const s = new ConnectivityStore();
  const a = s.getSnapshot();
  const b = s.getSnapshot();
  expect(a).toBe(b);
});
