import axios from 'axios';
import { NativeModules } from 'react-native';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { requestWithFallback } from './apiUtils';

async function getSearchSongData(searchText, page, limit) {
  const encodedText = encodeURIComponent(searchText || '');
  const cacheKey = `search_v3_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/search/songs?query=${encodedText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${encodedText}&page=${page}&limit=${limit}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting search data for "${searchText}":`, error);
    return { success: false, results: [], error: 'Network or Cache Error' };
  }
}

async function getArtistSongs(artistId) {
  const cacheKey = `artist_songs_v3_${artistId}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/artists/${artistId}/songs`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/songs`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      60,
      CACHE_GROUPS.SEARCH
    );
  } catch (error) {
    console.error(`Error getting songs for artist ID ${artistId}:`, error);
    throw error;
  }
}

async function getArtistSongsPaginated(artistId, page = 1, limit = 10) {
  const cacheKey = `artist_songs_paginated_v3_${artistId}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/artists/${artistId}/songs?page=${page}&limit=${limit}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/songs?page=${page}&limit=${limit}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      60,
      CACHE_GROUPS.SEARCH
    );
  } catch (error) {
    console.error(
      `Error getting paginated songs for artist ID ${artistId}:`,
      error
    );
    throw error;
  }
}

async function getArtistDetails(artistId) {
  const cacheKey = `artist_details_v2_${artistId}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/artists/${artistId}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      1440,
      CACHE_GROUPS.SEARCH
    );
  } catch (error) {
    console.error(`Error getting details for artist ID ${artistId}:`, error);
    throw error;
  }
}

async function getArtistAlbumsPaginated(artistId, page = 1, limit = 10) {
  const cacheKey = `artist_albums_paginated_v3_${artistId}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/artists/${artistId}/albums?page=${page}&limit=${limit}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/albums?page=${page}&limit=${limit}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      60,
      CACHE_GROUPS.SEARCH
    );
  } catch (error) {
    console.error(
      `Error getting paginated albums for artist ID ${artistId}:`,
      error
    );
    throw error;
  }
}

async function getAlbumSongs(albumId) {
  const cacheKey = `album_songs_v3_${albumId}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/albums?id=${albumId}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/albums?id=${albumId}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      60,
      CACHE_GROUPS.SONGS
    );
  } catch (error) {
    console.error(`Error getting songs for album ID ${albumId}:`, error);
    throw error;
  }
}

async function getSongDetails(id) {
  const cacheKey = `song_details_v2_${id}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/songs/${id}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/songs/${id}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      10080, // 7 days
      CACHE_GROUPS.SONGS
    );
  } catch (error) {
    console.error(`Error getting details for song ID ${id}:`, error);
    throw error;
  }
}

async function getArtistFromSong(searchText, page, limit) {
  const encodedText = encodeURIComponent(searchText || '');
  const cacheKey = `artist_from_song_v2_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/search/artists?query=${encodedText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/artists?query=${encodedText}&page=${page}&limit=${limit}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      10080, // 7 days
      CACHE_GROUPS.SEARCH
    );
  } catch (error) {
    console.error(
      `Error getting artist from song for query "${searchText}":`,
      error
    );
    throw error;
  }
}

async function getStreamingUrl(id) {
  try {
    const { InnerTube } = NativeModules;
    const streamUrl = await InnerTube.getStreamingUrl(id, '192');
    return streamUrl;
  } catch (e) {
    console.error('Error getting streaming URL:', e);
    return null;
  }
}

// LrcLib sits behind Cloudflare and rejects requests without a User-Agent (520)
const LYRICS_REQUEST_HEADERS = {
  'User-Agent': 'Orbit Music App (https://github.com/gauravxdevv/Orbit)',
  Accept: 'application/json',
};

// Pick the result closest to the track duration, preferring synced lyrics
function pickBestLrcLibMatch(results, duration) {
  const withLyrics = results.filter(
    (r) => r && !r.instrumental && (r.syncedLyrics || r.plainLyrics)
  );
  if (withLyrics.length === 0) return null;
  const score = (r) => {
    const diff = duration && r.duration ? Math.abs(r.duration - duration) : 0;
    return diff + (r.syncedLyrics ? 0 : 1000);
  };
  return withLyrics.reduce((best, r) => (score(r) < score(best) ? r : best));
}

async function getLyricsFromLrcLib(artist, title, duration) {
  if (!artist || !title) {
    return { success: false, message: 'Missing artist or title' };
  }

  // Extract the main song name before any parentheses
  const cleanTitle = title
    .split('(')[0] // Take only the part before the first parenthesis
    .split('[')[0] // Take only the part before the first bracket
    .replace(/\.{3}$/g, '') // Remove trailing ellipsis if any
    .replace(/\s+$/, '') // Remove any trailing whitespace
    .trim();

  const cleanArtist = artist.split(',')[0].trim();

  const cacheKey = `lrc_lib_v2_${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`;
  const fetchFunction = async () => {
    const urlsToTry = [
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(
        cleanArtist
      )}&track_name=${encodeURIComponent(cleanTitle)}`,
      `https://lrclib.net/api/search?q=${encodeURIComponent(
        `${cleanTitle} ${cleanArtist}`
      )}`,
      `https://lrclib.net/api/search?track_name=${encodeURIComponent(
        cleanTitle
      )}`,
    ];

    for (const url of urlsToTry) {
      try {
        console.log('[LrcLib] Try URL:', url);
        const response = await fetch(url, { headers: LYRICS_REQUEST_HEADERS });
        if (response.ok) {
          const data = await response.json();
          console.log('[LrcLib] Response length:', data ? data.length : 0);
          const match = Array.isArray(data)
            ? pickBestLrcLibMatch(data, duration)
            : null;
          if (match) {
            console.log(
              '[LrcLib] Success match:',
              match.trackName || match.name,
              match.artistName,
              match.duration
            );
            return { success: true, data: match };
          }
        } else {
          console.log('[LrcLib] Response not OK:', response.status);
        }
      } catch (error) {
        console.error(`Search failed for URL ${url}:`, error);
      }
    }

    return { success: false, message: 'No lyrics found' };
  };

  return getCachedData(cacheKey, fetchFunction, 1440, CACHE_GROUPS.LYRICS);
}

