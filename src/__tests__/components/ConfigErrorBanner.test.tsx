import React from 'react';
import { render } from '@testing-library/react-native';

describe('ConfigErrorBanner', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('renders nothing when there is no config error', () => {
    jest.doMock('@/config/env', () => ({ env: { configError: null } }));
    const { ConfigErrorBanner } = require('@/components/ConfigErrorBanner');
    const { toJSON } = render(<ConfigErrorBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders the generic message when a config error is present', () => {
    jest.doMock('@/config/env', () => ({ env: { configError: 'bad config' } }));
    const { ConfigErrorBanner } = require('@/components/ConfigErrorBanner');
    const { getByText } = render(<ConfigErrorBanner />);
    expect(getByText("Can't reach the server. Please contact support.")).toBeTruthy();
  });
});
