import axios from "axios";
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import PythonBridgeService from '../Utils/PythonBridgeService';

const YTMUSIC_API_BASE = "";

// Helper function to transform YTMusic song data to Saavn format
function transformYTToSaavnSong(song) {
  // Transform thumbnails array to Saavn format with .url property
  const imageArray = [];
  if (song.thumbnails && Array.isArray(song.thumbnails)) {
    song.thumbnails.forEach((thumbnail, index) => {
      imageArray.push({
        url: thumbnail.url,
        quality: index === 0 ? "50x50" : index === 1 ? "150x150" : "500x500"
      });
    });
  }

  return {
    id: song.id,
    name: song.title,
    title: song.title,
    subtitle: song.artists?.map(artist => artist.name).join(", ") || "Unknown Artist",
    type: "song",
    image: imageArray.length > 0 ? imageArray : [{
      url: "https://via.placeholder.com/150",
      quality: "150x150"
    }],
    artist: song.artists?.[0]?.name || "Unknown Artist",
    artists: {
      primary: song.artists || []
    },
    duration: 0, // YTMusic API doesn't provide duration in search
    language: "unknown",
    year: "",
    albumId: "",
    album: "",
    label: "",
    url: "", // YTMusic doesn't provide direct audio URLs
    copyright: "",
    primaryArtists: song.artists?.map(artist => artist.name).join(", ") || "Unknown Artist",
    singers: "",
    composer: "",
    lyricist: "",
    producer: "",
    genre: "",
    playCount: 0,
    explicitContent: 0,
    downloadUrl: song.id // Store the video ID for streaming
  };
}

// Transform YTMusic artist data
function transformYTToSaavnArtist(artist) {
  // Transform thumbnails array to Saavn format with .url property
  const imageArray = [];
  if (artist.thumbnails && Array.isArray(artist.thumbnails)) {
    artist.thumbnails.forEach((thumbnail) => {
      imageArray.push({
        url: thumbnail.url,
        quality: thumbnail.height < 300 ? "150x150" : "500x500"
      });
    });
  }

  return {
    id: artist.id,
    name: artist.name,
    title: artist.name,
    subtitle: `${artist.type} • ${artist.drawName || artist.category || "Artist"}`,
    type: "artist",
    image: imageArray.length > 0 ? imageArray : [{
      url: "https://via.placeholder.com/150",
      quality: "150x150"
    }],
    url: artist.id,
    role: "",
    artistId: artist.id,
    followerCount: 0,
    follower_count: 0,
    fan_count: 0,
    isVerified: false,
    dominantLanguage: "unknown",
    dominantType: "",
    bio: "",
    dob: "",
    fb: "",
    twitter: "",
    wiki: "",
    availableLanguages: [],
    isRadioPresent: false
  };
}

// Transform YTMusic album data
function transformYTToSaavnAlbum(album) {
  // Transform thumbnails array to Saavn format with .url property
  const imageArray = [];
  if (album.thumbnails && Array.isArray(album.thumbnails)) {
    album.thumbnails.forEach((thumbnail) => {
      imageArray.push({
        url: thumbnail.url,
        link: thumbnail.url, // Add link property for compatibility
        quality: thumbnail.height <= 226 ? "150x150" : "500x500"
      });
    });
  }

  return {
    id: album.id,
    name: album.title,
    title: album.title,
    subtitle: album.year ? `Album • ${album.year}` : "Album",
    type: "album",
    image: imageArray.length > 0 ? imageArray : [{
      url: "https://via.placeholder.com/150",
      link: "https://via.placeholder.com/150",
      quality: "150x150"
    }],
    artist: "Various Artists",
    artistId: "",
    artists: "Various Artists",
    url: album.id,
    duration: 0,
    explicit: false,
    language: "unknown",
    playCount: 0,
    year: album.year || "",
    songs: [],
    artistMap: {}
  };
}