// Helper to parse TTML time format
function parseTTMLTime(timeStr) {
  if (!timeStr) return 0;
  if (timeStr.includes(':')) {
    const timeParts = timeStr.split(':');
    if (timeParts.length === 2) {
      return (
        parseInt(timeParts[0]) * 60 * 1000 + parseFloat(timeParts[1]) * 1000
      );
    } else if (timeParts.length === 3) {
      return (
        parseInt(timeParts[0]) * 3600 * 1000 +
        parseInt(timeParts[1]) * 60 * 1000 +
        parseFloat(timeParts[2]) * 1000
      );
    }
  }
  return parseFloat(timeStr) * 1000;
}

function decodeEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// TTML Parser Helper - Extracts line and word-level timings
function parseTTML(ttml) {
  try {
    const lyrics = [];
    // Enhanced regex to handle potentially multi-line p tags and attributes
    const lines = ttml.match(/<p\s+[^>]*begin="([^"]+)"[^>]*>(.*?)<\/p>/gs);

    if (!lines) return [];

    lines.forEach((lineContent) => {
      const match = lineContent.match(
        /<p\s+([^>]*)begin="([^"]+)"([^>]*)>(.*?)<\/p>/s
      );
      if (match) {
        const attrs = `${match[1]} ${match[3]}`;
        const timeStr = match[2];
        const innerContent = match[4];
        const endMatch = attrs.match(/\bend="([^"]+)"/);

        const lineTime = parseTTMLTime(timeStr);
        const lineEnd = endMatch ? parseTTMLTime(endMatch[1]) : null;

        // Extract words from spans if available
        const words = [];
        const spanRegex =
          /<span\s+[^>]*begin="([^"]+)"\s+end="([^"]+)"[^>]*>(.*?)<\/span>/gs;
        let spanMatch;
        while ((spanMatch = spanRegex.exec(innerContent)) !== null) {
          const wordText = decodeEntities(
            spanMatch[3].replace(/<[^>]+>/g, '')
          );
          if (!wordText.trim()) continue;
          // Syllables of one word are adjacent spans with no whitespace between
          const after = innerContent.slice(spanRegex.lastIndex);
          words.push({
            startTime: parseTTMLTime(spanMatch[1]),
            endTime: parseTTMLTime(spanMatch[2]),
            text: wordText.trim(),
            spaceAfter: /^\s/.test(after) || /\s$/.test(wordText),
          });
        }

        // Clean up text for the full line
        const text = decodeEntities(innerContent.replace(/<[^>]+>/g, ''))
          .replace(/\s+/g, ' ')
          .trim();

        if (text) {
          lyrics.push({
            time: lineTime,
            endTime: lineEnd,
            text: text,
            words: words.length > 0 ? words : null,
          });
        }
      }
    });

    return lyrics;
  } catch (error) {
    console.error('Error parsing TTML:', error);
    return [];
  }
}

