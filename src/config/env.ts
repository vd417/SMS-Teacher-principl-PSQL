export type DataSource = 'mock' | 'live';

const raw = process.env.EXPO_PUBLIC_DATA_SOURCE;
const DATA_SOURCE: DataSource = raw === 'live' ? 'live' : 'mock';

export const env = {
  DATA_SOURCE,
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.schooldesk.local',
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
} as const;
