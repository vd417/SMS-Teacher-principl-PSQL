// The app talks only to the live backend. API_BASE_URL must include the /v1
// prefix (every backend route is under /v1); repositories use /v1-relative paths.
// In production we fail fast on a missing/placeholder/non-https URL so a build can
// never silently ship pointing at nothing. In dev we keep a localhost default.
const PLACEHOLDER = 'https://api.schooldesk.local/v1';

export interface AppEnv {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  SENTRY_DSN: string;
}

export function loadEnv(raw: Record<string, string | undefined>, isDev: boolean): AppEnv {
  const url = raw.EXPO_PUBLIC_API_BASE_URL;

  if (!isDev) {
    if (!url) throw new Error('EXPO_PUBLIC_API_BASE_URL is required in production builds.');
    if (url === PLACEHOLDER)
      throw new Error(`EXPO_PUBLIC_API_BASE_URL is still the placeholder (${PLACEHOLDER}).`);
    if (!url.startsWith('https://'))
      throw new Error('EXPO_PUBLIC_API_BASE_URL must use https in production.');
  }

  return {
    API_BASE_URL: url ?? PLACEHOLDER,
    GOOGLE_MAPS_API_KEY: raw.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    SENTRY_DSN: raw.EXPO_PUBLIC_SENTRY_DSN ?? '',
  };
}

export const env: AppEnv = loadEnv(process.env, __DEV__);