async function getLyricsFromBetterLyrics(artist, title, duration) {
  if (!artist || !title) {
    return { success: false, message: 'Missing artist or title' };
  }

  // Extract the main song name
  const cleanTitle = title
    .split('(')[0]
    .split('[')[0]
    .replace(/\.{3}$/g, '')
    .trim();

  const cleanArtist = artist.split(',')[0].trim();
  const cacheKey = `better_lyrics_v2_${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`;

  const fetchFunction = async () => {
    try {
      const url = `https://api.betterlyrics.org/getLyrics?s=${encodeURIComponent(
        cleanTitle
      )}&a=${encodeURIComponent(cleanArtist)}${
        duration ? `&d=${Math.floor(duration)}` : ''
      }`;
      console.log('[BetterLyrics] Fetching:', url);

      const response = await fetch(url, { headers: LYRICS_REQUEST_HEADERS });
      console.log('[BetterLyrics] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log(
          '[BetterLyrics] Data received:',
          !!data,
          'Has TTML:',
          !!data?.ttml
        );
        if (data && data.ttml) {
          const syncedLyrics = parseTTML(data.ttml);
          if (syncedLyrics && syncedLyrics.length > 0) {
            return {
              success: true,
              data: {
                syncedLyrics: syncedLyrics,
                plainLyrics: syncedLyrics.map((l) => l.text).join('\n'),
              },
            };
          }
        }
      }
    } catch (error) {
      console.error('BetterLyrics fetch failed:', error);
    }
    return { success: false, message: 'No lyrics found on BetterLyrics' };
  };

  return getCachedData(cacheKey, fetchFunction, 1440, CACHE_GROUPS.LYRICS);
}

/**
 * Fetch lyrics from official YouTube Music via native bridge
 */
async function getLyricsFromYTMusic(track) {
  if (!track || (!track.id && !track.videoId)) {
    return { success: false, message: 'No track info' };
  }

  const videoId = track.videoId || track.id;
  const { InnerTubeModule } = NativeModules;

  if (!InnerTubeModule) {
    return { success: false, message: 'InnerTubeModule not found' };
  }

  try {
    // 1. Attempt Synced Transcript (Official YT Lyrics)
    const transcript = await InnerTubeModule.getTranscript(videoId);
    if (transcript) {
      console.log('[YTMusic] Transcript found for', videoId);
      return {
        success: true,
        data: {
          syncedLyrics: transcript,
          plainLyrics: transcript.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, ''),
        },
      };
    }
  } catch (error) {}

  try {
    // 2. Fallback to Plain Lyrics if endpoint is available
    const lyricsEndpoint =
      track.lyricsEndpoint || track.endpoint?.lyricsEndpoint;
    if (lyricsEndpoint?.browseId) {
      const lyrics = await InnerTubeModule.getLyrics(
        lyricsEndpoint.browseId,
        lyricsEndpoint.params || null
      );
      if (lyrics) {
        return {
          success: true,
          data: {
            plainLyrics: lyrics,
          },
        };
      }
    }
  } catch (error) {}

  return { success: false, message: 'No YTMusic lyrics found' };
}

// Unified lyrics fetcher with fallback logic
async function getUnifiedLyrics(
  artist,
  title,
  duration,
  preferredProvider = 'LrcLib',
  track = null
) {
  // Use full title from track object if available, as the passed 'title' might be truncated for display
  let fullTitle = title;
  if (track) {
    // Priority: originalTitle (stored full name) > name > title
    const trackFullName = track.originalTitle || track.name || track.title;
    // Use the longer, non-truncated name
    if (
      trackFullName &&
      !trackFullName.endsWith('...') &&
      !trackFullName.endsWith('â€¦')
    ) {
      fullTitle = trackFullName;
    }
  }
  // Clean up HTML entities
  fullTitle = fullTitle
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'");
  // If still truncated (ends with ...), strip it but note this is lossy
  if (fullTitle.endsWith('...') || fullTitle.endsWith('â€¦')) {
    fullTitle = fullTitle.slice(0, -3).trim();
  }

  console.log('[UnifiedLyrics] Request:', {
    artist,
    originalTitle: title,
    resolvedTitle: fullTitle,
    preferredProvider,
    trackId: track?.id || track?.videoId,
  });

  // Determine provider order
  let providers = [];
  const ytProvider = async (a, t, d) => getLyricsFromYTMusic(track);

  if (preferredProvider === 'YTMusic') {
    providers = [ytProvider, getLyricsFromLrcLib, getLyricsFromBetterLyrics];
  } else if (preferredProvider === 'BetterLyrics') {
    providers = [getLyricsFromBetterLyrics, getLyricsFromLrcLib, ytProvider];
  } else {
    providers = [getLyricsFromLrcLib, getLyricsFromBetterLyrics, ytProvider];
  }

  for (const provider of providers) {
    const result = await provider(artist, fullTitle, duration);
    if (result && result.success) {
      return result;
    }
  }

  return { success: false, message: 'No lyrics found from any provider' };
}

export {
  getSearchSongData,
  getArtistSongs,
  getArtistSongsPaginated,
  getArtistDetails,
  getArtistAlbumsPaginated,
  getAlbumSongs,
  getSongDetails,
  getArtistFromSong,
  getStreamingUrl,
  getLyricsFromLrcLib,
  getLyricsFromBetterLyrics,
  getUnifiedLyrics,
  getLyricsFromYTMusic,
};
