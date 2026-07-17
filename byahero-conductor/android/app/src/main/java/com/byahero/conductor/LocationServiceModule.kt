package com.byahero.conductor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class LocationServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var locationReceiver: BroadcastReceiver? = null
    private var mediaReceiver: BroadcastReceiver? = null

    override fun getName() = "LocationServiceModule"

    @ReactMethod
    fun startService() {
        val intent = Intent(reactContext, LocationForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
        registerReceivers()
    }

    @ReactMethod
    fun stopService() {
        unregisterReceivers()
        reactContext.stopService(Intent(reactContext, LocationForegroundService::class.java))
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(LocationForegroundService.isRunning)
    }

    @ReactMethod
    fun notifyAppForeground() = sendAction(LocationForegroundService.ACTION_APP_FOREGROUND)

    @ReactMethod
    fun notifyAppBackground() = sendAction(LocationForegroundService.ACTION_APP_BACKGROUND)

    @ReactMethod
    fun updateMetadata(title: String, artist: String) {
        LocationForegroundService.currentTitle  = title
        LocationForegroundService.currentArtist = artist
        if (LocationForegroundService.isRunning) {
            reactContext.sendBroadcast(Intent(LocationForegroundService.ACTION_UPDATE_META).apply {
                putExtra(LocationForegroundService.EXTRA_TITLE, title)
                putExtra(LocationForegroundService.EXTRA_ARTIST, artist)
                `package` = reactContext.packageName
            })
        }
    }

    private fun sendAction(action: String) {
        if (!LocationForegroundService.isRunning) return
        val intent = Intent(reactContext, LocationForegroundService::class.java).apply { this.action = action }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    private fun registerReceivers() {
        if (locationReceiver == null) {
            locationReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val params = Arguments.createMap().apply {
                        putDouble("lat", intent.getDoubleExtra("lat", 0.0))
                        putDouble("lng", intent.getDoubleExtra("lng", 0.0))
                        putDouble("accuracy", intent.getDoubleExtra("accuracy", 0.0))
                    }
                    emitEvent("onBackgroundLocation", params)
                }
            }
            doRegisterReceiver(locationReceiver!!, IntentFilter("com.byahero.conductor.LOCATION_UPDATE"))
        }

        if (mediaReceiver == null) {
            mediaReceiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val event = intent.getStringExtra("event") ?: return
                    emitEvent(event, null)
                }
            }
            doRegisterReceiver(mediaReceiver!!, IntentFilter("com.byahero.conductor.MEDIA_BUTTON"))
        }
    }

    private fun unregisterReceivers() {
        locationReceiver?.let {
            try { reactContext.unregisterReceiver(it) } catch (e: Exception) {}
            locationReceiver = null
        }
        mediaReceiver?.let {
            try { reactContext.unregisterReceiver(it) } catch (e: Exception) {}
            mediaReceiver = null
        }
    }

    private fun doRegisterReceiver(receiver: BroadcastReceiver, filter: IntentFilter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(receiver, filter)
        }
    }

    private fun emitEvent(event: String, data: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, data)
    }

    override fun invalidate() {
        unregisterReceivers()
        super.invalidate()
    }
}
