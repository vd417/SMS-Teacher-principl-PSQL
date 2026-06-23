import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

const mockForgot = jest.fn(async () => {});
const fakeRepos = { auth: { forgotPassword: mockForgot } } as unknown as Repositories;

const Probe = () => {
  const { status, forgotPassword } = useAuth();
  return (
    <>
      <Text>{`status:${status}`}</Text>
      <TouchableOpacity onPress={() => forgotPassword('asha@x.com')}>
        <Text>forgot</Text>
      </TouchableOpacity>
    </>
  );
};

test('forgotPassword delegates to the repo without establishing a session', async () => {
  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('forgot'));
  await waitFor(() => expect(mockForgot).toHaveBeenCalledWith('asha@x.com'));
  // Still unauthenticated — forgot-password must not log the user in.
  expect(screen.getByText('status:unauthenticated')).toBeTruthy();
});
