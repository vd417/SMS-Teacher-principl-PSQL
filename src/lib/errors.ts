export interface AppErrorShape {
  code: string;
  status: number;
  message: string;
  details?: Record<string, string[]>;
}

export class AppError extends Error {
  code: string;
  status: number;
  details?: Record<string, string[]>;
  constructor({ code, status, message, details }: AppErrorShape) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

// Coarse failure taxonomy used across the app to decide ret/keep-cache/logout
// behaviour. Kept deliberately small — see docs on offline-first handling.
export type ErrorKind = 'network' | 'timeout' | 'server' | 'auth' | 'validation' | 'unknown';

export function classifyError(e: unknown): ErrorKind {
  if (!isAppError(e)) return 'unknown';
  if (e.code === 'network') return 'network';
  if (e.code === 'timeout') return 'timeout';
  // A status-0 AppError with no explicit code is a transport failure too.
  if (e.status === 0) return 'network';
  if (e.status === 401 || e.status === 403) return 'auth';
  if (e.status === 400 || e.status === 422) return 'validation';
  if (e.status >= 500) return 'server';
  return 'unknown';
}

export function isNetworkError(e: unknown): boolean {
  return classifyError(e) === 'network';
}

export function isTimeoutError(e: unknown): boolean {
  return classifyError(e) === 'timeout';
}

// The "don't punish the user for the network" set: a network drop, a timeout, or
// a server 5xx. These must NEVER force a logout and must NEVER discard cached
// data — they mean "can't reach the backend right now", not "you are signed out".
// Only a genuine auth rejection (see classifyError -> 'auth') ends a session.
export function isConnectivityError(e: unknown): boolean {
  const k = classifyError(e);
  return k === 'network' || k === 'timeout' || k === 'server';
}
