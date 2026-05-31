import React, { createContext, useContext } from 'react';
import type { Repositories } from './types';

const RepositoryContext = createContext<Repositories | null>(null);

export const RepositoryProvider: React.FC<{
  repositories: Repositories;
  children: React.ReactNode;
}> = ({ repositories, children }) => (
  <RepositoryContext.Provider value={repositories}>{children}</RepositoryContext.Provider>
);

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepositories must be used within RepositoryProvider');
  return ctx;
}
