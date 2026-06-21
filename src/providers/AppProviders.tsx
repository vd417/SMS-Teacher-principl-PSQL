import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { env } from '@/config/env';
import { createHttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import { authBridge } from '@/features/auth/authBridge';
import { createHttpRepositories } from '@/data/repositories/factory';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { AuthProvider } from '@/features/auth/AuthProvider';
import type { Repositories } from '@/data/repositories/types';
import { Colors } from '@/theme';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repositories | null>(null);

  useEffect(() => {
    // getAuth reads the live snapshot AuthProvider keeps current, so every request
    // carries the latest token + tenant with no startup race. onRefresh/onAuthLost
    // delegate to AuthProvider via authBridge (registered when it mounts).
    const http = createHttpClient({
      baseUrl: env.API_BASE_URL,
      getAuth: () => authSnapshot.get(),
      onRefresh: () => authBridge.refresh(),
      onAuthLost: () => {
        void authBridge.signOut();
      },
    });
    setRepositories(createHttpRepositories(http));
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
