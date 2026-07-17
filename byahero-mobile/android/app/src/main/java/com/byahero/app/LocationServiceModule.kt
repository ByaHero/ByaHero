package com.byahero.app

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*

class LocationServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LocationServiceModule"
    }

    @ReactMethod
    fun startService(email: String, serverUrl: String, cookieString: String) {
        val intent = Intent(reactApplicationContext, LocationService::class.java).apply {
            putExtra("email", email)
            putExtra("serverUrl", serverUrl)
            putExtra("cookieString", cookieString)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactApplicationContext, LocationService::class.java)
        reactApplicationContext.stopService(intent)
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(LocationService.isRunning)
    }

    @ReactMethod
    fun bindListener() {
        LocationService.reactContext = reactApplicationContext
    }
}
