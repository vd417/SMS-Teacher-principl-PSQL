// The app talks only to the live backend. API_BASE_URL must include the /v1
// prefix (every backend route is under /v1); repositories use /v1-relative paths.
// In production a missing/placeholder/non-https URL sets `configError` instead
// of throwing, so a misconfigured build still starts and shows the user a
// connection banner (see ConfigErrorBanner) rather than crashing before any UI
// exists. In dev we keep a localhost default and never set a config error.
const PLACEHOLDER = 'https://api.schooldesk.local/v1';

export interface AppEnv {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  SENTRY_DSN: string;
  configError: string | null;
}

export function loadEnv(raw: Record<string, string | undefined>, isDev: boolean): AppEnv {
  const url = raw.EXPO_PUBLIC_API_BASE_URL;

  const EAS_BUILD_HINT =
    "Build with 'eas build --profile production' (or 'production-apk'/'preview') — " +
    "eas.json env values are not applied by 'expo export' alone.";

  let configError: string | null = null;

  if (!isDev) {
    if (!url) {
      configError = `EXPO_PUBLIC_API_BASE_URL is required in production builds. ${EAS_BUILD_HINT}`;
    } else if (url === PLACEHOLDER) {
      configError = `EXPO_PUBLIC_API_BASE_URL is still the placeholder (${PLACEHOLDER}). ${EAS_BUILD_HINT}`;
    } else if (!url.startsWith('https://')) {
      configError = `EXPO_PUBLIC_API_BASE_URL must use https in production. ${EAS_BUILD_HINT}`;
    }
  }

  return {
    API_BASE_URL: configError ? PLACEHOLDER : (url ?? PLACEHOLDER),
    GOOGLE_MAPS_API_KEY: raw.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    SENTRY_DSN: raw.EXPO_PUBLIC_SENTRY_DSN ?? '',
    configError,
  };
}

export const env: AppEnv = loadEnv(
  {
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
  __DEV__
);
