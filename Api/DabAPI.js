import axios from 'axios';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import DabAuthService from '../Utils/DabAuthService';

// DAB Music API Base URL
const DAB_API_BASE_URL = 'https://dabmusic.xyz/api';

// Request timeout
const REQUEST_TIMEOUT = 15000;

// ============================================
// HELPER FUNCTIONS - Data Transformation
// ============================================

/**
 * Transform DAB track to Saavn-like format
 */
function transformDabToSaavnSong(track) {
    const imageArray = [];

    // Handle album cover as image array
    if (track.albumCover) {
        imageArray.push(
            { url: track.albumCover, quality: '50x50' },
            { url: track.albumCover, quality: '150x150' },
            { url: track.albumCover, quality: '500x500' }
        );
    }

    return {
        id: String(track.id),
        name: track.title,
        title: track.title,
        subtitle: track.artist || 'Unknown Artist',
        type: 'song',
        source: 'dab', // Mark source as DAB
        image: imageArray.length > 0 ? imageArray : [{
            url: 'https://via.placeholder.com/150',
            quality: '150x150'
        }],
        artist: track.artist || 'Unknown Artist',
        artists: {
            primary: track.artist ? [{ name: track.artist, id: track.artistId }] : []
        },
        duration: track.duration || 0,
        language: 'unknown',
        year: track.releaseDate ? track.releaseDate.split('-')[0] : '',
        albumId: String(track.albumId || ''),
        album: track.albumTitle || '',
        label: '',
        url: '',
        copyright: '',
        primaryArtists: track.artist || 'Unknown Artist',
        singers: '',
        composer: '',
        lyricist: '',
        producer: '',
        genre: track.genre || '',
        playCount: 0,
        explicitContent: 0,
        downloadUrl: String(track.id), // Store track ID for streaming
        // DAB-specific metadata
        audioQuality: track.audioQuality || null,
        isHiRes: track.audioQuality?.isHiRes || false,
        maximumBitDepth: track.audioQuality?.maximumBitDepth || null,
        maximumSamplingRate: track.audioQuality?.maximumSamplingRate || null,
    };
}

/**
 * Transform DAB album to Saavn-like format
 */
function transformDabToSaavnAlbum(album) {
    const imageArray = [];

    if (album.cover) {
        imageArray.push(
            { url: album.cover, link: album.cover, quality: '50x50' },
            { url: album.cover, link: album.cover, quality: '150x150' },
            { url: album.cover, link: album.cover, quality: '500x500' }
        );
    }

    return {
        id: String(album.id),
        name: album.title,
        title: album.title,
        subtitle: `Album • ${album.releaseDate || 'Unknown'}`,
        type: 'album',
        source: 'dab',
        image: imageArray.length > 0 ? imageArray : [{
            url: 'https://via.placeholder.com/150',
            link: 'https://via.placeholder.com/150',
            quality: '150x150'
        }],
        artist: album.artist || 'Unknown Artist',
        artistId: String(album.artist || ''),
        artists: album.artist || 'Unknown Artist',
        url: String(album.id),
        duration: album.duration || 0,
        explicit: album.parental_warning || false,
        language: 'unknown',
        playCount: album.popularity || 0,
        year: album.releaseDate ? album.releaseDate.split('-')[0] : '',
        songs: Array.isArray(album.tracks) ? album.tracks.map(transformDabToSaavnSong) : [],
        songCount: album.trackCount || 0,
        genre: album.genre || '',
        label: album.label || '',
        upc: album.upc || '',
        audioQuality: album.audioQuality || null,
        artistMap: {}
    };
}

/**
 * Transform DAB artist to Saavn-like format
 */
function transformDabToSaavnArtist(artist) {
    const imageArray = [];

    if (artist.image) {
        imageArray.push(
            { url: artist.image, quality: '50x50' },
            { url: artist.image, quality: '150x150' },
            { url: artist.image, quality: '500x500' }
        );
    }

    return {
        id: String(artist.id),
        name: artist.name,
        title: artist.name,
        subtitle: `Artist • ${artist.albumsCount || 0} albums`,
        type: 'artist',
        source: 'dab',
        image: imageArray.length > 0 ? imageArray : [{
            url: 'https://via.placeholder.com/150',
            quality: '150x150'
        }],
        url: String(artist.id),
        role: '',
        artistId: String(artist.id),
        followerCount: 0,
        follower_count: 0,
        fan_count: 0,
        isVerified: false,
        dominantLanguage: 'unknown',
        dominantType: '',
        bio: artist.biography || '',
        dob: '',
        fb: '',
        twitter: '',
        wiki: '',
        availableLanguages: [],
        isRadioPresent: false,
        albumsCount: artist.albumsCount || 0,
        slug: artist.slug || ''
    };
}

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Login response with user data
 */