// Transform YTMusic playlist data
function transformYTToSaavnPlaylist(playlist) {
  // Transform thumbnails array to Saavn format with .link property
  const imageArray = [];
  if (playlist.thumbnails && Array.isArray(playlist.thumbnails)) {
    playlist.thumbnails.forEach((thumbnail, index) => {
      imageArray.push({
        quality: thumbnail.height <= 192 ? "50x50" : thumbnail.height <= 226 ? "150x150" : "500x500",
        url: thumbnail.url,
        link: thumbnail.url // This is what EachPlaylistCard expects
      });
    });
  }

  return {
    id: playlist.id,
    name: playlist.title,
    title: playlist.title,
    subtitle: "YouTube Music Playlist",
    type: "playlist",
    image: imageArray.length > 0 ? imageArray : [{
      quality: "150x150",
      url: "https://via.placeholder.com/150",
      link: "https://via.placeholder.com/150"
    }],
    url: playlist.id,
    songCount: 0,
    createdBy: "YouTube Music",
    songs: [],
    duration: 0,
    description: "",
    explicit: false,
    artists: "YouTube Music" // Add artists property for compatibility
  };
}

async function getYTMusicSearchSongData(searchText, page = 1, limit = 20) {
  const cacheKey = `ytmusic_search_songs_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    try {
      // Remove spaces from search query for YTMusic API
      const apiQuery = searchText.replace(/\s+/g, '');
      const response = await axios.get(`${YTMUSIC_API_BASE}/api/search`, {
        params: {
          query: apiQuery,
          filter: "songs"
        },
        timeout: 10000
      });

      if (response.data?.data?.results) {
        const transformedResults = response.data.data.results.map(transformYTToSaavnSong);

        return {
          status: "SUCCESS",
          message: "",
          data: {
            total: transformedResults.length,
            start: 0,
            results: transformedResults
          },
          success: true
        };
      }

      return {
        status: "SUCCESS",
        message: "",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    } catch (error) {
      console.error('YTMusic song search error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to search YTMusic songs",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting YTMusic song search data for "${searchText}":`, error);
    return {
      success: false,
      data: { results: [] },
      error: error.message || 'Network or Cache Error'
    };
  }
}

async function getYTMusicSearchArtistData(searchText, page = 1, limit = 20) {
  const cacheKey = `ytmusic_search_artists_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    try {
      // Remove spaces from search query for YTMusic API
      const apiQuery = searchText.replace(/\s+/g, '');
      const response = await axios.get(`${YTMUSIC_API_BASE}/api/search`, {
        params: {
          query: apiQuery,
          filter: "artists"
        },
        timeout: 10000
      });

      if (response.data?.data?.results) {
        const transformedResults = response.data.data.results.map(transformYTToSaavnArtist);

        return {
          status: "SUCCESS",
          message: "",
          data: {
            total: transformedResults.length,
            start: 0,
            results: transformedResults
          },
          success: true
        };
      }

      return {
        status: "SUCCESS",
        message: "",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    } catch (error) {
      console.error('YTMusic artist search error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to search YTMusic artists",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting YTMusic artist search data for "${searchText}":`, error);
    return {
      success: false,
      data: { results: [] },
      error: error.message || 'Network or Cache Error'
    };
  }
}

async function getYTMusicSearchAlbumData(searchText, page = 1, limit = 20) {
  const cacheKey = `ytmusic_search_albums_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    try {
      // Remove spaces from search query for YTMusic API
      const apiQuery = searchText.replace(/\s+/g, '');
      const response = await axios.get(`${YTMUSIC_API_BASE}/api/search`, {
        params: {
          query: apiQuery,
          filter: "albums"
        },
        timeout: 10000
      });

      if (response.data?.data?.results) {
        const transformedResults = response.data.data.results.map(transformYTToSaavnAlbum);

        return {
          status: "SUCCESS",
          message: "",
          data: {
            total: transformedResults.length,
            start: 0,
            results: transformedResults
          },
          success: true
        };
      }

      return {
        status: "SUCCESS",
        message: "",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    } catch (error) {
      console.error('YTMusic album search error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to search YTMusic albums",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting YTMusic album search data for "${searchText}":`, error);
    return {
      success: false,
      data: { results: [] },
      error: error.message || 'Network or Cache Error'
    };
  }
}

