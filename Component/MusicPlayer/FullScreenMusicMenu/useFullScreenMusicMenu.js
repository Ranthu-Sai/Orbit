import { useState, useCallback, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ToastAndroid } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@react-navigation/native';
import { AddOneSongToPlaylist } from '../../../MusicPlayerFunctions';
import { getAlbumSongs, getSearchSongData } from '../../../Api/Songs';
import {
  getYTMusicArtistSongsPaginated,
  getYTMusicSearchArtistData,
} from '../../../Api/YTMusic';
import Context from '../../../Context/Context';

/**
 * useFullScreenMusicMenu - Custom hook for managing FullScreen music menu functionality
 * Provides menu options, handlers, and state management for the three-dot menu
 *
 * @param {Object} currentPlaying - Current playing track object
 * @param {boolean} isOffline - Whether the app is in offline mode
 * @returns {Object} Menu state and handlers
 */
export const useFullScreenMusicMenu = (currentPlaying, isOffline) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 100, right: 16 });
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;

  // Get context to track navigation from FullScreenMusic
  const { setFullScreenNavigationTarget, setIndex } = useContext(Context);

  // Helper function to extract multiple artists from song data
  const extractMultipleArtists = useCallback((song) => {
    if (!song) {
      return [];
    }

    const artists = [];

    // Method 1: Check artists.primary array (most common for multiple artists)
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      song.artists.primary.forEach((artist) => {
        if (artist && artist.name && artist.id) {
          artists.push({
            id: artist.id,
            name: artist.name.trim(),
            type: 'primary',
          });
        }
      });
    }

    // Method 2: If no artists.primary, try to parse from artist string
    if (artists.length === 0 && song.artist) {
      // Split by common separators for multiple artists
      const artistNames = song.artist
        .split(/[,&]|feat\.?|ft\.?/i)
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      artistNames.forEach((name, index) => {
        // Try to get ID from various fields for the first artist
        let artistId = null;
        if (index === 0) {
          artistId =
            song.artistID ||
            song.primary_artists_id ||
            song.more_info?.artistid ||
            song.more_info?.primary_artists_id;
        }

        artists.push({
          id: artistId,
          name: name,
          type: index === 0 ? 'primary' : 'featured',
        });
      });
    }

    // Method 3: Fallback to single artist
    if (artists.length === 0 && song.artist) {
      const artistId =
        song.artistID ||
        song.primary_artists_id ||
        song.more_info?.artistid ||
        song.more_info?.primary_artists_id;

      artists.push({
        id: artistId,
        name: song.artist.trim(),
        type: 'primary',
      });
    }

    return artists;
  }, []);

  // Helper function to search for artist ID when missing with multiple strategies
  const findArtistId = useCallback(
    async (artistName) => {
      if (!artistName || isOffline) {
        return null;
      }

      try {
        // Strategy 1: Direct artist search
        let response = await getYTMusicSearchArtistData(artistName, 1, 10);

        if (
          response?.success &&
          response?.data?.results &&
          response.data.results.length > 0
        ) {
          // Find the best match by name similarity
          let bestMatch = response.data.results[0];

          // Look for exact or close match
          const exactMatch = response.data.results.find(
            (artist) => artist.name.toLowerCase() === artistName.toLowerCase()
          );

          if (exactMatch) {
            bestMatch = exactMatch;
          } else {
            // Look for partial match
            const partialMatch = response.data.results.find(
              (artist) =>
                artist.name.toLowerCase().includes(artistName.toLowerCase()) ||
                artistName.toLowerCase().includes(artist.name.toLowerCase())
            );

            if (partialMatch) {
              bestMatch = partialMatch;
            }
          }

          return bestMatch.id;
        }

        // Strategy 2: If artist search fails, try searching songs by this artist
        const songResponse = await getSearchSongData(artistName, 1, 10);

        if (
          songResponse?.success &&
          songResponse?.data?.results &&
          songResponse.data.results.length > 0
        ) {
          // Look for songs by this artist and extract artist ID
          for (const song of songResponse.data.results) {
            const songArtist =
              song.artist || song.artists?.primary?.[0]?.name || '';
            if (
              songArtist.toLowerCase().includes(artistName.toLowerCase()) ||
              artistName.toLowerCase().includes(songArtist.toLowerCase())
            ) {
              const artistId =
                song.artists?.primary?.[0]?.id ||
                song.artistID ||
                song.primary_artists_id;

              if (artistId) {
                return artistId;
              }
            }
          }
        }
      } catch (error) {
        // Silent error handling
      }

      return null;
    },
    [isOffline]
  );

  // Helper function to search for song details when missing album info
  const findSongDetails = useCallback(
    async (songTitle, artistName) => {
      if (!songTitle || isOffline) {
        return null;
      }

      try {
        const searchQuery = artistName
          ? `${songTitle} ${artistName}`
          : songTitle;
        const response = await getSearchSongData(searchQuery, 1, 10); // Increased limit for better results

        if (
          response?.success &&
          response?.data?.results &&
          response.data.results.length > 0
        ) {
          // Try to find the best match by comparing titles
          let bestMatch = response.data.results[0];

          if (artistName && response.data.results.length > 1) {
            // Look for a better match that includes the artist name
            const betterMatch = response.data.results.find((song) => {
              const songArtist =
                song.artist || song.artists?.primary?.[0]?.name || '';
              return (
                songArtist.toLowerCase().includes(artistName.toLowerCase()) ||
                artistName.toLowerCase().includes(songArtist.toLowerCase())
              );
            });

            if (betterMatch) {
              bestMatch = betterMatch;
            }
          }

          // Extract album information from multiple possible fields
          const albumId =
            bestMatch.album?.id ||
            bestMatch.albumId ||
            bestMatch.album_id ||
            bestMatch.more_info?.album_id;

          const albumName =
            bestMatch.album?.name ||
            bestMatch.album ||
            bestMatch.more_info?.album;

          return {
            albumId: albumId,
            albumName: albumName,
            artistId:
              bestMatch.artists?.primary?.[0]?.id ||
              bestMatch.artistID ||
              bestMatch.primary_artists_id,
          };
        }
      } catch (error) {
        // Silent error handling
      }

      return null;
    },
    [isOffline]
  );

  // Show menu with position calculation
  const showMenu = useCallback(() => {
    // Set position for the menu (top-right area of screen)
    setMenuPosition({ top: 100, right: 16 });
    setMenuVisible(true);
  }, []);

  // Close menu
  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  // Navigate to specific artist by ID and name
  const navigateToSpecificArtist = useCallback(
    async (artistId, artistName) => {
      if (!artistName) {
        ToastAndroid.show('Artist name not available', ToastAndroid.SHORT);
        return;
      }

      let finalArtistId = artistId;

      // If no artist ID, try to find it by searching
      if (!finalArtistId) {
        ToastAndroid.show('Searching for artist...', ToastAndroid.SHORT);

        finalArtistId = await findArtistId(artistName);

        if (!finalArtistId) {
          ToastAndroid.show(
            'Could not find artist information',
            ToastAndroid.SHORT
          );
          return;
        }
      }

      // Validate artist ID format
      if (
        typeof finalArtistId !== 'string' &&
        typeof finalArtistId !== 'number'
      ) {
        ToastAndroid.show('Invalid artist information', ToastAndroid.SHORT);
        return;
      }

      try {
        // CRITICAL: Track that we're navigating FROM FullScreenMusic
        // This allows proper back navigation to return to FullScreenMusic
        setFullScreenNavigationTarget('ArtistPage');

        // Close FullScreenMusic first (Index = 0), then navigate
        setIndex(0);

        // Small delay to ensure FullScreen closes before navigation
        setTimeout(() => {
          navigation.navigate('ArtistPage', {
            artistId: String(finalArtistId),
            artistName: artistName,
            source: 'FullScreenMusic',
            returnToFullScreen: true, // Flag to indicate we should return to FullScreen
          });
        }, 50);

        ToastAndroid.show(`Opening ${artistName} page`, ToastAndroid.SHORT);
      } catch (error) {
        ToastAndroid.show('Failed to open artist page', ToastAndroid.SHORT);
      }
    },
    [
      currentPlaying,
      navigation,
      findArtistId,
      setFullScreenNavigationTarget,
      setIndex,
    ]
  );

  // Navigate to Artist screen (legacy function for single artist)
  const navigateToArtist = useCallback(async () => {
    if (!currentPlaying) {
      ToastAndroid.show('No song is currently playing', ToastAndroid.SHORT);
      return;
    }

    // Get the first/primary artist
    const artists = extractMultipleArtists(currentPlaying);
    if (artists.length === 0) {
      ToastAndroid.show('No artist information available', ToastAndroid.SHORT);
      return;
    }

    const primaryArtist = artists[0];
    await navigateToSpecificArtist(primaryArtist.id, primaryArtist.name);
  }, [currentPlaying, extractMultipleArtists, navigateToSpecificArtist]);

  // Navigate to Album screen
  const navigateToAlbum = useCallback(async () => {
    if (!currentPlaying) {
      ToastAndroid.show('No song is currently playing', ToastAndroid.SHORT);
      return;
    }

    // Detect the source of the current playing song
    const detectSource = () => {
      // Check for YTMusic
      if (
        currentPlaying.isYTMusic ||
        currentPlaying.source === 'ytmusic' ||
        (currentPlaying.id?.length === 11 &&
          !currentPlaying.isLocalMusic &&
          !currentPlaying.isDabTrack)
      ) {
        return 'ytmusic';
      }

      // Check for DAB/Qobuz
      if (
        currentPlaying.isDabTrack ||
        currentPlaying.source === 'dab' ||
        currentPlaying.sourceType === 'dab' ||
        (currentPlaying.url &&
          (currentPlaying.url.includes('qobuz') ||
            currentPlaying.url.includes('dab-music')))
      ) {
        return 'dab';
      }

      // Check for Spotify
      if (currentPlaying.source === 'spotify' || currentPlaying.spotifyId) {
        return 'spotify';
      }

      // Default to Saavn
      return 'saavn';
    };

    const songSource = detectSource();

    // Enhanced album ID detection with more comprehensive field checking
    let albumId =
      currentPlaying.albumId ||
      currentPlaying.album_id ||
      currentPlaying.album?.id ||
      currentPlaying.more_info?.album_id ||
      currentPlaying.more_info?.albumid;

    let albumName =
      currentPlaying.album?.name ||
      (typeof currentPlaying.album === 'string'
        ? currentPlaying.album
        : null) ||
      currentPlaying.more_info?.album ||
      'Unknown Album';

    // If no album ID, try multiple search strategies based on source
    if (!albumId && currentPlaying.title) {
      ToastAndroid.show('Searching for album...', ToastAndroid.SHORT);

      // Strategy 1: Search by song title and artist
      let songDetails = await findSongDetails(
        currentPlaying.title,
        currentPlaying.artist
      );

      // Strategy 2: If first search fails, try with just song title
      if (!songDetails?.albumId && currentPlaying.title) {
        songDetails = await findSongDetails(currentPlaying.title, null);
      }

      // Strategy 3: Try alternative search with different query format
      if (!songDetails?.albumId && currentPlaying.artist) {
        const alternativeQuery = `"${currentPlaying.title}" "${currentPlaying.artist}"`;
        songDetails = await findSongDetails(alternativeQuery, null);
      }

      if (songDetails?.albumId) {
        albumId = songDetails.albumId;
        albumName = songDetails.albumName || albumName;
      }
    }

    if (!albumId) {
      ToastAndroid.show(
        'Album information not available for this song',
        ToastAndroid.SHORT
      );
      return;
    }

    // Validate album ID format
    if (typeof albumId !== 'string' && typeof albumId !== 'number') {
      ToastAndroid.show('Invalid album information', ToastAndroid.SHORT);
      return;
    }

    try {
      // CRITICAL: Track that we're navigating FROM FullScreenMusic
      setFullScreenNavigationTarget('Album');

      // Close FullScreenMusic first (Index = 0), then navigate
      setIndex(0);

      // Small delay to ensure FullScreen closes before navigation
      setTimeout(() => {
        navigation.navigate('Album', {
          id: String(albumId),
          name: albumName,
          source: songSource, // Pass the actual song source for correct API fetching
          returnToFullScreen: true,
        });
      }, 50);

      ToastAndroid.show(`Opening ${albumName} album`, ToastAndroid.SHORT);
    } catch (error) {
      console.error('❌ Error navigating to album:', error);
      ToastAndroid.show('Failed to open album page', ToastAndroid.SHORT);
    }
  }, [
    currentPlaying,
    navigation,
    findSongDetails,
    setFullScreenNavigationTarget,
    setIndex,
  ]);

  // Add to playlist functionality
  const addToPlaylist = useCallback(async () => {
    if (!currentPlaying) {
      ToastAndroid.show('No song is currently playing', ToastAndroid.SHORT);
      return;
    }

    if (!currentPlaying.id || !currentPlaying.title) {
      ToastAndroid.show(
        'Song data incomplete for playlist',
        ToastAndroid.SHORT
      );
      return;
    }

    try {
      await AddOneSongToPlaylist(currentPlaying);
    } catch (error) {
      ToastAndroid.show('Failed to add to playlist', ToastAndroid.SHORT);
    }
  }, [currentPlaying]);

  // Add more songs from specific artist
  const addMoreFromSpecificArtist = useCallback(
    async (artistId, artistName) => {
      if (isOffline) {
        ToastAndroid.show(
          'This feature is not available offline',
          ToastAndroid.SHORT
        );
        return;
      }

      if (!artistName) {
        ToastAndroid.show('Artist name not available', ToastAndroid.SHORT);
        return;
      }

      let finalArtistId = artistId;

      // Check if the ID is a valid YouTube Music Channel ID (starts with UC)
      // If it's a Saavn/Spotify ID (numbers or other formats), we need to find the YTMusic ID
      const isYTMusicId =
        finalArtistId &&
        typeof finalArtistId === 'string' &&
        finalArtistId.startsWith('UC');

      // Always use YTMusic for artist features for consistent experience
      // If no artist ID or not a YTMusic ID, try to find it by searching YTMusic
      if (!finalArtistId || !isYTMusicId) {
        ToastAndroid.show(
          'Finding artist on YouTube Music...',
          ToastAndroid.SHORT
        );

        // Always use YTMusic search for consistent artist data
        try {
          const ytSearchResponse = await getYTMusicSearchArtistData(
            artistName,
            1,
            10
          );
          if (
            ytSearchResponse?.success &&
            ytSearchResponse?.data?.results?.length > 0
          ) {
            // Find best match
            const bestMatch =
              ytSearchResponse.data.results.find(
                (artist) =>
                  artist.name.toLowerCase() === artistName.toLowerCase()
              ) || ytSearchResponse.data.results[0];
            finalArtistId = bestMatch.id;
          }
        } catch (error) {
          console.warn('Error searching artist on YTMusic:', error);
        }

        if (!finalArtistId) {
          ToastAndroid.show(
            'Could not find artist information on YouTube Music',
            ToastAndroid.SHORT
          );
          return;
        }
      }

      try {
        ToastAndroid.show(
          `Loading more songs from ${artistName}...`,
          ToastAndroid.SHORT
        );

        let response = null;
        let songs = [];

        // Always use YouTube Music API for artist songs (unified approach)
        try {
          response = await getYTMusicArtistSongsPaginated(
            String(finalArtistId),
            1,
            20
          );
          if (
            response?.success &&
            response?.data?.songs &&
            response.data.songs.length > 0
          ) {
            songs = response.data.songs;
          }
        } catch (error) {
          console.error('Error fetching artist songs:', error);
        }

        if (songs.length > 0) {
          // CRITICAL: Track that we're navigating FROM FullScreenMusic
          setFullScreenNavigationTarget('ArtistPage');

          // Close FullScreenMusic first (Index = 0), then navigate
          setIndex(0);

          // Navigate directly to artist page to show all songs
          // Pass the songs directly to avoid refetching
          setTimeout(() => {
            navigation.navigate('ArtistPage', {
              artistId: String(finalArtistId),
              artistName: artistName,
              source: 'ytmusic', // Always use ytmusic for consistent artist page
              preloadedSongs: songs,
              returnToFullScreen: true,
            });
          }, 50);

          ToastAndroid.show(
            `Found ${songs.length} songs from ${artistName}`,
            ToastAndroid.SHORT
          );
        } else {
          ToastAndroid.show(
            `No additional songs found from ${artistName}`,
            ToastAndroid.SHORT
          );
        }
      } catch (error) {
        console.error('❌ Error in addMoreFromSpecificArtist:', error);
        ToastAndroid.show('Failed to load artist songs', ToastAndroid.SHORT);
      }
    },
    [
      isOffline,
      navigation,
      findArtistId,
      currentPlaying,
      setFullScreenNavigationTarget,
      setIndex,
    ]
  );

  // Add more songs from same artist (legacy function for single artist)
  const addMoreFromArtist = useCallback(async () => {
    if (!currentPlaying) {
      ToastAndroid.show('No song is currently playing', ToastAndroid.SHORT);
      return;
    }

    // Get the first/primary artist
    const artists = extractMultipleArtists(currentPlaying);
    if (artists.length === 0) {
      ToastAndroid.show('No artist information available', ToastAndroid.SHORT);
      return;
    }

    const primaryArtist = artists[0];
    await addMoreFromSpecificArtist(primaryArtist.id, primaryArtist.name);
  }, [currentPlaying, extractMultipleArtists, addMoreFromSpecificArtist]);

  // Generate menu options with multiple artist support
  const getMenuOptions = useCallback(() => {
    const baseOptions = [];

    // Check if the song has album metadata available
    // Only show "Go to Album" option if album info exists
    const hasAlbumMetadata =
      currentPlaying &&
      (currentPlaying.albumId ||
        currentPlaying.album_id ||
        currentPlaying.album?.id ||
        currentPlaying.more_info?.album_id ||
        currentPlaying.more_info?.albumid ||
        // Check if album name exists and is not a placeholder
        (currentPlaying.album?.name &&
          currentPlaying.album.name !== 'Unknown Album' &&
          currentPlaying.album.name !== 'N/A') ||
        (typeof currentPlaying.album === 'string' &&
          currentPlaying.album &&
          currentPlaying.album !== 'Unknown Album' &&
          currentPlaying.album !== 'N/A') ||
        (currentPlaying.more_info?.album &&
          currentPlaying.more_info.album !== 'Unknown Album' &&
          currentPlaying.more_info.album !== 'N/A'));

    // Only add album option if album metadata is available
    if (hasAlbumMetadata) {
      baseOptions.push({
        id: 'album',
        icon: (
          <MaterialCommunityIcons name="album" size={22} color={colors.text} />
        ),
        text: 'Go to Album',
        onPress: navigateToAlbum,
      });
    }

    // Get multiple artists from current song
    const artists = currentPlaying
      ? extractMultipleArtists(currentPlaying)
      : [];

    if (artists.length === 1) {
      // Single artist, add "More from Artist" option
      const artist = artists[0];
      baseOptions.push({
        id: 'more-artist',
        icon: (
          <MaterialCommunityIcons
            name="music-note-plus"
            size={22}
            color={colors.text}
          />
        ),
        text: `More from ${artist.name}`,
        onPress: addMoreFromArtist,
      });
    } else if (artists.length > 1) {
      // Multiple artists, add individual options for each
      artists.forEach((artist, index) => {
        // Add "More from [Artist Name]" for each artist
        baseOptions.push({
          id: `more-artist-${index}`,
          icon: (
            <MaterialCommunityIcons
              name="account-music"
              size={22}
              color={colors.text}
            />
          ),
          text: `More from ${artist.name}`,
          onPress: () => addMoreFromSpecificArtist(artist.id, artist.name),
        });
      });
    }

    // Always add playlist option
    baseOptions.push({
      id: 'playlist',
      icon: (
        <MaterialCommunityIcons
          name="playlist-plus"
          size={22}
          color={colors.text}
        />
      ),
      text: 'Add to Playlist',
      onPress: addToPlaylist,
    });

    return baseOptions;
  }, [
    colors.text,
    currentPlaying,
    extractMultipleArtists,
    navigateToAlbum,
    addToPlaylist,
    addMoreFromArtist,
    addMoreFromSpecificArtist,
  ]);

  return {
    menuVisible,
    menuPosition,
    showMenu,
    closeMenu,
    getMenuOptions,
  };
};
