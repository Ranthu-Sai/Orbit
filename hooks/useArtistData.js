import { useState, useEffect, useCallback, useRef } from 'react';
import { ToastAndroid } from 'react-native';
import {
  getArtistDetails,
  getArtistSongsPaginated,
  getArtistAlbumsPaginated,
} from '../Api/Songs';
import {
  getYTMusicArtistDetails,
  getYTMusicArtistSongsPaginated,
  getYTMusicArtistAlbumsPaginated,
} from '../Api/YTMusic';

/**
 * Custom hook for managing artist data fetching and state
 * @param {string} artistId - Artist ID
 * @param {string} source - Source (saavn or ytmusic)
 * @returns {object} - Artist data state and functions
 */
export const useArtistData = (artistId, source = 'saavn') => {
  const [artistData, setArtistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Ignore responses for an artist the user already navigated away from
  const requestIdRef = useRef(0);

  // Memoized: it is an effect dependency. A new function every render made
  // the effect re-run after each setState -> endless fetch loop.
  const fetchArtistData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);

      let detailsResponse;
      if (source === 'ytmusic') {
        detailsResponse = await getYTMusicArtistDetails(artistId);
      } else {
        detailsResponse = await getArtistDetails(artistId);
      }

      if (requestId === requestIdRef.current) {
        setArtistData(detailsResponse);
      }
    } catch (error) {
      console.error('Error fetching artist data:', error);
      if (requestId === requestIdRef.current) {
        ToastAndroid.show('Failed to load artist data', ToastAndroid.SHORT);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [artistId, source]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchArtistData();
    setRefreshing(false);
  }, [fetchArtistData]);

  useEffect(() => {
    if (artistId) {
      fetchArtistData();
    }
    return () => {
      // Invalidate in-flight requests on artist change / unmount
      requestIdRef.current++;
    };
  }, [artistId, fetchArtistData]);

  return {
    artistData,
    loading,
    refreshing,
    fetchArtistData,
    onRefresh,
  };
};

/**
 * Custom hook for managing infinite scroll songs
 * @param {string} artistId - Artist ID
 * @param {number} songsPerPage - Number of songs per page
 * @param {string} source - Source (saavn or ytmusic)
 * @returns {object} - Songs state and functions
 */
export const useArtistSongs = (
  artistId,
  songsPerPage = 10,
  source = 'saavn',
  preloadedSongs = null
) => {
  const [visibleSongs, setVisibleSongs] = useState([]);
  const [currentSongPage, setCurrentSongPage] = useState(1);
  const [songLoading, setSongLoading] = useState(false);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [totalSongs, setTotalSongs] = useState(0);
  const requestIdRef = useRef(0);

  // Callers often pass a new array each render; read it through a ref and
  // key the effect on its content so it can't trigger a refetch loop.
  const preloadedRef = useRef(preloadedSongs);
  preloadedRef.current = preloadedSongs;
  const preloadedKey = preloadedSongs?.length
    ? `${preloadedSongs.length}:${preloadedSongs[0]?.id ?? ''}`
    : '';

  const loadInitialSongs = useCallback(async () => {
    const preloaded = preloadedRef.current;
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

    // If we have preloaded songs, use them instead of fetching
    if (preloaded && preloaded.length > 0) {
      setVisibleSongs(preloaded);
      setTotalSongs(preloaded.length);
      setCurrentSongPage(1);
      setHasMoreSongs(false); // No more to load since we have all preloaded songs
      return;
    }

    try {
      setSongLoading(true);
      let response;
      if (source === 'ytmusic') {
        response = await getYTMusicArtistSongsPaginated(
          artistId,
          1,
          songsPerPage
        );

        // Fallback to Saavn song search if YouTube Music returns no songs
        if (!response?.data?.songs || response.data.songs.length === 0) {
          // const { getSearchSongData } = require('../Api/Songs');

          // Try to extract artist name from artistId or use it directly
          // Since we don't have artist name here, we'll need to get it from somewhere
          // For now, skip the fallback in this hook - the issue is we need artist name
        }
      } else {
        response = await getArtistSongsPaginated(artistId, 1, songsPerPage);
      }

      if (isCurrent() && response?.data?.songs) {
        setVisibleSongs(response.data.songs);
        setTotalSongs(response.data.total || 0);
        setCurrentSongPage(1);
        setHasMoreSongs(
          response.data.songs.length >= songsPerPage &&
            response.data.songs.length < response.data.total
        );
      }
    } catch (error) {
      console.error('Error loading initial songs:', error);
      if (isCurrent()) {
        ToastAndroid.show('Failed to load songs', ToastAndroid.SHORT);
      }
    } finally {
      if (isCurrent()) {
        setSongLoading(false);
      }
    }
  }, [artistId, source, songsPerPage]);

  const loadMoreSongs = async () => {
    if (songLoading || !hasMoreSongs) {
      return;
    }

    try {
      setSongLoading(true);
      const nextPage = currentSongPage + 1;
      let response;
      if (source === 'ytmusic') {
        response = await getYTMusicArtistSongsPaginated(
          artistId,
          nextPage,
          songsPerPage
        );
      } else {
        response = await getArtistSongsPaginated(
          artistId,
          nextPage,
          songsPerPage
        );
      }

      if (response?.data?.songs && response.data.songs.length > 0) {
        setVisibleSongs((prev) => {
          const next = [...prev, ...response.data.songs];
          // Computed from the live list, not a stale closure value
          setHasMoreSongs(next.length < response.data.total);
          return next;
        });
        setCurrentSongPage(nextPage);
      } else {
        setHasMoreSongs(false);
      }
    } catch (error) {
      console.error('Error loading more songs:', error);
      ToastAndroid.show('Failed to load more songs', ToastAndroid.SHORT);
    } finally {
      setSongLoading(false);
    }
  };

  const resetSongs = () => {
    setVisibleSongs([]);
    setCurrentSongPage(1);
    setHasMoreSongs(true);
    setTotalSongs(0);
  };

  useEffect(() => {
    if (artistId) {
      loadInitialSongs();
    }
    return () => {
      requestIdRef.current++;
    };
  }, [artistId, loadInitialSongs, preloadedKey]);

  return {
    visibleSongs,
    songLoading,
    hasMoreSongs,
    totalSongs,
    loadMoreSongs,
    resetSongs,
    loadInitialSongs,
  };
};

