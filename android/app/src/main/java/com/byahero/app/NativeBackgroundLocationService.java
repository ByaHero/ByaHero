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
                    android.util.Log.d("ByaHeroLocation", "onLocationResult: lat=" + location.getLatitude() + ", lng=" + location.getLongitude());
                    
                    // Broadcast location update immediately to the main process
                    try {
                        Intent broadcastIntent = new Intent("com.byahero.app.LOCATION_UPDATE");
                        broadcastIntent.setPackage(getPackageName());
                        broadcastIntent.putExtra("latitude", location.getLatitude());
                        broadcastIntent.putExtra("longitude", location.getLongitude());
                        sendBroadcast(broadcastIntent);
                    } catch (Exception e) {
                        android.util.Log.e("ByaHeroLocation", "Failed to send location update broadcast", e);
                    }
                    
                    postLocation(location);
                } else {
                    android.util.Log.d("ByaHeroLocation", "onLocationResult: location is null");
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
        android.util.Log.d("ByaHeroLocation", "onStartCommand: action=" + (intent != null ? intent.getAction() : "null"));
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            stopSelf();
            return START_NOT_STICKY;
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
                    editor.putString("route", intent.getStringExtra("route"));
                    editor.putInt("seats_available", intent.getIntExtra("seats_available", 0));
                    editor.putString("status", intent.getStringExtra("status"));
                }
            }
            editor.apply();
            android.util.Log.d("ByaHeroLocation", "Saved settings: url=" + prefs.getString(EXTRA_UPDATE_URL, null) + ", userAgent=" + prefs.getString("userAgent", null) + ", payloadType=" + prefs.getString("payloadType", "passenger"));
        }

        if (!hasLocationPermission()) {
            android.util.Log.w("ByaHeroLocation", "Missing location permissions!");
            stopSelf();
            return START_NOT_STICKY;
        }

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire();
            android.util.Log.d("ByaHeroLocation", "WakeLock acquired");
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        startTracking();
        return START_STICKY;
    }

    private void startTracking() {
        long intervalMs = getSharedPreferences(PREFS, MODE_PRIVATE)
            .getLong(EXTRA_INTERVAL_MS, DEFAULT_INTERVAL_MS);
        android.util.Log.d("ByaHeroLocation", "startTracking: intervalMs=" + intervalMs);

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(Math.max(1000L, intervalMs / 2L))
            .setWaitForAccurateLocation(false)
            .build();

        fusedLocationClient.removeLocationUpdates(locationCallback);
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
            android.util.Log.d("ByaHeroLocation", "Fused location updates requested");
        } else {
            android.util.Log.e("ByaHeroLocation", "Cannot request location updates: Permission denied");
        }
    }

    private void stopTracking() {
        android.util.Log.d("ByaHeroLocation", "stopTracking");
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean("trackingEnabled", false)
            .apply();

        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            android.util.Log.d("ByaHeroLocation", "WakeLock released");
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

    private void postLocation(Location location) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String updateUrl = prefs.getString(EXTRA_UPDATE_URL, null);
        String cookie = prefs.getString(EXTRA_COOKIE, null);
        String userAgent = prefs.getString("userAgent", "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Mobile Safari/537.36");

        if (updateUrl == null || updateUrl.trim().isEmpty() || cookie == null || cookie.trim().isEmpty()) {
            android.util.Log.w("ByaHeroLocation", "postLocation: URL or Cookie is empty!");
            return;
        }

        android.util.Log.d("ByaHeroLocation", "postLocation: posting to " + updateUrl);
        android.util.Log.d("ByaHeroLocation", "postLocation: using Cookie = " + cookie);
        android.util.Log.d("ByaHeroLocation", "postLocation: using User-Agent = " + userAgent);
        networkExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                JSONObject payload = new JSONObject();
                String payloadType = prefs.getString("payloadType", "passenger");
                if ("conductor".equals(payloadType)) {
                    long busId = prefs.getLong("bus_id", 0L);
                    String route = prefs.getString("route", "");
                    int seatsAvailable = prefs.getInt("seats_available", 0);
                    String status = prefs.getString("status", "available");

                    payload.put("bus_id", busId);
                    payload.put("lat", location.getLatitude());
                    payload.put("lng", location.getLongitude());
                    payload.put("route", route);
                    payload.put("seats_available", seatsAvailable);
                    payload.put("status", status);
                    payload.put("current_location_name", String.format(java.util.Locale.US, "%.5f, %.5f", location.getLatitude(), location.getLongitude()));
                } else {
                    payload.put("latitude", location.getLatitude());
                    payload.put("longitude", location.getLongitude());
                    payload.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);
                }

                android.util.Log.d("ByaHeroLocation", "postLocation: payload = " + payload.toString());
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

                int responseCode = connection.getResponseCode();
                String responseBody = "";
                try {
                    java.io.InputStream is = (responseCode >= 200 && responseCode < 300) ? connection.getInputStream() : connection.getErrorStream();
                    if (is != null) {
                        java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is, StandardCharsets.UTF_8));
                        StringBuilder sb = new StringBuilder();
                        String line;
                        while ((line = br.readLine()) != null) {
                            sb.append(line);
                        }
                        responseBody = sb.toString();
                    }
                } catch (Exception ignored) {}
                android.util.Log.d("ByaHeroLocation", "postLocation: HTTP response = " + responseCode + ", body = " + responseBody);
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

        Intent launchIntent = new Intent(this, MainActivity.class);
        PendingIntent launchPendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, NativeBackgroundLocationService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_location)
            .setContentTitle("ByaHero location sharing")
            .setContentText("Sharing your live location while enabled.")
            .setContentIntent(launchPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(0, "Stop", stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Location sharing",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Keeps ByaHero live location sharing active.");
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        networkExecutor.shutdown();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
