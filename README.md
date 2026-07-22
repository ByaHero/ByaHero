# ByaHero
Capstone project

## DEVELOPERS

- CJ
- EDGAR
- TIMOTHY
- CHELSEA
- MIEL
- PAUL

A lightweight PHP prototype for real-time bus tracking.

## Features

- 🗺️ **Real-time Bus Tracking** - View live bus locations on an interactive map
- 📍 **GPS Location Sharing** - Conductors can share their GPS location in real-time
- 🚌 **Bus Management** - Select from pre-seeded buses and manage routes
- 💺 **Seat Availability** - Track and update available seats on each bus
- 🎨 **Status Indicators** - Visual indicators for bus status (available, on stop, full, unavailable)
- 📱 **Mobile Responsive** - Works on both desktop and mobile devices

## Technologies Used

- **Backend**: PHP 7.4+ with SQLite (PDO)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **Database**: SQLite (no external services required)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ByaHero/ByaHero.git
   ```

2. **Ask for access for the database**

### For Conductors

2. Select your bus from the dropdown
3. Enter the route name for your trip
4. Click "Start Tracking" to begin sharing your location
5. Update bus status and available seats as needed
6. Your location will be shared every 3 seconds while tracking is active
7. Click "Stop Tracking" when your shift ends

## License

See [LICENSE](LICENSE) file for details.

---

## 📱 App Release & In-App Update Guide

The ByaHero ecosystem consists of 3 mobile applications:
- **Passenger App**: `byahero-mobile`
- **Conductor App**: `byahero-conductor`
- **Admin App**: `byahero-admin`

Each mobile application features an automatic in-app version check and popup notification system.

### How In-App Updates Work:
1. When any mobile app launches, it queries `GET /api/app-version?app=<app_name>` (`passenger`, `conductor`, or `admin`).
2. The Laravel backend (`AppVersionController.php`) dynamically queries the GitHub Releases API (`https://api.github.com/repos/ByaHero/ByaHero/releases`).
3. If a newer release exists for that specific app, a popup modal appears with release notes and a direct APK download link.

---

### Step-by-Step Release Process for App Updates

#### Step 1: Bump Version Numbers
Before building the target app:
1. Open `android/app/build.gradle` inside the target app directory (`byahero-mobile`, `byahero-conductor`, or `byahero-admin`).
2. Increment `versionCode` (e.g. `2` ➔ `3`) and update `versionName` (e.g. `"1.0.1"` ➔ `"1.0.2"`).
3. Update `version` in `app.json` and `package.json` to match.

#### Step 2: Build the Release APK
Navigate to the `android/` directory of the app you want to build and run:
```powershell
.\gradlew assembleRelease
```
The generated release APK file will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

#### Step 3: Publish Release on GitHub
1. Go to **[GitHub Releases](https://github.com/ByaHero/ByaHero/releases)** ➔ Click **Draft a new release**.
2. **Tag Conventions**:
   - For **Passenger App**: Tag `v1.0.2` (e.g. `v1.0.2`) and attach `byahero.apk`.
   - For **Conductor App**: Tag `conductor-v1.0.2` and attach `byahero-conductor.apk`.
   - For **Admin App**: Tag `admin-v1.0.2` and attach `byahero-admin.apk`.
3. Add release notes in the description box.
4. Click **Publish Release**.

---

## Post Pre-Oral Defense

Panel Suggestions:
1. Thermal Scanning/ thermal printer for printing of tickets
2. More AI/ML model for faster bus speed detection and etc
3. Route Optimization
4. Enhanced conductor ticketing system
5. Add Fare integration 
6. Native Application
