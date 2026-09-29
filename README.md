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
valid `EXPO_PUBLIC_API_BASE_URL`. In production mode the app will still
start, but every request will fail and a generic connection banner will
show; the actionable diagnostic (telling you to use `eas build` instead) is
reported to Sentry, not shown on screen.

## Testing

- `npm test` — run the Jest suite

## Running against sms-api locally (PostgreSQL)

1. In `../sms-api`: set `SMS_MIGRATOR_CONNECTION` (owner role of `sms_dev`, in your own shell), then run
   `dotnet run --project db/Sms.PgMigrator -- status` and apply pending migrations only after reviewing them.
2. Seed: `dotnet run --project tools/Sms.DevSeed -- --i-know-this-is-dev` (logins in `tools/Sms.DevSeed/README.md`).
3. API: `dotnet run --project src/Sms.Api --launch-profile http`, then check `curl http://localhost:5162/health/ready` returns 200.
4. App: create `.env` with `EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP>:5162/v1` (Android emulator: `http://10.0.2.2:5162/v1`).
5. End-to-end gate: `E2E_API_BASE_URL=http://localhost:5162/v1 npm run e2e:sms-api`. It uses the real HTTP layer and
   real SignalR, with no skips. Parity evidence: `npm run capture:sms-api`, written to `docs/superpowers/audits/sms-api-capture/`.
