import TrackPlayer from "react-native-track-player";
import { setRepeatMode } from "react-native-track-player/lib/trackPlayer";
import { GetPlaybackQuality } from "./LocalStorage/AppSettings";
import NetInfo from "@react-native-community/netinfo";
import { ToastAndroid } from "react-native";
import historyManager from "./Utils/HistoryManager";

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
      ...song,
      url: playbackUrl,
      currentPlayingQuality: currentQuality
    };

    await TrackPlayer.reset();
    await TrackPlayer.add([songForPlayback]);
    await TrackPlayer.play();
  } catch (error) {
    console.error('Error playing song:', error);
  }
}

async function AddPlaylist (songs){
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

    const processedSongs = songs.map(song => {
      let playbackUrl = song.url;

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

      return {
        ...song,
        url: playbackUrl,
        currentPlayingQuality: currentQuality
      };
    });

    await TrackPlayer.reset();
    await TrackPlayer.add(processedSongs);
    await TrackPlayer.play();
  } catch (error) {
    console.error('Error in AddPlaylist:', error);
  }
}

async function AddSongsToQueue(songs){
  // Apply playback quality setting to songs being added to queue
  const qualityIndex = await getIndexQuality();
  const qualityNames = ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps'];
  const currentQuality = qualityNames[qualityIndex] || 'Unknown';

  const processedSongs = songs.map(song => {
    let playbackUrl = song.url;

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

    return {
      ...song,
      url: playbackUrl,
      currentPlayingQuality: currentQuality
    };
  });

  await TrackPlayer.add(processedSongs);
}
async function PlaySong(){
  await TrackPlayer.play();
}
async function PauseSong(){
  await TrackPlayer.pause();
}

async function SetProgressSong(value){
  try {
    // Ensure value is a valid number and within bounds
    const seekValue = Math.max(0, parseFloat(value) || 0);
    await TrackPlayer.seekTo(seekValue);
  } catch (error) {
    console.error('Error seeking to position:', error);
  }
}

async function PlayNextSong(){
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
  } catch (error) {
    console.error('Error in PlayNextSong:', error);
  }
}

async function PlayPreviousSong(){
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
async function SkipToTrack(trackIndex){
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
async function SetRepeatMode(mode){
  await setRepeatMode(mode)
}

async function getIndexQuality(){
  const PlaybackQuality = [
    { value: '12kbps' },
    { value: '48kbps' },
    { value: '96kbps' },
    { value: '160kbps' },
    { value: '320kbps' },
  ];
  const data = await GetPlaybackQuality()
  let index = 4
  PlaybackQuality.map((e, i)=>{
    if (e.value === data){
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
