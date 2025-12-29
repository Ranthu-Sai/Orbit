import TrackPlayer from "react-native-track-player";
import { setRepeatMode } from "react-native-track-player/lib/trackPlayer";
import { GetPlaybackQuality } from "./LocalStorage/AppSettings";
import NetInfo from "@react-native-community/netinfo";
import { ToastAndroid, DeviceEventEmitter, InteractionManager } from "react-native";
import historyManager from "./Utils/HistoryManager";

import dabMusicService from "./Utils/DabMusicService";
import youtubeStreamingService from "./Utils/YouTubeStreamingService";
import queueManager from "./Utils/QueueManager";
import { enhanceYTMusicArtwork, getPrimaryArtworkUrl } from "./Utils/ArtworkEnhancer";
import autoRecommendations from "./Utils/AutoRecommendations";
import skipOperationManager from "./Utils/SkipOperationManager";
import streamFetchManager from "./Utils/StreamFetchManager";
import smartPrefetchManager from "./Utils/SmartPrefetchManager";
import FormatArtist from "./Utils/FormatArtists";

let isPlayerInitialized = false;

// PERFORMANCE: Cache quality index to avoid repeated AsyncStorage calls
let cachedQualityIndex = null;
let qualityCacheTimestamp = 0;
const QUALITY_CACHE_TTL = 60000; // 1 minute cache TTL

// Helper to extract artwork URL from various formats
const extractArtwork = (song) => {
  // Direct artwork/image string
  if (song.artwork && typeof song.artwork === 'string' && song.artwork.length > 0) {
    return song.artwork;
  }
  if (song.image && typeof song.image === 'string' && song.image.length > 0) {
    return song.image;
  }

  // Object format with url/uri
  if (song.artwork && typeof song.artwork === 'object') {
    if (song.artwork.url) return song.artwork.url;
    if (song.artwork.uri) return song.artwork.uri;
  }

  // Array format (Saavn/OuterTune)
  if (song.image && Array.isArray(song.image)) {
    const bestImage = song.image[2] || song.image[song.image.length - 1] || song.image[0];
    if (bestImage?.url) return bestImage.url;
    if (bestImage?.link) return bestImage.link;
    if (typeof bestImage === 'string') return bestImage;
  }

  // Single Image Object format
  if (song.image && typeof song.image === 'object') {
    if (song.image.url) return song.image.url;
    if (song.image.uri) return song.image.uri;
  }

  // Thumbnail format (YTMusic)
  if (song.thumbnail) {
    if (typeof song.thumbnail === 'string') return song.thumbnail;
    if (typeof song.thumbnail === 'object' && song.thumbnail.url) return song.thumbnail.url;
  }

  if (song.thumbnails && Array.isArray(song.thumbnails)) {
    const bestThumb = song.thumbnails[song.thumbnails.length - 1] || song.thumbnails[0];
    if (bestThumb?.url) return bestThumb.url;
  }

  // Try to find any property that looks like a URL
  if (song.artwork?.uri) return song.artwork.uri;
  if (song.image?.uri) return song.image.uri;

  return '';
};

export const setupPlayer = async () => {
  try {
    if (!isPlayerInitialized) {
      try {
        await TrackPlayer.setupPlayer({
          android: {
            appKilledPlaybackBehavior: 'ContinuePlayback',
            alwaysPauseOnInterruption: false,
          },
          autoHandleInterruptions: true,
          autoUpdateMetadata: true,
        });
        console.log('Player initialized successfully in MusicPlayerFunctions');

        // NOTE: Remote control listeners (play, pause, next, previous) are registered in service.js
        // to avoid duplicate event listeners. DO NOT add them here.

        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: 'ContinuePlayback',
            alwaysPauseOnInterruption: false,
          },
          capabilities: [
            'play',
            'pause',
            'stop',
            'seekTo',
            'skip',
            'skipToNext',
            'skipToPrevious',
          ],
          compactCapabilities: [
            'play',
            'pause',
            'stop',
            'seekTo',
            'skip',
            'skipToNext',
            'skipToPrevious',
          ],
          notificationCapabilities: [
            'play',
            'pause',
            'stop',
            'seekTo',
            'skip',
            'skipToNext',
            'skipToPrevious',
          ]
        });

        isPlayerInitialized = true;

        // Initialize SmartPrefetchManager for background prefetching
        smartPrefetchManager.initialize();

      } catch (setupError) {
        // Check if the error is about player already being initialized
        if (setupError.message && setupError.message.includes('player has already been initialized')) {
          console.log('Player already initialized in MusicPlayerFunctions');
          isPlayerInitialized = true;
          smartPrefetchManager.initialize();
        } else {
          console.error('Error setting up player in MusicPlayerFunctions:', setupError);
          throw setupError;
        }
      }
    } else {
      console.log('Player already initialized, skipping setup in MusicPlayerFunctions');
    }
  } catch (error) {
    console.error('Error in setupPlayer function:', error);
  }
};

