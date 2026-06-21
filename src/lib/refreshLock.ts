// Coordinates concurrent 401s so only ONE token refresh runs at a time.
// Every caller that arrives while a refresh is in flight awaits the same promise.
let inFlight: Promise<unknown> | null = null;

export async function runSingleFlight<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight) return inFlight as Promise<T>;
  inFlight = fn().finally(() => {
    inFlight = null;
  });
  return inFlight as Promise<T>;
}
