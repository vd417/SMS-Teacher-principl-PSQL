import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/config/env';
import { createHttpClient } from '@/lib/httpClient';
import { createStore } from '@/data/mock/store';
import { createMockRepositories, createHttpRepositories } from '@/data/repositories/factory';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { tokenStore } from '@/lib/tokenStore';
import type { Repositories } from '@/data/repositories/types';
import { Colors } from '@/theme';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repositories | null>(null);

  useEffect(() => {
    (async () => {
      if (env.DATA_SOURCE === 'live') {
        let cached: { accessToken: string | null; tenantId: string | null } = {
          accessToken: null,
          tenantId: null,
        };
        const http = createHttpClient({
          baseUrl: env.API_BASE_URL,
          getAuth: () => cached,
        });
        // refresh cached token snapshot before each render cycle via tokenStore
        tokenStore.read().then((t) => {
          cached = { accessToken: t?.accessToken ?? null, tenantId: null };
        });
        setRepositories(createHttpRepositories(http));
      } else {
        const store = await createStore();
        setRepositories(createMockRepositories(store));
      }
    })();
  }, []);

  if (!repositories) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repositories={repositories}>
        <AuthProvider>{children}</AuthProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
