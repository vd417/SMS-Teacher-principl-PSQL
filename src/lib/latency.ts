import { AppError } from './errors';

const DEFAULT_MIN = 150;
const DEFAULT_MAX = 500;

export function simulateLatency(ms?: number): Promise<void> {
  const delay = ms ?? DEFAULT_MIN + Math.random() * (DEFAULT_MAX - DEFAULT_MIN);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/** Throws an AppError with probability `p` (0..1). Used to exercise error paths. */
export function maybeFail(p = 0): void {
  if (Math.random() < p) {
    throw new AppError({ code: 'mock_failure', status: 500, message: 'Simulated failure' });
  }
}
