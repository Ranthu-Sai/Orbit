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
                
                try {
                    val file = File(filePath)
                    if (!file.exists()) continue

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
                    // Skip this file
                    continue
                }
            }

            promise.resolve(results)

        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Batch read error", e)
            promise.reject("BATCH_ERROR", "Failed to read batch: ${e.message}", e)
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
     * Resolve a content:// URI to a real file path by copying to cache
     * This is required because JAudioTagger needs a File, not a content URI
     */
    @ReactMethod
    fun resolveContentUri(contentUri: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val uri = Uri.parse(contentUri)
            
            android.util.Log.d(TAG, "🔍 Resolving content URI: $contentUri")
            
            // Get filename from content provider
            var fileName = "audio_${System.currentTimeMillis()}"
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex) ?: fileName
                    }
                }
            }
            
            android.util.Log.d(TAG, "📄 File name from URI: $fileName")
            
            // Create temp file in cache directory
            val cacheDir = File(context.cacheDir, "audio_intent")
            if (!cacheDir.exists()) cacheDir.mkdirs()
            
            val tempFile = File(cacheDir, fileName)
            
            // Copy content to temp file
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                FileOutputStream(tempFile).use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
            
            android.util.Log.d(TAG, "✅ Content URI resolved to: ${tempFile.absolutePath}")
            
            val result = Arguments.createMap()
            result.putString("filePath", tempFile.absolutePath)
            result.putString("fileName", fileName)
            result.putBoolean("isTempFile", true)
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Failed to resolve content URI", e)
            promise.reject("RESOLVE_ERROR", "Failed to resolve content URI: ${e.message}", e)
        }
    }

    /**
     * Read metadata directly from a content URI
     * Combines resolveContentUri + readMetadata for convenience
     */
    @ReactMethod
    fun readMetadataFromUri(contentUri: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val uri = Uri.parse(contentUri)
            
            android.util.Log.d(TAG, "🎵 Reading metadata from URI: $contentUri")
            
            // Get filename from content provider
            var fileName = "audio_${System.currentTimeMillis()}"
            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex) ?: fileName
                    }
                }
            }
            
            // Create temp file in cache directory
            val cacheDir = File(context.cacheDir, "audio_intent")
            if (!cacheDir.exists()) cacheDir.mkdirs()
            
            val tempFile = File(cacheDir, fileName)
            
            // Copy content to temp file
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                FileOutputStream(tempFile).use { outputStream ->
                    inputStream.copyTo(outputStream)
                }
            }
            
            android.util.Log.d(TAG, "📄 Temp file created: ${tempFile.absolutePath}")
            
            // Read metadata from temp file
            val audioFile = try {
                AudioFileIO.read(tempFile)
            } catch (e: Exception) {
                android.util.Log.w(TAG, "Cannot read file: ${e.message}")
                val fallback = createEmptyMetadata(fileName)
                fallback.putString("filePath", tempFile.absolutePath)
                fallback.putBoolean("isTempFile", true)
                promise.resolve(fallback)
                return
            }

            val tag = audioFile.tag
            val metadata = Arguments.createMap()
            
            if (tag != null) {
                metadata.putString("title", tag.getAll(FieldKey.TITLE).joinToString(", ").ifEmpty { fileName.substringBeforeLast('.') })
                metadata.putString("artist", tag.getAll(FieldKey.ARTIST).joinToString(", ").ifEmpty { "Unknown Artist" })
                metadata.putString("album", tag.getAll(FieldKey.ALBUM).joinToString(", ").ifEmpty { "Unknown Album" })
                metadata.putString("year", tag.getAll(FieldKey.YEAR).joinToString(", ").ifEmpty { "" })
                metadata.putString("genre", tag.getAll(FieldKey.GENRE).joinToString(", ").ifEmpty { "" })
                
                // Extract artwork if available
                try {
                    val artwork = tag.firstArtwork
                    if (artwork != null) {
                        val imageData = artwork.binaryData
                        if (imageData != null && imageData.isNotEmpty()) {
                            val base64Image = Base64.encodeToString(imageData, Base64.NO_WRAP)
                            metadata.putString("artworkBase64", base64Image)
                            
                            val mimeType = when {
                                imageData.size >= 2 && imageData[0].toInt() == 0xFF && imageData[1].toInt() == 0xD8 -> "image/jpeg"
                                imageData.size >= 4 && imageData[0].toInt() == 0x89 && imageData[1].toInt() == 0x50 -> "image/png"
                                else -> artwork.mimeType ?: "image/jpeg"
                            }
                            metadata.putString("artworkMimeType", mimeType)
                            
                            android.util.Log.d(TAG, "✅ Extracted artwork (${imageData.size} bytes)")
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.w(TAG, "Failed to extract artwork: ${e.message}")
                }
            } else {
                metadata.putString("title", fileName.substringBeforeLast('.'))
                metadata.putString("artist", "Unknown Artist")
                metadata.putString("album", "Unknown Album")
                metadata.putString("year", "")
                metadata.putString("genre", "")
            }
            
            metadata.putString("fileName", fileName)
            metadata.putString("filePath", tempFile.absolutePath)
            metadata.putBoolean("isTempFile", true)
            
            android.util.Log.d(TAG, "✅ Metadata read successfully: ${metadata.getString("title")}")
            
            promise.resolve(metadata)

        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Error reading metadata from URI", e)
            promise.reject("METADATA_URI_ERROR", "Failed to read metadata from URI: ${e.message}", e)
        }
    }
}
