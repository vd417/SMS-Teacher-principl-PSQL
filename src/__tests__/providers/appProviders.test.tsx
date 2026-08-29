import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AppProviders } from '@/providers/AppProviders';
import { useRepositories } from '@/data/repositories/RepositoryContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock('@microsoft/signalr', () => ({
  LogLevel: { None: 0 },
  HubConnectionBuilder: class {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return {
        on() {},
        off() {},
        onreconnected() {},
        onclose() {},
        start: async () => {},
        stop: async () => {},
      };
    }
  },
}));

const Probe = () => {
  const repos = useRepositories();
  return <Text>{typeof repos.auth.login === 'function' ? 'ready' : 'no'}</Text>;
};

describe('AppProviders', () => {
  it('provides repositories and auth to children', async () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>
    );
    await waitFor(() => expect(screen.getByText('ready')).toBeTruthy());
  });
});
