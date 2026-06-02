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
   git clone https://github.com/sijey-CJAA/ByaHero-Prototype-V3.git
   ```

2. **Ask for access for the database**

### For Conductors

2. Select your bus from the dropdown
3. Enter the route name for your trip
4. Click "Start Tracking" to begin sharing your location
5. Update bus status and available seats as needed
6. Your location will be shared every 3 seconds while tracking is active
7. Click "Stop Tracking" when your shift ends

## API Endpoints

The application includes a simple REST API at `public/api.php`:

- `GET /api.php?action=get_buses` - Retrieve all buses with their current data
- `POST /api.php?action=update_location` - Update bus location, route, seats, and status
- `POST /api.php?action=register_bus` - Register a bus with a route
- `GET /api.php?action=init_db` - Initialize/reset the database

## Project Structure

```
ByaHero-Prototype-V2/
├── public/
│   ├── index.php      # Passenger map view
│   ├── conductor.php  # Conductor dashboard
│   └── api.php        # REST API endpoints
├── data/
│   ├── .gitkeep       # Keep directory in git
│   ├── README.md      # Database documentation
│   └── db.sqlite      # SQLite database (generated)
├── init_db.php        # Database initialization script
├── README.md          # This file
└── LICENSE            # License file
```

## Requirements

- PHP 7.4 or higher
- PDO SQLite extension (usually included by default)
- Modern web browser with JavaScript enabled
- Geolocation API support (for conductor location sharing)

## Development Notes

- This is a **prototype** for demonstration purposes
- Uses AJAX polling (every 3 seconds) for real-time updates instead of WebSockets
- No authentication required for passengers
- Conductors select from pre-seeded buses (no authentication)
- Database is a single SQLite file for easy portability
- All dependencies loaded from CDN (no build process required)

## Firebase Cloud Functions Push Setup

ByaHero sends SOS push alerts through a Firebase Cloud Function HTTP endpoint.

### Required configuration

| Variable | Purpose |
|---|---|
| `FIREBASE_FUNCTIONS_PUSH_URL` | Full HTTPS URL of your deployed Firebase Cloud Function that sends push notifications |
| `FIREBASE_FUNCTIONS_AUTH_SECRET` | Optional bearer secret expected by your Cloud Function for request authentication |

### Configuration (never commit real secrets)

Set environment variables on your server:

```bash
export FIREBASE_FUNCTIONS_PUSH_URL="https://<region>-<project>.cloudfunctions.net/sendPush"
export FIREBASE_FUNCTIONS_AUTH_SECRET="your-shared-secret"
```

The backend loads these values from `config/firebase_push.php`.

### Testing device registration

1. Open the app on your Android/iOS device inside the ByaHero native wrapper.
2. Log in to your passenger account.
3. The app will automatically register your device token to the database via `backend/registerFcmToken.php`.
4. You can verify push receipt by triggering an SOS alert.

### Troubleshooting

- **"No SDK found"** — You must open the page inside the native app, not a plain browser.
- **"No subscription ID after 20 s"** — Check that `google-services.json` / `GoogleService-Info.plist` is correctly placed and that FCM is enabled in your mobile app configuration.
- **Token saved but no push received** — Ensure `FIREBASE_FUNCTIONS_PUSH_URL` is correct and that your Cloud Function accepts `{ tokens, title, body, data, priority, ttl }`.



- User authentication for conductors
- WebSocket support for real-time updates
- Historical route tracking
- Passenger notifications
- Admin dashboard for bus management
- Route planning and optimization

## License

See [LICENSE](LICENSE) file for details.

Run this to terminal

php -S localhost:8000 -t public