async function getYTMusicSearchPlaylistData(searchText, page = 1, limit = 20) {
  const cacheKey = `ytmusic_search_playlists_${searchText}_page${page}_limit${limit}`;

  const fetchFunction = async () => {
    try {
      // Remove spaces from search query for YTMusic API
      const apiQuery = searchText.replace(/\s+/g, '');
      const response = await axios.get(`${YTMUSIC_API_BASE}/api/search`, {
        params: {
          query: apiQuery,
          filter: "playlists"
        },
        timeout: 10000
      });

      if (response.data?.data?.results) {
        const transformedResults = response.data.data.results.map(transformYTToSaavnPlaylist);

        return {
          status: "SUCCESS",
          message: "",
          data: {
            total: transformedResults.length,
            start: 0,
            results: transformedResults
          },
          success: true
        };
      }

      return {
        status: "SUCCESS",
        message: "",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    } catch (error) {
      console.error('YTMusic playlist search error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to search YTMusic playlists",
        data: {
          total: 0,
          start: 0,
          results: []
        },
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    console.error(`Error getting YTMusic playlist search data for "${searchText}":`, error);
    return {
      success: false,
      data: { results: [] },
      error: error.message || 'Network or Cache Error'
    };
  }
}

async function getYTMusicHomeFeed(limit = 10) {
  const cacheKey = `ytmusic_homefeed_limit_${limit}`;

  const fetchFunction = async () => {
    try {
      // Use Python bridge for production (calls android/app/src/main/python/youtube_api.py)
      console.log('🌐 YTMusic Home - Using Python bridge for homefeed...');

      const homeFeedData = await PythonBridgeService.getHomeFeed(limit);

      if (homeFeedData && typeof homeFeedData === 'string') {
        // Parse the JSON string returned by Python
        const parsedData = JSON.parse(homeFeedData);

        if (parsedData && Array.isArray(parsedData)) {
          // Transform the homefeed data to extract playlists and albums
          const feedSections = parsedData;

          // Extract playlists and albums from all sections
          const playlists = [];
          const albums = [];

          console.log('Processing YTMusic homefeed sections:', feedSections.length);

          feedSections.forEach((section, sectionIndex) => {
            console.log(`Section ${sectionIndex}: ${section.title}, items: ${section.contents?.length || 0}`);

            if (section.contents && Array.isArray(section.contents)) {
              section.contents.forEach((item, itemIndex) => {
                console.log(`  Item ${itemIndex}: type=${item.videoId ? 'song' : item.playlistId ? 'playlist' : item.browseId ? 'album' : 'unknown'}, id=${item.videoId || item.playlistId || item.browseId || item.id}, title=${item.title}`);

                // Determine item type based on available properties
                let itemType = 'unknown';
                if (item.playlistId) {
                  itemType = 'playlist';
                } else if (item.browseId) {
                  itemType = 'album';
                }

                if (itemType === 'playlist') {
                  // Transform playlist data
                  const transformedPlaylist = transformYTToSaavnPlaylist({
                    id: item.playlistId,
                    title: item.title,
                    thumbnails: item.thumbnails || []
                  });
                  playlists.push(transformedPlaylist);
                  console.log('    Added playlist:', transformedPlaylist.title);
                } else if (itemType === 'album') {
                  // Transform album data
                  const transformedAlbum = transformYTToSaavnAlbum({
                    id: item.browseId,
                    title: item.title,
                    thumbnails: item.thumbnails || [],
                    year: item.year || ''
                  });
                  albums.push(transformedAlbum);
                  console.log('    Added album:', transformedAlbum.title);
                }
              });
            }
          });

          console.log(`YTMusic homefeed processed: ${playlists.length} playlists, ${albums.length} albums`);

          // Log sample data for debugging
          if (playlists.length > 0) {
            console.log('Sample playlist:', JSON.stringify(playlists[0], null, 2));
          }
          if (albums.length > 0) {
            console.log('Sample album:', JSON.stringify(albums[0], null, 2));
          }

          const finalPlaylists = playlists.slice(0, 20);
          const finalAlbums = albums.slice(0, 20);

          return {
            status: "SUCCESS",
            message: `Found ${finalPlaylists.length} playlists and ${finalAlbums.length} albums`,
            data: {
              playlists: finalPlaylists,
              albums: finalAlbums,
              feed: feedSections // Store the full feed for future use
            },
            success: true
          };
        }
      }

      console.log('YTMusic homefeed: No valid data from Python bridge');
      return {
        status: "SUCCESS",
        message: "No data available",
        data: {
          playlists: [],
          albums: [],
          feed: []
        },
        success: false
      };
    } catch (error) {
      console.error('YTMusic homefeed error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to fetch YTMusic homefeed",
        data: {
          playlists: [],
          albums: [],
          feed: []
        },
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 7200, CACHE_GROUPS.HOME); // Cache for 2 hours (7200 seconds)
  } catch (error) {
    console.error('Error getting YTMusic homefeed data:', error);
    return {
      success: false,
      data: { playlists: [], albums: [], feed: [] },
      error: error.message || 'Network or Cache Error'
    };
  }
}


async function getYTMusicPlaylistData(playlistId) {
  const cacheKey = `ytmusic_playlist_${playlistId}`;

  const fetchFunction = async () => {
    try {
      // Using computer IP address for physical device/emulator access
      const apiBaseURL = 'http://10.72.51.82:5001';

      // Use the correct endpoint format: /api/playlist/<playlist_id>
      const response = await axios.get(`${apiBaseURL}/api/playlist/${playlistId}`, {
        timeout: 15000
      });

      if (response.data && response.data.data) {
        const playlistData = response.data.data;

        // Transform the tracks data to match Saavn format
        const transformedSongs = [];
        if (playlistData.tracks && Array.isArray(playlistData.tracks)) {
          playlistData.tracks.forEach(song => {
            // Transform song data to Saavn format
            const transformedSong = {
              id: song.id,
              name: song.title,
              title: song.title,
              subtitle: song.artists?.map(artist => artist.name).join(", ") || "Unknown Artist",
              type: "song",
              source: "ytmusic", // Mark as YTMusic song
              image: song.thumbnails?.map(thumb => ({
                url: thumb.url,
                quality: thumb.height <= 192 ? "50x50" : thumb.height <= 226 ? "150x150" : "500x500"
              })) || [{
                url: "https://via.placeholder.com/150",
                quality: "150x150"
              }],
              artist: song.artists?.[0]?.name || "Unknown Artist",
              artists: {
                primary: song.artists || []
              },
              duration: 0, // YouTube API doesn't provide duration in playlist response
              language: "unknown",
              year: "",
              albumId: "",
              album: "",
              label: "",
              url: "",
              copyright: "",
              primaryArtists: song.artists?.map(artist => artist.name).join(", ") || "Unknown Artist",
              singers: "",
              composer: "",
              lyricist: "",
              producer: "",
              genre: "",
              playCount: 0,
              explicitContent: 0,
              downloadUrl: song.id
            };
            transformedSongs.push(transformedSong);
          });
        }

        // Transform the playlist metadata
        const transformedPlaylist = {
          id: playlistData.playlist.id,
          name: playlistData.playlist.title,
          title: playlistData.playlist.title,
          subtitle: `YouTube Music Playlist • ${transformedSongs.length} songs`,
          type: "playlist",
          image: playlistData.playlist.thumbnails?.map(thumb => ({
            quality: thumb.height <= 192 ? "50x50" : thumb.height <= 226 ? "150x150" : "500x500",
            url: thumb.url,
            link: thumb.url
          })) || [{
            quality: "150x150",
            url: "https://via.placeholder.com/150",
            link: "https://via.placeholder.com/150"
          }],
          url: playlistData.playlist.id,
          songCount: transformedSongs.length,
          createdBy: "YouTube Music",
          songs: transformedSongs,
          duration: 0,
          description: "",
          explicit: false,
          artists: "YouTube Music",
          follower: `${transformedSongs.length} songs`
        };

        return {
          status: "SUCCESS",
          message: `Loaded playlist with ${transformedSongs.length} songs`,
          data: transformedPlaylist,
          success: true
        };
      }

      return {
        status: "FAILED",
        message: "No playlist data found",
        data: null,
        success: false
      };
    } catch (error) {
      console.error('YTMusic playlist fetch error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to fetch YTMusic playlist",
        data: null,
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.PLAYLISTS); // Cache for 30 minutes
  } catch (error) {
    console.error(`Error getting YTMusic playlist data for ID ${playlistId}:`, error);
    return {
      success: false,
      data: null,
      error: error.message || 'Network or Cache Error'
    };
  }
}

async function getYTMusicAlbumData(albumId) {
  const cacheKey = `ytmusic_album_${albumId}`;

  const fetchFunction = async () => {
    try {
      // Using computer IP address for physical device/emulator access
      const apiBaseURL = 'http://10.72.51.82:5001';

      // Use the correct endpoint format: /api/album/<album_id>
      const response = await axios.get(`${apiBaseURL}/api/album/${albumId}`, {
        timeout: 15000
      });

      if (response.data && response.data.data) {
        const albumData = response.data.data;

        // Transform the tracks data to match Saavn format
        const transformedSongs = [];
        if (albumData.tracks && Array.isArray(albumData.tracks)) {
          albumData.tracks.forEach(song => {
            // Transform song data to Saavn format
            const transformedSong = {
              id: song.id,
              name: song.title,
              title: song.title,
              subtitle: song.artists?.map(artist => artist.name).join(", ") || "Unknown Artist",
              type: "song",
              source: "ytmusic", // Mark as YTMusic song
              image: song.thumbnails?.map(thumb => ({
                url: thumb.url,
                quality: thumb.height <= 192 ? "50x50" : thumb.height <= 226 ? "150x150" : "500x500"
              })) || [{
                url: "https://via.placeholder.com/150",
                quality: "150x150"
              }],
              artist: song.artists?.[0]?.name || "Unknown Artist",
              artists: {
                primary: song.artists || []
              },
              duration: 0, // YouTube API doesn't provide duration in album response
              language: "unknown",
              year: albumData.album?.year || "",
              albumId: albumData.album?.id || albumId,
              album: albumData.album?.title || "",
              label: "",
              url: "",
              copyright: "",
              primaryArtists: song.artists?.map(artist => artist.name).join(", ") || "Unknown Artist",
              singers: "",
              composer: "",
              lyricist: "",
              producer: "",
              genre: "",
              playCount: 0,
              explicitContent: 0,
              downloadUrl: song.id
            };
            transformedSongs.push(transformedSong);
          });
        }

        // Transform the album metadata
        const transformedAlbum = {
          id: albumData.album?.id || albumId,
          name: albumData.album?.title || "Unknown Album",
          title: albumData.album?.title || "Unknown Album",
          subtitle: albumData.album?.year ? `Album • ${albumData.album.year}` : "Album",
          type: "album",
          image: albumData.album?.thumbnails?.map(thumb => ({
            quality: thumb.height <= 192 ? "50x50" : thumb.height <= 226 ? "150x150" : "500x500",
            url: thumb.url,
            link: thumb.url
          })) || [{
            quality: "150x150",
            url: "https://via.placeholder.com/150",
            link: "https://via.placeholder.com/150"
          }],
          artist: "Various Artists", // YouTube albums don't specify a single artist
          artistId: "",
          artists: "Various Artists",
          url: albumData.album?.id || albumId,
          duration: 0,
          explicit: false,
          language: "unknown",
          playCount: 0,
          year: albumData.album?.year || "",
          songs: transformedSongs,
          songCount: transformedSongs.length,
          description: "",
          label: "",
          copyright: "",
          primaryArtists: "Various Artists",
          primaryArtistsId: "",
          albumid: albumData.album?.id || albumId,
          releaseDate: "",
          songCountText: `${transformedSongs.length} songs`
        };

        return {
          status: "SUCCESS",
          message: `Loaded album with ${transformedSongs.length} songs`,
          data: transformedAlbum,
          success: true
        };
      }

      return {
        status: "FAILED",
        message: "No album data found",
        data: null,
        success: false
      };
    } catch (error) {
      console.error('YTMusic album fetch error:', error);
      return {
        status: "FAILED",
        message: error.message || "Failed to fetch YTMusic album",
        data: null,
        success: false
      };
    }
  };

  try {
    return await getCachedData(cacheKey, fetchFunction, 60, CACHE_GROUPS.ALBUMS); // Cache for 60 minutes
  } catch (error) {
    console.error(`Error getting YTMusic album data for ID ${albumId}:`, error);
    return {
      success: false,
      data: null,
      error: error.message || 'Network or Cache Error'
    };
  }
}

export {
  getYTMusicSearchSongData,
  getYTMusicSearchArtistData,
  getYTMusicSearchAlbumData,
  getYTMusicSearchPlaylistData,
  getYTMusicHomeFeed,
  getYTMusicPlaylistData,
  getYTMusicAlbumData
};
