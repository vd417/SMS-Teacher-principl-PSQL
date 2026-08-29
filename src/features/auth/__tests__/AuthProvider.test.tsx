import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

test('signIn with multiple schools stops at selecting-school and exposes pendingSchools', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
    },
    tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
  }));
  const mockListSchools = jest.fn(async () => [
    { id: 't1', name: 'School One' },
    { id: 't2', name: 'School Two' },
  ]);
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools },
  } as unknown as Repositories;

  const Probe2 = () => {
    const { status, pendingSchools, signIn } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`pending:${pendingSchools?.length ?? 'null'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe2 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:selecting-school')).toBeTruthy());
  expect(screen.getByText('pending:2')).toBeTruthy();
});

test('switchSchool establishes the session and returns to authenticated', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
    },
    tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
  }));
  const mockListSchools = jest.fn(async () => [
    { id: 't1', name: 'School One' },
    { id: 't2', name: 'School Two' },
  ]);
  const mockSwitchSchool = jest.fn(async (tenantId: string) => ({
    accessToken: 'a2',
    refreshToken: 'r2',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'principal' as const,
      mustSetPassword: false,
    },
    tenant: { id: tenantId, name: 'School Two', tier: 'silver', planName: '' },
  }));
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools, switchSchool: mockSwitchSchool },
  } as unknown as Repositories;

  const Probe3 = () => {
    const { status, session, signIn, switchSchool } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`tenant:${session?.tenant.id ?? 'none'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => switchSchool('t2')}>
          <Text>pick-t2</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe3 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:selecting-school')).toBeTruthy());
  fireEvent.press(screen.getByText('pick-t2'));
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());
  expect(mockSwitchSchool).toHaveBeenCalledWith('t2');
  expect(screen.getByText('tenant:t2')).toBeTruthy();
});

test('signIn still completes via establishSession when listMySchools throws', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
    },
    tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
  }));
  const mockListSchools = jest.fn(async () => {
    throw new Error('schools endpoint down');
  });
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools },
  } as unknown as Repositories;

  const Probe4 = () => {
    const { status, session, pendingSchools, signIn } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`tenant:${session?.tenant.id ?? 'none'}`}</Text>
        <Text>{`pending:${pendingSchools?.length ?? 'null'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe4 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  // A secondary-endpoint failure must not block sign-in: it falls back to the
  // single-school path and establishes the original login session.
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());
  expect(screen.getByText('tenant:t1')).toBeTruthy();
  expect(screen.getByText('pending:null')).toBeTruthy();
});

test('a rejected switchSchool leaves pendingSchools and status unchanged so the user can retry', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
    },
    tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
  }));
  const mockListSchools = jest.fn(async () => [
    { id: 't1', name: 'School One' },
    { id: 't2', name: 'School Two' },
  ]);
  const mockSwitchSchool = jest.fn(async () => {
    throw new Error('switch failed');
  });
  const fakeRepos = {
    auth: { login: mockLogin, listMySchools: mockListSchools, switchSchool: mockSwitchSchool },
  } as unknown as Repositories;

  const Probe5 = () => {
    const { status, pendingSchools, signIn, switchSchool } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`pending:${pendingSchools?.length ?? 'null'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            switchSchool('t2').catch(() => {
              /* expected: caller (SchoolPickerScreen) surfaces this */
            });
          }}
        >
          <Text>pick-t2</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos}>
      <AuthProvider>
        <Probe5 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:selecting-school')).toBeTruthy());
  fireEvent.press(screen.getByText('pick-t2'));
  await waitFor(() => expect(mockSwitchSchool).toHaveBeenCalledWith('t2'));
  // Still selecting-school with the original two pending schools intact.
  expect(screen.getByText('status:selecting-school')).toBeTruthy();
  expect(screen.getByText('pending:2')).toBeTruthy();
});

test('updatePhoto calls the repo and patches session.user.photoUrl in place', async () => {
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
      photoUrl: null,
    },
    tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
  }));
  const mockListSchools = jest.fn(async () => [{ id: 't1', name: 'School One', logoUrl: null }]);
  const mockUpdatePhoto = jest.fn(async () => undefined);
  const fakeRepos2 = {
    auth: { login: mockLogin, listMySchools: mockListSchools, updatePhoto: mockUpdatePhoto },
  } as unknown as Repositories;

  const Probe2 = () => {
    const { status, session, signIn, updatePhoto } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`photo:${session?.user.photoUrl ?? 'none'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => updatePhoto('https://cdn.example.com/a.png')}>
          <Text>set-photo</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos2}>
      <AuthProvider>
        <Probe2 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());
  expect(screen.getByText('photo:none')).toBeTruthy();

  fireEvent.press(screen.getByText('set-photo'));
  await waitFor(() => expect(screen.getByText('photo:https://cdn.example.com/a.png')).toBeTruthy());
  expect(mockUpdatePhoto).toHaveBeenCalledWith('https://cdn.example.com/a.png');
});

test('establishSession never persists photoUrl to AsyncStorage (web localStorage quota)', async () => {
  // A data-URI photo can be up to ~400,000 characters; persisting the full
  // session on every sign-in would risk QuotaExceededError on web (AsyncStorage
  // is backed by localStorage there). photoUrl must stay in-memory only —
  // rehydration re-fetches the live value from repos.auth.me() anyway.
  const bigPhoto = `data:image/png;base64,${'a'.repeat(400_000)}`;
  const mockLogin = jest.fn(async () => ({
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: '',
      initials: '—',
      title: '',
      email: '',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher' as const,
      mustSetPassword: false,
      photoUrl: bigPhoto,
    },
    tenant: { id: 't1', name: 'School One', tier: 'silver', planName: '' },
  }));
  const mockListSchools = jest.fn(async () => [{ id: 't1', name: 'School One', logoUrl: null }]);
  const fakeRepos3 = {
    auth: { login: mockLogin, listMySchools: mockListSchools },
  } as unknown as Repositories;

  const Probe3 = () => {
    const { status, session, signIn } = useAuth();
    return (
      <>
        <Text>{`status:${status}`}</Text>
        <Text>{`photo:${session?.user.photoUrl ?? 'none'}`}</Text>
        <TouchableOpacity onPress={() => signIn('asha@x.com', 'secret123')}>
          <Text>signin</Text>
        </TouchableOpacity>
      </>
    );
  };

  render(
    <RepositoryProvider repositories={fakeRepos3}>
      <AuthProvider>
        <Probe3 />
      </AuthProvider>
    </RepositoryProvider>
  );
  await waitFor(() => expect(screen.getByText('status:unauthenticated')).toBeTruthy());
  fireEvent.press(screen.getByText('signin'));
  await waitFor(() => expect(screen.getByText('status:authenticated')).toBeTruthy());

  // In-memory session keeps the real photo...
  expect(screen.getByText(`photo:${bigPhoto}`)).toBeTruthy();
  // ...but what got persisted to storage does not.
  const stored = await AsyncStorage.getItem('sd.session');
  const parsed = JSON.parse(stored as string);
  expect(parsed.user.photoUrl).toBeNull();
});
