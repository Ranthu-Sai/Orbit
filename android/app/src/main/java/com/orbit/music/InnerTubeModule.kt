package com.orbit.app

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.LifecycleEventListener
import com.zionhuang.innertube.YouTube
import com.zionhuang.innertube.models.YouTubeLocale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * InnerTubeModule - React Native bridge to OuterTune's InnerTube library
 * 
 * FIXES APPLIED:
 * ✅ FIX #4: Memory Management - Uses supervised scope with lifecycle management
 * ✅ FIX #3: Error Handling - Provides context in error messages
 * ✅ FIX #2: Data Structure - Uses OuterTune's SearchFilter enum correctly
 */
class InnerTubeModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {
    
    // FIX #4: Use supervised scope that can be cancelled
    private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val json = Json { 
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

    init {
        // Initialize YouTube client with locale
        YouTube.locale = YouTubeLocale("en", "US")
        
        // Register lifecycle listener
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "InnerTubeModule"
    }

    // FIX #4: Lifecycle management
    override fun onHostResume() {
        // Module resumed
    }

    override fun onHostPause() {
        // Module paused
    }

    override fun onHostDestroy() {
        // Cancel all ongoing operations when app is destroyed
        moduleScope.cancel()
    }

    @ReactMethod
    fun search(query: String, filter: String?, promise: Promise) {
        moduleScope.launch {
            try {
                // FIX #2: Use OuterTune's SearchFilter constants
                val searchFilter = when (filter) {
                    "songs" -> YouTube.SearchFilter.FILTER_SONG
                    "videos" -> YouTube.SearchFilter.FILTER_VIDEO
                    "albums" -> YouTube.SearchFilter.FILTER_ALBUM
                    "artists" -> YouTube.SearchFilter.FILTER_ARTIST
                    "playlists" -> YouTube.SearchFilter.FILTER_COMMUNITY_PLAYLIST
                    else -> YouTube.SearchFilter.FILTER_SONG
                }
                
                val result = YouTube.search(query, searchFilter).getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                // FIX #3: Better error context
                promise.reject(
                    "SEARCH_ERROR",
                    "Search failed for query '$query' with filter '$filter': ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getSearchSuggestions(query: String, promise: Promise) {
        moduleScope.launch {
            try {
                val result = YouTube.searchSuggestions(query).getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                promise.reject(
                    "SUGGESTION_ERROR", 
                    "Search suggestions failed for query '$query': ${e.message}", 
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getHome(promise: Promise) {
        moduleScope.launch {
            try {
                val result = YouTube.home().getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                promise.reject(
                    "HOME_ERROR",
                    "Home feed fetch failed: ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getArtist(browseId: String, promise: Promise) {
        moduleScope.launch {
            try {
                val result = YouTube.artist(browseId).getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                promise.reject(
                    "ARTIST_ERROR",
                    "Artist fetch failed for browseId '$browseId': ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getAlbum(browseId: String, promise: Promise) {
        moduleScope.launch {
            try {
                val result = YouTube.album(browseId).getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                promise.reject(
                    "ALBUM_ERROR",
                    "Album fetch failed for browseId '$browseId': ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getPlaylist(playlistId: String, promise: Promise) {
        moduleScope.launch {
            try {
                val result = YouTube.playlist(playlistId).getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                promise.reject(
                    "PLAYLIST_ERROR",
                    "Playlist fetch failed for playlistId '$playlistId': ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getNext(videoId: String, playlistId: String?, promise: Promise) {
        moduleScope.launch {
            try {
                val endpoint = com.zionhuang.innertube.models.WatchEndpoint(
                    videoId = videoId,
                    playlistId = playlistId
                )
                val result = YouTube.next(endpoint).getOrThrow()
                val jsonResult = json.encodeToString(result)
                promise.resolve(jsonResult)
            } catch (e: Exception) {
                promise.reject(
                    "NEXT_ERROR",
                    "Recommendations fetch failed for videoId '$videoId': ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getLyrics(browseId: String, params: String?, promise: Promise) {
        moduleScope.launch {
            try {
                val endpoint = com.zionhuang.innertube.models.BrowseEndpoint(
                    browseId = browseId,
                    params = params
                )
                val result = YouTube.lyrics(endpoint).getOrThrow()
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject(
                    "LYRICS_ERROR",
                    "Lyrics fetch failed for browseId '$browseId': ${e.message}",
                    e
                )
            }
        }
    }

    @ReactMethod
    fun getTranscript(videoId: String, promise: Promise) {
        moduleScope.launch {
            try {
                val result = YouTube.transcript(videoId).getOrThrow()
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject(
                    "TRANSCRIPT_ERROR",
                    "Transcript fetch failed for videoId '$videoId': ${e.message}",
                    e
                )
            }
        }
    }
}
