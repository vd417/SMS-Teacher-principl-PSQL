# School Desk Teacher App

Expo/React Native app for teachers and principals in the School Desk suite.

## Development

- `npm start` — start the Metro dev server
- `npm run android` — start with the Android app open
- `npm run ios` — start with the iOS app open

Development builds talk to the backend URL in `.env` (`EXPO_PUBLIC_API_BASE_URL`).

## Building

Shippable builds (preview, production, production-apk) **must** go through
EAS Build:

```bash
eas build --profile preview        # internal APK, staging API
eas build --profile production     # store build, production API
eas build --profile production-apk # internal APK, production API
```

See `eas.json` for what each profile sets, and the `apk` npm script
(`npm run apk`) for an example.

Do **not** use `npx expo export` on its own to produce a build for testing
or distribution. `expo export` only bundles the JS/assets — it does not
apply `eas.json`'s per-profile `env` values, so the resulting bundle has no
valid `EXPO_PUBLIC_API_BASE_URL` and will crash on startup in production
mode with an error telling you to use `eas build` instead.

## Testing

- `npm test` — run the Jest suite
- `npm run smoke:teacher` — run the teacher smoke script
