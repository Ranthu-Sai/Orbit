/**
 * LinkDetector.js
 *
 * Utility to parse URLs and detect source, type, and ID.
 * Supports:
 * - Spotify: Playlist, Album, Track
 * - YouTube: Playlist, Video
 * - YouTube Music: Playlist, Album, Video
 */

export const detectLink = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const trimmedUrl = url.trim();

  // --- Spotify ---
  if (trimmedUrl.includes('spotify.com')) {
    // Playlist
    if (trimmedUrl.includes('/playlist/')) {
      const id = extractId(trimmedUrl, '/playlist/');
      return { source: 'spotify', type: 'playlist', id };
    }
    // Album
    if (trimmedUrl.includes('/album/')) {
      const id = extractId(trimmedUrl, '/album/');
      return { source: 'spotify', type: 'album', id };
    }
    // Track
    if (trimmedUrl.includes('/track/')) {
      const id = extractId(trimmedUrl, '/track/');
      return { source: 'spotify', type: 'track', id };
    }
  }

  // --- YouTube / YouTube Music ---
  if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
    // 1. YouTube Playlist (list=ID)
    // Check for 'list' parameter
    const listMatch = trimmedUrl.match(/[?&]list=([^&#]+)/);
    if (listMatch) {
      const listId = listMatch[1];

      // Distinguish Album vs Playlist if possible
      if (listId.startsWith('OLAK') || listId.startsWith('MPRE')) {
        return { source: 'ytmusic', type: 'album', id: listId };
      }

      return { source: 'youtube', type: 'playlist', id: listId };
    }

    // 2. YouTube Album (browse/ID) - mainly YTM
    if (
      trimmedUrl.includes('music.youtube.com') &&
      trimmedUrl.includes('/browse/')
    ) {
      const parts = trimmedUrl.split('/browse/');
      const id = parts[1]?.split('?')[0];
      if (id) {
        return { source: 'ytmusic', type: 'album', id };
      }
    }

    // 3. YouTube Video / Track (watch?v=ID or youtu.be/ID)
    let videoId = null;
    const vMatch = trimmedUrl.match(/[?&]v=([^&#]+)/);

    if (vMatch) {
      videoId = vMatch[1];
    } else if (trimmedUrl.includes('youtu.be/')) {
      videoId = trimmedUrl.split('youtu.be/')[1]?.split('?')[0];
    }

    if (videoId) {
      return { source: 'youtube', type: 'video', id: videoId };
    }
  }

  return null;
};

const extractId = (url, prefix) => {
  try {
    const parts = url.split(prefix);
    let id = parts[1];
    if (id) {
      // Remove query params
      id = id.split('?')[0];
      // Remove following path segments if any (rare for these IDs but good safety)
      id = id.split('/')[0];
      return id;
    }
  } catch (e) {
    return null;
  }
  return null;
};
