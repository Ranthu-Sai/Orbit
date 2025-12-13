import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import LyricsPage from './LyricsPage';
import { GetLyricsButton } from './GetLyricsButton';
import { getUnifiedLyrics } from '../../Api/Songs';
import { GetLyricsProvider } from '../../LocalStorage/AppSettings';

// Constants for error messages
const ERROR_MESSAGES = {
  NO_TRACK: 'No song playing or missing track information. Please play a song first.',
  OFFLINE: 'You are offline. Lyrics are not available in offline mode.',
  NOT_FOUND: 'No Lyrics Found\nSorry, we couldn\'t find lyrics for this song.',
  EMPTY_LYRICS: 'No Lyrics Found\nLyrics data is empty for this song.',
  FETCH_ERROR: 'Could not fetch lyrics. Please try again.'
};

const parseLRC = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const lyrics = [];
  const timeRegex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;

  lines.forEach(line => {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msString = match[3];
      const milliseconds = parseInt(msString.length === 2 ? msString + '0' : msString, 10);
      const time = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
      const text = match[4].trim();
      if (text) {
        lyrics.push({ time, text });
      }
    }
  });
  return lyrics.sort((a, b) => a.time - b.time);
};

/**
 * Handles fetching and displaying lyrics for the currently playing track
 */
export const LyricsHandler = ({
  currentPlayingTrack,
  isOffline,
  onLyricsVisibilityChange,
  currentArtworkSource,
  iconColor,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [lyricData, setLyricData] = useState([]); // Array of {time, text} or empty
  const [errorMessage, setErrorMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Notify parent component about dialog visibility changes
  useEffect(() => {
    onLyricsVisibilityChange?.(showDialog);
  }, [showDialog, onLyricsVisibilityChange]);

  // Clear lyrics when dialog is closed to prevent stale data
  useEffect(() => {
    if (!showDialog) {
      setLyricData([]);
      setErrorMessage(null);
    }
  }, [currentPlayingTrack?.id, showDialog]);

  /**
   * Fetches lyrics for the current track
   */
  const fetchLyrics = useCallback(async () => {
    if (!currentPlayingTrack?.title || !currentPlayingTrack?.artist) {
      setErrorMessage(ERROR_MESSAGES.NO_TRACK);
      setShowDialog(true);
      return;
    }

    setShowDialog(true);
    setIsLoading(true);
    setLyricData([]);
    setErrorMessage(null);

    try {
      if (isOffline) {
        setErrorMessage(ERROR_MESSAGES.OFFLINE);
        return;
      }

      const { artist, title, duration } = currentPlayingTrack;
      const providerPreference = await GetLyricsProvider();
      const lyricsData = await getUnifiedLyrics(artist, title, duration, providerPreference);

      if (!lyricsData?.success) {
        setErrorMessage(lyricsData?.message || ERROR_MESSAGES.NOT_FOUND);
        return;
      }

      const { syncedLyrics, plainLyrics } = lyricsData.data || {};

      if (syncedLyrics) {
        setLyricData(parseLRC(syncedLyrics));
      } else if (plainLyrics) {
        // Handle plain lyrics by creating a single item or just splitting by newline without time
        // For now, LyricsPage expects distinct lines with time. 
        // We can create dummy time or handle plain text display in LyricsPage.
        // Let's split plain text into lines with 0 time for now, or handle specifically.
        // Actually, let's just use 0 time for all to show them in list.
        const lines = plainLyrics.split('\n').filter(t => t.trim()).map(text => ({ time: 0, text }));
        setLyricData(lines);
      } else {
        setErrorMessage(ERROR_MESSAGES.EMPTY_LYRICS);
      }
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      setErrorMessage(ERROR_MESSAGES.FETCH_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlayingTrack, isOffline]);

  return (
    <>
      <GetLyricsButton onPress={fetchLyrics} color={iconColor} />
      <LyricsPage
        visible={showDialog}
        onClose={() => setShowDialog(false)}
        currentSong={currentPlayingTrack}
        lyrics={errorMessage ? [{ time: 0, text: errorMessage }] : lyricData}
        isLoading={isLoading}
      />
    </>
  );
};

// Add prop type validation if needed
// LyricsHandler.propTypes = {
//   currentPlayingTrack: PropTypes.shape({
//     title: PropTypes.string,
//     artist: PropTypes.string,
//     id: PropTypes.string,
//   }),
//   isOffline: PropTypes.bool,
//   onLyricsVisibilityChange: PropTypes.func,
//   currentArtworkSource: PropTypes.any,
// };
