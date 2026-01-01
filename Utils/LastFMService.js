/**
 * LastFMService.js
 * 
 * Last.fm API integration for authentication and recommendations.
 * Used to power intelligent "Vibe-Consistent" recommendations for DAB songs.
 * 
 * Features:
 * - Mobile Session authentication (username/password)
 * - track.getSimilar for recommendation brain
 * - Secure credential storage via AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import md5 from 'md5';

// Storage keys for credentials
const LASTFM_SESSION_KEY = 'lastfm_session_key';
const LASTFM_USERNAME_KEY = 'lastfm_username';

// Last.fm API configuration
const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';

// API credentials - stored separately for security
// These should be set via initialize() on app start
let API_KEY = '';
let API_SECRET = '';

class LastFMService {
    constructor() {
        this.sessionKey = null;
        this.username = null;
        this.isInitialized = false;
        this.listeners = [];
    }

    /**
     * Initialize the service with API credentials
     * Call this on app startup with your Last.fm API key and secret
     */
    initialize(apiKey, apiSecret) {
        API_KEY = apiKey;
        API_SECRET = apiSecret;
        this.isInitialized = true;
        console.log('🎵 LastFMService: Initialized');
    }

    /**
     * Load saved session from storage
     */
    async loadSession() {
        try {
            const [sessionKey, username] = await Promise.all([
                AsyncStorage.getItem(LASTFM_SESSION_KEY),
                AsyncStorage.getItem(LASTFM_USERNAME_KEY)
            ]);

            if (sessionKey && username) {
                this.sessionKey = sessionKey;
                this.username = username;
                console.log(`🎵 LastFMService: Restored session for ${username}`);
                this.notifyListeners();
                return true;
            }
            return false;
        } catch (error) {
            console.error('LastFMService: Failed to load session', error);
            return false;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.sessionKey !== null && this.sessionKey.length > 0;
    }

    /**
     * Get current user info (from local state)
     */
    getUser() {
        if (!this.isAuthenticated()) return null;
        return {
            username: this.username,
            sessionKey: this.sessionKey
        };
    }

    /**
     * Fetch user profile info from Last.fm
     */
    async getUserInfo() {
        if (!this.isAuthenticated()) return null;

        try {
            const data = await this._apiRequest('user.getInfo', {
                user: this.username
            });

            if (data && data.user) {
                return {
                    username: data.user.name,
                    realname: data.user.realname,
                    image: data.user.image, // Array of images
                    avatarUrl: data.user.image?.[2]?.['#text'] || data.user.image?.[1]?.['#text'] || null,
                    country: data.user.country,
                    playcount: data.user.playcount,
                    registered: data.user.registered?.unixtime
                };
            }
            return null;
        } catch (error) {
            console.error('LastFMService: Failed to fetch user info', error);
            return null;
        }
    }

    /**
     * Generate API signature for Last.fm requests
     * @private
     */
    _generateApiSig(params) {
        // Sort params alphabetically and concatenate
        const sortedKeys = Object.keys(params).sort();
        let sigString = '';
        for (const key of sortedKeys) {
            sigString += key + params[key];
        }
        sigString += API_SECRET;
        return md5(sigString);
    }

    /**
     * Make authenticated API request to Last.fm
     * @private
     */
    async _apiRequest(method, params = {}, requiresAuth = false) {
        if (!this.isInitialized) {
            throw new Error('LastFMService not initialized. Call initialize() first.');
        }

        const requestParams = {
            method,
            api_key: API_KEY,
            format: 'json',
            ...params
        };

        if (requiresAuth && this.sessionKey) {
            requestParams.sk = this.sessionKey;
        }

        // Add API signature
        const paramsForSig = { ...requestParams };
        delete paramsForSig.format; // format is not included in signature
        requestParams.api_sig = this._generateApiSig(paramsForSig);

        // Build form data
        const formData = new URLSearchParams();
        for (const [key, value] of Object.entries(requestParams)) {
            formData.append(key, value);
        }

        const response = await fetch(LASTFM_API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Orbit Music Player (https://github.com/gauravxdev/Orbit)'
            },
            body: formData.toString()
        });

        const data = await response.json();

        if (data.error) {
            throw new LastFMError(data.error, data.message);
        }

        return data;
    }

    /**
     * Login with username and password (Mobile Session)
     * @param {string} username - Last.fm username
     * @param {string} password - Last.fm password
     * @returns {Promise<{success: boolean, username?: string, error?: string}>}
     */
    async login(username, password) {
        try {
            console.log(`🎵 LastFMService: Logging in as ${username}...`);

            const data = await this._apiRequest('auth.getMobileSession', {
                username,
                password
            });

            if (data.session && data.session.key) {
                this.sessionKey = data.session.key;
                this.username = data.session.name;

                // Save to secure storage
                await Promise.all([
                    AsyncStorage.setItem(LASTFM_SESSION_KEY, this.sessionKey),
                    AsyncStorage.setItem(LASTFM_USERNAME_KEY, this.username)
                ]);

                console.log(`✅ LastFMService: Logged in as ${this.username}`);
                this.notifyListeners();

                return { success: true, username: this.username };
            }

            throw new Error('Invalid response from Last.fm');
        } catch (error) {
            console.error('❌ LastFMService: Login failed', error);

            let errorMessage = 'Login failed';
            if (error instanceof LastFMError) {
                switch (error.code) {
                    case 4:
                        errorMessage = 'Invalid username or password';
                        break;
                    case 10:
                        errorMessage = 'Invalid API key';
                        break;
                    case 26:
                        errorMessage = 'API key suspended';
                        break;
                    default:
                        errorMessage = error.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            return { success: false, error: errorMessage };
        }
    }

    /**
     * Logout and clear stored credentials
     */
    async logout() {
        try {
            this.sessionKey = null;
            this.username = null;

            await Promise.all([
                AsyncStorage.removeItem(LASTFM_SESSION_KEY),
                AsyncStorage.removeItem(LASTFM_USERNAME_KEY)
            ]);

            console.log('🎵 LastFMService: Logged out');
            this.notifyListeners();

            return { success: true };
        } catch (error) {
            console.error('LastFMService: Logout failed', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean track title for better Last.fm matching
     * @private
     */
    _cleanTrackTitle(title) {
        if (!title) return '';

        return title
            // Remove (feat. ...), [feat. ...], ft. etc
            .replace(/[\(\[]feat\.?[^\)\]]*[\)\]]/gi, '')
            .replace(/\s+feat\.?\s+.*/gi, '')
            .replace(/\s+ft\.?\s+.*/gi, '')
            // Remove (From "..."), [From ...]
            .replace(/[\(\[]from\s+["']?[^"'\)\]]*["']?[\)\]]/gi, '')
            // Remove (Original Motion Picture...), (OST), etc
            .replace(/[\(\[]original\s+[^\)\]]*[\)\]]/gi, '')
            .replace(/[\(\[]ost[^\)\]]*[\)\]]/gi, '')
            // Remove remaster/remix indicators
            .replace(/[\(\[](remaster|remix|version|edit|radio)[^\)\]]*[\)\]]/gi, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Get similar tracks for a song (Recommendation Brain)
     * @param {string} artist - Artist name
     * @param {string} track - Track name
     * @param {number} limit - Max results (default 20)
     * @returns {Promise<Array<{artist: string, track: string, match: number}>>}
     */
    async getSimilarTracks(artist, track, limit = 20) {
        try {
            console.log(`🧠 LastFM Brain: Getting similar tracks for "${artist} - ${track}"`);

            // First, try with original title
            let data;
            try {
                data = await this._apiRequest('track.getSimilar', {
                    artist,
                    track,
                    limit: limit.toString(),
                    autocorrect: '1'
                });
            } catch (error) {
                // If track not found, try with cleaned title
                if (error.code === 6) { // Track not found
                    const cleanedTitle = this._cleanTrackTitle(track);
                    console.log(`🧠 LastFM Brain: Retrying with cleaned title: "${cleanedTitle}"`);

                    if (cleanedTitle !== track && cleanedTitle.length > 0) {
                        try {
                            data = await this._apiRequest('track.getSimilar', {
                                artist,
                                track: cleanedTitle,
                                limit: limit.toString(),
                                autocorrect: '1'
                            });
                        } catch (retryError) {
                            // Still failed, will use artist fallback below
                            console.log(`🧠 LastFM Brain: Cleaned title also not found`);
                        }
                    }
                }
            }

            // If we have similar tracks, use them
            if (data && data.similartracks && data.similartracks.track) {
                const tracks = Array.isArray(data.similartracks.track)
                    ? data.similartracks.track
                    : [data.similartracks.track];

                const results = tracks.map(t => ({
                    artist: t.artist?.name || t.artist || '',
                    track: t.name || '',
                    match: parseFloat(t.match) || 0,
                    url: t.url || ''
                })).filter(t => t.match >= 0.1);

                console.log(`🧠 LastFM Brain: Found ${results.length} similar tracks`);
                return results;
            }

            // FALLBACK: Get artist's top tracks + some variation
            console.log(`🧠 LastFM Brain: No similar tracks found, falling back to artist top tracks`);
            return await this.getArtistTopTracks(artist, limit);

        } catch (error) {
            console.error('🧠 LastFM Brain: getSimilarTracks failed', error);

            // IMPROVED FALLBACK: Use mood-based + similar artists discovery
            try {
                console.log(`🧠 LastFM Brain: Falling back to mood-based discovery`);
                return await this.getMoodBasedRecommendations(artist, track, limit);
            } catch (fallbackError) {
                console.error('🧠 LastFM Brain: Mood fallback also failed', fallbackError);
                return [];
            }
        }
    }

    /**
     * Get mood-based recommendations using track tags and similar artists
     * This is a much better fallback than same-artist top tracks
     * @param {string} artist - Original artist name
     * @param {string} track - Original track name
     * @param {number} limit - Max results
     */
    async getMoodBasedRecommendations(artist, track, limit = 20) {
        const results = [];
        const seenTracks = new Set();
        const seenArtists = new Set([artist.toLowerCase()]); // Start with original artist to avoid it

        try {
            // 1. Get track tags for mood detection
            console.log(`🧠 LastFM Brain: Getting tags for mood detection`);
            const tags = await this.getTrackTags(artist, track);

            // Filter to meaningful mood/genre tags
            const moodTags = tags.filter(tag =>
                !tag.includes('seen live') &&
                !tag.includes('favourite') &&
                tag.length > 2
            ).slice(0, 3);

            console.log(`🧠 LastFM Brain: Detected mood tags: ${moodTags.join(', ')}`);

            // 2. Get similar artists for variety
            let similarArtists = [];
            try {
                similarArtists = await this.getSimilarArtists(artist, 5);
                console.log(`🧠 LastFM Brain: Found ${similarArtists.length} similar artists`);
            } catch (e) { /* ignore */ }

            // 3. Get tracks from mood tags (parallel for speed)
            if (moodTags.length > 0) {
                const tagPromises = moodTags.map(tag =>
                    this.getTopTracksByTag(tag, Math.ceil(limit / moodTags.length))
                );

                const tagResults = await Promise.all(tagPromises);

                for (const tagTracks of tagResults) {
                    for (const t of tagTracks) {
                        const key = `${t.artist.toLowerCase()}-${t.track.toLowerCase()}`;
                        if (!seenTracks.has(key) && !seenArtists.has(t.artist.toLowerCase())) {
                            seenTracks.add(key);
                            results.push({ ...t, match: 0.7 }); // Mood-based match

                            // Track this artist (allow max 2 songs per artist)
                            const artistLower = t.artist.toLowerCase();
                            const artistCount = results.filter(r => r.artist.toLowerCase() === artistLower).length;
                            if (artistCount >= 2) {
                                seenArtists.add(artistLower);
                            }
                        }
                    }
                }
            }

            // 4. Get top tracks from similar artists (parallel)
            if (similarArtists.length > 0 && results.length < limit) {
                const artistPromises = similarArtists.slice(0, 3).map(a =>
                    this.getArtistTopTracks(a.name, 5)
                );

                const artistResults = await Promise.all(artistPromises);

                for (const artistTracks of artistResults) {
                    for (const t of artistTracks) {
                        const key = `${t.artist.toLowerCase()}-${t.track.toLowerCase()}`;
                        const artistLower = t.artist.toLowerCase();

                        if (!seenTracks.has(key)) {
                            const artistCount = results.filter(r => r.artist.toLowerCase() === artistLower).length;
                            if (artistCount < 2) {
                                seenTracks.add(key);
                                results.push({ ...t, match: 0.6 }); // Similar artist match
                            }
                        }
                    }
                }
            }

            // 5. Shuffle results for freshness
            for (let i = results.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [results[i], results[j]] = [results[j], results[i]];
            }

            console.log(`🧠 LastFM Brain: Got ${results.length} mood-based recommendations from ${new Set(results.map(r => r.artist)).size} artists`);
            return results.slice(0, limit);

        } catch (error) {
            console.error('🧠 LastFM Brain: getMoodBasedRecommendations failed', error);
            return [];
        }
    }

    /**
     * Get similar artists
     * @param {string} artist - Artist name
     * @param {number} limit - Max results
     */
    async getSimilarArtists(artist, limit = 5) {
        try {
            const data = await this._apiRequest('artist.getSimilar', {
                artist,
                limit: limit.toString(),
                autocorrect: '1'
            });

            if (!data.similarartists || !data.similarartists.artist) {
                return [];
            }

            const artists = Array.isArray(data.similarartists.artist)
                ? data.similarartists.artist
                : [data.similarartists.artist];

            return artists.map(a => ({
                name: a.name || '',
                match: parseFloat(a.match) || 0
            }));
        } catch (error) {
            console.error('🧠 LastFM Brain: getSimilarArtists failed', error);
            return [];
        }
    }

    /**
     * Get top tracks for an artist
     * @param {string} artist - Artist name
     * @param {number} limit - Max results
     * @returns {Promise<Array<{artist: string, track: string, match: number}>>}
     */
    async getArtistTopTracks(artist, limit = 20) {
        try {
            const data = await this._apiRequest('artist.getTopTracks', {
                artist,
                limit: limit.toString(),
                autocorrect: '1'
            });

            if (!data.toptracks || !data.toptracks.track) {
                return [];
            }

            const tracks = Array.isArray(data.toptracks.track)
                ? data.toptracks.track
                : [data.toptracks.track];

            // Convert to same format as getSimilarTracks
            // Use playcount-based matching (normalize to 0-1 range)
            const maxPlaycount = Math.max(...tracks.map(t => parseInt(t.playcount) || 0));

            const results = tracks.map(t => ({
                artist: t.artist?.name || artist,
                track: t.name || '',
                match: maxPlaycount > 0 ? (parseInt(t.playcount) || 0) / maxPlaycount : 0.5,
                url: t.url || ''
            }));

            return results;
        } catch (error) {
            console.error('🧠 LastFM Brain: getArtistTopTracks failed', error);
            return [];
        }
    }

    /**
     * Get top tags for a track (for vibe analysis)
     * @param {string} artist - Artist name
     * @param {string} track - Track name
     * @returns {Promise<Array<string>>}
     */
    async getTrackTags(artist, track) {
        try {
            const data = await this._apiRequest('track.getTopTags', {
                artist,
                track,
                autocorrect: '1'
            });

            if (!data.toptags || !data.toptags.tag) {
                return [];
            }

            const tags = Array.isArray(data.toptags.tag)
                ? data.toptags.tag
                : [data.toptags.tag];

            return tags.slice(0, 5).map(t => t.name.toLowerCase());
        } catch (error) {
            console.error('LastFMService: getTrackTags failed', error);
            return [];
        }
    }

    /**
     * Get top tracks by tag (for genre-based discovery)
     * @param {string} tag - Tag name (e.g., "rock", "jazz")
     * @param {number} limit - Max results
     * @returns {Promise<Array<{artist: string, track: string}>>}
     */
    async getTopTracksByTag(tag, limit = 20) {
        try {
            const data = await this._apiRequest('tag.getTopTracks', {
                tag,
                limit: limit.toString()
            });

            if (!data.tracks || !data.tracks.track) {
                return [];
            }

            const tracks = Array.isArray(data.tracks.track)
                ? data.tracks.track
                : [data.tracks.track];

            return tracks.map(t => ({
                artist: t.artist?.name || '',
                track: t.name || ''
            }));
        } catch (error) {
            console.error('LastFMService: getTopTracksByTag failed', error);
            return [];
        }
    }

    // ============ LISTENER PATTERN ============

    /**
     * Add auth state listener
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove auth state listener
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    notifyListeners() {
        const state = {
            isAuthenticated: this.isAuthenticated(),
            user: this.getUser()
        };
        this.listeners.forEach(callback => callback(state));
    }
}

/**
 * Custom error class for Last.fm API errors
 */
class LastFMError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'LastFMError';
    }
}

// Singleton instance
const lastFMService = new LastFMService();
export default lastFMService;
export { LastFMError };
