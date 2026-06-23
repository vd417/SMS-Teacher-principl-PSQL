import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('kaboom');
}

describe('AppErrorBoundary', () => {
  it('renders fallback when a child throws and recovers on retry', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    const { getByText, queryByText, rerender } = render(
      <AppErrorBoundary>{shouldThrow ? <Boom /> : <Text>ok</Text>}</AppErrorBoundary>
    );
    expect(getByText(/something went wrong/i)).toBeTruthy();

    // Heal the children first (boundary still shows the fallback while hasError),
    // then retry resets the boundary and the healthy tree renders.
    shouldThrow = false;
    rerender(
      <AppErrorBoundary>
        <Text>ok</Text>
      </AppErrorBoundary>
    );
    fireEvent.press(getByText(/retry/i));
    expect(queryByText(/something went wrong/i)).toBeNull();
    spy.mockRestore();
  });
});
