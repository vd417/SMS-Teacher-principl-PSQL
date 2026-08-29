import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import React from 'react';
import { registerRootComponent } from 'expo';
import { View, Text, StyleSheet } from 'react-native';

// App.tsx pulls in src/config/env, which throws synchronously (before any
// component mounts) if the build's EXPO_PUBLIC_API_BASE_URL is missing or
// invalid. A throw during a static `import` crashes the whole JS bundle with
// no error UI — the app just opens and immediately closes. Loading it via a
// guarded `require` here turns that into a visible message instead.
let RootComponent: React.ComponentType;
try {
  RootComponent = require('./App').default;
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  RootComponent = function StartupError() {
    return React.createElement(
      View,
      { style: styles.container },
      React.createElement(Text, { style: styles.text }, `Startup failed:\n${message}`)
    );
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(RootComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1A0129',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
  },
});
