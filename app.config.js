const { withAndroidManifest } = require('@expo/config-plugins');

// Only the "lan-apk" eas.json profile sets a plain-http EXPO_PUBLIC_API_BASE_URL
// (a developer's LAN IP, for physical-device testing). Android 9+ blocks
// cleartext (http) network traffic by default, so allow it only for that case —
// production/staging/preview all use https and are unaffected.
const usesLanHttp = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').startsWith('http://');

const withCleartextTraffic = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return cfg;
  });

module.exports = {
  expo: {
    name: 'School Desk Teacher App',
    slug: 'teacher-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1A0129',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.catre.schooldeskteacher',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow School Desk to use your location to verify you are at school when you check in.',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          disableAutoUpload: true,
        },
      ],
      '@react-native-community/datetimepicker',
      ...(usesLanHttp ? [withCleartextTraffic] : []),
    ],
    extra: {
      eas: {
        projectId: '8520504e-1cdf-41a1-9cbb-56cd896e6763',
      },
    },
    owner: 'vaibhavdds-team',
  },
};
