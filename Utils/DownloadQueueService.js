/**
 * DownloadQueueService
 * 
 * Handles queue end detection for downloaded songs and suggests
 * online songs from Saavn API when the queue finishes.
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import NetInfo from '@react-native-community/netinfo';
import { ToastAndroid } from 'react-native';
import { getSearchSongData } from '../Api/Songs';
import { getIndexQuality } from '../MusicPlayerFunctions';

class DownloadQueueService {
    static instance = null;
    static isListening = false;

    /**
     * Initialize the service - call once at app startup
     */
    static async initialize() {
        if (DownloadQueueService.isListening) {
            return;
        }

        try {
            // Listen for queue end events
            TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
                await DownloadQueueService.handleQueueEnded();
            });

            DownloadQueueService.isListening = true;
        } catch (error) {
            console.error('[DownloadQueueService] Failed to initialize:', error);
        }
    }

    /**
     * Handle queue ended event
     */
    static async handleQueueEnded() {
        try {
            // Get the last track that was playing
            const queue = await TrackPlayer.getQueue();
            if (queue.length === 0) {
                return;
            }

            const lastTrack = queue[queue.length - 1];
            // Only handle if the queue was downloaded/local songs
            if (!lastTrack?.isDownloaded && !lastTrack?.isLocal && lastTrack?.sourceType !== 'downloaded' && lastTrack?.sourceType !== 'mymusic') {
                return;
            }

            // Check network connectivity
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) {
                ToastAndroid.show('You\'re offline. Queue ended.', ToastAndroid.SHORT);
                return;
            }

            // Suggest songs based on the last track
            await DownloadQueueService.suggestSongsFromSaavn(lastTrack);
        } catch (error) {
            console.error('[DownloadQueueService] Error handling queue end:', error);
        }
    }

    /**
     * Fetch and queue song suggestions from Saavn API
     */
    static async suggestSongsFromSaavn(lastTrack) {
        try {
            // Use the last track's title or artist as search query
            const searchQuery = lastTrack.artist || lastTrack.title || 'popular hindi songs';
            ToastAndroid.show('Finding more songs for you...', ToastAndroid.SHORT);

            // Search for songs using Saavn API
            const searchResult = await getSearchSongData(searchQuery, 1, 15);

            if (!searchResult?.data?.results || searchResult.data.results.length === 0) {
                ToastAndroid.show('No more suggestions available', ToastAndroid.SHORT);
                return;
            }

            const quality = await getIndexQuality();
            const suggestedTracks = [];

            for (const song of searchResult.data.results) {
                // Skip if no download URL
                if (!song.downloadUrl || !Array.isArray(song.downloadUrl) || song.downloadUrl.length === 0) {
                    continue;
                }

                // Get the URL based on quality preference
                const songUrl = song.downloadUrl[quality]?.url || song.downloadUrl[0]?.url;
                if (!songUrl) continue;

                // Get artwork
                let artworkUrl = '';
                if (typeof song.image === 'string') {
                    artworkUrl = song.image;
                } else if (Array.isArray(song.image) && song.image.length > 0) {
                    artworkUrl = song.image[song.image.length - 1]?.url || song.image[0]?.url || '';
                }

                // Format artist name
                let artistName = 'Unknown Artist';
                if (song.artists?.primary && Array.isArray(song.artists.primary)) {
                    artistName = song.artists.primary.map(a => a.name).join(', ');
                } else if (typeof song.artist === 'string') {
                    artistName = song.artist;
                }

                suggestedTracks.push({
                    id: song.id,
                    url: songUrl,
                    title: song.name || song.title || 'Unknown Title',
                    artist: artistName,
                    artwork: artworkUrl,
                    image: artworkUrl,
                    duration: song.duration || 0,
                    language: song.language || '',
                    downloadUrl: song.downloadUrl,
                    source: 'saavn',
                    isSuggestion: true // Flag to track these are suggestions
                });
            }

            if (suggestedTracks.length === 0) {
                ToastAndroid.show('No more songs available', ToastAndroid.SHORT);
                return;
            }
            // Add suggested tracks to queue and play
            await TrackPlayer.add(suggestedTracks);
            await TrackPlayer.play();

            ToastAndroid.show(`Playing similar songs by ${lastTrack.artist || 'various artists'}`, ToastAndroid.SHORT);
        } catch (error) {
            console.error('[DownloadQueueService] Error fetching suggestions:', error);
            ToastAndroid.show('Could not load more songs', ToastAndroid.SHORT);
        }
    }
}

export default DownloadQueueService;