async function PlayOneSong(song) {
  try {
    // Validate song object
    if (!song) {
      console.error('PlayOneSong: No song provided');
      return;
    }


    // Ensure player is initialized
    if (!isPlayerInitialized) {
      console.log('Player not initialized, setting up...');
      await setupPlayer();
    }

    // Get the appropriate URL based on playback quality setting
    let playbackUrl = song.url;
    let updatedSong = { ...song };

    // Check if this is a podcast episode - skip all stream processing
    const isPodcast = song.isPodcast || song.type === 'podcast';

    // Check if this is a YouTube song (has videoId/id that looks like YouTube video ID)
    // Podcasts should NOT be treated as YouTube songs even if ID length matches
    const isYouTubeSong = !isPodcast && song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isLocalMusic;

    if (isYouTubeSong) {
      try {
        console.log('Fetching YouTube stream for video ID:', song.id);

        // OPTIMISTIC UI: Emit early metadata event so mini player shows immediately
        // This provides instant feedback while the 2-3 second stream fetch happens
        const earlyArtwork = extractArtwork(song) || song.artwork || song.image || '';
        DeviceEventEmitter.emit('song-loading-started', {
          id: song.id,
          title: song.title || song.name || 'Loading...',
          artist: song.artist || 'Loading...',
          artwork: earlyArtwork,
          image: earlyArtwork,
          duration: song.duration,
          isLoading: true,
        });
        console.log('📱 Emitted early metadata for immediate UI feedback');

        // Use StreamFetchManager for deduplication and abort support
        const streamData = await streamFetchManager.fetchStream(
          song.id,
          async (videoId, signal) => {
            return await youtubeStreamingService.getStreamUrl(videoId, false);
          }
        );

        if (streamData && streamData.url) {
          // Verbose logging removed for cleaner console
          playbackUrl = streamData.url;
          // Update song with stream data and headers
          // IMPORTANT: Preserve artist from original song data
          // Determine quality label from actual bitrate and mimeType
          // Estimate bitrate based on codec if not available
          const isOpus = streamData.mimeType?.includes('webm');
          const estimatedBitrate = streamData.bitrate || (isOpus ? 148000 : 256000);
          const bitrateKbps = Math.round(estimatedBitrate / 1000);
          const codec = isOpus ? 'Opus' : 'AAC';
          const ytQuality = `${codec} ${bitrateKbps}kbps`;

          updatedSong = {
            ...updatedSong,
            url: streamData.url,
            headers: streamData.headers,
            userAgent: streamData.headers?.['User-Agent'],
            artwork: streamData.thumbnail || updatedSong.artwork,
            duration: streamData.duration || updatedSong.duration,
            currentPlayingQuality: ytQuality, // Store actual stream quality
            title: updatedSong.title || streamData.title,
            artist: updatedSong.artist || 'Unknown Artist',
          };
          console.log('YouTube stream URL fetched successfully');

          // Reset error counter on successful fetch
          skipOperationManager.resetErrorCounter();
        } else {
          console.error('Failed to get YouTube stream URL');
          ToastAndroid.show('Failed to load YouTube stream', ToastAndroid.SHORT);
          return;
        }
      } catch (error) {
        console.error('Error fetching YouTube stream:', error);

        // Don't show toast if operation was cancelled
        if (error.name !== 'AbortError') {
          ToastAndroid.show('Error loading YouTube stream', ToastAndroid.SHORT);
        }
        return;
      }
    }
    // Check if this is a SPOTIFY track - needs to be mapped to YTMusic
    else if (song.source === 'spotify' || song.spotifyId) {
      try {
        console.log('🎵 Spotify Track detected! Mapping to YTMusic:', song.title, '-', song.artist);

        // OPTIMISTIC UI: Emit early metadata so mini player shows immediately
        // Uses Spotify artwork while we search for YTMusic match
        const earlyArtwork = extractArtwork(song) || song.artwork || song.image || '';
        DeviceEventEmitter.emit('song-loading-started', {
          id: song.id,
          title: song.title || song.name || 'Loading...',
          artist: song.artist || 'Finding on YTMusic...',
          artwork: earlyArtwork,
          image: earlyArtwork,
          duration: song.duration,
          isLoading: true,
          isSpotifyMapping: true, // Flag for UI to show mapping indicator
        });
        console.log('📱 Emitted optimistic UI for Spotify → YTMusic mapping');

        // Use YouTubeMusicService.searchAndStream to find and get stream URL
        const YouTubeMusicService = require('./Utils/YouTubeMusicService').default;
        const searchQuery = `${song.title || song.name} ${song.artist || ''}`.trim();

        const ytMusicResult = await YouTubeMusicService.searchAndStream(
          song.title || song.name,
          song.artist || ''
        );

        if (ytMusicResult && ytMusicResult.url && !ytMusicResult.error) {
          console.log('🌐 [Spotify-Mapped YTMusic Response]:', JSON.stringify(ytMusicResult, null, 2));
          playbackUrl = ytMusicResult.url;

          // Update song with YTMusic stream data while strictly PRESERVING Spotify metadata
          // Determine quality label from actual bitrate and mimeType
          // Estimate bitrate based on codec if not available
          const isOpus = ytMusicResult.mimeType?.includes('webm');
          const estimatedBitrate = ytMusicResult.bitrate || (isOpus ? 148000 : 256000);
          const bitrateKbps = Math.round(estimatedBitrate / 1000);
          const codec = isOpus ? 'Opus' : 'AAC';
          const ytQuality = `${codec} ${bitrateKbps}kbps`;

          updatedSong = {
            ...updatedSong,
            url: ytMusicResult.url,
            headers: ytMusicResult.headers,
            userAgent: ytMusicResult.headers?.['User-Agent'],
            // Add technical YTMusic data but keep Spotify metadata for UI
            ytMusicVideoId: ytMusicResult.videoId,
            mappedFromSpotify: true,
            currentPlayingQuality: ytQuality,
          };

          console.log('✅ Spotify → YTMusic mapping successful:', ytMusicResult.videoId);
          skipOperationManager.resetErrorCounter();
        } else {
          console.error('❌ Failed to find YTMusic match for Spotify track');
          ToastAndroid.show('Could not find song on YTMusic', ToastAndroid.SHORT);
          return;
        }
      } catch (error) {
        console.error('❌ Error mapping Spotify to YTMusic:', error);
        ToastAndroid.show('Error finding song on YTMusic', ToastAndroid.SHORT);
        return;
      }
    }
    // Check if this is a DAB Music track
    else if (song.isDabTrack || song.source === 'dab' || (!isNaN(song.url) && String(song.url).length > 5)) {
      try {
        console.log('🎵 DAB Track detected! Fetching stream URL for ID:', song.id);

        // OPTIMISTIC UI: Emit early metadata so mini player shows immediately
        const earlyArtwork = extractArtwork(song) || song.artwork || song.image || '';
        DeviceEventEmitter.emit('song-loading-started', {
          id: song.id,
          title: song.title || song.name || 'Loading...',
          artist: song.artist || 'Loading...',
          artwork: earlyArtwork,
          image: earlyArtwork,
          duration: song.duration,
          isLoading: true,
          isDabTrack: true, // Flag for UI to show DAB indicator
        });
        console.log('📱 Emitted optimistic UI for DAB Music');

        await dabMusicService.initialize();
        const streamUrl = await dabMusicService.getStreamUrl(song.id);

        if (streamUrl) {
          playbackUrl = streamUrl;

          // Parse format from URL to determine quality
          const fmtMatch = streamUrl.match(/[?&]fmt=(\d+)/);
          const fmt = fmtMatch ? fmtMatch[1] : null;
          const formatMap = {
            '5': 'MP3 320kbps',
            '6': 'FLAC 16-bit/44.1kHz',
            '7': 'FLAC 24-bit/96kHz',
            '27': 'FLAC 24-bit/192kHz'
          };
          const dabQuality = formatMap[fmt] || 'FLAC';

          updatedSong = {
            ...updatedSong,
            url: streamUrl,
            source: 'dab',
            isDabTrack: true,
            currentPlayingQuality: dabQuality  // Set actual FLAC quality
          };
          console.log('✅ DAB stream URL fetched successfully');
          console.log('🎵 Quality:', dabQuality);
        } else {
          console.error('Failed to get DAB stream URL');
          ToastAndroid.show('Failed to load DAB stream', ToastAndroid.SHORT);
          return;
        }
      } catch (error) {
        console.error('❌ Error fetching DAB stream:', error);
        ToastAndroid.show('Error loading DAB stream', ToastAndroid.SHORT);
        return;
      }
    } else {
      // If song has multiple quality URLs, select based on setting
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        const qualityIndex = await getIndexQuality();
        if (song.downloadUrl[qualityIndex]?.url) {
          playbackUrl = song.downloadUrl[qualityIndex].url;
        } else {
          // Fallback to any available URL
          for (let i = song.downloadUrl.length - 1; i >= 0; i--) {
            if (song.downloadUrl[i]?.url) {
              playbackUrl = song.downloadUrl[i].url;
              break;
            }
          }
        }
      } else if (song.download_url && Array.isArray(song.download_url)) {
        // Alternative format
        const qualityIndex = await getIndexQuality();
        if (song.download_url[qualityIndex]?.url) {
          playbackUrl = song.download_url[qualityIndex].url;
        } else {
          // Fallback to any available URL
          for (let i = song.download_url.length - 1; i >= 0; i--) {
            if (song.download_url[i]?.url) {
              playbackUrl = song.download_url[i].url;
              break;
            }
          }
        }
      }
    }

    // Validate song URL
    if (!playbackUrl || typeof playbackUrl !== 'string') {
      console.error('PlayOneSong: Invalid or missing song URL', song);
      ToastAndroid.show('Cannot play song - invalid URL', ToastAndroid.SHORT);
      return;
    }

    // Check if the song is a local file (has a path or isLocalMusic property)
    const isLocalFile = song.isLocalMusic || song.path || playbackUrl.startsWith('file://');

    // If it's a local file, make sure the URL starts with file://
    if (isLocalFile && !playbackUrl.startsWith('file://') && song.path) {
      playbackUrl = `file://${song.path}`;
    }

    // Check network availability for non-local files - NON-BLOCKING
    // Instead of blocking here, we let playback fail gracefully if offline
    if (!isLocalFile) {
      NetInfo.fetch().then(netInfo => {
        if (!netInfo.isConnected) {
          console.log('Warning: Playing online song but device may be offline');
        }
      }).catch(() => { /* ignore */ });
    }

    // NOTE: History tracking moved to AFTER TrackPlayer.play() to avoid blocking playback
    // See below after TrackPlayer.play() call

    // Create a copy of the song with the selected playback URL and quality info
    // PERFORMANCE: Use cached quality index if available
    let qualityIndex = cachedQualityIndex;
    if (qualityIndex === null || (Date.now() - qualityCacheTimestamp > QUALITY_CACHE_TTL)) {
      qualityIndex = await getIndexQuality();
      cachedQualityIndex = qualityIndex;
      qualityCacheTimestamp = Date.now();
    }
    const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
    const currentQuality = qualityNames[qualityIndex] || 'Unknown';

    // Enhance artwork to highest quality for playing song (w500)
    const enhancedArtwork = enhanceYTMusicArtwork(updatedSong.artwork || updatedSong.image, 'playing');
    const playingArtwork = getPrimaryArtworkUrl(enhancedArtwork) || updatedSong.artwork || updatedSong.image;

    // NORMALIZE METADATA (Critical for Saavn/Standard tracks)
    // 1. Ensure Title
    if (!updatedSong.title && updatedSong.name) {
      updatedSong.title = String(updatedSong.name).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
    }
    if (!updatedSong.title) {
      updatedSong.title = 'Unknown Title';
    }

    // 2. Ensure Artist
    if (!updatedSong.artist) {
      if (updatedSong.artists && updatedSong.artists.primary) {
        updatedSong.artist = FormatArtist(updatedSong.artists.primary);
      } else if (song.artists && song.artists.primary) {
        updatedSong.artist = FormatArtist(song.artists.primary);
      } else {
        updatedSong.artist = 'Unknown Artist';
      }
    }

    const songForPlayback = {
      ...updatedSong,
      url: playbackUrl,
      // CRITICAL: Preserve existing quality for YTMusic/Spotify/DAB tracks
      // Only use Saavn quality setting if no quality was already set by stream handler
      currentPlayingQuality: updatedSong.currentPlayingQuality || currentQuality,
      artwork: playingArtwork // Use enhanced w500 quality
    };

    await TrackPlayer.reset();
    await TrackPlayer.add([songForPlayback]);
    await TrackPlayer.play();

    // NON-BLOCKING: Start history tracking AFTER playback begins
    // Uses InteractionManager to run after all UI interactions complete,
    // preventing any lag, hangs, or unresponsive UI from file I/O operations
    InteractionManager.runAfterInteractions(() => {
      historyManager.startTracking(song).catch(err =>
        console.error('HistoryManager: Background tracking error:', err)
      );
    });

    // Signal that this is a single song playback (enable auto-recommendations)
    DeviceEventEmitter.emit('playback-mode-changed', { isPlaylist: false });

    // CORRECT FLOW: Load initial recommendations immediately after playback starts
    // 1. Song plays -> 2. Recommendations API called -> 3. Songs added to queue
    // 4. Monitor set up for refill when 5 songs left
    // NON-BLOCKING: Use InteractionManager for proper deferral (better than setTimeout)
    // This waits for animations to complete before starting background work
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Determine source based on song type
        const isYTId = song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isLocalMusic;
        const source = isYTId ? 'ytmusic' : 'saavn';

        // Load initial recommendations
        const recommendations = await queueManager.buildQueueFromRecommendations(song.id, source, 20);

        if (recommendations && recommendations.length > 0) {
          // SAFETY: Filter out the currently playing song to prevent duplicates
          const filteredRecs = recommendations.filter(rec => rec.id !== song.id);

          if (filteredRecs.length > 0) {
            await AddSongsToQueue(filteredRecs);
            console.log(`✅ Initial queue loaded: ${filteredRecs.length} songs`);

            // 🎵 PREMIUM UX: Trigger initial prefetch for N+1 immediately after queue loads
            // This ensures the next song is ready even faster
            setImmediate(() => {
              const smartPrefetchManager = require('./Utils/SmartPrefetchManager').default;
              smartPrefetchManager._prefetchTrackAtIndex(1)
                .catch(err => {
                  // Silence expected errors when queue isn't ready
                  if (!err.message?.includes("doesn't exist")) {
                    console.log('Initial N+1 prefetch skipped:', err.message);
                  }
                });
            });
          }
        }

        // Now start the monitor (it will only trigger refill when 5 songs remain)
        queueManager.startContinuousQueueMonitor(song.id);
      } catch (err) {
        console.error('Error loading initial recommendations:', err);
        // Still start monitor even if initial load fails
        queueManager.startContinuousQueueMonitor(song.id);
      }
    });
  } catch (error) {
    console.error('Error playing song:', error);
  }
}

