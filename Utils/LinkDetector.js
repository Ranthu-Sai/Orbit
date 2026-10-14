/**
 * Pull the first http(s) URL out of arbitrary text. Share intents from
 * Spotify / YouTube Music often wrap the link in promotional copy, e.g.
 * "Check out this playlist on Spotify: https://open.spotify.com/playlist/...".
 * Falls back to the trimmed input when no URL is found.
 */
export const extractUrlFromText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }
  const match = rawText.match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : rawText.trim();
};

export const detectLink = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  const trimmedUrl = extractUrlFromText(url);
  if (!trimmedUrl) {
    return null;
  }

  // --- Spotify ---
  if (trimmedUrl.includes('spotify.com')) {
    // Playlist
    if (trimmedUrl.includes('/playlist/')) {
      const id = extractId(trimmedUrl, '/playlist/');
      return { source: 'spotify', type: 'playlist', id, url: trimmedUrl };
    }
    // Album
    if (trimmedUrl.includes('/album/')) {
      const id = extractId(trimmedUrl, '/album/');
      return { source: 'spotify', type: 'album', id, url: trimmedUrl };
    }
    // Track
    if (trimmedUrl.includes('/track/')) {
      const id = extractId(trimmedUrl, '/track/');
      return { source: 'spotify', type: 'track', id, url: trimmedUrl };
    }
  }

  // --- YouTube / YouTube Music ---
  if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
    const isYTMusic = trimmedUrl.includes('music.youtube.com');
    const ytSource = isYTMusic ? 'ytmusic' : 'youtube';

    // 1. YouTube Playlist (list=ID)
    // Check for 'list' parameter
    const listMatch = trimmedUrl.match(/[?&]list=([^&#]+)/);
    if (listMatch) {
      const listId = listMatch[1];

      // Distinguish Album vs Playlist if possible
      if (listId.startsWith('OLAK') || listId.startsWith('MPRE')) {
        return { source: 'ytmusic', type: 'album', id: listId, url: trimmedUrl };
      }

      return { source: ytSource, type: 'playlist', id: listId, url: trimmedUrl };
    }

    // 2. YouTube Album (browse/ID) - mainly YTM
    if (isYTMusic && trimmedUrl.includes('/browse/')) {
      const parts = trimmedUrl.split('/browse/');
      const id = parts[1]?.split('?')[0];
      if (id) {
        return { source: 'ytmusic', type: 'album', id, url: trimmedUrl };
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
      return { source: ytSource, type: 'video', id: videoId, url: trimmedUrl };
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
