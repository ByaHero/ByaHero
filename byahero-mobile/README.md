# ByaHero Mobile Application Setup Guide

Welcome to the **ByaHero Mobile** project! This is a cross-platform React Native / Expo application that integrates with the ByaHero PHP backend to provide real-time bus tracking, emergency SOS alerts, and circle notifications.

---

## Prerequisites

Before setting up the project, make sure you have the following installed on your machine:

1. **Node.js** (v18.x or v20.x recommended)
2. **npm** (comes packaged with Node.js)
3. **Expo Go app** (installed on your physical iOS or Android device from the App Store or Google Play Store) OR:
   - **Android Studio** (for Android Emulator)
   - **Xcode** (for iOS Simulator - macOS only)
4. **Local PHP Server / MySQL Database** (e.g., XAMPP, Laragon, or a hosted server like AlwaysData) running the ByaHero backend.

---

## Step-by-Step Installation & Run

Follow these steps to set up and run the mobile application locally:

### 1. Navigate to the mobile project directory
Open your terminal and navigate to the `byahero-mobile` folder:
```bash
cd byahero-mobile
```

### 2. Install dependencies
Install all required Node modules defined in `package.json`:
```bash
npm install
```

### 3. Start the Expo development server
Start the Metro bundler to compile your Javascript/TypeScript assets:
```bash
npm run start
```
*Alternatively, you can run:*
- `npm run android` - to start Expo and launch immediately on an attached Android device or running emulator.
- `npm run ios` - to start Expo and launch on the iOS simulator (macOS only).
- `npm run web` - to run the project in a web browser.

---

## Connecting to Your Backend Server

By default, the application is configured to connect to the production backend at:
`https://byahero.alwaysdata.net`

To connect to your **local backend** (e.g., if you are running XAMPP locally):

1. **Retrieve your Local IP Address**:
   - On Windows: Run `ipconfig` in Command Prompt and find your **IPv4 Address** (e.g., `192.168.1.100`).
   - On macOS/Linux: Run `ifconfig` or `ip a` in terminal.
   - *Do not use `localhost` or `127.0.0.1` because the mobile device or emulator runs in a separate network context.*

2. **Configure the Server URL in the App**:
   - Open the ByaHero App on your device or emulator.
   - In the settings/server configurations, update the target server URL to point to your local PHP server (e.g., `http://192.168.1.100/ByaHero`).
   - The app persists this setting in `AsyncStorage` under the key `byahero_server_url`.

---

## Project Structure & Architecture

Key directories and files in the mobile app:

- `src/app/` — **Expo Router pages**: Contains file-based routing navigation folders (e.g., `passenger/`, `conductor/`, `driver/`, `admin/`).
- `src/components/` — Shared UI components (e.g., `passenger-navbar.tsx`, `passenger-bottomsheet.tsx`).
- `src/services/` — Service layer helpers:
  - `authService.js` — Offline session caching, login, signup, forgot password actions.
  - `notificationService.js` — Client-side FCM (Firebase Cloud Messaging) dispatcher.
- `assets/` — Shared visual assets, icons, and SVG styles.

---

