package com.orbit

import android.util.Log
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule


class PythonBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "PythonBridge"
        private var pythonInitialized = false
    }

    override fun getName() = "PythonBridge"

    override fun getConstants(): MutableMap<String, Any>? {
        return hashMapOf<String, Any>(
            "PYTHON_AVAILABLE" to true
        )
    }

    @ReactMethod
    fun initializePython(promise: Promise) {
        try {
            if (!pythonInitialized) {
                // Initialize Python if not already done
                if (!Python.isStarted()) {
                    Python.start(AndroidPlatform(reactApplicationContext))
                }
                Log.i(TAG, "Python bridge initialized successfully")
                pythonInitialized = true
                promise.resolve(true)
            } else {
                Log.i(TAG, "Python bridge already initialized")
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Python bridge", e)
            promise.reject("PYTHON_INIT_ERROR", "Failed to initialize Python: ${e.message}")
        }
    }

    @ReactMethod
    fun callPythonFunction(functionName: String, params: ReadableMap, promise: Promise) {
        // Run Python calls on background thread to avoid blocking UI
        Thread {
            try {
                Log.i(TAG, "Calling Python function: $functionName")

                // Ensure Python is initialized
                if (!pythonInitialized) {
                    initializePythonInThread()
                }

                val py = Python.getInstance()
                val module = py.getModule("youtube_api")

                // Convert ReadableMap to HashMap for Python
                val hashMapParams = params.toHashMap()

                // Call the Python function
                val result = module.callAttr("call_function", functionName, hashMapParams)

                Log.i(TAG, "Python function call completed: $functionName")

                // Resolve with the JSON string result
                promise.resolve(result.toString())

            } catch (e: Exception) {
                Log.e(TAG, "Python function call failed: $functionName", e)
                promise.reject("PYTHON_ERROR", "Python error in $functionName: ${e.message}", e)
            }
        }.start()
    }



    @ReactMethod
    fun getCacheStats(promise: Promise) {
        Thread {
            try {
                if (!pythonInitialized) {
                    initializePythonInThread()
                }

                val py = Python.getInstance()
                val cacheModule = py.getModule("diskcache")
                // In a real implementation, we'd need to expose cache stats from Python
                // For now, return basic info

                val stats = mapOf(
                    "initialized" to pythonInitialized,
                    "cache_location" to "./cache"
                )

                promise.resolve(stats)

            } catch (e: Exception) {
                Log.e(TAG, "Failed to get cache stats", e)
                promise.reject("CACHE_STATS_ERROR", e.message)
            }
        }.start()
    }

    @ReactMethod
    fun clearPythonCache(promise: Promise) {
        Thread {
            try {
                if (!pythonInitialized) {
                    initializePythonInThread()
                }

                val py = Python.getInstance()
                val module = py.getModule("youtube_api")

                // Call the clear_cache function
                val result = module.callAttr("call_function", "clear_cache", emptyMap<String, Any>())

                Log.i(TAG, "Python cache cleared")
                promise.resolve(result.toString())

            } catch (e: Exception) {
                Log.e(TAG, "Failed to clear Python cache", e)
                promise.reject("CACHE_CLEAR_ERROR", e.message)
            }
        }.start()
    }

    private fun initializePythonInThread() {
        try {
            // Uncomment when Chaquopy is properly configured:
            /*
            if (!Python.isStarted()) {
                Python.start(AndroidPlatform(reactApplicationContext))
            }
            pythonInitialized = true
            */
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Python in thread", e)
            throw e
        }
    }
}
