# ByaHero Passenger Web Application

Welcome to the **ByaHero Passenger Web** project! This is the official web application counterpart of the `byahero-mobile` passenger app, built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Leaflet**.

---

## 🚀 Features

- 🗺️ **Real-Time Passenger Transit Map**: Interactive Leaflet map displaying active buses, bus stops, Laurel–Talisay–Tanauan route boundaries (`GeoJSON`), live moving telemetry, and GPS location.
- 🚌 **Live Bus Fleet Directory**: Real-time seat occupancy indicator, speed monitoring, and route filtering (Laurel ↔ Tanauan).
- 📍 **Bus Stops with Real-Time Distance**: Dynamic distance calculation from your device GPS to all designated pickup points.
- 🙋‍♂️ **"Waiting for Bus" Signal**: Broadcast a 15-minute waiting signal to incoming conductors directly from recognized stops.
- 🚍 **Auto-Boarding Detection**: Automatic proximity detection prompting you when boarding or departing a bus.
- 👥 **Circles (Family & Friend Sharing)**: Share your live transit location with loved ones using 6-character private invite codes.
- 🧮 **Interactive Fare Matrix Calculator**: Calculate official LTFRB trip fares between any origin and destination with automatic 20% discount calculation for Students, Senior Citizens, and PWDs.
- 🚨 **Emergency Panic SOS**: 5-second countdown panic trigger broadcasting coordinates to local responders and emergency contacts, with one-click direct dialing hotlines (PNP, BFP, MDRRMO, Red Cross, 911).
- 🔍 **Lost & Found Portal**: Browse and submit reports with photo uploads.
- ⚠️ **Problem & Incident Reporting**: Report bus cleanliness, reckless driving, or conductor behavior.
- 📱 **Mobile & Desktop Responsive Design**: Seamless touch experience on mobile viewports with bottom drawer sheets, adapting to modern dashboard layouts on desktop.

---

## 🛠️ Getting Started

### 1. Installation
```bash
cd byahero-passenger-web
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5175`.

### 3. Production Build
```bash
npm run build
```

---

## ⚙️ Backend Server Configuration

By default, the web application connects to the production backend at:
`https://byahero.alwaysdata.net`

To connect to your **local XAMPP / PHP backend**:
1. On the login screen, click the **ByaHero Logo 5 times** (or go to Settings ➔ Developer Options).
2. Enter your target backend URL (e.g. `http://localhost/ByaHero` or `http://localhost:8000`).
3. Click **Save Config**. The setting will persist in `localStorage`.

---

## 👥 Developers
- Timothy
- CJ
- Edgar
- Chelsea
- Miel
- Paul
