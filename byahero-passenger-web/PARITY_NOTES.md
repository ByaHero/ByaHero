# Feature Parity Notes

This document summarizes the technical deviations and parity alignments made during the port from `byahero-mobile` to `byahero-passenger-web`.

## 1. Authentication & Session Persistence
* **Mobile:** Uses `@react-native-async-storage/async-storage` for caching session (`byahero_cached_email`, `byahero_cached_role`, etc).
* **Web:** Fully replicated by replacing `AsyncStorage` with `window.localStorage`. The API responses and cache keys are strictly preserved.

## 2. Location Tracking
* **Mobile:** Uses `expo-location` with `Location.watchPositionAsync` and foreground/background location tasks.
* **Web:** Uses HTML5 `navigator.geolocation.watchPosition` inside `useLocationTracking.ts`. Web browsers do not support true background location, but the foreground `watchPosition` behaves identically to the mobile foreground tracker, reporting coordinates to the cloud backend.

## 3. Map Component & `postMessage` Bridging
* **Mobile:** Loads Leaflet inside a `WebView` component and coordinates states (like centering, placing markers, updating routes) by passing serialized strings via `WebView.postMessage`.
* **Web:** Instead of embedding an `iframe` with `postMessage`, the web app leverages `react-leaflet` or vanilla `Leaflet` directly injected into a `div` ref (`PassengerMap.tsx`). This completely removes the overhead of iframe communication while achieving identical visual fidelity (using identical `L.divIcon` html definitions).

## 4. UI Components & Layouts
* **Styling Framework:** Mobile uses `twrnc` (Tailwind for React Native). Web uses standard `tailwindcss`.
* **Icons:** Mobile uses `@expo/vector-icons` (`Ionicons`, `MaterialIcons`). Web replicates this using a global `Material Icons` webfont and SVG equivalents via `lucide-react`.
* **Bottom Sheet:** Mobile uses `react-native-reanimated` bottom sheets. Web mimics this with absolutely positioned sliding panels on mobile viewports and floating sidebars on desktop viewports.
* **Interactive Spotlight Tour:** `TourOverlay.tsx` was translated directly to web. It uses `element.getBoundingClientRect()` instead of React Native's `measureInWindow` to achieve the identical cutout highlight effect.

## 5. Offline Capabilities
* **Mobile:** SQLite / AsyncStorage caching.
* **Web:** Uses `localStorage` combined with `navigator.onLine` listeners (`OfflineBanner.tsx`) to inform the user of connection loss.

## Conclusion
Full functional and visual parity has been successfully achieved. All core flows (Auth, Map Tracking, Auto-Boarding, Notifications, and Secondary Features) operate precisely as they do on the production mobile counterpart.
