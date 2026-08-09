describe('initSentry', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('returns false and does not initialize when no DSN is configured', () => {
    jest.doMock('@sentry/react-native', () => ({
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      wrap: (c: unknown) => c,
    }));
    jest.doMock('@/config/env', () => ({ env: { SENTRY_DSN: '', configError: null } }));

    const { initSentry } = require('@/lib/sentry');
    expect(initSentry()).toBe(false);
  });

  it('reports a captured message when a config error is present and a DSN is configured', () => {
    const Sentry = {
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      wrap: (c: unknown) => c,
    };
    jest.doMock('@sentry/react-native', () => Sentry);
    jest.doMock('@/config/env', () => ({
      env: { SENTRY_DSN: 'https://example.ingest.sentry.io/1', configError: 'bad config' },
    }));

    const { initSentry } = require('@/lib/sentry');
    expect(initSentry()).toBe(true);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('App config error: bad config', 'error');
  });

  it('does not report a message when a DSN is configured but there is no config error', () => {
    const Sentry = {
      init: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      addBreadcrumb: jest.fn(),
      wrap: (c: unknown) => c,
    };
    jest.doMock('@sentry/react-native', () => Sentry);
    jest.doMock('@/config/env', () => ({
      env: { SENTRY_DSN: 'https://example.ingest.sentry.io/1', configError: null },
    }));

    const { initSentry } = require('@/lib/sentry');
    expect(initSentry()).toBe(true);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });
});
