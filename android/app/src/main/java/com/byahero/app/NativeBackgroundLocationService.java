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

    private static final String CHANNEL_ID = "byahero_location_tracking";
    private static final int NOTIFICATION_ID = 7401;
    private static final long DEFAULT_INTERVAL_MS = 30000L;
    private static final String PREFS = "native_background_location";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void onCreate() {
        super.onCreate();
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                Location location = locationResult.getLastLocation();
                if (location != null) {
                    postLocation(location);
                }
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            stopSelf();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        if (intent != null) {
            prefs.edit()
                .putBoolean("trackingEnabled", true)
                .putString(EXTRA_UPDATE_URL, intent.getStringExtra(EXTRA_UPDATE_URL))
                .putString(EXTRA_COOKIE, intent.getStringExtra(EXTRA_COOKIE))
                .putLong(EXTRA_INTERVAL_MS, intent.getLongExtra(EXTRA_INTERVAL_MS, DEFAULT_INTERVAL_MS))
                .apply();
        }

        if (!hasLocationPermission()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        startTracking();
        return START_STICKY;
    }

    private void startTracking() {
        long intervalMs = getSharedPreferences(PREFS, MODE_PRIVATE)
            .getLong(EXTRA_INTERVAL_MS, DEFAULT_INTERVAL_MS);

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(Math.max(10000L, intervalMs / 2L))
            .setWaitForAccurateLocation(false)
            .build();

        fusedLocationClient.removeLocationUpdates(locationCallback);
        fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    }

    private void stopTracking() {
        getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean("trackingEnabled", false)
            .apply();

        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
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

        if (updateUrl == null || updateUrl.trim().isEmpty() || cookie == null || cookie.trim().isEmpty()) {
            return;
        }

        networkExecutor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                JSONObject payload = new JSONObject();
                payload.put("latitude", location.getLatitude());
                payload.put("longitude", location.getLongitude());
                payload.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL);

                byte[] body = payload.toString().getBytes(StandardCharsets.UTF_8);
                connection = (HttpURLConnection) new URL(updateUrl).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("Cookie", cookie);
                connection.setFixedLengthStreamingMode(body.length);

                try (OutputStream os = connection.getOutputStream()) {
                    os.write(body);
                }

                connection.getResponseCode();
            } catch (Exception ignored) {
                // Location retries naturally on the next fused-provider update.
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
        networkExecutor.shutdown();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
