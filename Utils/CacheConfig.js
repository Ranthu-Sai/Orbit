/**
 * Cache Configuration for Navigation and Stream Caching
 * 
 * This file defines TTL values and cache size limits for different data types.
 * All durations are in milliseconds.
 */

// Time-To-Live configurations (in milliseconds)
export const CACHE_TTL = {
    // Screen data caches
    HOME_DATA: 24 * 60 * 60 * 1000,      // 24 hours - home page data (Persistence)
    PLAYLIST_DATA: 24 * 60 * 60 * 1000,  // 24 hours - playlist details (Match Home)
    ALBUM_DATA: 24 * 60 * 60 * 1000,     // 24 hours - album details (Match Home)
    LANGUAGE_DATA: 24 * 60 * 60 * 1000,  // 24 hours - language data
    LIBRARY_DATA: 10 * 60 * 1000,        // 10 minutes - library screens (Keep short for user updates)
    ARTIST_DATA: 24 * 60 * 60 * 1000,    // 24 hours - artist details

    // Search Caches
    SEARCH_RESULTS: 4 * 60 * 60 * 1000,      // 4 hours - default search songs
    SEARCH_PLAYLIST_ALBUM: 6 * 60 * 60 * 1000, // 6 hours - search playlists/albums

    // Stream URL caches
    YTMUSIC_STREAM: 4 * 60 * 60 * 1000,  // 4 hours - YouTube Music stream URLs
    DAB_STREAM: 4 * 60 * 60 * 1000,      // 4 hours - DAB stream URLs
    PREFETCH_STREAM: 4 * 60 * 60 * 1000, // 4 hours - Prefetch/On-demand URLs

    // UI State caches
    SCROLL_POSITION: 30 * 60 * 1000,     // 30 minutes - scroll positions
    SEARCH_QUERY: 24 * 60 * 60 * 1000,   // 24 hours - search query state (Better UX on restart)

    // Default fallback
    DEFAULT: 5 * 60 * 1000,              // 5 minutes - default TTL
};

// Cache key prefixes for organization
export const CACHE_KEYS = {
    HOME: 'home_data',
    PLAYLIST: 'playlist',
    ALBUM: 'album',
    SEARCH: 'search',
    LANGUAGE: 'language',
    ARTIST: 'artist',
    LIKED_SONGS: 'liked_songs',
    LIKED_PLAYLISTS: 'liked_playlists',
    CUSTOM_PLAYLISTS: 'custom_playlists',
    FAVORITES_DATA: 'favorites_data',
    DOWNLOADS: 'downloads',
    HISTORY: 'history',
    MY_MUSIC: 'my_music',

    // Stream caches
    YTMUSIC_STREAM: 'ytmusic_stream',
    DAB_STREAM: 'dab_stream',

    // UI State
    SCROLL: 'scroll',
    SEARCH_STATE: 'search_state',
};

// Maximum cache sizes to prevent memory issues
export const CACHE_LIMITS = {
    MAX_ENTRIES: 100,           // Maximum number of cache entries
    MAX_STREAM_ENTRIES: 50,     // Maximum stream URLs to cache
    MAX_SCROLL_ENTRIES: 20,     // Maximum scroll positions to store
};

// Helper to generate cache keys
export const generateCacheKey = (prefix, id) => {
    if (!id) return prefix;
    return `${prefix}_${id}`;
};

// Helper to check if a cache entry is stale
export const isCacheStale = (timestamp, ttl) => {
    if (!timestamp) return true;
    return Date.now() - timestamp > ttl;
};
