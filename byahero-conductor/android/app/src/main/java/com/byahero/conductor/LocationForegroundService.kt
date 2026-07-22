package com.byahero.conductor

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat.MediaStyle
import com.google.android.gms.location.*

class LocationForegroundService : Service() {

    companion object {
        const val CHANNEL_ID        = "byahero_tracking"
        const val NOTIF_ID          = 1001
        const val ACTION_UPDATE_META    = "com.byahero.conductor.ACTION_UPDATE_META"
        const val ACTION_APP_FOREGROUND = "com.byahero.conductor.ACTION_APP_FOREGROUND"
        const val ACTION_APP_BACKGROUND = "com.byahero.conductor.ACTION_APP_BACKGROUND"
        const val ACTION_MEDIA_NEXT     = "com.byahero.conductor.ACTION_MEDIA_NEXT"
        const val ACTION_MEDIA_PREV     = "com.byahero.conductor.ACTION_MEDIA_PREV"
        const val EXTRA_TITLE  = "meta_title"
        const val EXTRA_ARTIST = "meta_artist"

        @Volatile var isRunning   = false
        @Volatile var currentTitle  = "ByaHero – Tracking Active"
        @Volatile var currentArtist = "Bus location is being shared."
        @Volatile var busId = ""
        @Volatile var code = ""
        @Volatile var route = ""
        @Volatile var seatsTotal = 25
        @Volatile var seatsAvailable = 25
        @Volatile var serverUrl = "https://byahero.alwaysdata.net"
        @Volatile var cachedEmail = ""
        @Volatile var lastLat = 0.0
        @Volatile var lastLng = 0.0
        @Volatile var lastSpeed = 0.0
        @Volatile var lastLocName = ""
    }

    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var mediaSession: MediaSessionCompat? = null
    private var appInForeground = false

