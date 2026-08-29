import { AppError } from '@/lib/errors';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Incorrect email/phone or password.',
  not_registered: "This mobile or email isn't registered.",
  invalid_code: 'Code is invalid or expired.',
  weak_password: 'Password must be at least 8 characters.',
};

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

/** Maps an unknown error (usually an AppError from httpClient) to user-facing copy. */
export function authErrorMessage(err: unknown, fallback: string = DEFAULT_FALLBACK): string {
  if (err instanceof AppError) {
    if (err.status === 0) {
      return 'Cannot reach the server. Start sms-backend on http://localhost:5162 and try again.';
    }
    if (err.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return MESSAGES[err.code] ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
