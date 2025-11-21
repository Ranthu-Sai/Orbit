import axios from "axios";
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import PythonBridgeService from '../Utils/PythonBridgeService';

const YTMUSIC_API_BASE = "https://ytmusic-api-rest.onrender.com";

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
      // Using localhost after adb reverse port forwarding
      const apiBaseURL = 'http://localhost:5001';
      
      const response = await axios.get(`${apiBaseURL}/api/homefeed`, {
        params: {
          limit: limit
        },
        timeout: 15000
      });

      if (response.data && response.data.data && response.data.data.feed) {
        // Transform the homefeed data to extract playlists and albums
        const feedSections = response.data.data.feed;

        // Extract playlists and albums from all sections
        const playlists = [];
        const albums = [];

        console.log('Processing YTMusic homefeed sections:', feedSections.length);

        feedSections.forEach((section, sectionIndex) => {
          console.log(`Section ${sectionIndex}: ${section.sectionTitle}, items: ${section.items?.length || 0}`);
          
          if (section.items && Array.isArray(section.items)) {
            section.items.forEach((item, itemIndex) => {
              console.log(`  Item ${itemIndex}: type=${item.type}, id=${item.id}, title=${item.title}`);
              
              if (item.type === 'playlist') {
                // Transform playlist data
                const transformedPlaylist = transformYTToSaavnPlaylist(item);
                playlists.push(transformedPlaylist);
                console.log('    Added playlist:', transformedPlaylist.title);
              } else if (item.type === 'album') {
                // Transform album data
                const transformedAlbum = transformYTToSaavnAlbum(item);
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

      console.log('YTMusic homefeed: No valid data structure found in response');
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
    return await getCachedData(cacheKey, fetchFunction, 10, CACHE_GROUPS.HOME); // Cache for 10 minutes
  } catch (error) {
    console.error('Error getting YTMusic homefeed data:', error);
    return {
      success: false,
      data: { playlists: [], albums: [], feed: [] },
      error: error.message || 'Network or Cache Error'
    };
  }
}


export {
  getYTMusicSearchSongData,
  getYTMusicSearchArtistData,
  getYTMusicSearchAlbumData,
  getYTMusicSearchPlaylistData,
  getYTMusicHomeFeed
};
