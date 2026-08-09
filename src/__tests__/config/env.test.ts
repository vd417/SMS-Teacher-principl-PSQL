import { loadEnv } from '@/config/env';

const PLACEHOLDER = 'https://api.schooldesk.local/v1';

describe('loadEnv', () => {
  it('accepts a valid https URL in production with no config error', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'https://api.school.com/v1' }, false);
    expect(out.API_BASE_URL).toBe('https://api.school.com/v1');
    expect(out.configError).toBeNull();
  });

  it('sets a config error in production when the URL is missing, and falls back to the placeholder', () => {
    const out = loadEnv({}, false);
    expect(out.configError).toMatch(/EXPO_PUBLIC_API_BASE_URL/);
    expect(out.configError).toMatch(/eas build --profile production/);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('sets a config error in production when the URL is the placeholder host', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: PLACEHOLDER }, false);
    expect(out.configError).toMatch(/placeholder/i);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('sets a config error in production when the URL is not https, and falls back to the placeholder', () => {
    const out = loadEnv({ EXPO_PUBLIC_API_BASE_URL: 'http://api.school.com/v1' }, false);
    expect(out.configError).toMatch(/https/i);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
  });

  it('falls back to the localhost placeholder in dev with no config error', () => {
    const out = loadEnv({}, true);
    expect(out.API_BASE_URL).toBe(PLACEHOLDER);
    expect(out.configError).toBeNull();
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
    expect(out.configError).toBeNull();
  });
});
