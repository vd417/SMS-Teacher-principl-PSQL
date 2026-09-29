import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import { liveEventType, liveHubUrl } from '@/lib/liveEvents';
import { transportHubUrl } from '@/lib/transportHub';
import { apiBaseUrl } from './config';

export interface HubEvent {
  event: string;
  payload: unknown;
}
type Pred = (e: HubEvent) => boolean;

export interface HubRecorder {
  conn: HubConnection;
  seen: HubEvent[];
  /** Resolves with the first matching event (already seen or future); rejects after `ms`. */
  waitFor(pred: Pred, ms?: number): Promise<HubEvent>;
  stop(): Promise<void>;
}

async function connect(url: string, token: string, events: string[]): Promise<HubRecorder> {
  const conn = new HubConnectionBuilder()
    .withUrl(url, { accessTokenFactory: () => token, withCredentials: false })
    .configureLogging(LogLevel.None)
    .build();
  const seen: HubEvent[] = [];
  const waiters: { pred: Pred; resolve: (e: HubEvent) => void }[] = [];
  for (const name of events) {
    conn.on(name, (payload: unknown) => {
      const e = { event: name, payload };
      seen.push(e);
      for (const w of [...waiters]) {
        if (w.pred(e)) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(e);
        }
      }
    });
  }
  await conn.start();
  return {
    conn,
    seen,
    stop: () => conn.stop(),
    waitFor(pred, ms = 10000) {
      const hit = seen.find(pred);
      if (hit) return Promise.resolve(hit);
      return new Promise<HubEvent>((resolve, reject) => {
        const waiter = {
          pred,
          resolve: (e: HubEvent) => {
            clearTimeout(timer);
            resolve(e);
          },
        };
        const timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`no matching hub event within ${ms} ms`));
        }, ms);
        waiters.push(waiter);
      });
    },
  };
}

export const connectLive = (token: string) =>
  connect(liveHubUrl(apiBaseUrl()), token, ['live_event']);
export const connectFleet = (token: string) =>
  connect(transportHubUrl(apiBaseUrl()), token, [
    'position_update',
    'trip_started',
    'trip_ended',
    'fleet_update',
  ]);

export const isLive =
  (type: string): Pred =>
  (e) =>
    e.event === 'live_event' && liveEventType(e.payload) === type;
export const isEvent =
  (name: string): Pred =>
  (e) =>
    e.event === name;
