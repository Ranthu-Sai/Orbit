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

    /**
     * Get stream URL for STREAMING - selects highest bitrate (best quality)
     * Backward compatible - keeps original signature
     */
    @ReactMethod
    fun getStreamUrl(videoId: String, cookies: String?, promise: Promise) {
        // Delegate to internal method with preferM4A = false (streaming mode)
        getStreamUrlInternal(videoId, cookies, false, promise)
    }

    /**
     * Get stream URL for DOWNLOAD - prioritizes M4A format for metadata embedding
     */
    @ReactMethod
    fun getStreamUrlForDownload(videoId: String, cookies: String?, promise: Promise) {
        // Delegate to internal method with preferM4A = true (download mode)
        getStreamUrlInternal(videoId, cookies, true, promise)
    }

    /**
     * Internal method that handles both streaming and download cases
     */
    private fun getStreamUrlInternal(videoId: String, cookies: String?, preferM4A: Boolean, promise: Promise) {
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
                    
                    // Stream selection depends on use case:
                    // - For STREAMING (preferM4A = false): Select highest bitrate for best quality
                    // - For DOWNLOAD (preferM4A = true): Prefer M4A for metadata embedding support
                    
                    val bestStream = if (preferM4A) {
                        // DOWNLOAD MODE: Prioritize M4A format for metadata embedding
                        // M4A/AAC works with JAudioTagger, Opus in WebM doesn't
                        val m4aStreams = audioStreams.filter { stream ->
                            val mimeType = stream.format?.mimeType ?: ""
                            val formatId = stream.formatId?.toString() ?: ""
                            mimeType.contains("mp4") || mimeType.contains("m4a") || 
                            formatId == "140" || formatId == "139"
                        }
                        
                        if (m4aStreams.isNotEmpty()) {
                            android.util.Log.d("StreamModule", "📥 [Download] Found ${m4aStreams.size} M4A streams, selecting best for metadata support")
                            m4aStreams.maxByOrNull { it.bitrate }
                        } else {
                            android.util.Log.w("StreamModule", "⚠️ No M4A streams found, falling back to highest bitrate")
                            audioStreams.maxByOrNull { it.bitrate }
                        }
                    } else {
                        // STREAMING MODE: Just pick the highest bitrate for best quality
                        android.util.Log.d("StreamModule", "🎵 [Stream] Selecting highest quality audio stream")
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
