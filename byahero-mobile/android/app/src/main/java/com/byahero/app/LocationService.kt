package com.byahero.app

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class LocationService : Service() {

    companion object {
        var isRunning = false
        var reactContext: ReactApplicationContext? = null
    }

    private val CHANNEL_ID = "LocationServiceChannel"
    private var locationManager: LocationManager? = null
    private var email: String = ""
    private var serverUrl: String = ""
    private var cookieString: String = ""
    private var lastBackendUpdateTime = 0L
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ByaHero Tracking")
            .setContentText("Location is being tracked in the background.")
            .setSmallIcon(resources.getIdentifier("ic_launcher", "mipmap", packageName))
            .build()
        startForeground(1, notification)
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
    }

    @SuppressLint("MissingPermission")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            email = it.getStringExtra("email") ?: ""
            serverUrl = it.getStringExtra("serverUrl") ?: ""
            cookieString = it.getStringExtra("cookieString") ?: ""
        }

        try {
            locationManager?.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                2000L,
                0f,
                locationListener
            )
            locationManager?.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER,
                2000L,
                0f,
                locationListener
            )
        } catch (e: Exception) {
            Log.e("LocationService", "Error requesting location updates", e)
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        locationManager?.removeUpdates(locationListener)
    }

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            val lat = location.latitude
            val lng = location.longitude

            // Send to React Native
            reactContext?.let {
                if (it.hasActiveReactInstance()) {
                    val params = Arguments.createMap().apply {
                        putDouble("lat", lat)
                        putDouble("lng", lng)
                    }
                    it.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onBackgroundLocation", params)
                }
            }

            // Send to Backend (throttle to 15 seconds)
            val currentTime = System.currentTimeMillis()
            if (serverUrl.isNotEmpty() && (currentTime - lastBackendUpdateTime >= 15000L)) {
                sendLocationToBackend(lat, lng, location.accuracy)
                lastBackendUpdateTime = currentTime
            }
        }

        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }

    private fun sendLocationToBackend(lat: Double, lng: Double, accuracy: Float) {
        val endpoint = if (serverUrl.endsWith("/")) "${serverUrl}api/location/update" else "$serverUrl/api/location/update"
        val json = JSONObject().apply {
            put("latitude", lat)
            put("longitude", lng)
            put("accuracy", accuracy)
            put("email", email)
        }
        val requestBody = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        
        val requestBuilder = Request.Builder()
            .url(endpoint)
            .post(requestBody)
        
        if (cookieString.isNotEmpty()) {
            requestBuilder.addHeader("Cookie", cookieString)
        }

        client.newCall(requestBuilder.build()).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("LocationService", "Failed to update location", e)
            }
            override fun onResponse(call: Call, response: Response) {
                response.close()
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }
}
