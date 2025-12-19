package com.orbit

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.jaudiotagger.audio.AudioFileIO
import org.jaudiotagger.audio.flac.FlacTagCreator
import org.jaudiotagger.tag.FieldKey
import org.jaudiotagger.tag.Tag
import org.jaudiotagger.tag.TagOptionSingleton
import org.jaudiotagger.tag.flac.FlacTag
import org.jaudiotagger.tag.images.AndroidArtwork
import org.jaudiotagger.tag.images.Artwork
import org.jaudiotagger.tag.vorbiscomment.VorbisCommentTag
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.logging.Level
import java.util.logging.Logger

/**
 * MetadataWriterModule - Native module for embedding metadata and artwork into audio files
 * 
 * Supports: MP3 (ID3v2), M4A/AAC (MP4 atoms), FLAC (VorbisComment + PICTURE blocks), OGG, WAV
 * Uses JAudioTagger library for cross-format compatibility
 * 
 * IMPORTANT: FLAC files require special handling - artwork must be added as
 * MetadataBlockDataPicture, not just via tag.setField() which external players may not read.
 */
class MetadataWriterModule(reactContext: ReactApplicationContext) 
    : ReactContextBaseJavaModule(reactContext) {

    init {
        // Suppress JAudioTagger verbose logging
        Logger.getLogger("org.jaudiotagger").level = Level.OFF
        
        // CRITICAL: Enable Android mode for JAudioTagger
        // This uses Android-compatible image handling instead of javax.imageio
        TagOptionSingleton.getInstance().isAndroid = true
        android.util.Log.d("MetadataWriter", "✅ JAudioTagger Android mode enabled")
    }

    override fun getName(): String = "MetadataWriter"

    /**
     * Embeds metadata and optional artwork into an audio file
     */
    @ReactMethod
    fun embedMetadata(
        filePath: String,
        title: String?,
        artist: String?,
        album: String?,
        year: String?,
        artworkPath: String?,
        promise: Promise
    ) {
        Thread {
            try {
                val audioFile = File(filePath)
                
                if (!audioFile.exists()) {
                    promise.reject("FILE_NOT_FOUND", "Audio file not found: $filePath")
                    return@Thread
                }

                android.util.Log.d("MetadataWriter", "📁 Processing file: ${audioFile.name}")
                
                // Pre-check for unsupported formats before trying to read
                // WebM-contained Opus and raw Opus files may not be fully supported by JAudioTagger
                val lowerPath = filePath.lowercase()
                val isWebM = lowerPath.endsWith(".webm")
                val isOpusExtension = lowerPath.endsWith(".opus")
                
                // Check file magic bytes for WebM container (EBML header: 0x1A 0x45 0xDF 0xA3)
                var isWebMContent = false
                try {
                    val fis = java.io.FileInputStream(audioFile)
                    val magic = ByteArray(4)
                    if (fis.read(magic) == 4) {
                        // WebM/Matroska magic: 0x1A 0x45 0xDF 0xA3
                        isWebMContent = magic[0] == 0x1A.toByte() && 
                                       magic[1] == 0x45.toByte() && 
                                       magic[2] == 0xDF.toByte() && 
                                       magic[3] == 0xA3.toByte()
                    }
                    fis.close()
                } catch (e: Exception) {
                    android.util.Log.w("MetadataWriter", "Could not check file magic: ${e.message}")
                }
                
                if (isWebM || isWebMContent) {
                    android.util.Log.w("MetadataWriter", "⚠️ WebM container detected - skipping metadata embedding (not supported)")
                    android.util.Log.d("MetadataWriter", "WebM files use Matroska container which JAudioTagger doesn't support for writing")
                    // Return success=true so the download completes without error
                    promise.resolve(true)
                    return@Thread
                }
                
                // For Opus files, attempt to read - if JAudioTagger fails, skip gracefully
                // JAudioTagger supports Opus in OGG container but not always in WebM
                
                val audio = try {
                    AudioFileIO.read(audioFile)
                } catch (e: org.jaudiotagger.audio.exceptions.CannotReadException) {
                    android.util.Log.w("MetadataWriter", "⚠️ Cannot read audio file (unsupported format): ${e.message}")
                    promise.resolve(true) // Success - file exists, just can't embed metadata
                    return@Thread
                } catch (e: org.jaudiotagger.audio.exceptions.InvalidAudioFrameException) {
                    android.util.Log.w("MetadataWriter", "⚠️ Invalid audio frame: ${e.message}")
                    promise.resolve(true)
                    return@Thread
                }
                
                val tag = audio.tagOrCreateAndSetDefault
                val isFlac = lowerPath.endsWith(".flac")
                
                android.util.Log.d("MetadataWriter", "📁 File type: ${if (isFlac) "FLAC" else audio.audioHeader.format}, Tag type: ${tag::class.java.simpleName}")

                // Set text metadata fields
                title?.takeIf { it.isNotBlank() }?.let { 
                    tag.setField(FieldKey.TITLE, it) 
                }
                artist?.takeIf { it.isNotBlank() }?.let { 
                    tag.setField(FieldKey.ARTIST, it) 
                }
                album?.takeIf { it.isNotBlank() }?.let { 
                    tag.setField(FieldKey.ALBUM, it) 
                }
                year?.takeIf { it.isNotBlank() }?.let { 
                    tag.setField(FieldKey.YEAR, it) 
                }

                // Embed artwork if provided
                artworkPath?.let { path ->
                    android.util.Log.d("MetadataWriter", "🎨 Artwork path received: $path")
                    val artworkFile = File(path)
                    android.util.Log.d("MetadataWriter", "🎨 Artwork file exists: ${artworkFile.exists()}, size: ${artworkFile.length()} bytes")
                    
                    if (artworkFile.exists() && artworkFile.length() > 0) {
                        try {
                            val artworkSuccess = if (isFlac && tag is FlacTag) {
                                embedArtworkFlac(tag, artworkFile)
                            } else {
                                embedArtworkGeneric(tag, artworkFile)
                            }
                            
                            if (artworkSuccess) {
                                android.util.Log.d("MetadataWriter", "✅ Artwork successfully embedded")
                            } else {
                                android.util.Log.w("MetadataWriter", "⚠️ Artwork embedding returned false")
                            }
                        } catch (artworkError: Exception) {
                            android.util.Log.w("MetadataWriter", "❌ Failed to embed artwork: ${artworkError.message}")
                            artworkError.printStackTrace()
                        }
                    } else {
                        android.util.Log.w("MetadataWriter", "⚠️ Artwork file not found or empty: $path")
                    }
                } ?: run {
                    android.util.Log.d("MetadataWriter", "ℹ️ No artwork path provided to embed")
                }

                // Commit changes to the file
                audio.commit()
                android.util.Log.d("MetadataWriter", "✅ File committed successfully")
                
                promise.resolve(true)
            } catch (e: Exception) {
                val errorMessage = e.message?.lowercase() ?: ""
                // If the error is about unsupported format, don't fail the download
                // Common format errors should return success (file is still playable)
                if (errorMessage.contains("mp4") || 
                    errorMessage.contains("webm") ||
                    errorMessage.contains("cannot read") ||
                    errorMessage.contains("not supported") ||
                    errorMessage.contains("invalid audio") ||
                    errorMessage.contains("format")) {
                    android.util.Log.w("MetadataWriter", "⚠️ Format not supported for metadata embedding: ${e.message}")
                    promise.resolve(true) // Download is still successful, just no metadata
                } else {
                    android.util.Log.e("MetadataWriter", "Failed to embed metadata: ${e.message}", e)
                    promise.reject("METADATA_ERROR", "Failed to embed metadata: ${e.message}", e)
                }
            }
        }.start()
    }

    /**
     * Embeds artwork into FLAC files using MetadataBlockDataPicture directly.
     * 
     * NOTE: We cannot use flacTag.setField(AndroidArtwork) because that calls
     * AndroidArtwork.setImageFromData() which throws UnsupportedOperationException.
     * Instead, we create MetadataBlockDataPicture directly and add it to the tag.
     */
    private fun embedArtworkFlac(flacTag: FlacTag, artworkFile: File): Boolean {
        return try {
            android.util.Log.d("MetadataWriter", "🎨 Using FLAC-specific artwork embedding (MetadataBlockDataPicture)")
            
            // Read and convert image to JPEG for better compatibility
            val bitmap = BitmapFactory.decodeFile(artworkFile.absolutePath)
            if (bitmap == null) {
                android.util.Log.e("MetadataWriter", "❌ Failed to decode artwork image")
                return false
            }
            
            // Compress to JPEG for maximum player compatibility
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
            val imageBytes = outputStream.toByteArray()
            val width = bitmap.width
            val height = bitmap.height
            bitmap.recycle()
            
            android.util.Log.d("MetadataWriter", "🎨 Image prepared: ${imageBytes.size} bytes, ${width}x${height}")
            
            // Create MetadataBlockDataPicture directly (bypasses broken setImageFromData)
            val picture = org.jaudiotagger.audio.flac.metadatablock.MetadataBlockDataPicture(
                imageBytes,
                3, // pictureType: 3 = Cover (front)
                "image/jpeg",
                "Cover",
                width,
                height,
                24, // color depth (bits per pixel, usually 24 for JPEG)
                0   // indexed colors (0 for JPEG/PNG)
            )
            
            // Remove any existing images
            val images = flacTag.images
            images.clear()
            
            // Add the new picture
            images.add(picture)
            
            android.util.Log.d("MetadataWriter", "✅ FLAC artwork added via MetadataBlockDataPicture")
            true
        } catch (e: Exception) {
            android.util.Log.e("MetadataWriter", "❌ FLAC artwork embedding failed: ${e.message}", e)
            false
        }
    }

    /**
     * Embeds artwork into non-FLAC files (MP3, M4A, etc.) using generic tag approach
     */
    private fun embedArtworkGeneric(tag: Tag, artworkFile: File): Boolean {
        return try {
            android.util.Log.d("MetadataWriter", "🎨 Using generic artwork embedding")
            
            // Read image bytes
            val imageBytes = artworkFile.readBytes()
            
            // Determine MIME type from file extension
            val mimeType = when {
                artworkFile.name.lowercase().endsWith(".png") -> "image/png"
                artworkFile.name.lowercase().endsWith(".gif") -> "image/gif"
                artworkFile.name.lowercase().endsWith(".webp") -> "image/webp"
                else -> "image/jpeg"
            }
            
            android.util.Log.d("MetadataWriter", "🎨 Image size: ${imageBytes.size} bytes, MIME: $mimeType")
            
            // Create artwork
            val artwork = AndroidArtwork()
            artwork.binaryData = imageBytes
            artwork.mimeType = mimeType
            artwork.pictureType = 3 // Cover (front)
            artwork.description = "Cover"
            
            // Delete existing artwork and set new one
            tag.deleteArtworkField()
            tag.setField(artwork)
            
            android.util.Log.d("MetadataWriter", "✅ Generic artwork added successfully")
            true
        } catch (e: Exception) {
            android.util.Log.e("MetadataWriter", "❌ Generic artwork embedding failed: ${e.message}", e)
            
            // Fallback with BitmapFactory re-encoding
            try {
                android.util.Log.d("MetadataWriter", "🔄 Trying fallback with BitmapFactory...")
                val bitmap = BitmapFactory.decodeFile(artworkFile.absolutePath)
                if (bitmap != null) {
                    val outputStream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
                    val jpegBytes = outputStream.toByteArray()
                    bitmap.recycle()
                    
                    val artwork = AndroidArtwork()
                    artwork.binaryData = jpegBytes
                    artwork.mimeType = "image/jpeg"
                    artwork.pictureType = 3
                    artwork.description = "Cover"
                    
                    tag.deleteArtworkField()
                    tag.setField(artwork)
                    
                    android.util.Log.d("MetadataWriter", "✅ Fallback artwork embedding succeeded")
                    true
                } else {
                    android.util.Log.e("MetadataWriter", "❌ BitmapFactory.decodeFile returned null")
                    false
                }
            } catch (fallbackError: Exception) {
                android.util.Log.e("MetadataWriter", "❌ Fallback also failed: ${fallbackError.message}")
                false
            }
        }
    }

    /**
     * Checks if a file format is supported for metadata embedding
     */
    @ReactMethod
    fun isFormatSupported(filePath: String, promise: Promise) {
        Thread {
            try {
                val file = File(filePath)
                if (!file.exists()) {
                    promise.resolve(false)
                    return@Thread
                }

                AudioFileIO.read(file)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }.start()
    }
}