export async function dabLogin(email, password) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/auth/login`,
            { email, password },
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true, // Important for cookies
            }
        );

        if (response.data && response.data.user) {
            // Store session info
            await DabAuthService.setUser(response.data.user);

            return {
                success: true,
                message: response.data.message || 'Login successful',
                user: response.data.user
            };
        }

        throw new Error('Invalid login response');
    } catch (error) {
        console.error('DAB login error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message || 'Login failed',
            error: error.response?.data
        };
    }
}

/**
 * Register new user
 * @param {string} username - Username
 * @param {string} email - Email address
 * @param {string} password - Password
 * @param {string} inviteCode - Optional invite code
 * @returns {Promise<Object>} Registration response
 */
export async function dabRegister(username, email, password, inviteCode = null) {
    try {
        const requestBody = { username, email, password };
        if (inviteCode) {
            requestBody.inviteCode = inviteCode;
        }

        console.log('📤 DAB Register request:', { username, email, hasInviteCode: !!inviteCode });

        const response = await axios.post(
            `${DAB_API_BASE_URL}/auth/register`,
            requestBody,
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            }
        );

        console.log('✅ DAB Register success:', response.data);

        return {
            success: true,
            message: response.data.message || 'User created successfully'
        };
    } catch (error) {
        console.error('❌ DAB register error:', error);
        console.error('Error response data:', error.response?.data);
        console.error('Error response status:', error.response?.status);

        return {
            success: false,
            message: error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed',
            error: error.response?.data
        };
    }
}

/**
 * Logout current user
 * @returns {Promise<Object>} Logout response
 */
export async function dabLogout() {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/auth/logout`,
            {},
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        // Clear local session
        await DabAuthService.clearUser();

        return {
            success: true,
            message: response.data.message || 'Logged out successfully'
        };
    } catch (error) {
        console.error('DAB logout error:', error);
        // Clear local session even if API call fails
        await DabAuthService.clearUser();

        return {
            success: false,
            message: error.response?.data?.error || error.message || 'Logout failed'
        };
    }
}

/**
 * Get current authenticated user
 * @returns {Promise<Object>} Current user data
 */
export async function dabGetCurrentUser() {
    try {
        const response = await axios.get(
            `${DAB_API_BASE_URL}/auth/me`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        if (response.data && response.data.user) {
            // Update local session
            await DabAuthService.setUser(response.data.user);

            return {
                success: true,
                user: response.data.user
            };
        }

        return {
            success: false,
            user: null
        };
    } catch (error) {
        console.error('DAB get current user error:', error);
        return {
            success: false,
            user: null,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Response
 */
export async function dabForgotPassword(email) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/auth/forgot-password`,
            { email },
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
            }
        );

        return {
            success: true,
            message: response.data.message || 'Password reset email sent'
        };
    } catch (error) {
        console.error('DAB forgot password error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message || 'Request failed'
        };
    }
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} password - New password
 * @returns {Promise<Object>} Response
 */
export async function dabResetPassword(token, password) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/auth/reset-password`,
            { token, password },
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
            }
        );

        return {
            success: true,
            message: response.data.message || 'Password reset successful'
        };
    } catch (error) {
        console.error('DAB reset password error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message || 'Reset failed'
        };
    }
}

// ============================================
// SEARCH ENDPOINTS
// ============================================

/**
 * Search for tracks
 * @param {string} searchText - Search query
 * @param {number} page - Page number (not used by API, kept for consistency)
 * @param {number} limit - Results limit (1-50)
 * @returns {Promise<Object>} Search results
 */
