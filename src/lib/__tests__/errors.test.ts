import {
  AppError,
  classifyError,
  isConnectivityError,
  isNetworkError,
  isTimeoutError,
} from '../errors';

const net = new AppError({ code: 'network', status: 0, message: 'x' });
const timeout = new AppError({ code: 'timeout', status: 0, message: 'x' });
const s500 = new AppError({ code: 'http_500', status: 500, message: 'x' });
const s503 = new AppError({ code: 'http_503', status: 503, message: 'x' });
const s401 = new AppError({ code: 'unauthorized', status: 401, message: 'x' });
const s403 = new AppError({ code: 'forbidden', status: 403, message: 'x' });
const s422 = new AppError({ code: 'invalid_request', status: 422, message: 'x' });
const s400 = new AppError({ code: 'bad_request', status: 400, message: 'x' });
const s404 = new AppError({ code: 'not_found', status: 404, message: 'x' });

test('classifyError buckets each failure kind', () => {
  expect(classifyError(net)).toBe('network');
  expect(classifyError(timeout)).toBe('timeout');
  expect(classifyError(s500)).toBe('server');
  expect(classifyError(s503)).toBe('server');
  expect(classifyError(s401)).toBe('auth');
  expect(classifyError(s403)).toBe('auth');
  expect(classifyError(s422)).toBe('validation');
  expect(classifyError(s400)).toBe('validation');
  expect(classifyError(s404)).toBe('unknown');
  expect(classifyError(new Error('plain'))).toBe('unknown');
  expect(classifyError(null)).toBe('unknown');
});

test('network and timeout helpers', () => {
  expect(isNetworkError(net)).toBe(true);
  expect(isNetworkError(timeout)).toBe(false);
  expect(isTimeoutError(timeout)).toBe(true);
  expect(isTimeoutError(net)).toBe(false);
});

test('isConnectivityError covers network, timeout and 5xx (the never-logout / keep-cache set)', () => {
  expect(isConnectivityError(net)).toBe(true);
  expect(isConnectivityError(timeout)).toBe(true);
  expect(isConnectivityError(s500)).toBe(true);
  expect(isConnectivityError(s503)).toBe(true);
  // genuine auth / validation failures are NOT connectivity errors
  expect(isConnectivityError(s401)).toBe(false);
  expect(isConnectivityError(s422)).toBe(false);
  expect(isConnectivityError(s404)).toBe(false);
});