async function AddPlaylist(songs, startSongId = null) {
  try {
    // Validate songs array
    if (!Array.isArray(songs) || songs.length === 0) {
      console.error('Invalid songs array provided to AddPlaylist');
      return;
    }

    // Filter/Slice if startSongId is provided
    let tracksToAdd = [...songs];
    if (startSongId) {
      const startIndex = songs.findIndex(s => s.id === startSongId || s.videoId === startSongId);
      if (startIndex !== -1) {
        console.log(`🎵 Playing from index ${startIndex} (Song ID: ${startSongId}), skipping previous ${startIndex} songs`);
        tracksToAdd = songs.slice(startIndex);
      } else {
        console.warn(`⚠️ Start song ID ${startSongId} not found in playlist, playing all`);
      }
    }

    // Ensure all songs have albumId if it exists on the first song
    const albumId = tracksToAdd[0]?.albumId;
    if (albumId) {
      tracksToAdd = tracksToAdd.map(song => ({
        ...song,
        albumId: albumId
      }));
    }

    // Apply playback quality setting to all songs
    const qualityIndex = await getIndexQuality();
    const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
    const currentQuality = qualityNames[qualityIndex] || 'Unknown';

    const processedSongs = await Promise.all(tracksToAdd.map(async (song, index) => {
      let playbackUrl = song.url;
      let updatedSong = { ...song };

      // Check if this is a podcast episode - skip all stream processing
      const isPodcast = song.isPodcast || song.type === 'podcast';

      // Check if this is a YouTube song (podcasts excluded)
      const isYouTubeSong = !isPodcast && song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isLocalMusic;

      if (isYouTubeSong) {
        // Only fetch stream for the FIRST song immediately
        // All others get a placeholder and will be fetched on demand
        const isFirstSong = index === 0;

        if (isFirstSong) {
          try {
            console.log('Fetching YouTube stream for first playlist song:', song.id);
            const streamData = await youtubeStreamingService.getStreamUrl(song.id);

            if (streamData && streamData.url) {
              playbackUrl = streamData.url;
              updatedSong = {
                ...updatedSong,
                url: streamData.url,
                headers: streamData.headers,
                userAgent: streamData.headers?.['User-Agent'],
                artwork: streamData.thumbnail || updatedSong.artwork,
                duration: streamData.duration || updatedSong.duration,
                title: streamData.title || updatedSong.title,
                currentPlayingQuality: currentQuality
              };
            }
          } catch (error) {
            console.error('Error fetching YouTube stream for first playlist song:', error);
          }
        } else {
          // LAZY LOAD: Set placeholder URL and flag
          playbackUrl = `ytmusic://${song.id || song.videoId}`;
          updatedSong._needsStream = true;
          updatedSong.isYTMusic = true;
          updatedSong.source = 'ytmusic';
          updatedSong.sourceType = 'online'; // CRITICAL: Set sourceType for queue filtering
          updatedSong.url = playbackUrl;
          updatedSong.currentPlayingQuality = currentQuality;
        }
      }
      // Check if this is a DAB Music track
      else if (song.isDabTrack || song.source === 'dab' || (!isNaN(song.url) && String(song.url).length > 5)) {
        const isFirstSong = index === 0;

        if (isFirstSong) {
          try {
            console.log('🎵 Fetching DAB stream for first playlist song:', song.title);

            // OPTIMISTIC UI: Emit early metadata so player shows immediately
            const earlyArtwork = extractArtwork(song) || song.artwork || song.image || '';
            DeviceEventEmitter.emit('song-loading-started', {
              id: song.id,
              title: song.title || song.name || 'Loading...',
              artist: song.artist || 'Loading...',
              artwork: earlyArtwork,
              image: earlyArtwork,
              duration: song.duration,
              isLoading: true,
              isDabTrack: true,
            });

            await dabMusicService.initialize();
            const streamUrl = await dabMusicService.getStreamUrl(song.id);

            if (streamUrl) {
              playbackUrl = streamUrl;
              // Parse format from URL to determine quality
              const fmtMatch = streamUrl.match(/[?&]fmt=(\d+)/);
              const fmt = fmtMatch ? fmtMatch[1] : null;
              const formatMap = {
                '5': 'MP3 320kbps',
                '6': 'FLAC 16-bit/44.1kHz',
                '7': 'FLAC 24-bit/96kHz',
                '27': 'FLAC 24-bit/192kHz'
              };
              const dabQuality = formatMap[fmt] || 'FLAC';

              updatedSong = {
                ...updatedSong,
                url: streamUrl,
                source: 'dab',
                isDabTrack: true,
                currentPlayingQuality: dabQuality
              };
              console.log('✅ DAB stream URL fetched for first song');
            }
          } catch (error) {
            console.error('Error fetching DAB stream for first song:', error);
          }
        } else {
          // LAZY LOAD: Set placeholder and flags for later processing
          playbackUrl = `dab://${song.id}`;
          updatedSong._needsStream = true;
          updatedSong._needsDabStream = true;
          updatedSong.source = 'dab';
          updatedSong.isDabTrack = true;
          updatedSong.sourceType = 'online';
          updatedSong.url = playbackUrl;
          updatedSong.currentPlayingQuality = currentQuality;
        }
      }
      // SPOTIFY SUPPORT: Handle Spotify tracks (map to YTMusic for playback)
      else if (song.source === 'spotify' || song.spotifyId) {
        const isFirstSong = index === 0;

        if (isFirstSong) {
          try {
            console.log('🎵 Fetching YTMusic stream for first Spotify playlist song:', song.title);

            // OPTIMISTIC UI: Emit early metadata so player shows immediately
            const earlyArtwork = extractArtwork(song) || song.artwork || song.image || '';
            DeviceEventEmitter.emit('song-loading-started', {
              id: song.id,
              title: song.title || song.name || 'Loading...',
              artist: song.artist || 'Finding on YTMusic...',
              artwork: earlyArtwork,
              image: earlyArtwork,
              duration: song.duration,
              isLoading: true,
              isSpotifyMapping: true,
            });

            // Use YouTubeMusicService to map and get stream URL
            const YouTubeMusicService = require('./Utils/YouTubeMusicService').default;
            const ytMusicResult = await YouTubeMusicService.searchAndStream(
              song.title || song.name,
              song.artist || ''
            );

            if (ytMusicResult && ytMusicResult.url && !ytMusicResult.error) {
              playbackUrl = ytMusicResult.url;
              const isOpus = ytMusicResult.mimeType?.includes('webm');
              const estimatedBitrate = ytMusicResult.bitrate || (isOpus ? 148000 : 256000);
              const bitrateKbps = Math.round(estimatedBitrate / 1000);
              const codec = isOpus ? 'Opus' : 'AAC';

              updatedSong = {
                ...updatedSong,
                url: ytMusicResult.url,
                headers: ytMusicResult.headers,
                userAgent: ytMusicResult.headers?.['User-Agent'],
                ytMusicVideoId: ytMusicResult.videoId,
                mappedFromSpotify: true,
                currentPlayingQuality: `${codec} ${bitrateKbps}kbps`,
              };
              console.log('✅ Spotify → YTMusic mapping successful for first song');
            } else {
              console.error('❌ Failed to map first Spotify song to YTMusic');
            }
          } catch (error) {
            console.error('Error mapping first Spotify playlist song:', error);
          }
        } else {
          // LAZY LOAD: Set placeholder and flags for later processing
          playbackUrl = `spotify://${song.id || song.spotifyId}`;
          updatedSong._needsStream = true;
          updatedSong._needsSpotifyMapping = true;
          updatedSong.source = 'spotify';
          updatedSong.spotifyId = song.id || song.spotifyId;
          updatedSong.sourceType = 'online';
          updatedSong.url = playbackUrl;
          updatedSong.currentPlayingQuality = currentQuality;
        }
      } else {
        // Standard file/download URL logic (Saavn, etc.)
        if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
          updatedSong.url = song.downloadUrl[qualityIndex]?.url || song.downloadUrl.find(d => d?.url)?.url || song.url;
        } else if (song.download_url && Array.isArray(song.download_url)) {
          updatedSong.url = song.download_url[qualityIndex]?.url || song.download_url.find(d => d?.url)?.url || song.url;
        }

        // CRITICAL: Check if we have a valid media URL
        playbackUrl = updatedSong.url;

        // Debug logging for Saavn/Standard tracks
        if (index === 0) {
          console.log(`[AddPlaylist] Processing first ${song.type || 'unknown'} track:`, {
            id: song.id,
            name: song.name,
            hasDownloadUrl: !!(song.downloadUrl || song.download_url),
            extractedUrl: playbackUrl
          });

          if (playbackUrl && (playbackUrl.includes('jiosaavn.com/song/') || playbackUrl.includes('jiosaavn.com/album/'))) {
            console.warn('⚠️ WARNING: Extracted URL appears to be a web page, not a media stream:', playbackUrl);
          }
        }
      }

      const artworkUrl = extractArtwork(song) || extractArtwork(updatedSong);

      // Normalize Saavn song data (Saavn uses 'name' instead of 'title')
      // Extract artist from multiple possible formats
      let extractedArtist =
        updatedSong.artist ||
        song.artist ||  // Direct artist string (Spotify)
        (typeof song.artists === 'string' ? song.artists : null) ||  // artists as string
        song.primaryArtists ||  // primaryArtists field
        (song.artists?.primary ? FormatArtist(song.artists.primary) : null) ||  // Saavn format
        'Unknown Artist';

      const normalizedSong = {
        ...updatedSong,
        url: playbackUrl || updatedSong.url,
        title: updatedSong.title || updatedSong.name || song.name || 'Unknown',
        artist: extractedArtist,
        artwork: artworkUrl,
        image: artworkUrl,
        currentPlayingQuality: currentQuality
      };

      // SAFETY: Ensure all songs have a URL - use placeholder if missing
      // TrackPlayer throws "URL cannot be empty" if url is missing
      if (!normalizedSong.url) {
        // For Spotify tracks - use spotify:// placeholder
        if (song.source === 'spotify' || song.spotifyId || updatedSong._needsSpotifyMapping) {
          normalizedSong.url = `spotify://${song.id || song.spotifyId || 'unknown'}`;
          normalizedSong._needsStream = true;
          normalizedSong._needsSpotifyMapping = true;
          normalizedSong.source = 'spotify';
          console.log(`⚠️ Safety: Added Spotify placeholder URL for ${normalizedSong.title}`);
        }
        // For DAB tracks - use dab:// placeholder  
        else if (song.source === 'dab' || song.isDabTrack || updatedSong._needsDabStream) {
          normalizedSong.url = `dab://${song.id || 'unknown'}`;
          normalizedSong._needsStream = true;
          normalizedSong._needsDabStream = true;
          normalizedSong.source = 'dab';
          console.log(`⚠️ Safety: Added DAB placeholder URL for ${normalizedSong.title}`);
        }
        // For YTMusic tracks - use ytmusic:// placeholder
        else if (isYouTubeSong) {
          normalizedSong.url = `ytmusic://${song.id || song.videoId || 'unknown'}`;
          normalizedSong._needsStream = true;
          console.log(`⚠️ Safety: Added YTMusic placeholder URL for ${normalizedSong.title}`);
        }
        // Fallback: Skip songs with no URL and no identifiable source
        else {
          console.warn(`⚠️ Skipping song with no URL: ${normalizedSong.title}`);
          return null;
        }
      }

      return normalizedSong;
    }));

    // Filter out null entries (songs that were skipped)
    const validSongs = processedSongs.filter(song => song !== null);

    // BATCHED PLAYLIST ADDITION
    // 1. Add first batch for instant playback
    const INITIAL_BATCH_SIZE = 20;
    const initialBatch = validSongs.slice(0, INITIAL_BATCH_SIZE);

    await TrackPlayer.reset();
    await TrackPlayer.add(initialBatch);
    await TrackPlayer.play();

    // Signal that this is a playlist/album playback (disable auto-recommendations)
    DeviceEventEmitter.emit('playback-mode-changed', { isPlaylist: true });

    console.log(`✅ Playlist: Added initial ${initialBatch.length} songs and started playback`);

    // 2. Add remaining songs in background
    const remainingSongs = validSongs.slice(INITIAL_BATCH_SIZE);

    if (remainingSongs.length > 0) {
      InteractionManager.runAfterInteractions(async () => {
        try {
          const BATCH_SIZE = 50;
          for (let i = 0; i < remainingSongs.length; i += BATCH_SIZE) {
            const batch = remainingSongs.slice(i, i + BATCH_SIZE);

            // Small pause to let UI breathe
            if (i > 0) await new Promise(resolve => setTimeout(resolve, 50));

            await TrackPlayer.add(batch);
            console.log(`✅ Playlist: Added background batch ${i / BATCH_SIZE + 1}`);
          }

          DeviceEventEmitter.emit('queue-updated', { count: processedSongs.length });
        } catch (batchError) {
          console.error('❌ Error adding background playlist batch:', batchError);
        }
      });
    }

    // Prefetch next song check
    setTimeout(() => {
      queueManager.prefetchNextTrack().catch(err =>
        console.error('Error prefetching next track:', err)
      );
    }, 1000);
  } catch (error) {
    console.error('Error in AddPlaylist:', error);
  }
}

