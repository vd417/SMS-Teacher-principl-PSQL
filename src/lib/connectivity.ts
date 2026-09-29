import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// A tiny connectivity model on top of NetInfo. Raw NetInfo events are debounced
// so a flaky link does not flicker the UI, and the return of connectivity is
// surfaced as a transient 'reconnecting' state (while background refetches run)
// before settling to 'online'. NetInfo is ALSO wired into react-query's
// onlineManager so queries/mutations pause and resume with connectivity.
export type ConnectivityStatus = 'online' | 'offline' | 'reconnecting';

export interface ConnectivitySnapshot {
  status: ConnectivityStatus;
  // Wall-clock ms of the last time we were confirmed online (for "last synced").
  lastOnlineAt: number | null;
}

export const DEBOUNCE_MS = 800;
export const RECONNECTING_MS = 1200;

// NetInfo reports isConnected as boolean | null; null (unknown) is treated as
// connected so we never falsely show offline before the first real reading.
const isConnected = (v: boolean | null | undefined): boolean => v !== false;

export class ConnectivityStore {
  private snapshot: ConnectivitySnapshot = { status: 'online', lastOnlineAt: Date.now() };
  private listeners = new Set<() => void>();
  private debounce?: ReturnType<typeof setTimeout>;
  private reconnect?: ReturnType<typeof setTimeout>;

  getSnapshot = (): ConnectivitySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit(next: Partial<ConnectivitySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((l) => l());
  }

  /** Feed a raw connectivity reading. Debounced into a stable status. */
  handleRaw(connected: boolean): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.settle(connected), DEBOUNCE_MS);
  }

  private settle(connected: boolean): void {
    if (!connected) {
      if (this.reconnect) {
        clearTimeout(this.reconnect);
        this.reconnect = undefined;
      }
      if (this.snapshot.status !== 'offline') this.emit({ status: 'offline' });
      return;
    }
    if (this.snapshot.status === 'offline') {
      // Connectivity just returned: show 'reconnecting' while refetches run,
      // then settle to 'online'.
      this.emit({ status: 'reconnecting' });
      if (this.reconnect) clearTimeout(this.reconnect);
      this.reconnect = setTimeout(() => {
        this.emit({ status: 'online', lastOnlineAt: Date.now() });
        this.reconnect = undefined;
      }, RECONNECTING_MS);
    } else {
      this.emit({ status: 'online', lastOnlineAt: Date.now() });
    }
  }
}

export const connectivity = new ConnectivityStore();

let initialised = false;

/** Wire NetInfo into react-query's onlineManager and the connectivity store. */
export function initConnectivity(): void {
  if (initialised) return;
  initialised = true;

  onlineManager.setEventListener((setOnline) => {
    const unsub = NetInfo.addEventListener((state) => setOnline(isConnected(state.isConnected)));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  });

  NetInfo.addEventListener((state) => connectivity.handleRaw(isConnected(state.isConnected)));
}

/** React hook: the current connectivity snapshot. */
export function useConnectivity(): ConnectivitySnapshot {
  return useSyncExternalStore(
    connectivity.subscribe,
    connectivity.getSnapshot,
    connectivity.getSnapshot
  );
}
