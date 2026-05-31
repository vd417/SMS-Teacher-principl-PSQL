import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';

describe('UI states', () => {
  it('ErrorState shows message and calls onRetry', () => {
    const onRetry = jest.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Boom')).toBeTruthy();
  });
  it('EmptyState renders its label', () => {
    render(<EmptyState label="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
