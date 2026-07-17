package com.byahero.conductor

import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.media.app.NotificationCompat.MediaStyle
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class MediaSessionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaSession: MediaSessionCompat? = null
    private val CHANNEL_ID = "byahero_media"
    private val NOTIF_ID = 2001

    override fun getName() = "MediaSessionModule"

    @ReactMethod
    fun setup(promise: Promise) {
        try {
            createNotificationChannel()
            mediaSession = MediaSessionCompat(reactContext, "ByaHeroSession").apply {
                setCallback(object : MediaSessionCompat.Callback() {
                    override fun onSkipToNext() = emit("media-session-next")
                    override fun onSkipToPrevious() = emit("media-session-prev")
                    override fun onPlay() = emit("media-session-next")
                    override fun onPause() = emit("media-session-prev")
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
                isActive = true
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SETUP_ERROR", e)
        }
    }

    @ReactMethod
    fun updateMetadata(title: String, artist: String, promise: Promise) {
        try {
            mediaSession?.setMetadata(
                MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                    .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "ByaHero")
                    .build()
            )
            showNotification(title, artist)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", e)
        }
    }

    @ReactMethod
    fun destroy(promise: Promise) {
        try {
            NotificationManagerCompat.from(reactContext).cancel(NOTIF_ID)
            mediaSession?.release()
            mediaSession = null
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DESTROY_ERROR", e)
        }
    }

    private fun emit(event: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, null)
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannelCompat.Builder(CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_LOW)
            .setName("ByaHero Tracking")
            .build()
        NotificationManagerCompat.from(reactContext).createNotificationChannel(channel)
    }

    private fun showNotification(title: String, artist: String) {
        val session = mediaSession ?: return
        val notif = NotificationCompat.Builder(reactContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle(title)
            .setContentText(artist)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_previous, "Depart", buildPendingIntent("prev"))
            .addAction(android.R.drawable.ic_media_next, "Board", buildPendingIntent("next"))
            .setStyle(
                MediaStyle()
                    .setMediaSession(session.sessionToken)
                    .setShowActionsInCompactView(0, 1)
            )
            .build()
        NotificationManagerCompat.from(reactContext).notify(NOTIF_ID, notif)
    }

    private fun buildPendingIntent(action: String): android.app.PendingIntent {
        val intent = Intent(reactContext, MediaButtonReceiver::class.java).apply {
            this.action = action
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            android.app.PendingIntent.FLAG_IMMUTABLE else 0
        return android.app.PendingIntent.getBroadcast(reactContext, action.hashCode(), intent, flags)
    }
}
