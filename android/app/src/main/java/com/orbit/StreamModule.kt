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

class StreamModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        // Initialize NewPipe
        if (NewPipeDownloaderInstance.downloader == null) {
             val client = OkHttpClient.Builder().build()
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
                    
                    // Find best audio stream (highest nitrate)
                    val bestStream = audioStreams.maxByOrNull { it.bitrate }
                    
                    if (bestStream != null) {
                        // Return URL and metadata
                        val result = com.facebook.react.bridge.Arguments.createMap()
                        result.putString("url", bestStream.content)
                        result.putString("title", streamInfo.name)
                        result.putString("author", streamInfo.uploaderName)
                        result.putDouble("duration", streamInfo.duration.toDouble())
                        result.putString("thumbnail", streamInfo.thumbnails.get(0).url)
                        
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
                                     errorMessage.contains("session")
                    
                    if (needsReinit && retryCount < maxRetries) {
                        // Reinitialize NewPipe and retry
                        try {
                            val client = OkHttpClient.Builder().build()
                            val downloader = NewPipeDownloader(client)
                            NewPipe.init(downloader)
                            NewPipeDownloaderInstance.downloader = downloader
                            retryCount++
                            Thread.sleep(500) // Brief delay before retry
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
