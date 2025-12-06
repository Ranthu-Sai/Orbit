import TrackPlayer from 'react-native-track-player';
import { getRecommendedSongs } from '../Api/Recommended';
import youtubeStreamingService from './YouTubeStreamingService';
import dabMusicService from './DabMusicService';
import { getIndexQuality } from '../MusicPlayerFunctions';
import InnerTubeClient from '../Api/InnertubeClient';

/**
 * QueueManager - Centralized queue management with lazy stream loading
 * Handles recommendations-based queue building and on-demand stream fetching
 */
class QueueManager {
    constructor() {
        this.prefetchInProgress = false;
        this.streamCache = new Map(); // Cache fetched streams to avoid re-fetching
    }

    /**
     * Build queue from recommendations for a given song
     * @param {string} songId - The song ID to get recommendations for
     * @param {string} source - Source of the song (ytmusic, saavn, dab)
     * @param {number} limit - Number of recommendations to fetch (default: 10)
     * @returns {Promise<Array>} Array of song objects for queue
     */
    async buildQueueFromRecommendations(songId, source = 'saavn', limit = 10) {
        try {
            console.log(`🎵 Building queue from recommendations for song: ${songId}, source: ${source}`);

            // For YouTube Music songs, use YouTube's own recommendations API
            if (source === 'ytmusic' || (typeof songId === 'string' && songId.length === 11)) {

                const nextData = await InnerTubeClient.getNext(songId);


                if (!nextData || !nextData.items || nextData.items.length === 0) {
                    return [];
                }


                // Map YouTube recommendations to queue format
                const queueSongs = nextData.items.slice(0, limit).map(song => {
                    // Extract artwork
                    let artworkUri = '';
                    if (song.thumbnails && Array.isArray(song.thumbnails)) {
                        const bestThumb = song.thumbnails[song.thumbnails.length - 1];
                        artworkUri = bestThumb?.url || '';
                    } else if (song.thumbnail) {
                        artworkUri = song.thumbnail;
                    }

                    return {
                        url: '', // Will be fetched on-demand
                        title: song.title || song.name || 'Unknown',
                        artist: song.artist || 'Unknown Artist',
                        artwork: artworkUri,
                        image: artworkUri,
                        duration: song.duration || 0,
                        id: song.videoId || song.id,
                        language: 'unknown',
                        downloadUrl: song.videoId || song.id,
                        source: 'ytmusic',
                        _needsStream: true // Mark for on-demand fetching
                    };
                });


                return queueSongs;
            }

            // For Saavn songs, use Saavn recommendations API
            const recommendationsData = await getRecommendedSongs(songId);

            if (!recommendationsData?.data || recommendationsData.data.length === 0) {
                console.log('⚠️ No recommendations found for song:', songId);
                return [];
            }

            const recommendations = recommendationsData.data.slice(0, limit);
            console.log(`✅ Found ${recommendations.length} recommendations`);

            // Get quality index for URL selection
            const qualityIndex = await getIndexQuality();

            // Map recommendations to queue format (without stream URLs)
            const queueSongs = recommendations.map(song => {
                let songUrl = '';

                // Extract URL based on quality
                if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
                    if (song.downloadUrl[qualityIndex]?.url) {
                        songUrl = song.downloadUrl[qualityIndex].url;
                    } else if (song.downloadUrl[0]?.url) {
                        songUrl = song.downloadUrl[0].url;
                    }
                } else if (song.download_url && Array.isArray(song.download_url)) {
                    if (song.download_url[qualityIndex]?.url) {
                        songUrl = song.download_url[qualityIndex].url;
                    } else if (song.download_url[0]?.url) {
                        songUrl = song.download_url[0].url;
                    }
                }

                // Extract artwork
                let artworkUri = '';
                if (typeof song.image === 'string') {
                    artworkUri = song.image;
                } else if (song.image && Array.isArray(song.image)) {
                    const imageItem = song.image[2] || song.image[song.image.length - 1] || song.image[0];
                    artworkUri = imageItem?.url || imageItem?.link || '';
                }

                return {
                    url: songUrl,
                    title: song.name || song.title || 'Unknown',
                    artist: this._formatArtist(song.artists?.primary || song.artist),
                    artwork: artworkUri,
                    image: artworkUri,
                    duration: song.duration || 0,
                    id: song.id,
                    language: song.language || '',
                    downloadUrl: song.downloadUrl || song.download_url || [],
                    source: 'saavn',
                    _needsStream: false
                };
            });

            return queueSongs;
        } catch (error) {
            console.error('❌ Error building queue from recommendations:', error);
            console.error('❌ Error stack:', error.stack);
            return [];
        }
    }

    /**
     * Prefetch stream URL for the next track in queue
     * Only fetches if the track needs streaming (YouTube/DAB)
     */
    async prefetchNextTrack() {
        if (this.prefetchInProgress) {
            console.log('⏳ Prefetch already in progress, skipping...');
            return;
        }

        try {
            this.prefetchInProgress = true;

            const currentIndex = await TrackPlayer.getCurrentTrack();
            const queue = await TrackPlayer.getQueue();

            if (currentIndex === null || currentIndex >= queue.length - 1) {
                console.log('📭 No next track to prefetch');
                return;
            }

            const nextTrack = queue[currentIndex + 1];

            // Check if already cached
            if (this.streamCache.has(nextTrack.id)) {
                console.log(`✅ Stream already cached for: ${nextTrack.title}`);
                return;
            }

            // Check if track needs streaming
            const isYouTubeSong = nextTrack.id && typeof nextTrack.id === 'string' &&
                nextTrack.id.length === 11 && !nextTrack.isLocalMusic;
            const isDabSong = nextTrack.isDabTrack || nextTrack.source === 'dab';

            if (!isYouTubeSong && !isDabSong) {
                console.log(`⏭️ Next track doesn't need prefetch: ${nextTrack.title}`);
                return;
            }

            console.log(`🔄 Prefetching stream for next track: ${nextTrack.title}`);

            const streamData = await this._fetchStreamForSong(nextTrack);

            if (streamData) {
                // Update the track in queue with stream URL
                await TrackPlayer.updateMetadataForTrack(currentIndex + 1, {
                    url: streamData.url,
                    headers: streamData.headers,
                    userAgent: streamData.headers?.['User-Agent']
                });

                // Cache the stream data
                this.streamCache.set(nextTrack.id, streamData);
                console.log(`✅ Prefetched stream for: ${nextTrack.title}`);
            }
        } catch (error) {
            console.error('❌ Error prefetching next track:', error);
        } finally {
            this.prefetchInProgress = false;
        }
    }

    /**
     * Fetch stream URL for a specific track by index
     * Used when user skips to a track that hasn't been streamed yet
     * @param {number} trackIndex - Index of track in queue
     */
    async fetchStreamForTrack(trackIndex) {
        try {
            const queue = await TrackPlayer.getQueue();

            if (trackIndex < 0 || trackIndex >= queue.length) {
                console.error('❌ Invalid track index:', trackIndex);
                return null;
            }

            const track = queue[trackIndex];

            // Check cache first
            if (this.streamCache.has(track.id)) {
                console.log(`✅ Using cached stream for: ${track.title}`);
                return this.streamCache.get(track.id);
            }

            console.log(`🔄 Fetching stream on-demand for: ${track.title}`);
            const streamData = await this._fetchStreamForSong(track);

            if (streamData) {
                // Update track in queue
                await TrackPlayer.updateMetadataForTrack(trackIndex, {
                    url: streamData.url,
                    headers: streamData.headers,
                    userAgent: streamData.headers?.['User-Agent']
                });

                // Cache the stream
                this.streamCache.set(track.id, streamData);
                console.log(`✅ Fetched stream for: ${track.title}`);
                return streamData;
            }

            return null;
        } catch (error) {
            console.error('❌ Error fetching stream for track:', error);
            return null;
        }
    }

    /**
     * Internal method to fetch stream for a song based on its source
     * @private
     */
    async _fetchStreamForSong(song) {
        try {
            const isYouTubeSong = song.id && typeof song.id === 'string' &&
                song.id.length === 11 && !song.isLocalMusic;
            const isDabSong = song.isDabTrack || song.source === 'dab';

            if (isYouTubeSong) {
                const streamData = await youtubeStreamingService.getStreamUrl(song.id);
                if (streamData && streamData.url) {
                    return {
                        url: streamData.url,
                        headers: streamData.headers,
                        thumbnail: streamData.thumbnail,
                        duration: streamData.duration,
                        title: streamData.title
                    };
                }
            } else if (isDabSong) {
                await dabMusicService.initialize();
                const streamUrl = await dabMusicService.getStreamUrl(song.id);
                if (streamUrl) {
                    return {
                        url: streamUrl,
                        headers: {},
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('❌ Error in _fetchStreamForSong:', error);
            return null;
        }
    }

    /**
     * Format artist data to string
     * @private
     */
    _formatArtist(artistData) {
        if (!artistData) return 'Unknown Artist';
        if (typeof artistData === 'string') return artistData;
        if (Array.isArray(artistData)) {
            return artistData.map(a => a.name || a).join(', ');
        }
        if (artistData.name) return artistData.name;
        return 'Unknown Artist';
    }

    /**
     * Clear the stream cache
     */
    clearCache() {
        this.streamCache.clear();
        console.log('🗑️ Stream cache cleared');
    }
}

// Export singleton instance
const queueManager = new QueueManager();
export default queueManager;
