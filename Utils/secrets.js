/**
 * Secrets configuration
 * Uses react-native-config to load from .env file
 */
import Config from 'react-native-config';

export const SPOTIFY_CLIENT_ID = Config.SPOTIFY_CLIENT_ID || '';
export const SPOTIFY_CLIENT_SECRET = Config.SPOTIFY_CLIENT_SECRET || '';
export const SPOTIFY_REDIRECT_URI = Config.SPOTIFY_REDIRECT_URI || 'com.orbit://spotify-callback';
export const SPOTIFY_AUTH_URL = Config.SPOTIFY_AUTH_URL || 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN_URL = Config.SPOTIFY_TOKEN_URL || 'https://accounts.spotify.com/api/token';
export const SPOTIFY_API_BASE_URL = Config.SPOTIFY_API_BASE_URL || 'https://api.spotify.com/v1';
export const PODCAST_INDEX_API_KEY = Config.PODCAST_INDEX_API_KEY || '';
export const PODCAST_INDEX_API_SECRET = Config.PODCAST_INDEX_API_SECRET || '';

// Last.fm API credentials
export const LASTFM_API_KEY = Config.LASTFM_API_KEY || '';
export const LASTFM_API_SECRET = Config.LASTFM_API_SECRET || '';
