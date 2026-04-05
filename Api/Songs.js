import axios from 'axios';
import { NativeModules } from 'react-native';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { requestWithFallback } from './apiUtils';

async function getSearchSongData(searchText, page, limit) {
  const cacheKey = `search_v3_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=${searchText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://saavn.dev/api/search/songs?query=${searchText}&page=${page}&limit=${limit}`;
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
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/songs`;
    const secondaryUrl = `https://saavn.dev/api/artists/${artistId}/songs`;
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
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/artists/${artistId}/songs?page=${page}&limit=${limit}`;
    const secondaryUrl = `https://saavn.dev/api/artists/${artistId}/songs?page=${page}&limit=${limit}`;
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
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/albums?id=${albumId}`;
    const secondaryUrl = `https://saavn.dev/api/albums?id=${albumId}`;
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
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/songs?id=${id}`;
    const secondaryUrl = `https://saavn.dev/api/songs?id=${id}`;
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
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/artists?query=${searchText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://saavn.dev/api/search/artists?query=${searchText}&page=${page}&limit=${limit}`;
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

export {
  getSearchSongData,
  getArtistSongs,
  getArtistSongsPaginated,
  getAlbumSongs,
  getSongDetails,
  getArtistFromSong,
  getStreamingUrl,
};
