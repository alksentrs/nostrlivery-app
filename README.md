# Nostrlivery Monorepo

This workspace contains three packages:

- `common`: Shared React Native components, screens, services, and utilities packaged as `@odevlibertario/nostrlivery-common`.
- `company`: Expo app for company users.
- `driver`: Expo app for drivers.

## Prerequisites

- Node.js 18+ (recommended) and npm 9+
- Android Studio or Xcode for running on devices/simulators (optional)
- Backend Nostr server running (see Backend Setup section below)

## First-time setup

1) Install dependencies (skip postinstall scripts that may fail outside RN toolchains):

```bash
# common
cd common
npm ci --ignore-scripts

# company
cd ../company
npm ci --ignore-scripts

# driver
cd ../driver
npm ci --ignore-scripts
```

2) Build and pack the shared library:

```bash
cd ../common
npm run build
npm pack
# Outputs: odevlibertario-nostrlivery-common-<version>.tgz
```

3) Install the packed tarball into apps:

```bash
# driver
cd ../driver
npm i --legacy-peer-deps ../common/odevlibertario-nostrlivery-common-*.tgz

# company
cd ../company
npm i --legacy-peer-deps ../common/odevlibertario-nostrlivery-common-*.tgz
```

**Note**: Use `--legacy-peer-deps` flag to resolve React version conflicts between the common package and apps.

## Backend Setup

The mobile apps require a backend Nostr server to be running. The current configuration expects:

- **API Server**: `http://192.168.1.199:3000`
- **Nostr Relay**: `ws://192.168.1.199:7000`
- **Node NPUB**: `npub1qpfswwjps7y8e5f89drhaxh8w3xjrzdh7dhmk7d764szg5gflywsl3lyad`

### Required Backend Endpoints:
- `GET /identity` - Returns the node's npub
- `GET /health` - Server health status
- `POST /entrypoint` - Accepts Nostr events for processing
- `GET /username/:npub` - Get username for a given npub
- `GET /driver/company-associations/:npub` - Get driver company associations

### Testing Backend Connection:
```bash
# Test API server
curl http://192.168.1.199:3000/identity
curl http://192.168.1.199:3000/health

# Should return:
# /identity: npub1qpfswwjps7y8e5f89drhaxh8w3xjrzdh7dhmk7d764szg5gflywsl3lyad
# /health: {"status":"healthy","timestamp":"..."}
```

## Running apps (Expo)

Because global `expo` may be unavailable, use the local CLI bundled with the `expo` package:

```bash
# company
cd company
node ./node_modules/expo/bin/cli start --clear

# driver (in another terminal)
cd driver
node ./node_modules/expo/bin/cli start --clear
```

- Press `a` for Android, `w` for web, or scan the QR with Expo Go.
- **Note**: Ensure the backend server is running before starting the mobile apps.

## SDK version alignment

Both apps are currently configured for Expo SDK 53 (React Native 0.79, React 19). If you see an SDK mismatch in Expo Go:

- Install Expo Go compatible with SDK 53 on your device, or
- Upgrade/downgrade the project using:

```bash
# Example upgrade to SDK 53
node ./node_modules/expo/bin/cli install expo@^53.0.0
node ./node_modules/expo/bin/cli install --fix
```

## Troubleshooting

### Backend Connection Issues:
- **"Failed to connect to node server" error**:
  - Verify backend server is running: `curl http://192.168.1.199:3000/health`
  - Check network connectivity: `ping 192.168.1.199`
  - Ensure correct IP address in `common/src/screens/NodeSelection/index.tsx`
  - Verify port 3000 is accessible (not 7000 for API calls)

- **Node selection screen shows empty float**:
  - This was fixed by auto-initializing the node URL and adding validation
  - Ensure the common package is rebuilt after changes

### Expo Issues:
- Expo CLI not found:
  - Use the local binary: `node ./node_modules/expo/bin/cli <command>`.

- Metro caching or strange bundling errors:
  - Restart with `--clear` as shown above.

- PlatformConstants / TurboModule invariant errors:
  - Ensure a single version of `react` and `react-native` is installed. In `driver`, `package.json` uses `overrides` (npm) to force a single tree.
  - Reinstall: `npm install --legacy-peer-deps`.

- Web mode missing deps:
  - Install web packages per Expo prompt:

```bash
npx expo install react-native-web react-dom @expo/metro-runtime
```

- Postinstall script failures (e.g., `react-native-storage`):
  - Install with `--ignore-scripts` as shown in setup, then run without that flag in a proper RN environment if needed for native linking.

## Rebuilding the shared `common` package

When `common` changes, rebuild and reinstall into apps:

```bash
cd common
npm run build
npm pack

cd ../driver
npm i --legacy-peer-deps ../common/odevlibertario-nostrlivery-common-*.tgz

cd ../company
npm i --legacy-peer-deps ../common/odevlibertario-nostrlivery-common-*.tgz
```

## Linting

```bash
# From each app or the common package
npm run lint
npm run lint:fix
```

## Directory layout

- `/common` — TypeScript source in `src`, compiled to `dist`, published as a tarball.
- `/company` — Expo app using the shared package.
- `/driver` — Expo app using the shared package.