/**
 * Custom hook for managing infinite scroll albums
 * @param {string} artistId - Artist ID
 * @param {number} albumsPerPage - Number of albums per page
 * @param {string} source - Source (saavn or ytmusic)
 * @returns {object} - Albums state and functions
 */
export const useArtistAlbums = (
  artistId,
  albumsPerPage = 10,
  source = 'saavn'
) => {
  const [visibleAlbums, setVisibleAlbums] = useState([]);
  const [currentAlbumPage, setCurrentAlbumPage] = useState(1);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const requestIdRef = useRef(0);

  const loadInitialAlbums = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;
    try {
      setAlbumLoading(true);
      let response;
      if (source === 'ytmusic') {
        response = await getYTMusicArtistAlbumsPaginated(
          artistId,
          1,
          albumsPerPage
        );
      } else {
        response = await getArtistAlbumsPaginated(artistId, 1, albumsPerPage);
      }

      if (isCurrent() && response?.data?.albums) {
        setVisibleAlbums(response.data.albums);
        setTotalAlbums(response.data.total || 0);
        setCurrentAlbumPage(1);
        setHasMoreAlbums(
          response.data.albums.length >= albumsPerPage &&
            response.data.albums.length < response.data.total
        );
      }
    } catch (error) {
      console.error('Error loading initial albums:', error);
      if (isCurrent()) {
        ToastAndroid.show('Failed to load albums', ToastAndroid.SHORT);
      }
    } finally {
      if (isCurrent()) {
        setAlbumLoading(false);
      }
    }
  }, [artistId, source, albumsPerPage]);

  const loadMoreAlbums = async () => {
    if (albumLoading || !hasMoreAlbums) {
      return;
    }

    try {
      setAlbumLoading(true);
      const nextPage = currentAlbumPage + 1;
      let response;
      if (source === 'ytmusic') {
        response = await getYTMusicArtistAlbumsPaginated(
          artistId,
          nextPage,
          albumsPerPage
        );
      } else {
        response = await getArtistAlbumsPaginated(
          artistId,
          nextPage,
          albumsPerPage
        );
      }

      if (response?.data?.albums && response.data.albums.length > 0) {
        setVisibleAlbums((prev) => {
          const next = [...prev, ...response.data.albums];
          // Computed from the live list, not a stale closure value
          setHasMoreAlbums(next.length < response.data.total);
          return next;
        });
        setCurrentAlbumPage(nextPage);
      } else {
        setHasMoreAlbums(false);
      }
    } catch (error) {
      console.error('Error loading more albums:', error);
      ToastAndroid.show('Failed to load more albums', ToastAndroid.SHORT);
    } finally {
      setAlbumLoading(false);
    }
  };

  const resetAlbums = () => {
    setVisibleAlbums([]);
    setCurrentAlbumPage(1);
    setHasMoreAlbums(true);
    setTotalAlbums(0);
  };

  useEffect(() => {
    if (artistId) {
      loadInitialAlbums();
    }
    return () => {
      requestIdRef.current++;
    };
  }, [artistId, loadInitialAlbums]);

  return {
    visibleAlbums,
    albumLoading,
    hasMoreAlbums,
    totalAlbums,
    loadMoreAlbums,
    resetAlbums,
    loadInitialAlbums,
  };
};
