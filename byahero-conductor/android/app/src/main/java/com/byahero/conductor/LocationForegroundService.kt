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
        const val EXTRA_TITLE  = "meta_title"
        const val EXTRA_ARTIST = "meta_artist"

        @Volatile var isRunning   = false
        @Volatile var currentTitle  = "ByaHero – Tracking Active"
        @Volatile var currentArtist = "Bus location is being shared."
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
                result.lastLocation?.let { broadcastLocation(it) }
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
        // App was swiped — drop media session, show reopen notification
        appInForeground = false
        refreshNotification()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        fusedClient.removeLocationUpdates(locationCallback)
        try { unregisterReceiver(metaReceiver) } catch (e: Exception) {}
        mediaSession?.release()
        mediaSession = null
        isRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun setupMediaSession() {
        mediaSession = MediaSessionCompat(this, "ByaHeroSession").apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onSkipToNext()     = broadcastMediaButton("media-session-next")
                override fun onSkipToPrevious() = broadcastMediaButton("media-session-prev")
                override fun onPlay()           = broadcastMediaButton("media-session-next")
                override fun onPause()          = broadcastMediaButton("media-session-prev")
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
        if (appInForeground) {
            mediaSession?.isActive = true
            mediaSession?.setMetadata(
                MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "ByaHero")
                    .build()
            )
        } else {
            mediaSession?.isActive = false
        }
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

        if (!appInForeground) {
            // Plain notification — no media controls
            return NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("ByaHero – Still Tracking")
                .setContentText("Tap to reopen the app and manage passengers.")
                .setContentIntent(openIntent)
                .setOngoing(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()
        }

        // Full media-style notification when app is open
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
            .addAction(android.R.drawable.ic_media_previous, "Depart", buildActionIntent(ACTION_APP_BACKGROUND, 1))
            .addAction(android.R.drawable.ic_media_next, "Board", buildActionIntent(ACTION_APP_BACKGROUND, 2))
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
