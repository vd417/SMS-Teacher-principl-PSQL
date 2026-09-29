const SENSITIVE_KEY = /token|password|secret|cookie|authorization|hash|otp/i;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

/** Deep copy with credentials removed. Applied to every captured body before it is written to disk. */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(JWT, '[REDACTED_JWT]');
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        SENSITIVE_KEY.test(k) ? '[REDACTED]' : redact(v),
      ])
    );
  }
  return value;
}
