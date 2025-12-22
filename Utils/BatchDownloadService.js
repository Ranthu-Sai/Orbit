/**
 * BatchDownloadService
 * 
 * Manages batch downloading of songs from playlists and albums.
 * Uses UnifiedDownloadService.downloadSong() for actual downloads.
 * Supports YTMusic, DAB, and Saavn sources.
 */

import { ToastAndroid } from 'react-native';
import { UnifiedDownloadService } from './UnifiedDownloadService';
import { StorageManager } from './StorageManager';
import EventRegister from './EventRegister';
import FormatArtist from './FormatArtists';

class BatchDownloadService {
    static isDownloading = false;
    static shouldCancel = false;
    static currentProgress = {
        current: 0,
        total: 0,
        songTitle: '',
        percent: 0
    };

    /**
     * Format song data for unified download service
     * Handles different song object structures from playlists/albums
     */
    static formatSongForDownload(song) {
        if (!song) return null;

        // Detect source type
        const isYTMusic = song.source === 'ytmusic' ||
            (song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isDabTrack);
        const isDAB = song.source === 'dab' || song.isDabTrack === true;

        // Format artist string
        let artist = 'Unknown Artist';
        if (typeof song.artist === 'string') {
            artist = song.artist;
        } else if (song.artists) {
            if (Array.isArray(song.artists)) {
                artist = FormatArtist(song.artists);
            } else if (song.artists.primary && Array.isArray(song.artists.primary)) {
                artist = FormatArtist(song.artists.primary);
            }
        } else if (song.primary_artists) {
            if (typeof song.primary_artists === 'string') {
                artist = song.primary_artists;
            } else if (Array.isArray(song.primary_artists)) {
                artist = FormatArtist(song.primary_artists);
            }
        }

        // Get artwork URL - safely handle different formats
        let artwork = '';

        // Method 1: Direct string artwork
        if (typeof song.artwork === 'string' && song.artwork.startsWith('http')) {
            artwork = song.artwork;
        }
        // Method 2: Artwork as object with uri
        else if (song.artwork && typeof song.artwork === 'object' && typeof song.artwork.uri === 'string') {
            artwork = song.artwork.uri;
        }
        // Method 3: Direct string image
        else if (typeof song.image === 'string' && song.image.startsWith('http')) {
            artwork = song.image;
        }
        // Method 4: Image as object with uri
        else if (song.image && typeof song.image === 'object' && !Array.isArray(song.image) && typeof song.image.uri === 'string') {
            artwork = song.image.uri;
        }
        // Method 5: Image array (get highest quality - last in array)
        else if (Array.isArray(song.image) && song.image.length > 0) {
            const lastImg = song.image[song.image.length - 1];
            if (typeof lastImg === 'string') {
                artwork = lastImg;
            } else if (lastImg && typeof lastImg === 'object') {
                artwork = lastImg.url || lastImg.link || lastImg.uri || '';
            }
        }
        // Method 6: Images array (Spotify/YTMusic format)
        else if (Array.isArray(song.images) && song.images.length > 0) {
            const lastImg = song.images[song.images.length - 1];
            if (typeof lastImg === 'string') {
                artwork = lastImg;
            } else if (lastImg && typeof lastImg === 'object') {
                artwork = lastImg.url || lastImg.link || lastImg.uri || '';
            }
        }

        // Get album name - safely handle different formats
        let albumName = 'Unknown Album';
        if (typeof song.album === 'string') {
            albumName = song.album;
        } else if (song.album && typeof song.album === 'object') {
            albumName = song.album.name || song.album.title || 'Unknown Album';
        }

        return {
            id: song.id || song.videoId,
            title: song.name || song.title || song.song || 'Unknown',
            artist: artist,
            album: albumName,
            year: song.year || song.releaseDate?.substring(0, 4) || '',
            artwork: artwork,
            image: artwork,
            duration: song.duration || 0,
            downloadUrl: song.downloadUrl || song.download_url,
            language: song.language || '',
            source: isYTMusic ? 'ytmusic' : (isDAB ? 'dab' : (song.source || 'saavn')),
            isDabTrack: isDAB,
        };
    }

    /**
     * Download all songs from a playlist
     * @param {Array} songs - Array of song objects
     * @param {string} playlistName - Name of the playlist (for display)
     * @returns {Promise<{success: number, failed: number, skipped: number}>}
     */
    static async downloadPlaylist(songs, playlistName) {
        return this.downloadBatch(songs, playlistName, 'playlist');
    }

