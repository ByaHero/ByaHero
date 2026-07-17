package com.byahero.conductor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.ReactApplication
import com.facebook.react.modules.core.DeviceEventManagerModule

class MediaButtonReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = when (intent.action) {
            "next" -> "media-session-next"
            "prev" -> "media-session-prev"
            else -> return
        }
        val reactContext = (context.applicationContext as ReactApplication)
            .reactNativeHost.reactInstanceManager.currentReactContext ?: return
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, null)
    }
}
