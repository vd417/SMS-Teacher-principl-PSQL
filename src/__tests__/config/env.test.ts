import { loadEnv } from '@/config/env';

const PLACEHOLDER = 'https://api.schooldesk.local/v1';

describe('loadEnv', () => {
  it('accepts a valid https URL in production', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'https://api.school.com/v1' }, false);
    expect(out.API_BASE_URL).toBe('https://api.school.com/v1');
  });

  it('throws in production when the URL is missing', () => {
    expect(() => loadEnv({}, false)).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it('throws in production when the URL is the placeholder host', () => {
    expect(() => loadEnv({ EXPO_PUBLIC_API_BASE_URL: PLACEHOLDER }, false)).toThrow(/placeholder/i);
  });

  it('throws in production when the URL is not https', () => {
    expect(() => loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'http://api.school.com/v1' }, false)).toThrow(
      /https/i
    );
  });

  it('falls back to the localhost placeholder in dev without throwing', () => {
    const out = loadEnv({}, true);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('passes through the optional maps key and sentry dsn', () => {
    const out = loadEnv(
      {
        EXPO_PUBLIC_API_BASE_URL: 'https://a.com/v1',
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'k',
        EXPO_PUBLIC_SENTRY_DSN: 'd',
      },
      false
    );
    expect(out.GOOGLE_MAPS_API_KEY).toBe('k');
    expect(out.SENTRY_DSN).toBe('d');
  });
});