export async function getDabSearchSongData(searchText, page = 1, limit = 20) {
    const cacheKey = `dab_search_tracks_${searchText}_limit${limit}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/search`,
                {
                    params: {
                        q: searchText,
                        type: 'track',
                        limit: Math.min(limit, 50)
                    },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const tracks = response.data?.tracks || [];
            const transformedTracks = tracks.map(transformDabToSaavnSong);

            console.log(`✅ DAB Search Tracks - Found ${transformedTracks.length} tracks for: ${searchText}`);

            return {
                status: 'SUCCESS',
                message: '',
                data: {
                    total: transformedTracks.length,
                    start: 0,
                    results: transformedTracks
                },
                success: true
            };
        } catch (error) {
            console.error('DAB track search error:', error);
            return {
                status: 'FAILED',
                message: error.message || 'Failed to search DAB tracks',
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
        console.error(`Error getting DAB track search data for "${searchText}":`, error);
        return {
            success: false,
            data: { results: [] },
            error: error.message || 'Network or Cache Error'
        };
    }
}

/**
 * Search for albums
 */
export async function getDabSearchAlbumData(searchText, page = 1, limit = 20) {
    const cacheKey = `dab_search_albums_${searchText}_limit${limit}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/search`,
                {
                    params: {
                        q: searchText,
                        type: 'album',
                        limit: Math.min(limit, 50)
                    },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const albums = response.data?.albums || [];
            const transformedAlbums = albums.map(transformDabToSaavnAlbum);

            console.log(`✅ DAB Search Albums - Found ${transformedAlbums.length} albums for: ${searchText}`);

            return {
                status: 'SUCCESS',
                message: '',
                data: {
                    total: transformedAlbums.length,
                    start: 0,
                    results: transformedAlbums
                },
                success: true
            };
        } catch (error) {
            console.error('DAB album search error:', error);
            return {
                status: 'FAILED',
                message: error.message || 'Failed to search DAB albums',
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
        console.error(`Error getting DAB album search data for "${searchText}":`, error);
        return {
            success: false,
            data: { results: [] },
            error: error.message || 'Network or Cache Error'
        };
    }
}

/**
 * Search for artists
 */
export async function getDabSearchArtistData(searchText, page = 1, limit = 20) {
    const cacheKey = `dab_search_artists_${searchText}_limit${limit}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/search`,
                {
                    params: {
                        q: searchText,
                        type: 'artist',
                        limit: Math.min(limit, 50)
                    },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const artists = response.data?.artists || [];
            const transformedArtists = artists.map(transformDabToSaavnArtist);

            console.log(`✅ DAB Search Artists - Found ${transformedArtists.length} artists for: ${searchText}`);

            return {
                status: 'SUCCESS',
                message: '',
                data: {
                    total: transformedArtists.length,
                    start: 0,
                    results: transformedArtists
                },
                success: true
            };
        } catch (error) {
            console.error('DAB artist search error:', error);
            return {
                status: 'FAILED',
                message: error.message || 'Failed to search DAB artists',
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
        console.error(`Error getting DAB artist search data for "${searchText}":`, error);
        return {
            success: false,
            data: { results: [] },
            error: error.message || 'Network or Cache Error'
        };
    }
}

// ============================================
// ALBUM & ARTIST ENDPOINTS
// ============================================

/**
 * Get album details
 * @param {string} albumId - Album ID
 * @returns {Promise<Object>} Album data with tracks
 */
export async function getDabAlbumData(albumId) {
    const cacheKey = `dab_album_${albumId}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/album`,
                {
                    params: { albumId },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const album = response.data?.album;

            if (!album) {
                throw new Error('Album not found');
            }

            const transformedAlbum = transformDabToSaavnAlbum(album);

            console.log(`✅ DAB Album - Loaded album: ${transformedAlbum.name}`);

            return {
                status: 'SUCCESS',
                message: `Loaded album with ${transformedAlbum.songCount} songs`,
                data: transformedAlbum,
                success: true
            };
        } catch (error) {
            console.error('DAB album fetch error:', error);
            return {
                status: 'FAILED',
                message: error.message || 'Failed to fetch DAB album',
                data: null,
                success: false
            };
        }
    };

    try {
        return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.ALBUMS);
    } catch (error) {
        console.error(`Error getting DAB album data for ID ${albumId}:`, error);
        return {
            success: false,
            data: null,
            error: error.message || 'Network or Cache Error'
        };
    }
}

/**
 * Get artist discography
 * @param {string} artistId - Artist ID
 * @returns {Promise<Object>} Artist data with albums
 */
export async function getDabArtistDiscography(artistId) {
    const cacheKey = `dab_artist_discography_${artistId}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/discography`,
                {
                    params: { artistId },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const artist = response.data?.artist;
            const albums = response.data?.albums || [];

            if (!artist) {
                throw new Error('Artist not found');
            }

            const transformedArtist = transformDabToSaavnArtist(artist);
            const transformedAlbums = albums.map(transformDabToSaavnAlbum);

            console.log(`✅ DAB Artist - Loaded ${transformedAlbums.length} albums for: ${transformedArtist.name}`);

            return {
                status: 'SUCCESS',
                message: `Loaded ${transformedAlbums.length} albums`,
                data: {
                    artist: transformedArtist,
                    albums: transformedAlbums
                },
                success: true
            };
        } catch (error) {
            console.error('DAB artist discography fetch error:', error);
            return {
                status: 'FAILED',
                message: error.message || 'Failed to fetch DAB artist discography',
                data: null,
                success: false
            };
        }
    };

    try {
        return await getCachedData(cacheKey, fetchFunction, 60, CACHE_GROUPS.ARTISTS);
    } catch (error) {
        console.error(`Error getting DAB artist discography for ID ${artistId}:`, error);
        return {
            success: false,
            data: null,
            error: error.message || 'Network or Cache Error'
        };
    }
}