## styling System
This project utilizes **`twrnc`** (Tailwind React Native Classnames) for applying Tailwind styles to native elements:
```typescript
import tw from 'twrnc';

<View style={tw`bg-[#103d7c] p-4 rounded-2xl`}>
  <Text style={tw`text-white font-bold`}>ByaHero</Text>
</View>
```
Do not install or use standard NativeWind configurations unless explicitly requested by the project requirements.

---

## Admin Laravel APIs Integration Guide

The backend has been fully migrated to Laravel. To connect the new React Native admin screens, query the following endpoints. 

> [!IMPORTANT]
> All admin endpoints require `credentials: 'include'` in your `fetch` calls so the browser/native client passes the authenticated cookie session (`laravel_session`).

### 1. Staff Management (Conductors & Drivers)
*   **List Staff**: `GET /api/admin/staff`
    *   *Response*: `{"success": true, "staff": [{"id": 1, "email": "tim@gmail.com", "role": "conductor"}, ...]}`
*   **Add Conductor/Driver**: `POST /api/admin/staff`
    *   *Body (JSON)*: `{"action": "add_user", "email": "new@gmail.com", "password": "password123", "role": "driver"}`
*   **Delete Staff**: `POST /api/admin/staff`
    *   *Body (JSON)*: `{"action": "delete_user", "id": 12, "role": "conductor"}`

### 2. Bus Fleet Management
*   **List Buses**: `GET /api/admin/buses`
    *   *Response*: `{"success": true, "buses": [{"Bus_ID": 3, "code": "B-03", "status": "available"}, ...]}`
*   **Add Bus**: `POST /api/admin/buses`
    *   *Body (JSON)*: `{"action": "add_bus", "code": "B-99"}`
*   **Update Bus Status**: `POST /api/admin/buses`
    *   *Body (JSON)*: `{"action": "update_bus", "id": 3, "status": "unavailable"}`
*   **Delete Bus**: `POST /api/admin/buses`
    *   *Body (JSON)*: `{"action": "delete_bus", "id": 3}`

### 3. Bus Stops & Terminals CRUD
*   **List Stops**: `GET /api/admin/stops`
*   **Add Stop**: `POST /api/admin/stops`
    *   *Body (JSON)*: `{"action": "add_stop", "name": "Stop Name", "type": "bus_stop", "location_name": "Location", "location_landmark": "Landmark", "lat": 14.12, "lng": 121.11, "route": "LAUREL - TANAUAN", "sort_order": 1}`
*   **Update Stop**: `POST /api/admin/stops`
    *   *Body (JSON)*: `{"action": "update_stop", "id": 5, ...}` (send all fields)
*   **Delete Stop**: `POST /api/admin/stops`
    *   *Body (JSON)*: `{"action": "delete_stop", "id": 5}`

### 4. Schedules & Routes
*   **List Schedules**: `GET /api/admin/schedules`
*   **Update Schedules**: `POST /api/admin/schedules`
    *   *Body (JSON)*: `{"action": "save_routes", "lt_open": "05:00", "lt_close": "19:00", "lt_suspended": false, "lt_message": "", "tl_open": "06:00", "tl_close": "20:00", "tl_suspended": true, "tl_message": "Suspended due to rain"}`

### 5. Passenger Feedback Log
*   **List Feedbacks**: `GET /api/admin/feedbacks`
*   **Delete Feedback**: `POST /api/admin/feedbacks/delete`
    *   *Body (JSON)*: `{"id": 4}`

### 6. Analytics & Logs
*   **Get Dashboard Metrics**: `GET /api/admin/analytics?period=today`
    *   *Query Parameters*: `period` (`today` / `week` / `month` / `custom`), plus `start` (YYYY-MM-DD) and `end` (YYYY-MM-DD) if `period=custom`.
    *   *Response*: Returns summary metrics, route breakdown, bus performances (with hotspots), conductor statistics, and detailed hourly boarding flow charts.

### 7. Active Buses Monitoring
*   **List Active Buses**: `GET /api/admin/active-buses`
    *   *Response*: `{"success": true, "activeBuses": [...]}`

### 8. Waiting Passengers Signals
*   **List Signals**: `GET /api/admin/waiting-passengers`
    *   *Response*: `{"success": true, "waitingList": [...]}`
*   **Cancel Single Passenger**: `POST /api/admin/waiting-passengers`
    *   *Body (JSON)*: `{"action": "cancel_waiting", "id": 4}`
*   **Cancel All Location Signals**: `POST /api/admin/waiting-passengers`
    *   *Body (JSON)*: `{"action": "cancel_location", "location": "J. Leviste, Laurel"}`

### 9. Admin Profile Management
*   **Get Profile details**: `GET /api/admin/profile`
    *   *Response*: `{"success": true, "user": {"name": "Admin Name", "email": "admin@gmail.com"}}`
*   **Update Profile**: `POST /api/admin/profile`
    *   *Body (JSON)*: `{"name": "New Name", "email": "new@gmail.com", "current_password": "old_password", "new_password": "new_password123", "confirm_password": "new_password123"}`
    *   *Response*: `{"success": true, "message": "Profile and password updated successfully!", "user": {...}}`

---

## Conductor Laravel APIs Integration Guide

The conductor-specific operations use session-scoped cookies and require `credentials: 'include'`.

### 1. Conductor Status
*   **Get Status / Auto-Resume**: `GET /api/conductor/status`
    *   *Query Parameters*: `stopped=1` (optional, clears active bus session cache).
    *   *Response*: `{"success": true, "user_id": 4, "user_name": "Juan", "current_bus_id": 3, "auto_resume": true}`

### 2. Claim Bus Assignment
*   **Claim Bus**: `POST /api/conductor/claim`
    *   *Body (JSON)*: `{"bus_id": 3, "code": "BUS-03", "route": "LAUREL - TANAUAN", "seats_total": 25, "initial_available_seats": 25, "pre_departure_count": 0}`
    *   *Response*: `{"success": true, "current_bus": {...}}` (or returns `{"success": false, "error": "bus_taken"}` if already owned by someone else).

### 3. List Assigned / Available Buses
*   **List Buses**: `GET /api/conductor/buses`
    *   *Response*: Returns a list of all buses that are not currently claimed, or are already claimed by the logged-in conductor.

### 4. Start Operation Tracking
*   **Start Operation**: `POST /api/conductor/start`
    *   *Body (JSON)*: `{"bus_id": 3, "route": "LAUREL - TANAUAN", "pre_departure_count": 5, "start_location": "Terminal Laurel"}`
    *   *Response*: `{"success": true, "operation_id": 42}`

### 5. Update Bus Live Location
*   **Update Location**: `POST /api/conductor/update-location`
    *   *Body (JSON)*: `{"bus_id": 3, "lat": 14.11, "lng": 121.22, "current_location_name": "Malarayat Stop", "seats_available": 18, "status": "on_stop"}`
    *   *Response*: `{"success": true, "message": "Location updated successfully"}`

### 6. Stop Operation Tracking
*   **Stop Tracking**: `POST /api/conductor/stop`
    *   *Body (JSON)*: `{"bus_id": 3, "end_location": "Tanauan Terminal"}`
    *   *Response*: `{"success": true, "message": "Stopped tracking for bus"}`

### 7. Profile Settings Management
*   **Get Profile details**: `GET /api/conductor/profile`
    *   *Response*: `{"success": true, "user": {"name": "Juan", "email": "juan@gmail.com"}}`
*   **Update Profile / Password**: `POST /api/conductor/profile`
    *   *Body (JSON)*: `{"name": "New Name", "email": "new@gmail.com", "current_password": "old_password", "new_password": "new_password123", "confirm_password": "new_password123"}`
    *   *Response*: `{"success": true, "message": "Profile and password updated successfully!", "user": {...}}`
