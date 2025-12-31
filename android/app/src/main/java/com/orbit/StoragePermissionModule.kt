package com.orbit

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StoragePermissionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "StoragePermissionModule"
    }

    /**
     * Check if the app has All Files Access (MANAGE_EXTERNAL_STORAGE) permission
     * Returns true for Android 10 and below (not needed)
     * Returns actual permission status for Android 11+
     */
    @ReactMethod
    fun isAllFilesAccessGranted(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                promise.resolve(Environment.isExternalStorageManager())
            } else {
                // Not needed for Android 10 and below
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Open the All Files Access settings page for the app
     * Only works on Android 11+ (API 30+)
     */
    @ReactMethod
    fun openAllFilesAccessSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val activity = currentActivity
                if (activity != null) {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                    intent.data = Uri.parse("package:${activity.packageName}")
                    activity.startActivity(intent)
                    promise.resolve(true)
                } else {
                    promise.reject("ERROR", "Activity is null")
                }
            } else {
                // Not needed for Android 10 and below
                promise.resolve(true)
            }
        } catch (e: Exception) {
            // Fallback: open general app settings if specific intent fails
            try {
                val activity = currentActivity
                if (activity != null) {
                    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    intent.data = Uri.parse("package:${activity.packageName}")
                    activity.startActivity(intent)
                    promise.resolve(true)
                } else {
                    promise.reject("ERROR", "Activity is null")
                }
            } catch (e2: Exception) {
                promise.reject("ERROR", e2.message)
            }
        }
    }
}