// ============================================
// STREAMING ENDPOINT
// ============================================

/**
 * Get streaming URL for a track
 * @param {string} trackId - Track ID
 * @param {string} quality - Audio quality (default: "27")
 * @returns {Promise<Object>} Streaming URL
 */
export async function getDabStreamingUrl(trackId, quality = '27') {
    const cacheKey = `dab_stream_${trackId}_${quality}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/stream`,
                {
                    params: {
                        trackId,
                        quality
                    },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const streamUrl = response.data?.streamUrl;

            if (!streamUrl) {
                throw new Error('No streaming URL found');
            }

            console.log(`✅ DAB Stream - Got URL for track: ${trackId}`);

            return streamUrl;
        } catch (error) {
            console.error('DAB streaming URL fetch error:', error);
            throw error;
        }
    };

    try {
        return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.STREAMING_URLS);
    } catch (error) {
        console.error(`Error getting DAB streaming URL for track ${trackId}:`, error);
        throw new Error(`Failed to get streaming URL: ${error.message}`);
    }
}

// ============================================
// LYRICS ENDPOINT
// ============================================

/**
 * Get lyrics for a song
 * @param {string} artist - Artist name
 * @param {string} title - Song title
 * @returns {Promise<Object>} Lyrics data
 */
export async function getDabLyrics(artist, title) {
    const cacheKey = `dab_lyrics_${artist.toLowerCase()}_${title.toLowerCase()}`;

    const fetchFunction = async () => {
        try {
            const response = await axios.get(
                `${DAB_API_BASE_URL}/lyrics`,
                {
                    params: { artist, title },
                    timeout: REQUEST_TIMEOUT,
                }
            );

            const lyrics = response.data?.lyrics;

            if (!lyrics) {
                return {
                    success: false,
                    message: 'No lyrics found'
                };
            }

            console.log(`✅ DAB Lyrics - Found for: ${artist} - ${title}`);

            return {
                success: true,
                data: {
                    lyrics,
                    source: 'dab'
                }
            };
        } catch (error) {
            console.error('DAB lyrics fetch error:', error);
            return {
                success: false,
                message: error.response?.status === 404 ? 'Lyrics not found' : error.message
            };
        }
    };

    try {
        return await getCachedData(cacheKey, fetchFunction, 1440, CACHE_GROUPS.LYRICS);
    } catch (error) {
        console.error(`Error getting DAB lyrics for "${artist} - ${title}":`, error);
        return {
            success: false,
            message: error.message || 'Failed to fetch lyrics'
        };
    }
}

// ============================================
// USER FEATURES (Require Authentication)
// ============================================

/**
 * Get user favorites
 * @returns {Promise<Object>} User favorites
 */
