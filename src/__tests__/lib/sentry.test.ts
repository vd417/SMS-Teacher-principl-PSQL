import { initSentry } from '@/lib/sentry';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: (c: unknown) => c,
}));
jest.mock('@/config/env', () => ({ env: { SENTRY_DSN: '' } }));

describe('initSentry', () => {
  it('returns false and does not initialize when no DSN is configured', () => {
    expect(initSentry()).toBe(false);
  });
});
