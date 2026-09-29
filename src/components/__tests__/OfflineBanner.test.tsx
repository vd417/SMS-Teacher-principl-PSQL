import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { OfflineBanner } from '../OfflineBanner';
import { connectivity, DEBOUNCE_MS, RECONNECTING_MS } from '@/lib/connectivity';

const goOffline = () =>
  act(() => {
    connectivity.handleRaw(false);
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
const goOnline = () =>
  act(() => {
    connectivity.handleRaw(true);
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });

describe('OfflineBanner', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    goOnline();
    act(() => {
      jest.advanceTimersByTime(RECONNECTING_MS);
    });
    jest.useRealTimers();
  });

  it('shows offline copy', () => {
    render(<OfflineBanner />);
    goOffline();
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  it('shows reconnecting copy', () => {
    render(<OfflineBanner />);
    goOffline();
    goOnline();
    expect(screen.getByText('Reconnecting…')).toBeTruthy();
  });

  it('renders nothing when online', () => {
    render(<OfflineBanner />);
    goOffline();
    goOnline();
    act(() => {
      jest.advanceTimersByTime(RECONNECTING_MS);
    });
    expect(screen.queryByText('No internet connection')).toBeNull();
    expect(screen.queryByText('Reconnecting…')).toBeNull();
  });
});
