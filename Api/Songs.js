import axios from 'axios';
import { NativeModules } from 'react-native';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { requestWithFallback } from './apiUtils';

async function getSearchSongData(searchText, page, limit) {
  const cacheKey = `search_v3_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/search/songs?query=${searchText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${searchText}&page=${page}&limit=${limit}`;
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
  const cacheKey = `artist_from_song_v2_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/search/artists?query=${searchText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/artists?query=${searchText}&page=${page}&limit=${limit}`;
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

async function getLyricsFromLrcLib(artist, title) {
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

  const cacheKey = `lrc_lib_${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`;
  const fetchFunction = async () => {
    const urlsToTry = [
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(
        cleanArtist
      )}&track_name=${encodeURIComponent(cleanTitle)}`,
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(
        cleanArtist.split(' ')[0]
      )}&track_name=${encodeURIComponent(cleanTitle)}`,
    ];

    for (const url of urlsToTry) {
      try {
        console.log('[LrcLib] Try URL:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('[LrcLib] Response length:', data ? data.length : 0);
          if (
            data &&
            data.length > 0 &&
            (data[0].syncedLyrics || data[0].plainLyrics)
          ) {
            console.log(
              '[LrcLib] Success match:',
              data[0].name,
              data[0].artistName
            );
            return { success: true, data: data[0] };
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

// TTML Parser Helper - Extracts line and word-level timings
function parseTTML(ttml) {
  try {
    const lyrics = [];
    // Enhanced regex to handle potentially multi-line p tags and attributes
    const lines = ttml.match(/<p\s+[^>]*begin="([^"]+)"[^>]*>(.*?)<\/p>/gs);

    if (!lines) return [];

    lines.forEach((lineContent) => {
      const match = lineContent.match(
        /<p\s+[^>]*begin="([^"]+)"[^>]*>(.*?)<\/p>/s
      );
      if (match) {
        const timeStr = match[1];
        const innerContent = match[2];

        const lineTime = parseTTMLTime(timeStr);

        // Extract words from spans if available
        const words = [];
        const spanRegex =
          /<span\s+[^>]*begin="([^"]+)"\s+end="([^"]+)"[^>]*>(.*?)<\/span>/gs;
        let spanMatch;
        while ((spanMatch = spanRegex.exec(innerContent)) !== null) {
          words.push({
            startTime: parseTTMLTime(spanMatch[1]),
            endTime: parseTTMLTime(spanMatch[2]),
            text: spanMatch[3].replace(/<[^>]+>/g, '').trim(),
          });
        }

        // Clean up text for the full line
        const text = innerContent.replace(/<[^>]+>/g, '').trim();
        console.log(
          '[parseTTML] Line:',
          text.substring(0, 30),
          'Words found:',
          words.length
        );

        if (text) {
          lyrics.push({
            time: lineTime,
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
  const cacheKey = `better_lyrics_${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`;

  const fetchFunction = async () => {
    try {
      const url = `https://lyrics-api-go-better-lyrics-api-pr-12.up.railway.app/getLyrics?s=${encodeURIComponent(
        cleanTitle
      )}&a=${encodeURIComponent(cleanArtist)}${
        duration ? `&d=${Math.floor(duration)}` : ''
      }`;
      console.log('[BetterLyrics] Fetching:', url);

      const response = await fetch(url);
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
      !trackFullName.endsWith('…')
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
  if (fullTitle.endsWith('...') || fullTitle.endsWith('…')) {
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
  getAlbumSongs,
  getSongDetails,
  getArtistFromSong,
  getStreamingUrl,
  getLyricsFromLrcLib,
  getLyricsFromBetterLyrics,
  getUnifiedLyrics,
  getLyricsFromYTMusic,
};