    /**
     * Download all songs from an album
     * @param {Array} songs - Array of song objects
     * @param {string} albumName - Name of the album (for display)
     * @returns {Promise<{success: number, failed: number, skipped: number}>}
     */
    static async downloadAlbum(songs, albumName) {
        return this.downloadBatch(songs, albumName, 'album');
    }

    /**
     * Core batch download logic
     */
    static async downloadBatch(songs, collectionName, type = 'playlist') {
        if (this.isDownloading) {
            ToastAndroid.show('A download is already in progress', ToastAndroid.SHORT);
            return { success: 0, failed: 0, skipped: 0 };
        }

        if (!songs || songs.length === 0) {
            ToastAndroid.show(`No songs to download in this ${type}`, ToastAndroid.SHORT);
            return { success: 0, failed: 0, skipped: 0 };
        }

        this.isDownloading = true;
        this.shouldCancel = false;

        const results = {
            success: 0,
            failed: 0,
            skipped: 0
        };

        // Emit start event
        EventRegister.emit('batch-download-started', {
            total: songs.length,
            name: collectionName,
            type
        });

        ToastAndroid.show(`Downloading ${songs.length} songs from ${collectionName}...`, ToastAndroid.SHORT);

        try {
            for (let i = 0; i < songs.length; i++) {
                // Check for cancellation
                if (this.shouldCancel) {
                    ToastAndroid.show('Download cancelled', ToastAndroid.SHORT);
                    break;
                }

                const song = songs[i];
                const formattedSong = this.formatSongForDownload(song);

                if (!formattedSong || !formattedSong.id) {
                    console.warn('[BatchDownload] Skipping invalid song:', song);
                    results.failed++;
                    continue;
                }

                // Update progress
                this.currentProgress = {
                    current: i + 1,
                    total: songs.length,
                    songTitle: formattedSong.title,
                    percent: Math.round(((i + 1) / songs.length) * 100)
                };

                // Emit progress event
                EventRegister.emit('batch-download-progress', this.currentProgress);

                // Check if already downloaded
                const isAlreadyDownloaded = await StorageManager.isSongDownloaded(formattedSong.id);
                if (isAlreadyDownloaded) {
                    console.log(`[BatchDownload] Skipping already downloaded: ${formattedSong.title}`);
                    results.skipped++;
                    continue;
                }

                // Download the song
                console.log(`[BatchDownload] Downloading (${i + 1}/${songs.length}): ${formattedSong.title}`);

                try {
                    const success = await UnifiedDownloadService.downloadSong(formattedSong, (percent) => {
                        // Per-song progress callback - emit detailed progress
                        EventRegister.emit('batch-download-song-progress', {
                            ...this.currentProgress,
                            songPercent: percent
                        });
                    });

                    if (success) {
                        results.success++;
                    } else {
                        results.failed++;
                    }
                } catch (downloadError) {
                    console.error(`[BatchDownload] Failed to download ${formattedSong.title}:`, downloadError);
                    results.failed++;
                }

                // Small delay between downloads to avoid overwhelming the system
                if (i < songs.length - 1 && !this.shouldCancel) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        } catch (error) {
            console.error('[BatchDownload] Batch download error:', error);
            ToastAndroid.show('Download error occurred', ToastAndroid.SHORT);
        } finally {
            this.isDownloading = false;
            this.currentProgress = { current: 0, total: 0, songTitle: '', percent: 0 };

            // Emit completion event
            EventRegister.emit('batch-download-complete', results);

            // Show completion toast
            if (results.success > 0 || results.skipped > 0) {
                let message = '';
                if (results.success > 0) {
                    message += `${results.success} downloaded`;
                }
                if (results.skipped > 0) {
                    message += message ? `, ${results.skipped} already had` : `${results.skipped} already downloaded`;
                }
                if (results.failed > 0) {
                    message += message ? `, ${results.failed} failed` : `${results.failed} failed`;
                }
                ToastAndroid.show(message, ToastAndroid.LONG);
            } else if (results.failed > 0) {
                ToastAndroid.show(`Failed to download ${results.failed} songs`, ToastAndroid.SHORT);
            }
        }

        return results;
    }

    /**
     * Cancel the current batch download
     */
    static cancelDownload() {
        if (this.isDownloading) {
            this.shouldCancel = true;
            ToastAndroid.show('Cancelling download...', ToastAndroid.SHORT);
        }
    }

    /**
     * Get current download progress
     */
    static getProgress() {
        return {
            isDownloading: this.isDownloading,
            ...this.currentProgress
        };
    }

    /**
     * Check if a batch download is in progress
     */
    static isInProgress() {
        return this.isDownloading;
    }
}

export default BatchDownloadService;
