import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppProviders } from './src/providers/AppProviders';
import { initSentry, wrapWithSentry } from './src/lib/sentry';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ConfigErrorBanner } from './src/components/ConfigErrorBanner';
import { Colors } from './src/theme';

initSentry();

function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.outer}>
      {/* On web, keep the phone-shaped app in a centered, device-width frame so
          the layout (and the bottom tab bar) renders like the real app instead
          of stretching edge-to-edge across the browser. No-op on native. */}
      <View style={styles.frame}>
        <SafeAreaProvider>
          <AppErrorBoundary>
            <AppProviders>
              <NavigationContainer>
                <StatusBar style="auto" />
                <OfflineBanner />
                <ConfigErrorBanner />
                <RootNavigator />
              </NavigationContainer>
            </AppProviders>
          </AppErrorBoundary>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(App);

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    ...Platform.select({
      web: { alignItems: 'center', backgroundColor: Colors.ink },
      default: {},
    }),
  },
  frame: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: { maxWidth: 480, alignSelf: 'center' },
      default: {},
    }),
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
});
