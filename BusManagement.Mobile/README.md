# TransitOps Mobile

React Native (Expo Go) app for the BusManagement system.

## Screens

| Tab | Description |
|-----|-------------|
| Route Search | Find direct routes between two stops |
| Journey Planner | Multi-leg journey with fare breakdown |
| Nearby Stops | GPS-based nearby stop finder |
| Fares | Fare comparison across all bus types |

## Setup

```bash
cd BusManagement.Mobile
npm install
```

## Configure API URL

Edit `api.ts` and set `BASE` to your server's IP:

```ts
// For physical device on same Wi-Fi:
export const BASE = 'http://192.168.29.141/TransitOpsAPI/api';

// For local dev (iOS Simulator only):
export const BASE = 'http://localhost:5000/api';
```

Make sure your API's CORS allows the Expo Go origin, or add your device IP to `appsettings.json`:
```json
"AllowedOrigins": ["http://192.168.29.141:8081"]
```

## Run

```bash
npx expo start
```

Then scan the QR code with **Expo Go** on your iPhone.

## Requirements

- Node.js 18+
- Expo Go app installed on iPhone (from App Store)
- BusManagement.API running and reachable on the same network
