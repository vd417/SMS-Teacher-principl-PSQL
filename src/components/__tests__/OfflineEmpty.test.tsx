import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineEmpty } from '../OfflineEmpty';

describe('OfflineEmpty', () => {
  it('renders default copy', () => {
    render(<OfflineEmpty />);
    expect(screen.getByText("You're offline")).toBeTruthy();
    expect(
      screen.getByText(
        "This information hasn't been downloaded to this device yet. Connect to the internet and try again."
      )
    ).toBeTruthy();
  });
  it('renders custom message as body', () => {
    render(<OfflineEmpty message="Custom" />);
    expect(screen.getByText('Custom')).toBeTruthy();
  });
});
