import TrackPlayer from "react-native-track-player";
import { setRepeatMode } from "react-native-track-player/lib/trackPlayer";
import { GetPlaybackQuality } from "./LocalStorage/AppSettings";
import NetInfo from "@react-native-community/netinfo";
import { ToastAndroid, DeviceEventEmitter } from "react-native";
import historyManager from "./Utils/HistoryManager";
import PythonBridgeService from "./Utils/PythonBridgeService";
import dabMusicService from "./Utils/DabMusicService";
import youtubeStreamingService from "./Utils/YouTubeStreamingService";
import queueManager from "./Utils/QueueManager";
import autoRecommendations from "./Utils/AutoRecommendations";

let isPlayerInitialized = false;

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

        // Add event listeners
        TrackPlayer.addEventListener('remote-play', () => TrackPlayer.play());
        TrackPlayer.addEventListener('remote-pause', () => TrackPlayer.pause());
        TrackPlayer.addEventListener('remote-stop', () => TrackPlayer.destroy());
        TrackPlayer.addEventListener('remote-next', () => PlayNextSong());
        TrackPlayer.addEventListener('remote-previous', () => PlayPreviousSong());
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
      } catch (setupError) {
        // Check if the error is about player already being initialized
        if (setupError.message && setupError.message.includes('player has already been initialized')) {
          console.log('Player already initialized in MusicPlayerFunctions');
          isPlayerInitialized = true;
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

    // Check if this is a YouTube song (has videoId/id that looks like YouTube video ID)
    const isYouTubeSong = song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isLocalMusic;

    if (isYouTubeSong) {
      try {
        console.log('Fetching YouTube stream for video ID:', song.id);
        const streamData = await youtubeStreamingService.getStreamUrl(song.id);

        if (streamData && streamData.url) {
          playbackUrl = streamData.url;
          // Update song with stream data and headers
          // IMPORTANT: Preserve artist from original song data
          updatedSong = {
            ...updatedSong,
            url: streamData.url,
            headers: streamData.headers,  // CRITICAL: Pass headers to TrackPlayer
            userAgent: streamData.headers?.['User-Agent'],  // Explicit for ExoPlayer
            artwork: streamData.thumbnail || updatedSong.artwork,
            duration: streamData.duration || updatedSong.duration,
            // Only use stream title if we don't have a good title already
            title: updatedSong.title || streamData.title,
            // Preserve artist from original song data (don't use stream artist)
            artist: updatedSong.artist || 'Unknown Artist',
          };
          console.log('YouTube stream URL fetched successfully');
        } else {
          console.error('Failed to get YouTube stream URL');
          ToastAndroid.show('Failed to load YouTube stream', ToastAndroid.SHORT);
          return;
        }
      } catch (error) {
        console.error('Error fetching YouTube stream:', error);
        ToastAndroid.show('Error loading YouTube stream', ToastAndroid.SHORT);
        return;
      }
    }
    // Check if this is a DAB Music track
    else if (song.isDabTrack || song.source === 'dab' || (!isNaN(song.url) && String(song.url).length > 5)) {
      try {
        console.log('🎵 DAB Track detected! Fetching stream URL for ID:', song.id);
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

    // Check network availability for non-local files
    if (!isLocalFile) {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('Cannot play online song while offline');
        // Return early or try to play a cached version
        return;
      }
    }

    // Start tracking this song in history
    await historyManager.startTracking(song);

    // Create a copy of the song with the selected playback URL and quality info
    const qualityIndex = await getIndexQuality();
    const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
    const currentQuality = qualityNames[qualityIndex] || 'Unknown';

    const songForPlayback = {
      ...updatedSong,
      url: playbackUrl,
      currentPlayingQuality: currentQuality
    };

    await TrackPlayer.reset();
    await TrackPlayer.add([songForPlayback]);
    await TrackPlayer.play();

    // For individual YTMusic song plays, fetch recommendations to build queue
    if (isYouTubeSong) {
      setTimeout(async () => {
        try {
          console.log('🎵 Building queue from YTMusic recommendations for:', song.id);
          const recommendations = await queueManager.buildQueueFromRecommendations(song.id, 'ytmusic', 30);

          if (recommendations && recommendations.length > 0) {
            // Filter out the current song from recommendations
            const filteredRecs = recommendations.filter(rec => rec.id !== song.id);

            if (filteredRecs.length > 0) {
              // Use AddSongsToQueue which handles stream fetching for YTMusic
              await AddSongsToQueue(filteredRecs);
              console.log(`✅ Added ${filteredRecs.length} recommended songs to queue`);
            }
          }
        } catch (error) {
          console.error('Error building queue from recommendations:', error);
          // Non-fatal - continue playing the current song
        }
      }, 1500); // Wait 1.5 seconds after playback starts
    }

    // Trigger prefetch for next song in queue (if any)
    setTimeout(() => {
      queueManager.prefetchNextTrack().catch(err =>
        console.error('Error prefetching next track:', err)
      );
    }, 3000); // Wait 3 seconds (after recommendations load)

    // Set up continuous queue monitoring - fetch more when near end
    queueManager.startContinuousQueueMonitor(song.id);
  } catch (error) {
    console.error('Error playing song:', error);
  }
}

async function AddPlaylist(songs) {
  try {
    // Validate songs array
    if (!Array.isArray(songs) || songs.length === 0) {
      console.error('Invalid songs array provided to AddPlaylist');
      return;
    }

    // Ensure all songs have albumId if it exists on the first song
    const albumId = songs[0]?.albumId;
    if (albumId) {
      songs = songs.map(song => ({
        ...song,
        albumId: albumId // Ensure all songs have the same albumId
      }));
    }

    // Apply playback quality setting to all songs
    const qualityIndex = await getIndexQuality();
    const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
    const currentQuality = qualityNames[qualityIndex] || 'Unknown';

    const processedSongs = await Promise.all(songs.map(async (song) => {
      let playbackUrl = song.url;
      let updatedSong = { ...song };

      // Check if this is a YouTube song
      const isYouTubeSong = song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isLocalMusic;

      if (isYouTubeSong) {
        // For YouTube songs in playlist, fetch stream for first song only
        // Others will be fetched on-demand
        const isFirstSong = songs.indexOf(song) === 0;

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
              };
            }
          } catch (error) {
            console.error('Error fetching YouTube stream for first playlist song:', error);
          }
        } else {
          // Mark as needing stream fetch later
          // Set a placeholder URL with videoId - will be replaced before playback
          playbackUrl = `ytmusic://${song.id || song.videoId}`;
          updatedSong._needsStream = true;
          updatedSong.isYTMusic = true;
        }
      }
      // Check if this is a DAB Music track
      else if (song.isDabTrack || song.source === 'dab' || (!isNaN(song.url) && String(song.url).length > 5)) {
        try {
          console.log('🎵 DAB Track detected in playlist! Fetching stream URL for ID:', song.id);
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
              currentPlayingQuality: dabQuality
            };
            console.log('✅ DAB stream URL fetched successfully for playlist');
            console.log('🎵 Quality:', dabQuality);
          } else {
            console.error('Failed to get DAB stream URL for playlist song');
          }
        } catch (error) {
          console.error('❌ Error fetching DAB stream for playlist song:', error);
          // Continue with original URL
        }
      } else {
        // Select appropriate quality URL
        if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
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

      // Extract artwork - handle all possible formats
      const extractArtwork = (song) => {
        // Direct artwork/image string
        if (song.artwork && typeof song.artwork === 'string' && song.artwork.length > 0) {
          return song.artwork;
        }
        if (song.image && typeof song.image === 'string' && song.image.length > 0) {
          return song.image;
        }
        // Array format (Saavn)
        if (song.image && Array.isArray(song.image)) {
          const bestImage = song.image[2] || song.image[song.image.length - 1] || song.image[0];
          if (bestImage?.url) return bestImage.url;
          if (bestImage?.link) return bestImage.link;
          if (typeof bestImage === 'string') return bestImage;
        }
        // Thumbnail format (YTMusic)
        if (song.thumbnail && typeof song.thumbnail === 'string') {
          return song.thumbnail;
        }
        if (song.thumbnails && Array.isArray(song.thumbnails)) {
          const bestThumb = song.thumbnails[song.thumbnails.length - 1] || song.thumbnails[0];
          if (bestThumb?.url) return bestThumb.url;
        }
        return '';
      };

      const artworkUrl = extractArtwork(song) || extractArtwork(updatedSong);

      return {
        ...updatedSong,
        url: playbackUrl,
        artwork: artworkUrl,
        image: artworkUrl,
        currentPlayingQuality: currentQuality
      };
    }));

    await TrackPlayer.reset();
    await TrackPlayer.add(processedSongs);
    await TrackPlayer.play();

    // Auto-recommendations disabled temporarily - URL handling needs proper fix
    // TODO: Re-enable once lazy loading is properly implemented
    /*
    const hasYTMusicSongs = processedSongs.some(song => song.source === 'ytmusic' || (song.id && song.id.length === 11));
    if (hasYTMusicSongs && processedSongs.length > 0) {
      const firstSongId = processedSongs[0].id;
      console.log('✨ Starting auto-recommendations for YTMusic playlist, first song:', firstSongId);
      setTimeout(() => {
        autoRecommendations.start(firstSongId).catch(err =>
          console.error('Error starting auto-recommendations:', err)
        );
      }, 2000);
    }
    */

    // Prefetch next song after a short delay
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
  console.log(`🎵 AddSongsToQueue: Starting progressive queue loading for ${songs.length} songs...`);

  const qualityIndex = await getIndexQuality();
  const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
  const currentQuality = qualityNames[qualityIndex] || 'Unknown';

  // Separate YTMusic songs from others
  const ytMusicSongs = [];
  const otherSongs = [];

  for (const song of songs) {
    const hasValidYouTubeId = song.id && typeof song.id === 'string' && song.id.length === 11;
    const isYTMusicSource = song.source === 'ytmusic' || song.isYTMusic === true;
    const isDabSong = song.isDabTrack || song.source === 'dab';

    if ((hasValidYouTubeId && !song.isLocalMusic) || isYTMusicSource) {
      ytMusicSongs.push(song);
    } else if (isDabSong) {
      otherSongs.push({ ...song, isDab: true });
    } else {
      otherSongs.push(song);
    }
  }

  console.log(`📊 Queue: ${ytMusicSongs.length} YTMusic, ${otherSongs.length} other`);

  let totalAdded = 0;

  // PROGRESSIVE LOADING: Fetch and add YTMusic songs in batches of 5
  // Each batch is added to TrackPlayer IMMEDIATELY after fetching
  if (ytMusicSongs.length > 0) {
    const batchSize = 5;
    console.log(`🎯 Progressive loading: ${ytMusicSongs.length} songs in ${Math.ceil(ytMusicSongs.length / batchSize)} batches`);

    for (let batchIndex = 0; batchIndex < ytMusicSongs.length; batchIndex += batchSize) {
      const batch = ytMusicSongs.slice(batchIndex, batchIndex + batchSize);
      const batchNum = Math.floor(batchIndex / batchSize) + 1;

      console.log(`📦 Batch ${batchNum}: Fetching ${batch.length} streams...`);

      // Fetch all streams in this batch in parallel
      const fetchPromises = batch.map(async (song) => {
        try {
          const streamData = await youtubeStreamingService.getStreamUrl(song.id);
          if (streamData && streamData.url) {
            // Cache the stream URL for instant playback later
            queueManager.streamCache.set(song.id, streamData);

            return {
              ...song,
              url: streamData.url,
              headers: streamData.headers,
              userAgent: streamData.headers?.['User-Agent'],
              artwork: streamData.thumbnail || song.artwork || song.image,
              duration: streamData.duration || song.duration,
              source: 'ytmusic',
              _needsStream: false,
              currentPlayingQuality: currentQuality
            };
          }
          return null;
        } catch (error) {
          console.error(`❌ Stream error ${song.title?.substring(0, 20)}:`, error.message);
          return null;
        }
      });

      const results = await Promise.allSettled(fetchPromises);
      const validSongs = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      // ADD THIS BATCH TO TRACKPLAYER IMMEDIATELY
      if (validSongs.length > 0) {
        try {
          await TrackPlayer.add(validSongs);
          totalAdded += validSongs.length;
          console.log(`✅ Batch ${batchNum}: Added ${validSongs.length} songs (Total: ${totalAdded})`);

          // Emit event AFTER EACH BATCH to refresh queue UI progressively
          DeviceEventEmitter.emit('queue-updated', { count: totalAdded, batch: batchNum });
        } catch (addError) {
          console.error(`❌ Batch ${batchNum} add failed:`, addError.message);
        }
      }

      // Small delay between batches to not overwhelm the system
      if (batchIndex + batchSize < ytMusicSongs.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  // Process and add non-YTMusic songs (Saavn, local, etc.)
  const processedOtherSongs = [];
  for (const song of otherSongs) {
    let playbackUrl = song.url || '';

    if (song.isDab) {
      try {
        await dabMusicService.initialize();
        playbackUrl = await dabMusicService.getStreamUrl(song.id) || '';
      } catch (error) {
        continue;
      }
    } else if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
      playbackUrl = song.downloadUrl[qualityIndex]?.url ||
        song.downloadUrl.find(d => d?.url)?.url || playbackUrl;
    } else if (song.download_url && Array.isArray(song.download_url)) {
      playbackUrl = song.download_url[qualityIndex]?.url ||
        song.download_url.find(d => d?.url)?.url || playbackUrl;
    }

    if (playbackUrl && playbackUrl.trim() !== '') {
      processedOtherSongs.push({ ...song, url: playbackUrl, currentPlayingQuality: currentQuality });
    }
  }

  if (processedOtherSongs.length > 0) {
    try {
      await TrackPlayer.add(processedOtherSongs);
      totalAdded += processedOtherSongs.length;
      console.log(`✅ Added ${processedOtherSongs.length} non-YTMusic songs`);
    } catch (error) {
      console.error('❌ Failed to add other songs:', error.message);
    }
  }

  console.log(`🎉 Queue loading complete! Total: ${totalAdded} songs added`);

  // Emit event to trigger queue UI refresh
  DeviceEventEmitter.emit('queue-updated', { count: totalAdded });
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
    const playerState = await TrackPlayer.getState();

    console.log('PlayNextSong called - Current track:', currentTrack, 'Queue length:', queue.length, 'Player state:', playerState);

    // If there's no next track, just return
    if (currentTrack >= queue.length - 1) {
      console.log('No next track available');
      return;
    }

    const nextTrackIndex = currentTrack + 1;
    const nextTrack = queue[nextTrackIndex];

    // Check if next track needs stream URL fetching
    if (nextTrack._needsStream) {
      console.log('🔄 Next track needs stream, fetching on-demand...');
      await queueManager.fetchStreamForTrack(nextTrackIndex);
    }

    // Skip to next track and ensure it plays
    await TrackPlayer.skipToNext();

    // Short delay to allow track to change
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get the new track and start tracking it
    const newTrack = await TrackPlayer.getActiveTrack();
    if (newTrack) {
      await historyManager.startTracking(newTrack);
    }

    // Check player state and play if not already playing
    const stateAfterSkip = await TrackPlayer.getState();
    console.log('Player state after skip:', stateAfterSkip);

    if (stateAfterSkip !== TrackPlayer.STATE_PLAYING) {
      try {
        await TrackPlayer.play();
        console.log('Play command issued after skip');
      } catch (playError) {
        console.error('Error playing after skip:', playError);
      }
    }

    // Prefetch the next song after this one
    setTimeout(() => {
      queueManager.prefetchNextTrack().catch(err =>
        console.error('Error prefetching next track:', err)
      );
    }, 1000);
  } catch (error) {
    console.error('Error in PlayNextSong:', error);
  }
}

async function PlayPreviousSong() {
  try {
    // Ensure player is initialized
    if (!isPlayerInitialized) {
      console.log('Player not initialized, setting up...');
      await setupPlayer();
    }

    // Stop tracking current song before switching
    await historyManager.stopTracking();

    await TrackPlayer.skipToPrevious();

    // Get the new track and start tracking it
    const newTrack = await TrackPlayer.getActiveTrack();
    if (newTrack) {
      await historyManager.startTracking(newTrack);
    }

    PlaySong();
  } catch (error) {
    console.error('Error in PlayPreviousSong:', error);
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

    await TrackPlayer.skip(validIndex);

    // Get the new track and start tracking it
    const newTrack = await TrackPlayer.getActiveTrack();
    if (newTrack) {
      await historyManager.startTracking(newTrack);
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
