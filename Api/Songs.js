import axios from "axios";
import { getCachedData, CACHE_GROUPS } from './CacheManager';

async function getSearchSongData(searchText, page, limit) {
  const cacheKey = `search_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    try {
      const response = await axios.get(`https://jiosavan-api-with-playlist.vercel.app/api/search/songs?query=${searchText}&page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status >= 500) {
        console.error(`Server error fetching search data for "${searchText}":`, error.response.data);
        return { success: false, results: [], error: 'Server Error' };
      }
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting search data for "${searchText}":`, error);
    return { success: false, results: [], error: 'Network or Cache Error' };
  }
}



async function getArtistSongs(artistId) {
  const cacheKey = `artist_songs_${artistId}`;

  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/artists/${artistId}/songs`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error(`API error fetching songs for artist ID ${artistId}:`, error.response ? `Status: ${error.response.status}` : error.message || error);
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 60, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting songs for artist ID ${artistId}:`, error);
    throw error;
  }
}

async function getArtistSongsPaginated(artistId, page = 1, limit = 10) {
  const cacheKey = `artist_songs_paginated_${artistId}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/artists/${artistId}/songs?page=${page}&limit=${limit}`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error(`API error fetching paginated songs for artist ID ${artistId}:`, error.response ? `Status: ${error.response.status}` : error.message || error);
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.SEARCH); // Shorter cache for paginated data
  } catch (error) {
    console.error(`Error getting paginated songs for artist ID ${artistId}:`, error);
    throw error;
  }
}

async function getAlbumSongs(albumId) {
  const cacheKey = `album_songs_${albumId}`;

  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/albums/${albumId}`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error(`API error fetching songs for album ID ${albumId}:`, error.response ? `Status: ${error.response.status}` : error.message || error);
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 60, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting songs for album ID ${albumId}:`, error);
    throw error;
  }
}

// Helper function to check if an artist has valid image and songs
async function validateArtist(artistId) {
  try {
    // Check if artist has songs
    const songsResponse = await getArtistSongs(artistId);
    const hasSongs = songsResponse?.data?.songs?.length > 0;

    if (!hasSongs) {
      return false;
    }

    // Check artist details for additional validation
    const detailsResponse = await getArtistDetails(artistId);
    const artistData = detailsResponse?.data;

    // Check if artist has proper image (not default placeholder)
    const hasValidImage = artistData?.image?.some(img =>
      img.url && !img.url.includes('artist-default') && !img.url.includes('share-image')
    );

    // Check follower count (real artists usually have more followers)
    const hasFollowers = artistData?.followerCount > 100;

    // Check if artist has bio information
    const hasBio = artistData?.bio?.length > 0;

    // Artist is valid if it has songs AND (valid image OR followers OR bio)
    return hasSongs && (hasValidImage || hasFollowers || hasBio);
  } catch (error) {
    console.error(`Error validating artist ${artistId}:`, error);
    return false;
  }
}

// Helper function to normalize artist names for comparison
function normalizeArtistName(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Remove all Unicode control characters and invisible characters
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to filter artists based on image and songs availability
function filterValidArtists(artists) {
  if (!artists || !Array.isArray(artists)) {
    return [];
  }

  // First filter for valid artists
  const validArtists = artists.filter(artist => {
    // Quick filter: Check if artist has non-default image
    const hasValidImage = artist?.image?.some(img =>
      img.url &&
      !img.url.includes('artist-default') &&
      !img.url.includes('share-image') &&
      !img.url.includes('_i/3.0/')
    );

    // Filter out obvious collaborative/dummy artists by name patterns
    const isDummyArtist = artist?.name?.includes('&') ||
      artist?.name?.includes(',') ||
      artist?.name?.includes('amp;');

    return hasValidImage && !isDummyArtist;
  });

  // Remove duplicates based on artist ID and normalized name
  const uniqueArtists = validArtists.filter((artist, index, self) => {
    const normalizedName = normalizeArtistName(artist.name);

    return index === self.findIndex(a => {
      const otherNormalizedName = normalizeArtistName(a.name);
      return a.id === artist.id || normalizedName === otherNormalizedName;
    });
  });

  return uniqueArtists;
}

async function getSearchArtistData(searchText, page, limit) {
  // Create a cache key based on the search parameters
  const cacheKey = `artist_search_${searchText}_page${page}_limit${limit}`;

  // Define the fetch function that will be called if cache miss
  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/search/artists?query=${searchText}&page=${page}&limit=${limit}`,
      headers: {},
    };

    try {
      const response = await axios.request(config);

      // Filter the results to show only valid artists
      if (response.data?.data?.results) {
        const filteredResults = filterValidArtists(response.data.data.results);

        return {
          ...response.data,
          data: {
            ...response.data.data,
            results: filteredResults,
            total: filteredResults.length
          }
        };
      }

      return response.data;
    }
    catch (error) {
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting artist search data for "${searchText}":`, error);
    throw error;
  }
}

async function getArtistDetails(artistId) {
  const cacheKey = `artist_details_${artistId}`;

  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/artists/${artistId}`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error(`API error fetching artist details for ID ${artistId}:`, error.response ? `Status: ${error.response.status}` : error.message || error);
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 120, CACHE_GROUPS.SEARCH); // Cache for 2 hours
  } catch (error) {
    console.error(`Error getting artist details for ID ${artistId}:`, error);
    throw error;
  }
}

