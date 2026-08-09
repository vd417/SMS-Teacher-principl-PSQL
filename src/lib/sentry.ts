// Thin wrapper so the rest of the app never imports the SDK directly and so the
// whole thing is a no-op when no DSN is set (dev, tests, un-provisioned builds).
// We never send tokens/PII — only structured context passed by callers.
import * as Sentry from '@sentry/react-native';
import { env } from '@/config/env';

let initialized = false;

export function initSentry(): boolean {
  if (initialized || !env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    enableNativeCrashHandling: true,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  });
  initialized = true;
  if (env.configError) {
    Sentry.captureMessage(`App config error: ${env.configError}`, 'error');
  }
  return true;
}

export function captureError(e: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(e, context ? { extra: context } : undefined);
}

export function addBreadcrumb(category: string, data: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({ category, data, level: 'error' });
}

export function wrapWithSentry<T>(c: T): T {
  return initialized ? (Sentry.wrap(c as never) as T) : c;
}
