import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { SyncStatus } from '../SyncStatus';
import { connectivity, DEBOUNCE_MS, RECONNECTING_MS } from '@/lib/connectivity';

const goOffline = () =>
  act(() => {
    connectivity.handleRaw(false);
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });

describe('SyncStatus', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => {
      connectivity.handleRaw(true);
      jest.advanceTimersByTime(DEBOUNCE_MS + RECONNECTING_MS);
    });
    jest.useRealTimers();
  });

  it('online copy', () => {
    render(<SyncStatus updatedAt={Date.now()} />);
    expect(screen.getByText('Updated just now')).toBeTruthy();
  });

  it('offline copy', () => {
    render(<SyncStatus updatedAt={Date.now() - 5 * 60_000} />);
    goOffline();
    expect(screen.getByText('Offline • 5 min ago')).toBeTruthy();
  });

  it('offline never synced', () => {
    render(<SyncStatus />);
    goOffline();
    expect(screen.getByText('Offline • Never synced')).toBeTruthy();
  });
});
