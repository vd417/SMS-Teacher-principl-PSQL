import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** App-wide navigation handle, so non-screen code (e.g. a tapped push) can navigate. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
