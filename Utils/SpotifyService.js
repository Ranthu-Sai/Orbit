import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_TOKEN_URL, SPOTIFY_API_BASE_URL } from './secrets';
import { Buffer } from 'buffer';

console.log('🔍 SpotifyService Debug: Using direct secrets.js');
console.log('🔍 SpotifyService Debug: SPOTIFY_CLIENT_ID Check:', SPOTIFY_CLIENT_ID ? 'Matches' : 'MISSING');

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
            console.log('🔄 Authenticaton with Spotify...');

            if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
                throw new Error('Missing Spotify credentials in .env');
            }

            const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

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

            console.log('✅ Spotify authentication successful');
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

            console.log(`📥 Fetching Spotify playlist: ${playlistId}`);

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
                console.log('📥 Fetching next page of Spotify tracks...');
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

            console.log(`✅ Loaded ${tracks.length} tracks from Spotify`);

            return {
                id: data.id,
                name: data.name,
                description: data.description,
                image: data.images?.[0]?.url,
                owner: data.owner?.display_name,
                totalTracks: data.tracks.total,
                tracks: tracks.map(item => {
                    const track = item.track;
                    // Skip local files or null tracks
                    if (!track || track.is_local) return null;

                    return {
                        title: track.name,
                        artist: track.artists.map(a => a.name).join(', '),
                        album: track.album.name,
                        duration: track.duration_ms / 1000, // convert directly to seconds
                        artwork: track.album.images?.[0]?.url,
                        spotifyId: track.id
                    };
                }).filter(t => t !== null)
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

            console.log(`📥 Fetching Spotify album: ${albumId}`);

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

            console.log(`📥 Fetching Spotify track: ${trackId}`);

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
    }
};
