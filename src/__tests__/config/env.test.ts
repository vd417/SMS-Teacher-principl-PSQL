import { env } from '@/config/env';

describe('env', () => {
  it('defaults DATA_SOURCE to mock', () => {
    expect(env.DATA_SOURCE).toBe('mock');
  });
  it('exposes an API_BASE_URL string', () => {
    expect(typeof env.API_BASE_URL).toBe('string');
  });
});
