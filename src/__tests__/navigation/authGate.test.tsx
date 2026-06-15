import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { RootNavigator } from '@/navigation/RootNavigator';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
}));

it('shows the Welcome screen when unauthenticated', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('Get Started')).toBeTruthy());
});
