package com.orbit.app

import android.graphics.BitmapFactory
import android.util.Base64
import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.*
import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.tag.FieldKey
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.logging.Level
import java.util.logging.Logger

/**
 * MetadataReaderModule - Reads embedded metadata from audio files
 * 
 * Supports: MP3 (ID3), M4A/AAC (MP4 atoms), FLAC, OGG
 * Uses JAudioTagger library for cross-format compatibility
 */
class MetadataReaderModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "MetadataReader"
        private var isInitialized = false

        // Library scans run here instead of the shared native-modules thread,
        // so long scans never delay other modules (e.g. TrackPlayer play/skip).
        private val scanExecutor = Executors.newSingleThreadExecutor()

        // Separate from scans so opening a file from another app never waits
        // behind a library scan
        private val intentExecutor = Executors.newSingleThreadExecutor()

        private const val INTENT_DIR = "audio_intent"

        // Upper bound for files copied from other apps' content providers
        private const val MAX_INTENT_FILE_BYTES = 1024L * 1024L * 1024L

        init {
            // Suppress JAudioTagger verbose logging
            Logger.getLogger("org.jaudiotagger").level = Level.OFF
        }
    }

    override fun getName(): String = "MetadataReaderModule"

    /**
     * Initialize the module (enable Android mode for JAudioTagger)
     */
    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            if (!isInitialized) {
                // Enable Android mode for JAudioTagger
                org.jaudiotagger.tag.TagOptionSingleton.getInstance().isAndroid = true
                isInitialized = true
                android.util.Log.d(TAG, "✅ MetadataReaderModule initialized with Android mode")
            }
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Initialization failed", e)
            promise.reject("INIT_ERROR", "Failed to initialize: ${e.message}", e)
        }
    }

    /**
     * Read metadata from an audio file
     * Returns: { title, artist, album, year, genre, artwork }
     */
    @ReactMethod
    fun readMetadata(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                return
            }

            // Read audio file using JAudioTagger
            val audioFile = try {
                AudioFileIO.read(file)
            } catch (e: Exception) {
                android.util.Log.w(TAG, "Cannot read file $filePath: ${e.message}")
                promise.reject("READ_ERROR", "Cannot read audio file: ${e.message}", e)
                return
            }

            val tag = audioFile.tag
            if (tag == null) {
                // No tags found, return basic info
                promise.resolve(createEmptyMetadata(file.name))
                return
            }

            // Extract metadata fields - use getAll() to capture all values (e.g., multiple artists)
            val metadata = Arguments.createMap()
            metadata.putString("title", tag.getAll(FieldKey.TITLE).joinToString(", ").ifEmpty { file.nameWithoutExtension })
            metadata.putString("artist", tag.getAll(FieldKey.ARTIST).joinToString(", ").ifEmpty { "Unknown Artist" })
            metadata.putString("album", tag.getAll(FieldKey.ALBUM).joinToString(", ").ifEmpty { "Unknown Album" })
            metadata.putString("year", tag.getAll(FieldKey.YEAR).joinToString(", ").ifEmpty { "" })
            metadata.putString("genre", tag.getAll(FieldKey.GENRE).joinToString(", ").ifEmpty { "" })
            metadata.putString("fileName", file.name)
            metadata.putString("filePath", filePath)

            // Extract artwork if available
            try {
                val artwork = tag.firstArtwork
                if (artwork != null) {
                    val imageData = artwork.binaryData
                    if (imageData != null && imageData.isNotEmpty()) {
                        // Convert to base64 for JavaScript
                        val base64Image = Base64.encodeToString(imageData, Base64.NO_WRAP)
                        metadata.putString("artworkBase64", base64Image)
                        
                        // Determine MIME type
                        val mimeType = when {
                            imageData.size >= 2 && imageData[0].toInt() == 0xFF && imageData[1].toInt() == 0xD8 -> "image/jpeg"
                            imageData.size >= 4 && imageData[0].toInt() == 0x89 && imageData[1].toInt() == 0x50 -> "image/png"
                            else -> artwork.mimeType ?: "image/jpeg"
                        }
                        metadata.putString("artworkMimeType", mimeType)
                        
                        android.util.Log.d(TAG, "✅ Extracted artwork (${imageData.size} bytes, $mimeType)")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w(TAG, "Failed to extract artwork: ${e.message}")
                // Continue without artwork
            }

            promise.resolve(metadata)

        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Error reading metadata from $filePath", e)
            promise.reject("METADATA_ERROR", "Failed to read metadata: ${e.message}", e)
        }
    }

    /**
     * Read metadata from multiple files (batch operation)
     */
    @ReactMethod
    fun readMetadataBatch(filePaths: ReadableArray, promise: Promise) {
        try {
            val results = Arguments.createArray()
            
            for (i in 0 until filePaths.size()) {
                val filePath = filePaths.getString(i) ?: continue
                
                // Every input gets exactly one result so callers can match by index
                try {
                    val file = File(filePath)
                    if (!file.exists()) {
                        results.pushMap(createEmptyMetadata(file.name).apply {
                            putString("filePath", filePath)
                        })
                        continue
                    }

                    val audioFile = AudioFileIO.read(file)
                    val tag = audioFile.tag

                    val metadata = if (tag != null) {
                        Arguments.createMap().apply {
                            putString("title", tag.getAll(FieldKey.TITLE).joinToString(", ").ifEmpty { file.nameWithoutExtension })
                            putString("artist", tag.getAll(FieldKey.ARTIST).joinToString(", ").ifEmpty { "Unknown Artist" })
                            putString("album", tag.getAll(FieldKey.ALBUM).joinToString(", ").ifEmpty { "Unknown Album" })
                            putString("year", tag.getAll(FieldKey.YEAR).joinToString(", ").ifEmpty { "" })
                            putString("genre", tag.getAll(FieldKey.GENRE).joinToString(", ").ifEmpty { "" })
                            putString("fileName", file.name)
                            putString("filePath", filePath)

                            // Extract artwork
                            try {
                                val artwork = tag.firstArtwork
                                if (artwork != null) {
                                    val imageData = artwork.binaryData
                                    if (imageData != null && imageData.isNotEmpty()) {
                                        val base64Image = Base64.encodeToString(imageData, Base64.NO_WRAP)
                                        putString("artworkBase64", base64Image)
                                        
                                        val mimeType = when {
                                            imageData.size >= 2 && imageData[0].toInt() == 0xFF && imageData[1].toInt() == 0xD8 -> "image/jpeg"
                                            imageData.size >= 4 && imageData[0].toInt() == 0x89 && imageData[1].toInt() == 0x50 -> "image/png"
                                            else -> artwork.mimeType ?: "image/jpeg"
                                        }
                                        putString("artworkMimeType", mimeType)
                                    }
                                }
                            } catch (e: Exception) {
                                // Continue without artwork
                            }
                        }
                    } else {
                        createEmptyMetadata(file.name)
                    }

                    results.pushMap(metadata)

                } catch (e: Exception) {
                    android.util.Log.w(TAG, "Failed to read $filePath: ${e.message}")
                    // Placeholder keeps result indexes aligned with filePaths
                    results.pushMap(createEmptyMetadata(File(filePath).name).apply {
                        putString("filePath", filePath)
                    })
                }
            }

            promise.resolve(results)

        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Batch read error", e)
            promise.reject("BATCH_ERROR", "Failed to read batch: ${e.message}", e)
        }
    }

    /**
     * Read tags + duration and write embedded artwork straight to [artworkOutPath].
     * Avoids sending base64 images over the bridge. Runs on [scanExecutor].
     * Resolves { title, artist, album, year, genre, duration, artworkPath? };
     * empty strings mean the tag is missing. Rejects if the file can't be parsed.
     */
    @ReactMethod
    fun readMetadataToFile(filePath: String, artworkOutPath: String?, promise: Promise) {
        scanExecutor.execute {
            try {
                val file = File(filePath)
                if (!file.exists()) {
                    promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
                    return@execute
                }

                val audioFile = AudioFileIO.read(file)
                val tag = audioFile.tag
                val result = Arguments.createMap()

                fun joined(key: FieldKey): String = try {
                    tag?.getAll(key)?.filter { it.isNotBlank() }?.joinToString(", ") ?: ""
                } catch (e: Exception) {
                    ""
                }

                result.putString("title", joined(FieldKey.TITLE))
                result.putString("artist", joined(FieldKey.ARTIST))
                result.putString("album", joined(FieldKey.ALBUM))
                result.putString("year", joined(FieldKey.YEAR))
                result.putString("genre", joined(FieldKey.GENRE))

                val durationSec = try {
                    audioFile.audioHeader?.trackLength ?: 0
                } catch (e: Exception) {
                    0
                }
                result.putInt("duration", durationSec)

                if (tag != null && !artworkOutPath.isNullOrEmpty()) {
                    try {
                        val imageData = tag.firstArtwork?.binaryData
                        if (imageData != null && imageData.isNotEmpty()) {
                            val out = File(artworkOutPath)
                            out.parentFile?.mkdirs()
                            FileOutputStream(out).use { it.write(imageData) }
                            result.putString("artworkPath", out.absolutePath)
                        }
                    } catch (e: Exception) {
                        android.util.Log.w(TAG, "Failed to write artwork for $filePath: ${e.message}")
                    }
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("METADATA_ERROR", "Failed to read metadata: ${e.message}", e)
            }
        }
    }

    private fun createEmptyMetadata(fileName: String): WritableMap {
        return Arguments.createMap().apply {
            putString("title", fileName.substringBeforeLast('.'))
            putString("artist", "Unknown Artist")
            putString("album", "Unknown Album")
            putString("year", "")
            putString("genre", "")
            putString("fileName", fileName)
        }
    }

    /**
     * Copy a content:// URI into the app cache so JAudioTagger / the player can
     * read it as a File.
     *
     * The URI comes from an exported VIEW intent, so the provider (and its
     * DISPLAY_NAME) is untrusted: the name is reduced to a safe base name,
     * prefixed with a unique stamp, and the resolved path must stay inside
     * the audio_intent folder. Copies are size-capped and old ones pruned.
     */
    private fun copyContentUriToCache(contentUri: String): Pair<File, String> {
        val context = reactApplicationContext
        val uri = Uri.parse(contentUri)
        if (uri.scheme != "content") {
            throw SecurityException("Only content:// URIs are supported")
        }

        var displayName: String? = null
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0) {
                    displayName = cursor.getString(nameIndex)
                }
            }
        }
        val safeName = sanitizeFileName(displayName)

        val cacheDir = File(context.cacheDir, INTENT_DIR)
        if (!cacheDir.exists()) cacheDir.mkdirs()
        pruneIntentCache(cacheDir)

        val tempFile = File(cacheDir, "${System.currentTimeMillis()}_$safeName")
        // Defence in depth: the canonical path must stay inside cacheDir
        val dirPath = cacheDir.canonicalPath + File.separator
        if (!tempFile.canonicalPath.startsWith(dirPath)) {
            throw SecurityException("Refusing to write outside the cache folder")
        }

        val input = context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open content URI")
        try {
            input.use { inputStream ->
                FileOutputStream(tempFile).use { outputStream ->
                    val buffer = ByteArray(64 * 1024)
                    var total = 0L
                    while (true) {
                        val read = inputStream.read(buffer)
                        if (read < 0) break
                        total += read
                        if (total > MAX_INTENT_FILE_BYTES) {
                            throw IllegalStateException("File is too large")
                        }
                        outputStream.write(buffer, 0, read)
                    }
                }
            }
        } catch (e: Exception) {
            tempFile.delete()
            throw e
        }
        return Pair(tempFile, safeName)
    }

    /** Base name only: no separators, control chars or leading dots; bounded length. */
    private fun sanitizeFileName(raw: String?): String {
        val base = (raw ?: "").substringAfterLast('/').substringAfterLast('\\')
        val cleaned = base
            .replace(Regex("[^\\p{L}\\p{N}._ ()\\-]"), "_")
            .trimStart('.', ' ')
            .take(100)
        return if (cleaned.isBlank()) "audio" else cleaned
    }

    /** Remove temp copies older than a day so the cache doesn't grow forever. */
    private fun pruneIntentCache(dir: File) {
        val cutoff = System.currentTimeMillis() - 24 * 60 * 60 * 1000L
        dir.listFiles()?.forEach { f ->
            if (f.isFile && f.lastModified() < cutoff) f.delete()
        }
    }

    /**
     * Resolve a content:// URI to a real file path by copying to cache
     * This is required because JAudioTagger needs a File, not a content URI
     */
    @ReactMethod
    fun resolveContentUri(contentUri: String, promise: Promise) {
        // Copying can take seconds: keep it off the shared native-modules thread
        intentExecutor.execute {
            try {
                val (tempFile, safeName) = copyContentUriToCache(contentUri)
                val result = Arguments.createMap()
                result.putString("filePath", tempFile.absolutePath)
                result.putString("fileName", safeName)
                result.putBoolean("isTempFile", true)
                promise.resolve(result)
            } catch (e: Exception) {
                android.util.Log.e(TAG, "❌ Failed to resolve content URI", e)
                promise.reject("RESOLVE_ERROR", "Failed to resolve content URI: ${e.message}", e)
            }
        }
    }

    /**
     * Read metadata directly from a content URI
     * Combines resolveContentUri + readMetadata for convenience
     */
    @ReactMethod
    fun readMetadataFromUri(contentUri: String, promise: Promise) {
        intentExecutor.execute {
            try {
                val (tempFile, safeName) = copyContentUriToCache(contentUri)

                val audioFile = try {
                    AudioFileIO.read(tempFile)
                } catch (e: Exception) {
                    android.util.Log.w(TAG, "Cannot read file: ${e.message}")
                    val fallback = createEmptyMetadata(safeName)
                    fallback.putString("filePath", tempFile.absolutePath)
                    fallback.putBoolean("isTempFile", true)
                    promise.resolve(fallback)
                    return@execute
                }

                val tag = audioFile.tag
                val metadata = Arguments.createMap()

                if (tag != null) {
                    metadata.putString("title", tag.getAll(FieldKey.TITLE).joinToString(", ").ifEmpty { safeName.substringBeforeLast('.') })
                    metadata.putString("artist", tag.getAll(FieldKey.ARTIST).joinToString(", ").ifEmpty { "Unknown Artist" })
                    metadata.putString("album", tag.getAll(FieldKey.ALBUM).joinToString(", ").ifEmpty { "Unknown Album" })
                    metadata.putString("year", tag.getAll(FieldKey.YEAR).joinToString(", ").ifEmpty { "" })
                    metadata.putString("genre", tag.getAll(FieldKey.GENRE).joinToString(", ").ifEmpty { "" })

                    try {
                        val artwork = tag.firstArtwork
                        val imageData = artwork?.binaryData
                        if (imageData != null && imageData.isNotEmpty()) {
                            metadata.putString("artworkBase64", Base64.encodeToString(imageData, Base64.NO_WRAP))
                            val mimeType = when {
                                imageData.size >= 2 && imageData[0].toInt() == 0xFF && imageData[1].toInt() == 0xD8 -> "image/jpeg"
                                imageData.size >= 4 && imageData[0].toInt() == 0x89 && imageData[1].toInt() == 0x50 -> "image/png"
                                else -> artwork.mimeType ?: "image/jpeg"
                            }
                            metadata.putString("artworkMimeType", mimeType)
                        }
                    } catch (e: Exception) {
                        android.util.Log.w(TAG, "Failed to extract artwork: ${e.message}")
                    }
                } else {
                    metadata.putString("title", safeName.substringBeforeLast('.'))
                    metadata.putString("artist", "Unknown Artist")
                    metadata.putString("album", "Unknown Album")
                    metadata.putString("year", "")
                    metadata.putString("genre", "")
                }

                metadata.putString("fileName", safeName)
                metadata.putString("filePath", tempFile.absolutePath)
                metadata.putBoolean("isTempFile", true)
                promise.resolve(metadata)
            } catch (e: Exception) {
                android.util.Log.e(TAG, "❌ Error reading metadata from URI", e)
                promise.reject("METADATA_URI_ERROR", "Failed to read metadata from URI: ${e.message}", e)
            }
        }
    }
}
