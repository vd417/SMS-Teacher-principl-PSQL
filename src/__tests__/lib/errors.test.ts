import { AppError, isAppError } from '@/lib/errors';

describe('AppError', () => {
  it('carries code, status and message', () => {
    const e = new AppError({ code: 'not_found', status: 404, message: 'nope' });
    expect(e.code).toBe('not_found');
    expect(e.status).toBe(404);
    expect(e.message).toBe('nope');
  });
  it('isAppError narrows correctly', () => {
    expect(isAppError(new AppError({ code: 'x', status: 500, message: 'y' }))).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
  });
});
