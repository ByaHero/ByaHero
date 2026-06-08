package com.byahero.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.BroadcastReceiver;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeBackgroundLocation")
public class NativeBackgroundLocationPlugin extends Plugin {
    private static final String DEFAULT_BASE_URL = "https://byahero.app";
    private static final String DEFAULT_UPDATE_URL = "https://byahero.app/backend/updateUserLocation.php";
    private static final long DEFAULT_INTERVAL_MS = 5000L;
    private static final String PREFS = "native_background_location";

    private BroadcastReceiver locationReceiver;

    @Override
    public void load() {
        super.load();
        locationReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent != null) {
                    if ("com.byahero.app.LOCATION_UPDATE".equals(intent.getAction())) {
                        double lat = intent.getDoubleExtra("latitude", 0.0);
                        double lng = intent.getDoubleExtra("longitude", 0.0);
                        JSObject data = new JSObject();
                        data.put("latitude", lat);
                        data.put("longitude", lng);
                        notifyListeners("locationUpdate", data);
                    } else if ("com.byahero.app.SEATS_UPDATE".equals(intent.getAction())) {
                        int seatsVal = intent.getIntExtra("seats_available", 0);
                        JSObject data = new JSObject();
                        data.put("seatsAvailable", seatsVal);
                        notifyListeners("seatsUpdate", data);
                    }
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.byahero.app.LOCATION_UPDATE");
        filter.addAction("com.byahero.app.SEATS_UPDATE");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(locationReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(locationReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (locationReceiver != null) {
            try {
                getContext().unregisterReceiver(locationReceiver);
            } catch (Exception ignored) {}
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!hasNativeLocationPermissions()) {
            call.reject("Location permissions are incomplete. Allow location access all the time, then enable Share Location again.");
            return;
        }

        String baseUrl = call.getString("baseUrl", DEFAULT_BASE_URL);
        String updateUrl = call.getString("updateUrl", DEFAULT_UPDATE_URL);
        
        Integer intervalMsInt = call.getInt("intervalMs");
        long intervalMs = intervalMsInt != null ? intervalMsInt.longValue() : DEFAULT_INTERVAL_MS;
        
        String cookie = call.getString("cookie", getCookie(baseUrl, updateUrl));

        if (cookie == null || cookie.trim().isEmpty()) {
            call.reject("No logged-in session cookie is available for native background location updates.");
            return;
        }

        String payloadType = call.getString("payloadType", "passenger");

        Intent intent = new Intent(getContext(), NativeBackgroundLocationService.class);
        intent.setAction(NativeBackgroundLocationService.ACTION_START);
        intent.putExtra(NativeBackgroundLocationService.EXTRA_UPDATE_URL, updateUrl);
        intent.putExtra(NativeBackgroundLocationService.EXTRA_COOKIE, cookie);
        intent.putExtra(NativeBackgroundLocationService.EXTRA_INTERVAL_MS, intervalMs);
        intent.putExtra("payloadType", payloadType);

        if ("conductor".equals(payloadType)) {
            Integer busIdInt = call.getInt("busId");
            long busId = busIdInt != null ? busIdInt.longValue() : 0L;
            intent.putExtra("bus_id", busId);
            intent.putExtra("bus_code", call.getString("busCode", ""));
            intent.putExtra("route", call.getString("route", ""));
            intent.putExtra("seats_available", call.getInt("seatsAvailable", 0));
            intent.putExtra("seats_total", call.getInt("seatsTotal", 25));
            intent.putExtra("status", call.getString("status", "available"));
        }

        try {
            intent.putExtra("userAgent", WebSettings.getDefaultUserAgent(getContext()));
        } catch (Exception e) {
            // Fallback in case of webview/settings init issues
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        JSObject result = new JSObject();
        result.put("running", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), NativeBackgroundLocationService.class);
        intent.setAction(NativeBackgroundLocationService.ACTION_STOP);
        getContext().startService(intent);

        JSObject result = new JSObject();
        result.put("running", false);
        call.resolve(result);
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSObject result = new JSObject();
        result.put("running", prefs.getBoolean("trackingEnabled", false));
        call.resolve(result);
    }

    private boolean hasNativeLocationPermissions() {
        boolean fine = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean coarse = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (!fine && !coarse) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }

        return true;
    }

    private String getCookie(String baseUrl, String updateUrl) {
        CookieManager cookieManager = CookieManager.getInstance();
        String cookie = cookieManager.getCookie(baseUrl);
        if (cookie == null || cookie.trim().isEmpty()) {
            cookie = cookieManager.getCookie(updateUrl);
        }
        return cookie;
    }
}
