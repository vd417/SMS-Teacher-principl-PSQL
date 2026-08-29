import { AppError } from '@/lib/errors';
import { authErrorMessage } from '../authErrors';

const appErr = (code: string, status = 400) => new AppError({ code, status, message: 'raw' });

test('maps known auth codes to user-facing copy', () => {
  expect(authErrorMessage(appErr('invalid_credentials', 401))).toBe(
    'Incorrect email/phone or password.'
  );
  expect(authErrorMessage(appErr('not_registered', 404))).toBe(
    "This mobile or email isn't registered."
  );
  expect(authErrorMessage(appErr('invalid_code', 401))).toBe('Code is invalid or expired.');
  expect(authErrorMessage(appErr('weak_password', 422))).toBe(
    'Password must be at least 8 characters.'
  );
});

test('429 rate limiting overrides the code message', () => {
  expect(authErrorMessage(appErr('whatever', 429))).toBe(
    'Too many attempts. Please wait a moment and try again.'
  );
});

test('network errors explain the API must be running', () => {
  expect(
    authErrorMessage(new AppError({ code: 'network', status: 0, message: 'Failed to fetch' }))
  ).toBe('Cannot reach the server. Start sms-backend on http://localhost:5162 and try again.');
});

test('falls back for unknown codes and non-errors', () => {
  expect(authErrorMessage(appErr('mystery', 400))).toBe('raw'); // uses the AppError message
  expect(authErrorMessage('not an error')).toBe('Something went wrong. Please try again.');
  expect(authErrorMessage(new Error('boom'))).toBe('boom');
});