async function getArtistAlbums(artistId) {
  const cacheKey = `artist_albums_${artistId}`;

  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/artists/${artistId}/albums`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error(`API error fetching albums for artist ID ${artistId}:`, error.response ? `Status: ${error.response.status}` : error.message || error);
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 120, CACHE_GROUPS.SEARCH); // Cache for 2 hours
  } catch (error) {
    console.error(`Error getting albums for artist ID ${artistId}:`, error);
    throw error;
  }
}

async function getArtistAlbumsPaginated(artistId, page = 1, limit = 10) {
  const cacheKey = `artist_albums_paginated_${artistId}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/artists/${artistId}/albums?page=${page}&limit=${limit}`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      return response.data;
    } catch (error) {
      console.error(`API error fetching paginated albums for artist ID ${artistId}:`, error.response ? `Status: ${error.response.status}` : error.message || error);
      throw error;
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.SEARCH); // Shorter cache for paginated data
  } catch (error) {
    console.error(`Error getting paginated albums for artist ID ${artistId}:`, error);
    throw error;
  }
}

async function getLyricsFromLrcLib(artist, title) {
  if (!artist || !title) {
    return { success: false, message: 'Missing artist or title' };
  }

  // Extract the main song name before any parentheses
  const cleanTitle = title
    .split('(')[0]  // Take only the part before the first parenthesis
    .split('[')[0]  // Take only the part before the first bracket
    .replace(/\.{3}$/g, '') // Remove trailing ellipsis if any
    .replace(/\s+$/, '') // Remove any trailing whitespace
    .trim();

  const cleanArtist = artist.split(',')[0].trim();

  const cacheKey = `lrc_lib_${cleanArtist.toLowerCase()}_${cleanTitle.toLowerCase()}`;
  console.log(`Searching lyrics for: ${cleanArtist} - ${cleanTitle}`);

  const fetchFunction = async () => {
    const urlsToTry = [
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`,
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(cleanArtist.split(' ')[0])}&track_name=${encodeURIComponent(cleanTitle)}`,
    ];

    for (const url of urlsToTry) {
      try {
        console.log('Trying URL:', url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && (data[0].syncedLyrics || data[0].plainLyrics)) {
            return { success: true, data: data[0] };
          }
        }
      } catch (error) {
        console.error(`Search failed for URL ${url}:`, error);
      }
    }

    return { success: false, message: 'No lyrics found' };
  };

  return getCachedData(cacheKey, fetchFunction, 1440, CACHE_GROUPS.LYRICS);
}

export { getSearchSongData, getArtistSongs, getArtistSongsPaginated, getAlbumSongs, getSearchArtistData, getArtistDetails, getArtistAlbums, getArtistAlbumsPaginated, validateArtist, filterValidArtists, getLyricsFromLrcLib, getLyricsFromBetterLyrics, getUnifiedLyrics };

// TTML Parser Helper
function parseTTML(ttml) {
  try {
    const lyrics = [];
    const lines = ttml.match(/<p\s+begin="([^"]+)"[^>]*>(.*?)<\/p>/g);

    if (!lines) return [];

    lines.forEach(line => {
      const match = line.match(/<p\s+begin="([^"]+)"[^>]*>(.*?)<\/p>/);
      if (match) {
        const timeStr = match[1];
        const textContent = match[2];

        // Parse time (MM:SS.mmm or HH:MM:SS.mmm)
        let time = 0;
        const timeParts = timeStr.split(':');
        if (timeParts.length === 2) {
          time = (parseInt(timeParts[0]) * 60 * 1000) + (parseFloat(timeParts[1]) * 1000);
        } else if (timeParts.length === 3) {
          time = (parseInt(timeParts[0]) * 3600 * 1000) + (parseInt(timeParts[1]) * 60 * 1000) + (parseFloat(timeParts[2]) * 1000);
        }

        // Clean up text (remove span tags if any)
        const text = textContent.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '').trim();

        if (text) {
          // Format to LRC timestamp [MM:SS.xx]
          const mm = Math.floor(time / 60000).toString().padStart(2, '0');
          const ss = Math.floor((time % 60000) / 1000).toString().padStart(2, '0');
          const xx = Math.floor((time % 1000) / 10).toString().padStart(2, '0');

          lyrics.push(`[${mm}:${ss}.${xx}]${text}`);
        }
      }
    });

    return lyrics.join('\n');
  } catch (error) {
    console.error('Error parsing TTML:', error);
    return '';
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
      const url = `https://lyrics-api-go-better-lyrics-api-pr-12.up.railway.app/getLyrics?s=${encodeURIComponent(cleanTitle)}&a=${encodeURIComponent(cleanArtist)}${duration ? `&d=${Math.floor(duration * 1000)}` : ''}`;
      console.log('Fetching BetterLyrics from:', url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.ttml) {
          const syncedLyrics = parseTTML(data.ttml);
          if (syncedLyrics) {
            return {
              success: true,
              data: {
                syncedLyrics: syncedLyrics,
                plainLyrics: syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '')
              }
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

// Unified lyrics fetcher with fallback logic
async function getUnifiedLyrics(artist, title, duration, preferredProvider = 'LrcLib') {
  console.log(`Getting unified lyrics. Preferred: ${preferredProvider}`);

  let primaryProvider = getLyricsFromLrcLib;
  let secondaryProvider = getLyricsFromBetterLyrics;

  if (preferredProvider === 'BetterLyrics') {
    primaryProvider = getLyricsFromBetterLyrics;
    secondaryProvider = getLyricsFromLrcLib;
  }

  // Try primary provider
  const primaryResult = await primaryProvider(artist, title, duration);
  if (primaryResult.success) {
    return primaryResult;
  }

  console.log(`${preferredProvider} failed. Trying fallback.`);

  // Try secondary provider
  const secondaryResult = await secondaryProvider(artist, title, duration);
  return secondaryResult;
}
