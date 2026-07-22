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
        val nativeSeats = LocationForegroundService.seatsAvailable
        val total = LocationForegroundService.seatsTotal
        val passengers = (total - nativeSeats).coerceAtLeast(0)
        val currentTitle = "Passengers: $passengers | Seats: $nativeSeats"
        LocationForegroundService.currentTitle  = currentTitle
        LocationForegroundService.currentArtist = artist
        if (LocationForegroundService.isRunning) {
            reactContext.sendBroadcast(Intent(LocationForegroundService.ACTION_UPDATE_META).apply {
                putExtra(LocationForegroundService.EXTRA_TITLE, currentTitle)
                putExtra(LocationForegroundService.EXTRA_ARTIST, artist)
                `package` = reactContext.packageName
            })
        }
    }

    @ReactMethod
    fun updateSessionData(map: ReadableMap) {
        if (map.hasKey("bus_id")) LocationForegroundService.busId = map.getString("bus_id") ?: ""
        if (map.hasKey("code")) LocationForegroundService.code = map.getString("code") ?: ""
        if (map.hasKey("route")) LocationForegroundService.route = map.getString("route") ?: ""
        if (map.hasKey("seats_total")) LocationForegroundService.seatsTotal = map.getInt("seats_total")
        
        val forceSeats = map.hasKey("force_seats") && map.getBoolean("force_seats")
        if (map.hasKey("seats_available") && forceSeats) {
            LocationForegroundService.seatsAvailable = map.getInt("seats_available")
            val prefs = reactContext.getSharedPreferences("byahero_conductor_prefs", Context.MODE_PRIVATE)
            prefs.edit().putInt("seats_available", LocationForegroundService.seatsAvailable).apply()
        }

        if (map.hasKey("server_url")) LocationForegroundService.serverUrl = map.getString("server_url") ?: ""
        if (map.hasKey("email")) LocationForegroundService.cachedEmail = map.getString("email") ?: ""
        if (map.hasKey("lat")) LocationForegroundService.lastLat = map.getDouble("lat")
        if (map.hasKey("lng")) LocationForegroundService.lastLng = map.getDouble("lng")
        if (map.hasKey("speed")) LocationForegroundService.lastSpeed = map.getDouble("speed")
        if (map.hasKey("location_name")) LocationForegroundService.lastLocName = map.getString("location_name") ?: ""
    }

    @ReactMethod
    fun getPersistedSeats(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("byahero_conductor_prefs", Context.MODE_PRIVATE)
            val seats = prefs.getInt("seats_available", -1)
            if (seats != -1) {
                LocationForegroundService.seatsAvailable = seats
            }
            promise.resolve(seats)
        } catch (e: Exception) {
            promise.reject("ERR_PREFS", e)
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