async function AddSongsToQueue(songs) {
  console.log(`🎵 AddSongsToQueue: Lazy loading ${songs.length} songs...`);

  const qualityIndex = await getIndexQuality();
  const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
  const currentQuality = qualityNames[qualityIndex] || 'Unknown';

  const processedSongs = [];

  for (const song of songs) {
    const hasValidYouTubeId = song.id && typeof song.id === 'string' && song.id.length === 11;
    const isYTMusicSource = song.source === 'ytmusic' || song.isYTMusic === true;
    const isDabSong = song.isDabTrack || song.source === 'dab';

    let processedSong = { ...song };

    // Explicitly check for Saavn markers BEFORE ID length check
    // to avoid misidentifying 11-char Saavn IDs as YouTube
    const hasSaavnMarkers = song.source === 'saavn' ||
      (song.downloadUrl && Array.isArray(song.downloadUrl)) ||
      (song.download_url && Array.isArray(song.download_url));

    if (((hasValidYouTubeId && !song.isLocalMusic) || isYTMusicSource) && !hasSaavnMarkers) {
      // LAZY LOAD: Do NOT fetch stream here. Just set placeholder.
      const videoId = song.id || song.videoId;
      processedSong = {
        ...processedSong,
        url: `ytmusic://${videoId}`,
        _needsStream: true,
        isYTMusic: true,
        source: 'ytmusic',
        sourceType: 'online', // CRITICAL: Set sourceType for queue filtering
        currentPlayingQuality: currentQuality,
        // Ensure artwork is set correctly using helper
        artwork: extractArtwork(song),
        image: extractArtwork(song),
        duration: song.duration
      };

    } else if (isDabSong) {
      // DAB songs logic - ideally lazy load too, but keeping minimal changes for now
      processedSong = { ...processedSong, isDab: true };
      try {
        await dabMusicService.initialize();
        const streamUrl = await dabMusicService.getStreamUrl(song.id);
        if (streamUrl) processedSong.url = streamUrl;
      } catch (e) { }

    } else {
      // Standard logic for downloads/local
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        processedSong.url = song.downloadUrl[qualityIndex]?.url || song.downloadUrl.find(d => d?.url)?.url || song.url;
      } else if (song.download_url && Array.isArray(song.download_url)) {
        processedSong.url = song.download_url[qualityIndex]?.url || song.download_url.find(d => d?.url)?.url || song.url;
      }
      processedSong.source = 'saavn';
      processedSong.currentPlayingQuality = currentQuality;
    }

    // CRITICAL: Check if valid URL for standard tracks
    if (processedSong.url && (processedSong.url.includes('jiosaavn.com/song/') || processedSong.url.includes('jiosaavn.com/album/'))) {
      console.warn(`⚠️ AddSongsToQueue: URL looks like a web page for ${song.name || song.title}`, processedSong.url);
    }

    // NORMALIZE METADATA (Critical for Saavn/Standard tracks)
    // 1. Ensure Title
    if (!processedSong.title && processedSong.name) {
      processedSong.title = String(processedSong.name).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
    }
    if (!processedSong.title) {
      processedSong.title = 'Unknown Title';
    }

    // 2. Ensure Artist
    if (!processedSong.artist) {
      if (processedSong.artists && processedSong.artists.primary) {
        processedSong.artist = FormatArtist(processedSong.artists.primary);
      } else {
        processedSong.artist = 'Unknown Artist';
      }
    }

    // 3. Ensure Artwork is a string URL
    if (!processedSong.artwork || typeof processedSong.artwork !== 'string') {
      const extracted = extractArtwork(processedSong);
      if (extracted) {
        processedSong.artwork = extracted;
        // Also set image for compatibility
        processedSong.image = extracted;
      }
    }

    processedSongs.push(processedSong);
  }

  if (processedSongs.length > 0) {
    try {
      // BATCHED ADDITION STRATEGY
      // 1. Add first small batch immediately for instant UI response
      const INITIAL_BATCH_SIZE = 20;
      const initialBatch = processedSongs.slice(0, INITIAL_BATCH_SIZE);

      await TrackPlayer.add(initialBatch);
      console.log(`✅ Queue: Added initial ${initialBatch.length} songs instantly`);

      // Emit event to update UI immediately
      DeviceEventEmitter.emit('queue-updated', { count: initialBatch.length });

      // 2. Add remaining songs in background batches
      const remainingSongs = processedSongs.slice(INITIAL_BATCH_SIZE);

      if (remainingSongs.length > 0) {
        InteractionManager.runAfterInteractions(async () => {
          try {
            const BATCH_SIZE = 50;
            for (let i = 0; i < remainingSongs.length; i += BATCH_SIZE) {
              const batch = remainingSongs.slice(i, i + BATCH_SIZE);

              // Small delay to allow UI frame updates between batches
              if (i > 0) await new Promise(resolve => setTimeout(resolve, 50));

              await TrackPlayer.add(batch);
              console.log(`✅ Queue: Added background batch ${i / BATCH_SIZE + 1} (${batch.length} songs)`);
            }

            // Final event to ensuring everything is synced
            DeviceEventEmitter.emit('queue-updated', { count: processedSongs.length });
          } catch (batchError) {
            console.error('❌ Error adding background batch:', batchError);
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to add songs to queue:', error.message);
    }
  }
}
async function PlaySong() {
  await TrackPlayer.play();
}
async function PauseSong() {
  await TrackPlayer.pause();
}

async function SetProgressSong(value) {
  try {
    // Ensure value is a valid number and within bounds
    const seekValue = Math.max(0, parseFloat(value) || 0);
    await TrackPlayer.seekTo(seekValue);
  } catch (error) {
    console.error('Error seeking to position:', error);
  }
}

async function PlayNextSong() {
  // INSTANT RESPONSE: Cancel any in-flight prefetches immediately
  const smartPrefetchManager = require('./Utils/SmartPrefetchManager').default;
  smartPrefetchManager.cancelAllPrefetches();

  // Use SkipOperationManager to debounce and lock skip operations
  const executed = await skipOperationManager.executeSkip(async (signal) => {
    try {
      // Ensure player is initialized
      if (!isPlayerInitialized) {
        console.log('Player not initialized, setting up...');
        await setupPlayer();
      }

      // Stop tracking current song before switching
      await historyManager.stopTracking();

      // Get current track and queue info
      const currentTrack = await TrackPlayer.getCurrentTrack();
      const queue = await TrackPlayer.getQueue();

      console.log('⏭️ PlayNextSong - Current:', currentTrack, 'Queue:', queue.length);

      // If there's no next track, just return
      if (currentTrack >= queue.length - 1) {
        console.log('No next track available');
        return;
      }

      const nextTrackIndex = currentTrack + 1;

      // Re-fetch queue to get the latest state (track may have been replaced by prefetch)
      const freshQueue = await TrackPlayer.getQueue();
      const nextTrack = freshQueue[nextTrackIndex];

      if (!nextTrack) {
        console.log('No next track available');
        return;
      }

      // Check if next track needs stream (wasn't prefetched or still has placeholder URL)
      const needsStream = nextTrack._needsStream ||
        nextTrack.url?.startsWith('ytmusic://') ||
        nextTrack.url?.startsWith('spotify://') ||
        nextTrack.url?.startsWith('dab://') ||
        nextTrack.url?.includes('music.youtube.com');

      // 🚀 OPTIMISTIC UI: Emit metadata IMMEDIATELY for instant visual feedback
      // This shows artwork + title while stream is being fetched in background
      DeviceEventEmitter.emit('song-loading-started', {
        id: nextTrack.id,
        title: nextTrack.title || 'Loading...',
        artist: nextTrack.artist || 'Loading...',
        artwork: nextTrack.artwork || nextTrack.image || '',
        image: nextTrack.artwork || nextTrack.image || '',
        duration: nextTrack.duration,
        isLoading: true,
      });
      console.log('📱 Optimistic UI: Showing next track metadata immediately');

      if (needsStream && !nextTrack._prefetched) {
        // FIRST: Check if SmartPrefetchManager has cached stream
        const cachedStream = smartPrefetchManager.getPrefetchedStream(nextTrack.id);

        if (cachedStream) {
          console.log('✅ Using cached prefetched stream for skip');
          // Replace track in queue with valid URL
          await smartPrefetchManager.replaceTrackAndWait(nextTrackIndex, nextTrack, cachedStream);
          console.log('✅ Track replaced with valid URL');
        } else {
          console.log('🔄 Track not in cache, fetching on-demand...');
          // BACKGROUND FETCH: Start stream fetch, don't await initially
          const streamPromise = smartPrefetchManager.fetchOnDemand(nextTrack.id);

          // Wait for stream with timeout - if too slow, skip anyway
          const streamData = await Promise.race([
            streamPromise,
            new Promise(resolve => setTimeout(() => resolve(null), 3000)) // 3 sec timeout
          ]);

          if (streamData && streamData.url) {
            // Replace track in queue with valid URL
            await smartPrefetchManager.replaceTrackAndWait(nextTrackIndex, nextTrack, streamData);
            console.log('✅ Track replaced with valid URL');
          } else {
            // Stream fetch timed out or failed - rely on error handler to recover
            console.log('⏳ Stream fetch slow/failed, skipping anyway - error handler will recover');
          }
        }
      }

      // Skip to next track
      await TrackPlayer.skipToNext();

      // Get the new track and start tracking it
      const newTrack = await TrackPlayer.getActiveTrack();
      if (newTrack) {
        // Non-blocking: Don't await, let it run in background
        historyManager.startTracking(newTrack).catch(err =>
          console.error('History tracking error:', err)
        );
        skipOperationManager.resetErrorCounter();
      }

      // Ensure playback starts
      const stateAfterSkip = await TrackPlayer.getState();
      if (stateAfterSkip !== TrackPlayer.STATE_PLAYING) {
        await TrackPlayer.play();
      }

    } catch (error) {
      if (error.message === 'AbortError') {
        console.log('⏭️ Skip cancelled');
      } else {
        console.error('❌ Error in PlayNextSong:', error);
      }
      throw error;
    }
  });

  if (!executed) {
    console.log('⏭️ Skip blocked - operation in progress');
  }
}

async function PlayPreviousSong() {
  // INSTANT RESPONSE: Cancel any in-flight prefetches immediately
  const smartPrefetchManager = require('./Utils/SmartPrefetchManager').default;
  smartPrefetchManager.cancelAllPrefetches();

  // Use SkipOperationManager to debounce and lock skip operations
  const executed = await skipOperationManager.executeSkip(async (signal) => {
    try {
      // Ensure player is initialized
      if (!isPlayerInitialized) {
        console.log('Player not initialized, setting up...');
        await setupPlayer();
      }

      // Stop tracking current song before switching
      await historyManager.stopTracking();

      // Check if operation was cancelled
      if (signal.aborted) {
        throw new Error('AbortError');
      }

      // Get current track and queue info
      const currentTrack = await TrackPlayer.getCurrentTrack();
      const queue = await TrackPlayer.getQueue();

      console.log('⏮️ PlayPreviousSong - Current:', currentTrack, 'Queue:', queue.length);

      // If there's no previous track, just return
      if (currentTrack <= 0) {
        console.log('No previous track available');
        return;
      }

      const prevTrackIndex = currentTrack - 1;
      const prevTrack = queue[prevTrackIndex];

      if (!prevTrack) {
        console.log('No previous track available');
        return;
      }

      // Check if previous track needs stream (wasn't prefetched or has placeholder URL)
      const needsStream = prevTrack._needsStream ||
        prevTrack.url?.startsWith('ytmusic://') ||
        prevTrack.url?.startsWith('spotify://') ||
        prevTrack.url?.startsWith('dab://') ||
        prevTrack.url?.includes('music.youtube.com');

      // 🚀 OPTIMISTIC UI: Emit metadata IMMEDIATELY for instant visual feedback
      DeviceEventEmitter.emit('song-loading-started', {
        id: prevTrack.id,
        title: prevTrack.title || 'Loading...',
        artist: prevTrack.artist || 'Loading...',
        artwork: prevTrack.artwork || prevTrack.image || '',
        image: prevTrack.artwork || prevTrack.image || '',
        duration: prevTrack.duration,
        isLoading: true,
      });
      console.log('📱 Optimistic UI: Showing previous track metadata immediately');

      if (needsStream && !prevTrack._prefetched) {
        // FIRST: Check if SmartPrefetchManager has cached stream
        const cachedStream = smartPrefetchManager.getPrefetchedStream(prevTrack.id);

        if (cachedStream) {
          console.log('✅ Using cached prefetched stream for previous');
          // Replace track in queue with valid URL
          await smartPrefetchManager.replaceTrackAndWait(prevTrackIndex, prevTrack, cachedStream);
          console.log('✅ Track replaced with valid URL');
        } else {
          console.log('🔄 Previous track not in cache, fetching on-demand...');
          // BACKGROUND FETCH: Start stream fetch with timeout
          const streamPromise = smartPrefetchManager.fetchOnDemand(prevTrack.id);

          // Wait for stream with timeout - if too slow, skip anyway
          const streamData = await Promise.race([
            streamPromise,
            new Promise(resolve => setTimeout(() => resolve(null), 3000)) // 3 sec timeout
          ]);

          if (streamData && streamData.url) {
            // Replace track in queue with valid URL
            await smartPrefetchManager.replaceTrackAndWait(prevTrackIndex, prevTrack, streamData);
            console.log('✅ Previous track replaced with valid URL');
          } else {
            // Stream fetch timed out or failed - rely on error handler to recover
            console.log('⏳ Stream fetch slow/failed, skipping anyway - error handler will recover');
          }
        }
      }

      // Skip to previous track
      await TrackPlayer.skipToPrevious();

      // Get the new track and start tracking it
      const newTrack = await TrackPlayer.getActiveTrack();
      if (newTrack) {
        // Non-blocking: Don't await, let it run in background
        historyManager.startTracking(newTrack).catch(err =>
          console.error('History tracking error:', err)
        );
        // Reset error counter on successful track change
        skipOperationManager.resetErrorCounter();
      }

      // Ensure playback starts
      const stateAfterSkip = await TrackPlayer.getState();
      if (stateAfterSkip !== TrackPlayer.STATE_PLAYING) {
        await TrackPlayer.play();
      }

    } catch (error) {
      if (error.message === 'AbortError') {
        console.log('⏮️ Skip cancelled');
      } else {
        console.error('❌ Error in PlayPreviousSong:', error);
      }
      throw error;
    }
  });

  if (!executed) {
    console.log('⏮️ Skip blocked - operation already in progress');
  }
}
async function SkipToTrack(trackIndex) {
  try {
    // Stop tracking current song before switching
    await historyManager.stopTracking();

    // Ensure trackIndex is a valid number
    const validIndex = Number(trackIndex);
    if (isNaN(validIndex)) {
      console.error('Invalid trackIndex provided to SkipToTrack:', trackIndex);
      return;
    }

    // Get the queue to verify index is within bounds
    const queue = await TrackPlayer.getQueue();
    if (validIndex < 0 || validIndex >= queue.length) {
      console.error('Track index out of bounds:', validIndex, 'Queue length:', queue.length);
      return;
    }

    const targetTrack = queue[validIndex];

    // Check if track needs stream (random song selection)
    const needsStream = targetTrack._needsStream ||
      targetTrack.url?.startsWith('ytmusic://') ||
      targetTrack.url?.includes('music.youtube.com');

    if (needsStream && !targetTrack._prefetched) {
      console.log('🎯 Random track selection - checking cache...');

      // FIRST: Check if SmartPrefetchManager has cached stream
      const cachedStream = smartPrefetchManager.getPrefetchedStream(targetTrack.id);

      let streamData = cachedStream;

      if (cachedStream) {
        console.log('✅ Using cached prefetched stream for random selection');
      } else {
        console.log('🔄 Track not in cache, fetching on-demand...');
        // Use SmartPrefetchManager for on-demand fetch (with retry)
        streamData = await smartPrefetchManager.fetchOnDemand(targetTrack.id);
      }

      if (streamData && streamData.url) {
        // Replace track in queue with valid URL using SAFE non-blocking method
        await smartPrefetchManager.replaceTrackAndWait(validIndex, targetTrack, streamData);
        console.log('✅ Track replaced for random selection');
      } else {
        console.error('❌ Failed to get stream for random track');
        return;
      }
    }

    await TrackPlayer.skip(validIndex);

    // Get the new track and start tracking it
    const newTrack = await TrackPlayer.getActiveTrack();
    if (newTrack) {
      // Non-blocking: Don't await, let it run in background
      historyManager.startTracking(newTrack).catch(err =>
        console.error('History tracking error:', err)
      );
    }

    await PlaySong();
  } catch (error) {
    console.error('Error in SkipToTrack:', error);
  }
}
async function SetRepeatMode(mode) {
  await setRepeatMode(mode)
}

async function getIndexQuality() {
  const PlaybackQuality = [
    { value: '12kbps' },
    { value: '48kbps' },
    { value: '96kbps' },
    { value: '160kbps' },
    { value: '320kbps' },
  ];
  const data = await GetPlaybackQuality()
  let index = 4
  PlaybackQuality.map((e, i) => {
    if (e.value === data) {
      index = i
    }
  })
  return index
}

async function AddOneSongToPlaylist(song) {
  try {
    console.log('🎵 AddOneSongToPlaylist called with song:', song?.title || 'Unknown');

    // Import the bottom sheet playlist selector manager for better UX
    const { PlaylistSelectorBottomSheetManager } = require('./Utils/PlaylistSelectorBottomSheetManager');

    // Validate song object
    if (!song || !song.id) {
      console.error('❌ Invalid song object provided to AddOneSongToPlaylist:', song);
      ToastAndroid.show('Invalid song data', ToastAndroid.SHORT);
      return false;
    }

    console.log('✅ Song validation passed, song ID:', song.id);

    console.log('AddOneSongToPlaylist called with song (bottom sheet):', song.title);

    // Safe image URL extraction
    const getImageUrl = (imageData) => {
      if (!imageData) return null;
      if (typeof imageData === 'string') return imageData;
      if (Array.isArray(imageData)) {
        for (const img of imageData) {
          if (typeof img === 'string' && img.trim() !== '') return img;
          if (img && typeof img === 'object' && img.url) return img.url;
        }
      }
      if (imageData && typeof imageData === 'object' && imageData.url) return imageData.url;
      return null;
    };

    // Format song object for playlist compatibility if needed
    const formattedSong = {
      id: song.id,
      title: song.title || 'Unknown Title',
      artist: song.artist || 'Unknown Artist',
      artwork: getImageUrl(song.artwork) || getImageUrl(song.image) || null,
      url: song.url || '',
      duration: song.duration || 0,
      language: song.language || '',
      artistID: song.artistID || song.primary_artists_id || '',
    };

    // Use the PlaylistSelectorBottomSheetManager to show the bottom drawer
    console.log('📱 Attempting to show PlaylistSelectorBottomSheet...');
    const result = PlaylistSelectorBottomSheetManager.show(formattedSong);
    console.log('📱 PlaylistSelectorBottomSheetManager.show result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error showing playlist selector bottom sheet:', error);
    ToastAndroid.show('Error opening playlist selector', ToastAndroid.SHORT);
    return false;
  }
}

export {
  PlayOneSong,
  PlaySong,
  PauseSong,
  SetProgressSong,
  PlayNextSong,
  AddPlaylist,
  PlayPreviousSong,
  AddSongsToQueue,
  SkipToTrack,
  SetRepeatMode,
  getIndexQuality,
  AddOneSongToPlaylist
}
