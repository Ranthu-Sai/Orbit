import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_TOKEN_URL, SPOTIFY_API_BASE_URL } from './secrets';
import base64 from 'base-64';

let accessToken = null;
let tokenExpiration = 0;

/**
 * Service to handle Spotify API interactions
 */
export const SpotifyService = {
    /**
     * Get a valid access token using Client Credentials flow
     * @returns {Promise<string>} Access token
     */
    getAccessToken: async () => {
        // Return existing token if valid
        if (accessToken && Date.now() < tokenExpiration) {
            return accessToken;
        }

        try {
            if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
                throw new Error('Missing Spotify credentials in .env');
            }

            const credentials = base64.encode(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);

            const response = await fetch(SPOTIFY_TOKEN_URL || 'https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Spotify Auth Error:', errorData);
                throw new Error(`Spotify Auth Failed: ${errorData.error_description || response.status}`);
            }

            const data = await response.json();

            accessToken = data.access_token;
            // Set expiration 5 minutes before actual expiration (usually 3600s) for safety
            tokenExpiration = Date.now() + ((data.expires_in - 300) * 1000);

            return accessToken;
        } catch (error) {
            console.error('Error getting Spotify access token:', error);
            throw error;
        }
    },

    /**
     * Parse playlist ID from various Spotify URL formats
     * @param {string} url - Spotify playlist URL
     * @returns {string|null} Playlist ID or null
     */
    getPlaylistIdFromUrl: (url) => {
        try {
            if (!url) return null;

            // Handle different formats:
            // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
            // spotify:playlist:37i9dQZF1DXcBWIGoYBM5M

            let id = '';

            if (url.includes('spotify:playlist:')) {
                id = url.split('spotify:playlist:')[1];
            } else if (url.includes('/playlist/')) {
                const parts = url.split('/playlist/');
                id = parts[1];
            }

            // Remove query parameters if present
            if (id && id.includes('?')) {
                id = id.split('?')[0];
            }

            return id || null;
        } catch (error) {
            console.error('Error parsing playlist URL:', error);
            return null;
        }
    },

    /**
     * Fetch playlist details and tracks
     * @param {string} playlistId - Spotify Playlist ID
     * @returns {Promise<Object>} Playlist object with formatted tracks
     */
    getPlaylist: async (playlistId) => {
        try {
            const token = await SpotifyService.getAccessToken();
            const baseUrl = SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';

            // Fetch playlist details
            const response = await fetch(`${baseUrl}/playlists/${playlistId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error('Playlist not found or is private');
                throw new Error(`Spotify API Error: ${response.status}`);
            }

            const data = await response.json();

            // Get all tracks (handle pagination if needed - for now supporting first 100)
            // Note: max limit per request is 100
            let tracks = data.tracks.items;
            let nextUrl = data.tracks.next;

            // If there dependancies are setup correctly, we could loop here to get all tracks.
            // For MVP/Robustness, let's fetch one more page if exists (up to 200 songs)
            // to avoid hitting rate limits or long wait times.
            if (nextUrl) {
                const nextResponse = await fetch(nextUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (nextResponse.ok) {
                    const nextData = await nextResponse.json();
                    tracks = [...tracks, ...nextData.items];
                }
            }

            // Filter and map tracks, excluding unavailable ones
            const availableTracks = tracks.map(item => {
                const track = item.track;
                // Skip local files or null tracks
                if (!track || track.is_local) return null;

                // Skip tracks with missing/empty names (show as "Unknown")
                if (!track.name || track.name.trim() === '') return null;

                // Skip tracks with no artists
                if (!track.artists || track.artists.length === 0) return null;

                const artistName = track.artists.map(a => a.name).join(', ');
                // Skip tracks where all artists are empty/missing
                if (!artistName || artistName.trim() === '') return null;

                return {
                    title: track.name,
                    artist: artistName,
                    album: track.album?.name || '',
                    duration: track.duration_ms / 1000, // convert directly to seconds
                    artwork: track.album?.images?.[0]?.url,
                    spotifyId: track.id
                };
            }).filter(t => t !== null);

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                image: data.images?.[0]?.url,
                owner: data.owner?.display_name,
                totalTracks: availableTracks.length, // Use filtered count, not API total
                tracks: availableTracks
            };

        } catch (error) {
            console.error('Error fetching Spotify playlist:', error);
            throw error;
        }
    },

    /**
     * Fetch album details and tracks
     * @param {string} albumId - Spotify Album ID
     * @returns {Promise<Object>} Album object with formatted tracks as playlist
     */
    getAlbum: async (albumId) => {
        try {
            const token = await SpotifyService.getAccessToken();
            const baseUrl = SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';

            const response = await fetch(`${baseUrl}/albums/${albumId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error('Album not found');
                throw new Error(`Spotify API Error: ${response.status}`);
            }

            const data = await response.json();

            // Handle paging for album tracks
            let tracks = data.tracks.items;
            let nextUrl = data.tracks.next;

            if (nextUrl) {
                const nextResponse = await fetch(nextUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (nextResponse.ok) {
                    const nextData = await nextResponse.json();
                    tracks = [...tracks, ...nextData.items];
                }
            }

            return {
                id: data.id,
                name: data.name,
                description: `Album by ${data.artists.map(a => a.name).join(', ')} • ${data.release_date}`,
                image: data.images?.[0]?.url,
                owner: data.artists[0]?.name,
                year: data.release_date?.split('-')[0] || '',
                totalTracks: data.total_tracks,
                tracks: tracks.map(track => {
                    if (!track) return null;
                    return {
                        title: track.name,
                        artist: track.artists.map(a => a.name).join(', '),
                        album: data.name, // Album structure doesn't always have album object in track
                        duration: track.duration_ms / 1000,
                        artwork: data.images?.[0]?.url, // Use album art
                        spotifyId: track.id
                    };
                }).filter(t => t !== null)
            };

        } catch (error) {
            console.error('Error fetching Spotify album:', error);
            throw error;
        }
    },

    /**
     * Fetch single track details
     * @param {string} trackId - Spotify Track ID
     * @returns {Promise<Object>} Object treating single track as a playlist of 1
     */
    getTrack: async (trackId) => {
        try {
            const token = await SpotifyService.getAccessToken();
            const baseUrl = SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';

            const response = await fetch(`${baseUrl}/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error('Track not found');
                throw new Error(`Spotify API Error: ${response.status}`);
            }

            const track = await response.json();

            // Return as a "Playlist" structure with 1 song
            return {
                id: track.id,
                name: track.name,
                description: `Single by ${track.artists.map(a => a.name).join(', ')}`,
                image: track.album.images?.[0]?.url,
                owner: track.artists[0]?.name,
                totalTracks: 1,
                tracks: [{
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    duration: track.duration_ms / 1000,
                    artwork: track.album.images?.[0]?.url,
                    spotifyId: track.id
                }]
            };

        } catch (error) {
            console.error('Error fetching Spotify track:', error);
            throw error;
        }
    },

    /**
     * Search Spotify for tracks, albums, and playlists
     * @param {string} query - Search query
     * @param {string} type - Type of search: 'tracks', 'albums', 'playlists', or 'all'
     * @param {number} limit - Number of results to return (default 20)
     * @returns {Promise<Object>} Search results in app-compatible format
     */
    // In-memory cache to stay within rate limits
    // query -> { timestamp, data }
    searchCache: new Map(),
    CACHE_TTL: 300000, // 5 minutes

    /**
     * Optimized Spotify Search
     * - Uses consolidated type query (track,album,playlist) in a single request
     * - Implements in-memory caching to avoid redundant rate-limit hits
     * - Minimum query length enforcement
     */
    search: async (query, type = 'all', limit = 20) => {
        if (!query || query.trim().length < 3) {
            return { status: 'SUCCESS', success: true, data: { total: 0, results: [] } };
        }

        const normalizedQuery = query.trim().toLowerCase();
        const cacheKey = `${normalizedQuery}_${type}_${limit}`;
        const allCacheKey = `${normalizedQuery}_all_${limit}`;

        // 1. Check Cache (Check specific or 'all' results)
        let cached = SpotifyService.searchCache.get(cacheKey);

        // If not found, check if we have an 'all' result for this query that contains the type we need
        if (!cached && type !== 'all') {
            const allCached = SpotifyService.searchCache.get(allCacheKey);
            if (allCached && (Date.now() - allCached.timestamp < SpotifyService.CACHE_TTL)) {
                // Construct a specific result from the 'all' data
                const filteredResults = type === 'tracks' || type === 'songs'
                    ? allCached.data.data.tracks
                    : (type === 'albums' ? allCached.data.data.albums : allCached.data.data.playlists);

                return {
                    ...allCached.data,
                    data: {
                        ...allCached.data.data,
                        results: filteredResults
                    }
                };
            }
        }

        if (cached && (Date.now() - cached.timestamp < SpotifyService.CACHE_TTL)) {
            return cached.data;
        }

        try {
            const token = await SpotifyService.getAccessToken();
            const baseUrl = SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';

            // Map our type names to Spotify API types
            // If type is 'all' (default for quick results), fetch EVERYTHING in one request!
            const spotifyType = type === 'all'
                ? 'track,album,playlist'
                : (type === 'tracks' || type === 'songs' ? 'track' : type === 'albums' ? 'album' : 'playlist');

            const response = await fetch(
                `${baseUrl}/search?q=${encodeURIComponent(query)}&type=${spotifyType}&limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Spotify Search Error:', errorData);
                throw new Error(`Spotify Search Failed: ${response.status}`);
            }

            const data = await response.json();

            // Transform results
            const transformTracks = (items) => items?.map(track => ({
                id: track.id,
                spotifyId: track.id,
                name: track.name,
                title: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                primaryArtists: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumId: track.album.id,
                duration: Math.floor(track.duration_ms / 1000),
                image: (track.album?.images || []).map(img => ({
                    url: img.url,
                    quality: img.width <= 64 ? '50x50' : img.width <= 300 ? '150x150' : '500x500'
                })).reverse(),
                artwork: track.album?.images?.[0]?.url,
                type: 'song',
                source: 'spotify',
                explicit: track.explicit,
                previewUrl: track.preview_url,
                externalUrl: track.external_urls?.spotify
            })) || [];

            const transformAlbums = (items) => items?.map(album => ({
                id: album.id,
                spotifyId: album.id,
                name: album.name,
                title: album.name,
                artist: album.artists.map(a => a.name).join(', '),
                artists: album.artists.map(a => a.name).join(', '),
                year: album.release_date?.split('-')[0] || '',
                releaseDate: album.release_date,
                totalTracks: album.total_tracks,
                image: (album.images || []).map(img => ({
                    url: img.url,
                    link: img.url,
                    quality: img.width <= 64 ? '50x50' : img.width <= 300 ? '150x150' : '500x500'
                })).reverse(),
                artwork: album.images?.[0]?.url,
                type: 'album',
                source: 'spotify',
                externalUrl: album.external_urls?.spotify
            })) || [];

            const transformPlaylists = (items) => items?.filter(p => p !== null).map(playlist => ({
                id: playlist.id,
                spotifyId: playlist.id,
                name: playlist.name,
                title: playlist.name,
                description: playlist.description,
                owner: playlist.owner?.display_name,
                createdBy: playlist.owner?.display_name,
                songCount: playlist.tracks?.total || 0,
                image: (playlist.images || []).map(img => ({
                    url: img.url,
                    link: img.url,
                    quality: img.width ? (img.width <= 64 ? '50x50' : img.width <= 300 ? '150x150' : '500x500') : '150x150'
                })).reverse(),
                artwork: playlist.images?.[0]?.url,
                type: 'playlist',
                source: 'spotify',
                externalUrl: playlist.external_urls?.spotify
            })) || [];

            // Consolidate all results
            let results = [];
            if (type === 'all') {
                results = [
                    ...transformTracks(data.tracks?.items),
                    ...transformAlbums(data.albums?.items),
                    ...transformPlaylists(data.playlists?.items)
                ];
            } else {
                if (spotifyType === 'track') results = transformTracks(data.tracks?.items);
                else if (spotifyType === 'album') results = transformAlbums(data.albums?.items);
                else if (spotifyType === 'playlist') results = transformPlaylists(data.playlists?.items);
            }

            const finalData = {
                status: 'SUCCESS',
                success: true,
                data: {
                    total: results.length,
                    results: results,
                    // Pass specific categories back for intelligent tab caching
                    tracks: type === 'all' ? transformTracks(data.tracks?.items) : [],
                    albums: type === 'all' ? transformAlbums(data.albums?.items) : [],
                    playlists: type === 'all' ? transformPlaylists(data.playlists?.items) : []
                }
            };

            // 2. Save to Cache
            SpotifyService.searchCache.set(cacheKey, {
                timestamp: Date.now(),
                data: finalData
            });

            return finalData;

        } catch (error) {
            console.error('Spotify search error:', error);
            return {
                status: 'FAILED',
                success: false,
                message: error.message,
                data: { total: 0, results: [] }
            };
        }
    }
};

export default SpotifyService;
