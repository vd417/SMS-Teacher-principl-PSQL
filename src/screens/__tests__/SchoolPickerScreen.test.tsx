import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SchoolPickerScreen } from '../SchoolPickerScreen';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
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
// @expo/vector-icons pulls in expo-font -> expo-asset, which isn't installed in
// this project (no screen test in this repo exercises it either) — stub the
// icon set so importing SchoolPickerScreen doesn't blow up on a missing module.
jest.mock('@expo/vector-icons', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name: string }) => ReactLib.createElement(Text, null, `icon:${props.name}`),
  };
});

const mockGoBack = jest.fn();
let mockCanGoBack = false;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => mockCanGoBack, goBack: mockGoBack }),
}));

function makeUser(role: 'teacher' | 'principal' = 'teacher') {
  return {
    id: 'u1',
    name: '',
    initials: '—',
    title: '',
    email: '',
    phone: '',
    employee: '',
    classroom: '',
    joined: '',
    role,
    mustSetPassword: false,
  };
}

function renderWithProviders(repos: Repositories, ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 320, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RepositoryProvider repositories={repos}>
          <AuthProvider>{ui}</AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  mockGoBack.mockClear();
  mockCanGoBack = false;
});

describe('SchoolPickerScreen — login-gate entry (pendingSchools set directly)', () => {
  test('renders the pending schools, offers Sign out, and has no back arrow', async () => {
    mockCanGoBack = false;
    const mockLogin = jest.fn(async () => ({
      accessToken: 'a',
      refreshToken: 'r',
      user: makeUser(),
      tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
    }));
    const mockListSchools = jest.fn(async () => [
      { id: 't1', name: 'School One', logoUrl: 'https://cdn.example.com/one.png' },
      { id: 't2', name: 'School Two', logoUrl: null },
    ]);
    const mockSwitchSchool = jest.fn(async (tenantId: string) => ({
      accessToken: 'a2',
      refreshToken: 'r2',
      user: makeUser(),
      tenant: { id: tenantId, name: 'School Two', tier: 'silver', planName: '' },
    }));
    const repos = {
      auth: { login: mockLogin, listMySchools: mockListSchools, switchSchool: mockSwitchSchool },
    } as unknown as Repositories;

    const Harness = () => {
      const { status, signIn } = useAuth();
      if (status === 'selecting-school') return <SchoolPickerScreen />;
      return (
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
      );
    };

    renderWithProviders(repos, <Harness />);
    await waitFor(() => expect(screen.getByText('signin')).toBeTruthy());
    fireEvent.press(screen.getByText('signin'));

    await waitFor(() => expect(screen.getByText('School One')).toBeTruthy());
    expect(screen.getByText('School Two')).toBeTruthy();
    expect(screen.getByTestId('school-picker-sign-out')).toBeTruthy();
    expect(screen.queryByTestId('school-picker-back')).toBeNull();
    // School One has a logo_url: renders its image, not the fallback icon.
    expect(screen.getByTestId('school-logo-t1')).toBeTruthy();
    expect(screen.queryByTestId('school-logo-fallback-t1')).toBeNull();
    // School Two has no logo: falls back to the generic icon.
    expect(screen.getByTestId('school-logo-fallback-t2')).toBeTruthy();
    expect(screen.queryByTestId('school-logo-t2')).toBeNull();

    fireEvent.press(screen.getByText('School Two'));
    await waitFor(() => expect(mockSwitchSchool).toHaveBeenCalledWith('t2'));
    // Login-gate mount has no back stack; goBack must not be called even after
    // a successful switch (RootNavigator swaps the whole stack instead).
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('SchoolPickerScreen — Profile entry (pendingSchools null, useMySchools fallback)', () => {
  test('renders schools from useMySchools, offers a back arrow, and goes back after switching', async () => {
    mockCanGoBack = true;
    const mockLogin = jest.fn(async () => ({
      accessToken: 'a',
      refreshToken: 'r',
      user: makeUser(),
      tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
    }));
    // First call is signIn's own branching check (single school -> establishes
    // session directly, pendingSchools stays null); later calls are useMySchools
    // fetching the fallback list for the Profile entry point.
    const mockListSchools = jest
      .fn()
      .mockResolvedValueOnce([{ id: 't1', name: 'School One' }])
      .mockResolvedValue([
        { id: 't1', name: 'School One' },
        { id: 't2', name: 'School Two' },
      ]);
    const mockSwitchSchool = jest.fn(async (tenantId: string) => ({
      accessToken: 'a2',
      refreshToken: 'r2',
      user: makeUser(),
      tenant: { id: tenantId, name: 'School Two', tier: 'silver', planName: '' },
    }));
    const repos = {
      auth: { login: mockLogin, listMySchools: mockListSchools, switchSchool: mockSwitchSchool },
    } as unknown as Repositories;

    const Harness = () => {
      const { status, signIn } = useAuth();
      if (status === 'authenticated') return <SchoolPickerScreen />;
      return (
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
      );
    };

    renderWithProviders(repos, <Harness />);
    await waitFor(() => expect(screen.getByText('signin')).toBeTruthy());
    fireEvent.press(screen.getByText('signin'));

    await waitFor(() => expect(screen.getByText('School Two')).toBeTruthy());
    expect(screen.getByText('School One')).toBeTruthy();
    expect(screen.getByTestId('school-picker-back')).toBeTruthy();
    expect(screen.queryByTestId('school-picker-sign-out')).toBeNull();

    fireEvent.press(screen.getByText('School Two'));
    await waitFor(() => expect(mockSwitchSchool).toHaveBeenCalledWith('t2'));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });
});
