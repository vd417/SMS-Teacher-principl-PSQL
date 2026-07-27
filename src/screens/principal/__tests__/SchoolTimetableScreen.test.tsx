import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SchoolTimetableScreen } from '../SchoolTimetableScreen';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import type { Repositories } from '@/data/repositories/types';
import type { Class } from '@/data/domain';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));
jest.mock('@expo/vector-icons', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name: string }) => ReactLib.createElement(Text, null, `icon:${props.name}`),
  };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

function renderScreen(repos: Repositories) {
  // A fresh QueryClient per render — reusing the app's shared singleton across
  // tests would serve one test's cached query results to the next.
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
          <AuthProvider>
            <SchoolTimetableScreen />
          </AuthProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

test('groups two classes that share a grade but have different names into one grade card', async () => {
  const classList: Class[] = [
    {
      id: 'c1',
      name: 'I-A',
      grade: 'I',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
    {
      id: 'c2',
      name: 'I-B',
      grade: 'I',
      section: 'B',
      subject: 'Math',
      studentCount: 0,
      room: '102',
    },
  ];

  const repos = {
    classes: { list: jest.fn(async () => classList) },
  } as unknown as Repositories;

  renderScreen(repos);

  // A single "I" grade card renders (not two "I-A"/"I-B" cards), aggregating
  // both sections.
  await waitFor(() => expect(screen.getByText('2 sections · tap to choose')).toBeTruthy());
  expect(screen.queryByText('I-A')).toBeNull();
  expect(screen.queryByText('I-B')).toBeNull();
});

test('keeps a class with no grade set keyed by its own name, unchanged from prior behavior', async () => {
  const classList: Class[] = [
    {
      id: 'c1',
      name: 'C1',
      grade: '',
      section: 'A',
      subject: 'Math',
      studentCount: 0,
      room: '101',
    },
  ];

  const repos = {
    classes: { list: jest.fn(async () => classList) },
  } as unknown as Repositories;

  renderScreen(repos);

  await waitFor(() => expect(screen.getByText('C1')).toBeTruthy());
  expect(screen.getByText('1 section · tap to choose')).toBeTruthy();
});
