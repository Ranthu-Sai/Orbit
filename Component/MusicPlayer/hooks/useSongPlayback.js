import { ToastAndroid } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { formatTrackForPlayer } from '../../../Utils/PlaybackUtils';

export const useSongPlayback = (song, updateTrack, closeMenu) => {
  const addToQueue = async () => {
    if (closeMenu) closeMenu();
    
    if (!song?.id) {
      ToastAndroid.show('No song data available', ToastAndroid.SHORT);
      return;
    }

    try {
      const trackToAdd = await formatTrackForPlayer(song);
      await TrackPlayer.add([trackToAdd]);
      if (updateTrack) updateTrack();
      ToastAndroid.show(`Added ${song.title || 'song'} to queue`, ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error adding to queue:', error);
      ToastAndroid.show('Failed to add to queue', ToastAndroid.SHORT);
    }
  };

  const playNext = async () => {
    if (closeMenu) closeMenu();

    if (!song?.url && !song?.id) {
      ToastAndroid.show('No song data available', ToastAndroid.SHORT);
      return;
    }

    try {
      const trackToAdd = await formatTrackForPlayer(song);

      const currentIndex = await TrackPlayer.getCurrentTrack();
      const queue = await TrackPlayer.getQueue();
      
      if (currentIndex === null || queue.length === 0) {
        // If no track is playing, just start playing this song
        await TrackPlayer.reset();
        await TrackPlayer.add([trackToAdd]);
        await TrackPlayer.play();
      } else {
        // For play next, we need to insert right after the current playing track
        // First, remove the track if it already exists in the queue to avoid duplicates
        const existingIndex = queue.findIndex(
          (track) => track.id === trackToAdd.id
        );
        
        if (existingIndex !== -1) {
          await TrackPlayer.remove(existingIndex);
          // Need to get the updated current index in case we removed a track before it
          const updatedCurrentIndex = await TrackPlayer.getCurrentTrack();
          await TrackPlayer.add([trackToAdd], updatedCurrentIndex + 1);
        } else {
          // Insert right after current track
          await TrackPlayer.add([trackToAdd], currentIndex + 1);
        }
      }

      if (updateTrack) updateTrack();
      ToastAndroid.show(`${song.title || 'song'} will play next`, ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error setting play next:', error);
      ToastAndroid.show('Failed to set play next', ToastAndroid.SHORT);
    }
  };

  return { addToQueue, playNext };
};
