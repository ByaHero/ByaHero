package com.byahero.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class NativeBackgroundLocationService extends Service {
    public static final String ACTION_START = "com.byahero.app.location.START";
    public static final String ACTION_STOP = "com.byahero.app.location.STOP";
    public static final String ACTION_PREVIOUS = "com.byahero.app.location.PREVIOUS";
    public static final String ACTION_NEXT = "com.byahero.app.location.NEXT";
    public static final String EXTRA_UPDATE_URL = "updateUrl";
    public static final String EXTRA_COOKIE = "cookie";
    public static final String EXTRA_INTERVAL_MS = "intervalMs";
    public static final String EXTRA_USER_AGENT = "userAgent";

    private static final String CHANNEL_ID = "byahero_location_tracking";
    private static final int NOTIFICATION_ID = 7401;
    private static final long DEFAULT_INTERVAL_MS = 5000L;
    private static final String PREFS = "native_background_location";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private PowerManager.WakeLock wakeLock;
    private Location lastLocation;
    private float currentCalculatedSpeed = 0.0f;
    private android.media.session.MediaSession mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();
        android.util.Log.d("ByaHeroLocation", "Service onCreate");
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    if (lastLocation != null) {
                        long timeDelta = location.getTime() - lastLocation.getTime();
                        if (timeDelta > 0) {
                            currentCalculatedSpeed = lastLocation.distanceTo(location) / (timeDelta / 1000.0f);
                        }
                    }

                    try {
                        Intent broadcastIntent = new Intent("com.byahero.app.LOCATION_UPDATE");
                        broadcastIntent.setPackage(getPackageName());
                        broadcastIntent.putExtra("latitude", location.getLatitude());
                        broadcastIntent.putExtra("longitude", location.getLongitude());
                        sendBroadcast(broadcastIntent);
                    } catch (Exception e) {
                        android.util.Log.e("ByaHeroLocation", "Failed to send location update broadcast", e);
                    }
                    
                    postLocation(location, currentCalculatedSpeed);
                    lastLocation = location;
                }
            }
        };

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ByaHero::LocationWakeLock");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopTracking();
                stopSelf();
                return START_NOT_STICKY;
            } else if (ACTION_PREVIOUS.equals(action)) {
                adjustSeats(1);
                return START_STICKY;
            } else if (ACTION_NEXT.equals(action)) {
                adjustSeats(-1);
                return START_STICKY;
            }
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (intent != null) {
            String updateUrl = intent.getStringExtra(EXTRA_UPDATE_URL);
            String cookie = intent.getStringExtra(EXTRA_COOKIE);
            String userAgent = intent.getStringExtra(EXTRA_USER_AGENT);
            long intervalMs = intent.getLongExtra(EXTRA_INTERVAL_MS, -1);
            String payloadType = intent.getStringExtra("payloadType");

            SharedPreferences.Editor editor = prefs.edit().putBoolean("trackingEnabled", true);
            if (updateUrl != null && !updateUrl.trim().isEmpty()) {
                editor.putString(EXTRA_UPDATE_URL, updateUrl);
            }
            if (cookie != null && !cookie.trim().isEmpty()) {
                editor.putString(EXTRA_COOKIE, cookie);
            }
            if (userAgent != null && !userAgent.trim().isEmpty()) {
                editor.putString("userAgent", userAgent);
            }
            if (intervalMs > 0) {
                editor.putLong(EXTRA_INTERVAL_MS, intervalMs);
            }
            if (payloadType != null) {
                editor.putString("payloadType", payloadType);
                if ("conductor".equals(payloadType)) {
                    editor.putLong("bus_id", intent.getLongExtra("bus_id", 0L));
                    editor.putString("bus_code", intent.getStringExtra("bus_code"));
                    editor.putString("route", intent.getStringExtra("route"));
                    editor.putInt("seats_available", intent.getIntExtra("seats_available", 0));
                    editor.putInt("seats_total", intent.getIntExtra("seats_total", 25));
                    editor.putString("status", intent.getStringExtra("status"));
                }
            }
            editor.apply();
        }

        if (!hasLocationPermission()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire();
        }

        boolean isConductor = "conductor".equals(prefs.getString("payloadType", "passenger"));
        if (isConductor) {
            updateMediaSession(
                prefs.getString("bus_code", ""),
                prefs.getString("route", ""),
                prefs.getInt("seats_available", 0),
                prefs.getInt("seats_total", 25),
                prefs.getString("status", "available")
            );
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int serviceType = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
            if (isConductor) {
                serviceType |= android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
            }
            startForeground(NOTIFICATION_ID, buildNotification(), serviceType);
        } else {
            startForeground(NOTIFICATION_ID, buildNotification());
        }
        startTracking();
        return START_STICKY;
    }

    private void startTracking() {
        long intervalMs = getSharedPreferences(PREFS, MODE_PRIVATE).getLong(EXTRA_INTERVAL_MS, DEFAULT_INTERVAL_MS);

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(Math.max(1000L, intervalMs / 2L))
            .setWaitForAccurateLocation(false)
            .build();

        fusedLocationClient.removeLocationUpdates(locationCallback);
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        }
    }

    private void stopTracking() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean("trackingEnabled", false).apply();

        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }

        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        stopForeground(STOP_FOREGROUND_REMOVE);
    }

    private boolean hasLocationPermission() {
        boolean fine = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!fine && !coarse) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private void postLocation(Location location, float computedSpeed) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String updateUrl = prefs.getString(EXTRA_UPDATE_URL, null);
        String cookie = prefs.getString(EXTRA_COOKIE, null);
        String userAgent = prefs.getString("userAgent", "Mozilla/5.0");

        if (updateUrl == null || updateUrl.trim().isEmpty() || cookie == null || cookie.trim().isEmpty()) {
            return;
        }

        networkExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                JSONObject payload = new JSONObject();
                String payloadType = prefs.getString("payloadType", "passenger");
                
                if ("conductor".equals(payloadType)) {
                    long busId = prefs.getLong("bus_id", 0L);
                    String route = prefs.getString("route", "");
                    int seatsAvailable = prefs.getInt("seats_available", 0);
                    int seatsTotal = prefs.getInt("seats_total", 25);
                    String currentStatus = prefs.getString("status", "available");
                    String newStatus = currentStatus;

                    // Combine native speed with fallback manual speed computation
                    float finalSpeed = location.hasSpeed() ? location.getSpeed() : computedSpeed;

                    // === THE NATIVE SMART STATE MACHINE ===
                    // Automatically decides the operational status without needing the JS frontend
                    if (seatsAvailable <= 0) {
                        newStatus = "full";
                    } else if (finalSpeed < 0.8f) { // Under 0.8 m/s (~2.8 km/h) is considered stopped
                        newStatus = "on_stop";
                    } else { // Moving and has seats
                        newStatus = "available";
                    }

                    // If the state changed, update local preferences and the notification UI
                    if (!newStatus.equals(currentStatus)) {
                        prefs.edit().putString("status", newStatus).apply();
                        String busCode = prefs.getString("bus_code", "");
                        updateMediaSession(busCode, route, seatsAvailable, seatsTotal, newStatus);
                    }

                    payload.put("bus_id", busId);
                    payload.put("lat", location.getLatitude());
                    payload.put("lng", location.getLongitude());
                    payload.put("route", route);
                    payload.put("seats_available", seatsAvailable);
                    payload.put("status", newStatus);
                    payload.put("current_location_name", String.format(java.util.Locale.US, "%.5f, %.5f", location.getLatitude(), location.getLongitude()));
                } else {
                    payload.put("latitude", location.getLatitude());
                    payload.put("longitude", location.getLongitude());
                    payload.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
                }

                byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
                connection = (HttpURLConnection) new URL(updateUrl).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cookie", cookie);
                connection.setRequestProperty("User-Agent", userAgent);
                connection.setFixedLengthStreamingMode(body.length);

                try (OutputStream os = connection.getOutputStream()) {
                    os.write(body);
                }

                connection.getResponseCode();
            } catch (Exception e) {
                android.util.Log.e("ByaHeroLocation", "postLocation network error", e);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    private Notification buildNotification() {
        createNotificationChannel();

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        boolean isConductor = "conductor".equals(prefs.getString("payloadType", "passenger"));

        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent launchPendingIntent = PendingIntent.getActivity(this, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, NativeBackgroundLocationService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 1, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_location)
            .setContentIntent(launchPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW);

        if (isConductor && mediaSession != null) {
            String busCode = prefs.getString("bus_code", "BUS");
            String route = prefs.getString("route", "-");
            int seatsAvailable = prefs.getInt("seats_available", 0);
            int seatsTotal = prefs.getInt("seats_total", 25);
            String status = prefs.getString("status", "available");
            
            int passengerCount = seatsTotal - seatsAvailable;
            if (passengerCount < 0) passengerCount = 0;

            String displayStatus = "Available";
            if ("on_stop".equals(status)) displayStatus = "On Stop";
            else if ("full".equals(status)) displayStatus = "Full";

            Intent prevIntent = new Intent(this, NativeBackgroundLocationService.class);
            prevIntent.setAction(ACTION_PREVIOUS);
            PendingIntent prevPendingIntent = PendingIntent.getService(this, 2, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            Intent nextIntent = new Intent(this, NativeBackgroundLocationService.class);
            nextIntent.setAction(ACTION_NEXT);
            PendingIntent nextPendingIntent = PendingIntent.getService(this, 3, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            builder.setContentTitle("BUS " + busCode + " • " + route)
                .setContentText("Passengers: " + passengerCount + " | " + displayStatus)
                .addAction(0, "-1 Seat", prevPendingIntent)
                .addAction(0, "+1 Seat", nextPendingIntent)
                .addAction(0, "Stop", stopPendingIntent)
                .setStyle(new MediaStyle()
                    .setMediaSession(android.support.v4.media.session.MediaSessionCompat.Token.fromToken(mediaSession.getSessionToken()))
                    .setShowActionsInCompactView(0, 1));
        } else {
            builder.setContentTitle("ByaHero location sharing")
                .setContentText("Sharing your live location while enabled.")
                .addAction(0, "Stop", stopPendingIntent);
        }

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Location sharing", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Keeps ByaHero live location sharing active.");
        manager.createNotificationChannel(channel);
    }

    private void updateMediaSession(String busCode, String route, int seatsAvailable, int seatsTotal, String status) {
        if (mediaSession == null) {
            mediaSession = new android.media.session.MediaSession(this, "ByaHeroConductorTracker");
            mediaSession.setCallback(new android.media.session.MediaSession.Callback() {
                @Override public void onSkipToNext() { adjustSeats(-1); }
                @Override public void onSkipToPrevious() { adjustSeats(1); }
            });
            mediaSession.setActive(true);
        }

        int passengerCount = Math.max(0, seatsTotal - seatsAvailable);
        String title = "BUS " + (!busCode.trim().isEmpty() ? busCode : "BUS") + " • " + route;

        String displayStatus = "Available";
        if ("on_stop".equals(status)) displayStatus = "On Stop";
        else if ("full".equals(status)) displayStatus = "Full";

        android.media.MediaMetadata.Builder metadataBuilder = new android.media.MediaMetadata.Builder();
        metadataBuilder.putString(android.media.MediaMetadata.METADATA_KEY_TITLE, title);
        metadataBuilder.putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, "Passengers: " + passengerCount + " | " + displayStatus);
        mediaSession.setMetadata(metadataBuilder.build());

        android.media.session.PlaybackState.Builder stateBuilder = new android.media.session.PlaybackState.Builder();
        stateBuilder.setActions(android.media.session.PlaybackState.ACTION_SKIP_TO_NEXT | android.media.session.PlaybackState.ACTION_SKIP_TO_PREVIOUS);
        stateBuilder.setState(android.media.session.PlaybackState.STATE_PLAYING, 0, 1.0f);
        mediaSession.setPlaybackState(stateBuilder.build());

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void adjustSeats(int delta) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        int current = prefs.getInt("seats_available", 0);
        int seatsTotal = prefs.getInt("seats_total", 25);
        int newSeats = Math.max(0, Math.min(current + delta, seatsTotal));
        
        String newStatus;
        if (newSeats <= 0) {
            newStatus = "full";
        } else if (currentCalculatedSpeed < 0.8f) {
            newStatus = "on_stop";
        } else {
            newStatus = "available";
        }

        prefs.edit()
             .putInt("seats_available", newSeats)
             .putString("status", newStatus)
             .apply();
             
        updateMediaSession(prefs.getString("bus_code", ""), prefs.getString("route", ""), newSeats, seatsTotal, newStatus);
        
        try {
            Intent broadcastIntent = new Intent("com.byahero.app.SEATS_UPDATE");
            broadcastIntent.setPackage(getPackageName());
            broadcastIntent.putExtra("seats_available", newSeats);
            sendBroadcast(broadcastIntent);
        } catch (Exception e) {}
        
        if (lastLocation != null) postLocation(lastLocation, currentCalculatedSpeed);
    }

    @Override
    public void onDestroy() {
        if (fusedLocationClient != null && locationCallback != null) fusedLocationClient.removeLocationUpdates(locationCallback);
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (mediaSession != null) { mediaSession.setActive(false); mediaSession.release(); mediaSession = null; }
        networkExecutor.shutdown();
        super.onDestroy();
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}