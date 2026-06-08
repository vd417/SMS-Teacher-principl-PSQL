import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@/navigation/RootNavigator';
import { RepositoryProvider } from '@/data/repositories/RepositoryContext';
import { createMockRepositories } from '@/data/repositories/factory';
import { createStore } from '@/data/mock/store';
import type { Session } from '@/data/domain';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-gesture-handler', () => {
  const RN = jest.requireActual('react-native');
  return {
    Swipeable: RN.View,
    DrawerLayout: RN.View,
    State: {},
    ScrollView: RN.ScrollView,
    Slider: RN.View,
    Switch: RN.Switch,
    TextInput: RN.TextInput,
    ToolbarAndroid: RN.View,
    ViewPagerAndroid: RN.View,
    DrawerLayoutAndroid: RN.View,
    WebView: RN.View,
    NativeViewGestureHandler: RN.View,
    TapGestureHandler: RN.View,
    FlingGestureHandler: RN.View,
    ForceTouchGestureHandler: RN.View,
    LongPressGestureHandler: RN.View,
    PanGestureHandler: RN.View,
    PinchGestureHandler: RN.View,
    RotationGestureHandler: RN.View,
    RawButton: RN.TouchableHighlight,
    BaseButton: RN.TouchableHighlight,
    RectButton: RN.TouchableHighlight,
    BorderlessButton: RN.TouchableHighlight,
    FlatList: RN.FlatList,
    gestureHandlerRootHOC: (c: any) => c,
    GestureHandlerRootView: ({ children }: any) => children,
    Directions: {},
    TouchableOpacity: RN.TouchableOpacity,
    TouchableHighlight: RN.TouchableHighlight,
    TouchableNativeFeedback: RN.TouchableNativeFeedback,
    TouchableWithoutFeedback: RN.TouchableWithoutFeedback,
    createNativeWrapper: (c: any) => c,
    GestureDetector: ({ children }: any) => children,
    Gesture: { Pan: () => ({}), Tap: () => ({}), Simultaneous: () => ({}), Exclusive: () => ({}) },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaInsetsContext: { Consumer: ({ children }: any) => children(insets) },
    initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 375, height: 812 } },
  };
});

const principalSession: Session = {
  accessToken: 't',
  refreshToken: 'r',
  tenant: { id: 'school_westbrook', name: 'Westbrook Academy' },
  user: {
    id: 'u_sunita',
    name: 'Sunita Rao',
    initials: 'SR',
    title: 'Principal',
    email: 'sunita.r@westbrook.edu',
    phone: '',
    employee: '',
    classroom: '',
    joined: '',
    role: 'principal',
  },
};

jest.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    status: 'authenticated',
    session: principalSession,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
  useTenantId: () => 'school_westbrook',
}));

it('renders the principal experience for a principal session', async () => {
  const store = await createStore();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RepositoryProvider repositories={createMockRepositories(store)}>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </RepositoryProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getByText('Welcome,')).toBeTruthy());
  expect(screen.queryByText('Classes')).toBeNull();
});