    private val metaReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context, intent: Intent) {
            currentTitle  = intent.getStringExtra(EXTRA_TITLE)  ?: currentTitle
            currentArtist = intent.getStringExtra(EXTRA_ARTIST) ?: currentArtist
            refreshNotification()
        }
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
        setupMediaSession()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(metaReceiver, android.content.IntentFilter(ACTION_UPDATE_META), RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(metaReceiver, android.content.IntentFilter(ACTION_UPDATE_META))
        }
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let {
                    lastLat = it.latitude
                    lastLng = it.longitude
                    lastSpeed = if (it.hasSpeed()) it.speed.toDouble() else 0.0
                    broadcastLocation(it)
                    scheduleNativeBackendUpdate()
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_APP_FOREGROUND -> {
                appInForeground = true
                refreshNotification()
                return START_STICKY
            }
            ACTION_APP_BACKGROUND -> {
                appInForeground = false
                refreshNotification()
                return START_STICKY
            }
            ACTION_MEDIA_NEXT -> {
                handleMediaBoard()
                return START_STICKY
            }
            ACTION_MEDIA_PREV -> {
                handleMediaDepart()
                return START_STICKY
            }
        }

        // Initial start
        appInForeground = true
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIF_ID, notification)
        }

        try {
            fusedClient.requestLocationUpdates(
                LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000L)
                    .setMinUpdateDistanceMeters(3f)
                    .build(),
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            stopSelf()
        }

        isRunning = true
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        appInForeground = false
        refreshNotification()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        nativeSyncRunnable?.let { nativeSyncHandler.removeCallbacks(it) }
        fusedClient.removeLocationUpdates(locationCallback)
        try { unregisterReceiver(metaReceiver) } catch (e: Exception) {}
        mediaSession?.release()
        mediaSession = null
        isRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private var lastMediaClickTime = 0L
    private var nativeSyncRunnable: Runnable? = null
    private val nativeSyncHandler by lazy { android.os.Handler(android.os.Looper.getMainLooper()) }

    private fun scheduleNativeBackendUpdate() {
        nativeSyncRunnable?.let { nativeSyncHandler.removeCallbacks(it) }
        nativeSyncRunnable = Runnable {
            sendNativeLocationUpdate()
        }
        nativeSyncHandler.postDelayed(nativeSyncRunnable!!, 3000L)
    }

    private fun getFormattedTitle(): String {
        val passengers = (seatsTotal - seatsAvailable).coerceAtLeast(0)
        return "Passengers: $passengers | Seats: $seatsAvailable"
    }

    private fun handleMediaBoard() {
        val now = System.currentTimeMillis()
        if (now - lastMediaClickTime < 80) return
        lastMediaClickTime = now

        if (seatsAvailable > 0) {
            seatsAvailable -= 1
            saveSeatsToPrefs(seatsAvailable)
            currentTitle = getFormattedTitle()
            if (code.isNotEmpty() || route.isNotEmpty()) {
                currentArtist = "Bus $code - Route: $route"
            }
            refreshNotification()
            scheduleNativeBackendUpdate()
        }
        if (appInForeground) {
            broadcastMediaButton("media-session-next")
        }
    }

    private fun handleMediaDepart() {
        val now = System.currentTimeMillis()
        if (now - lastMediaClickTime < 80) return
        lastMediaClickTime = now

        if (seatsAvailable < seatsTotal) {
            seatsAvailable += 1
            saveSeatsToPrefs(seatsAvailable)
            currentTitle = getFormattedTitle()
            if (code.isNotEmpty() || route.isNotEmpty()) {
                currentArtist = "Bus $code - Route: $route"
            }
            refreshNotification()
            scheduleNativeBackendUpdate()
        }
        if (appInForeground) {
            broadcastMediaButton("media-session-prev")
        }
    }

    private fun saveSeatsToPrefs(seats: Int) {
        val prefs = getSharedPreferences("byahero_conductor_prefs", MODE_PRIVATE)
        prefs.edit().putInt("seats_available", seats).apply()
    }

    private fun sendNativeLocationUpdate() {
        val sUrl = serverUrl.ifEmpty { return }
        val bId = busId.ifEmpty { return }

        java.util.concurrent.Executors.newSingleThreadExecutor().execute {
            try {
                val cleanBase = if (sUrl.endsWith("/")) sUrl.dropLast(1) else sUrl
                var targetUrl = "$cleanBase/api/conductor/update-location"
                if (!cleanBase.contains("alwaysdata.net") && !cleanBase.contains("public/")) {
                    targetUrl = "$cleanBase/public/api/conductor/update-location"
                }

                val url = java.net.URL(targetUrl)
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                conn.setRequestProperty("Accept", "application/json")
                conn.setRequestProperty("User-Agent", "ByaHeroConductor/1.0")

                val statusStr = if (seatsAvailable <= 0) "full" else "available"

                val geojsonObj = org.json.JSONObject().apply {
                    put("type", "Feature")
                    put("geometry", org.json.JSONObject().apply {
                        put("type", "Point")
                        put("coordinates", org.json.JSONArray().apply {
                            put(lastLng)
                            put(lastLat)
                        })
                    })
                    put("properties", org.json.JSONObject().apply {
                        put("bus_id", bId)
                        put("code", code)
                        put("route", route)
                        put("seats_available", seatsAvailable)
                        put("status", statusStr)
                        put("current_location_name", lastLocName)
                    })
                }

                val payloadObj = org.json.JSONObject().apply {
                    put("bus_id", bId.toIntOrNull() ?: 0)
                    put("route", route)
                    put("seats_available", seatsAvailable)
                    put("status", statusStr)
                    put("speed", lastSpeed)
                    put("current_location_name", lastLocName)
                    put("geojson", geojsonObj)
                    if (cachedEmail.isNotEmpty()) {
                        put("email", cachedEmail)
                    }
                }

                val bodyBytes = payloadObj.toString().toByteArray(Charsets.UTF_8)
                conn.setFixedLengthStreamingMode(bodyBytes.size)
                conn.outputStream.use { os ->
                    os.write(bodyBytes)
                }

                val responseCode = conn.responseCode
                conn.disconnect()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "ByaHeroSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onSkipToNext()     = handleMediaBoard()
                override fun onSkipToPrevious() = handleMediaDepart()
                override fun onPlay()           = handleMediaBoard()
                override fun onPause()          = handleMediaDepart()
            })
            setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setActions(
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                        PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE
                    )
                    .setState(PlaybackStateCompat.STATE_PLAYING, 0, 1f)
                    .build()
            )
            setMetadata(
                MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "ByaHero")
                    .build()
            )
            isActive = true
        }
    }

    private fun refreshNotification() {
        mediaSession?.isActive = true
        mediaSession?.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE
                )
                .setState(PlaybackStateCompat.STATE_PLAYING, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
                .build()
        )
        mediaSession?.setMetadata(
            MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "ByaHero")
                .build()
        )
        getSystemService(NotificationManager::class.java).notify(NOTIF_ID, buildNotification())
    }

    private fun buildNotification(): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val session = mediaSession ?: return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .build()

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_previous, "Depart", buildActionIntent(ACTION_MEDIA_PREV, 1))
            .addAction(android.R.drawable.ic_media_next, "Board", buildActionIntent(ACTION_MEDIA_NEXT, 2))
            .setStyle(
                MediaStyle()
                    .setMediaSession(session.sessionToken)
                    .setShowActionsInCompactView(0, 1)
            )
            .build()
    }

    private fun buildActionIntent(action: String, requestCode: Int): PendingIntent {
        val intent = Intent(this, LocationForegroundService::class.java).apply { this.action = action }
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE)
        } else {
            PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE)
        }
    }

    private fun broadcastLocation(location: Location) {
        sendBroadcast(Intent("com.byahero.conductor.LOCATION_UPDATE").apply {
            putExtra("lat", location.latitude)
            putExtra("lng", location.longitude)
            putExtra("accuracy", location.accuracy)
            `package` = packageName
        })
    }

    private fun broadcastMediaButton(event: String) {
        sendBroadcast(Intent("com.byahero.conductor.MEDIA_BUTTON").apply {
            putExtra("event", event)
            `package` = packageName
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Bus Tracking", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Keeps bus location active in background" }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
