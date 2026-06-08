package com.byahero.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class NativeBackgroundLocationBootReceiver extends BroadcastReceiver {
    private static final String PREFS = "native_background_location";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("trackingEnabled", false)) {
            return;
        }

        Intent serviceIntent = new Intent(context, NativeBackgroundLocationService.class);
        serviceIntent.setAction(NativeBackgroundLocationService.ACTION_START);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (RuntimeException ignored) {
            // Some Android versions restrict foreground-service starts from system broadcasts.
        }
    }
}
