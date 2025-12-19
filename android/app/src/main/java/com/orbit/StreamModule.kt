package com.orbit

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import okhttp3.OkHttpClient
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.services.youtube.YoutubeService
import org.schabi.newpipe.extractor.stream.StreamInfo
import java.util.concurrent.TimeUnit

class StreamModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        // Initialize NewPipe with proper timeout configuration
        if (NewPipeDownloaderInstance.downloader == null) {
             val client = OkHttpClient.Builder()
                 .connectTimeout(30, TimeUnit.SECONDS)
                 .readTimeout(30, TimeUnit.SECONDS)
                 .writeTimeout(30, TimeUnit.SECONDS)
                 .build()
             val downloader = NewPipeDownloader(client)
             NewPipe.init(downloader)
             NewPipeDownloaderInstance.downloader = downloader
        }
    }

    override fun getName(): String {
        return "StreamModule"
    }

    @ReactMethod
    fun getStreamUrl(videoId: String, cookies: String?, promise: Promise) {
        // Run on background thread to prevent UI freeze
        Thread {
            var retryCount = 0
            val maxRetries = 2
            var lastError: Exception? = null
            
            while (retryCount <= maxRetries) {
                try {
                    // Set cookies if provided
                    if (cookies != null && cookies.isNotEmpty()) {
                        NewPipeDownloaderInstance.downloader?.setCookies(cookies)
                    }

                    val service = ServiceList.YouTube
                    val url = "https://www.youtube.com/watch?v=$videoId"
                    
                    // Get stream info (Synchronous Network Call)
                    val streamInfo = StreamInfo.getInfo(service, url)
                    
                    // Get audio streams
                    val audioStreams = streamInfo.audioStreams
                    
                    // PRIORITIZE M4A format (140) over Opus (251) for metadata embedding support
                    // M4A/AAC works perfectly with JAudioTagger, while Opus in WebM container doesn't
                    // YouTube format IDs: 140 = M4A 128kbps, 139 = M4A 48kbps, 251 = Opus 160kbps, 250 = Opus 70kbps
                    
                    // Step 1: Try to find M4A streams (format ID 140 or 139)
                    val m4aStreams = audioStreams.filter { stream ->
                        val mimeType = stream.format?.mimeType ?: ""
                        val formatId = stream.formatId?.toString() ?: ""
                        mimeType.contains("mp4") || mimeType.contains("m4a") || 
                        formatId == "140" || formatId == "139"
                    }
                    
                    // Step 2: Select best M4A stream, or fall back to any highest bitrate
                    val bestStream = if (m4aStreams.isNotEmpty()) {
                        android.util.Log.d("StreamModule", "🎵 Found ${m4aStreams.size} M4A streams, selecting best quality")
                        m4aStreams.maxByOrNull { it.bitrate }
                    } else {
                        android.util.Log.w("StreamModule", "⚠️ No M4A streams found, falling back to highest bitrate (may be Opus)")
                        audioStreams.maxByOrNull { it.bitrate }
                    }
                    
                    if (bestStream != null) {
                        // Return URL and metadata including format info
                        val result = com.facebook.react.bridge.Arguments.createMap()
                        result.putString("url", bestStream.content)
                        result.putString("title", streamInfo.name)
                        result.putString("author", streamInfo.uploaderName)
                        result.putDouble("duration", streamInfo.duration.toDouble())
                        result.putString("thumbnail", streamInfo.thumbnails.get(0).url)
                        
                        // Get format info - NewPipe uses formatId (e.g., "251", "140")
                        // 251 = Opus, 140 = M4A, etc.
                        val formatId = bestStream.formatId?.toString() ?: ""
                        val formatSuffix = when {
                            formatId.contains("251") || formatId.contains("250") -> "opus" // Opus WebM
                            formatId.contains("140") || formatId.contains("139") -> "m4a"  // M4A AAC
                            else -> "m4a" // Default to M4A
                        }
                        
                        result.putString("mimeType", bestStream.format?.mimeType ?: "audio/mp4")
                        result.putString("format", formatSuffix)
                        result.putString("formatId", formatId)
                        result.putInt("bitrate", bestStream.bitrate)
                        
                        promise.resolve(result)
                        return@Thread
                    } else {
                        promise.reject("NO_STREAM", "No audio stream found for $videoId")
                        return@Thread
                    }
                } catch (e: Exception) {
                    lastError = e
                    
                    // Check if this is a "page needs to be reloaded" error or similar session issue
                    val errorMessage = e.message?.lowercase() ?: ""
                    val needsReinit = errorMessage.contains("reload") ||
                                     errorMessage.contains("refresh") ||
                                     errorMessage.contains("expired") ||
                                     errorMessage.contains("session") ||
                                     errorMessage.contains("timeout") // Also retry on timeout
                    
                    if (needsReinit && retryCount < maxRetries) {
                        // Reinitialize NewPipe and retry with proper timeout
                        try {
                            val client = OkHttpClient.Builder()
                                .connectTimeout(30, TimeUnit.SECONDS)
                                .readTimeout(30, TimeUnit.SECONDS)
                                .writeTimeout(30, TimeUnit.SECONDS)
                                .build()
                            val downloader = NewPipeDownloader(client)
                            NewPipe.init(downloader)
                            NewPipeDownloaderInstance.downloader = downloader
                            retryCount++
                            Thread.sleep(1000) // 1 second delay before retry
                            continue
                        } catch (initError: Exception) {
                            // If reinit fails, fall through to error
                        }
                    }
                    
                    // Not a reloadable error or max retries reached
                    break
                }
            }
            
            promise.reject("STREAM_ERROR", lastError?.message ?: "Unknown error", lastError)
        }.start()
    }
}

object NewPipeDownloaderInstance {
    var downloader: NewPipeDownloader? = null
}