export async function getDabFavorites() {
    try {
        const response = await axios.get(
            `${DAB_API_BASE_URL}/favorites`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        const favorites = response.data?.favorites || [];
        const transformedFavorites = favorites.map(transformDabToSaavnSong);

        return {
            success: true,
            data: transformedFavorites
        };
    } catch (error) {
        console.error('DAB get favorites error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message,
            data: []
        };
    }
}

/**
 * Add track to favorites
 * @param {Object} trackData - Track data to add
 * @returns {Promise<Object>} Response
 */
export async function dabAddToFavorites(trackData) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/favorites`,
            trackData,
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Added to favorites'
        };
    } catch (error) {
        console.error('DAB add to favorites error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Remove track from favorites
 * @param {string} trackId - Track ID
 * @returns {Promise<Object>} Response
 */
export async function dabRemoveFromFavorites(trackId) {
    try {
        const response = await axios.delete(
            `${DAB_API_BASE_URL}/favorites`,
            {
                params: { trackId },
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Removed from favorites'
        };
    } catch (error) {
        console.error('DAB remove from favorites error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Get user libraries
 * @returns {Promise<Object>} User libraries
 */
export async function getDabLibraries() {
    try {
        const response = await axios.get(
            `${DAB_API_BASE_URL}/libraries`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        return {
            success: true,
            data: response.data?.libraries || []
        };
    } catch (error) {
        console.error('DAB get libraries error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message,
            data: []
        };
    }
}

/**
 * Create a new library
 * @param {string} name - Library name
 * @param {string} description - Library description
 * @param {boolean} isPublic - Is library public
 * @returns {Promise<Object>} Response
 */
export async function dabCreateLibrary(name, description = '', isPublic = false) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/libraries`,
            { name, description, isPublic },
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: 'Library created',
            data: response.data
        };
    } catch (error) {
        console.error('DAB create library error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Get library details with tracks
 * @param {string} libraryId - Library ID
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} Library data
 */
export async function getDabLibrary(libraryId, page = 1, limit = 20) {
    try {
        const response = await axios.get(
            `${DAB_API_BASE_URL}/libraries/${libraryId}`,
            {
                params: { page, limit },
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        const library = response.data?.library;

        if (library && library.tracks) {
            library.tracks = library.tracks.map(transformDabToSaavnSong);
        }

        return {
            success: true,
            data: library
        };
    } catch (error) {
        console.error('DAB get library error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message,
            data: null
        };
    }
}

/**
 * Delete library
 * @param {string} libraryId - Library ID
 * @returns {Promise<Object>} Response
 */
export async function dabDeleteLibrary(libraryId) {
    try {
        const response = await axios.delete(
            `${DAB_API_BASE_URL}/libraries/${libraryId}`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Library deleted'
        };
    } catch (error) {
        console.error('DAB delete library error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Add track to library
 * @param {string} libraryId - Library ID
 * @param {Object} trackData - Track data
 * @returns {Promise<Object>} Response
 */
export async function dabAddTrackToLibrary(libraryId, trackData) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/libraries/${libraryId}/tracks`,
            trackData,
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Track added to library'
        };
    } catch (error) {
        console.error('DAB add track to library error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Remove track from library
 * @param {string} libraryId - Library ID
 * @param {string} trackId - Track ID
 * @returns {Promise<Object>} Response
 */
export async function dabRemoveTrackFromLibrary(libraryId, trackId) {
    try {
        const response = await axios.delete(
            `${DAB_API_BASE_URL}/libraries/${libraryId}/tracks/${trackId}`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Track removed from library'
        };
    } catch (error) {
        console.error('DAB remove track from library error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Get user queue
 * @returns {Promise<Object>} User queue
 */
export async function getDabQueue() {
    try {
        const response = await axios.get(
            `${DAB_API_BASE_URL}/queue`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        const queue = response.data?.queue || [];
        const transformedQueue = queue.map(transformDabToSaavnSong);

        return {
            success: true,
            data: transformedQueue
        };
    } catch (error) {
        console.error('DAB get queue error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message,
            data: []
        };
    }
}

/**
 * Save user queue
 * @param {Array} queue - Queue data
 * @returns {Promise<Object>} Response
 */
export async function dabSaveQueue(queue) {
    try {
        const response = await axios.post(
            `${DAB_API_BASE_URL}/queue`,
            { queue },
            {
                timeout: REQUEST_TIMEOUT,
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Queue saved'
        };
    } catch (error) {
        console.error('DAB save queue error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

/**
 * Clear user queue
 * @returns {Promise<Object>} Response
 */
export async function dabClearQueue() {
    try {
        const response = await axios.delete(
            `${DAB_API_BASE_URL}/queue`,
            {
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            }
        );

        return {
            success: true,
            message: response.data.message || 'Queue cleared'
        };
    } catch (error) {
        console.error('DAB clear queue error:', error);
        return {
            success: false,
            message: error.response?.data?.error || error.message
        };
    }
}

// Export all functions
export default {
    // Auth
    dabLogin,
    dabRegister,
    dabLogout,
    dabGetCurrentUser,
    dabForgotPassword,
    dabResetPassword,
    // Search
    getDabSearchSongData,
    getDabSearchAlbumData,
    getDabSearchArtistData,
    // Details
    getDabAlbumData,
    getDabArtistDiscography,
    // Streaming
    getDabStreamingUrl,
    // Lyrics
    getDabLyrics,
    // User Features
    getDabFavorites,
    dabAddToFavorites,
    dabRemoveFromFavorites,
    getDabLibraries,
    dabCreateLibrary,
    getDabLibrary,
    dabDeleteLibrary,
    dabAddTrackToLibrary,
    dabRemoveTrackFromLibrary,
    getDabQueue,
    dabSaveQueue,
    dabClearQueue,
};
