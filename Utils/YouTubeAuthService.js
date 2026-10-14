/**
 * YouTubeAuthService - Manages YouTube Music authentication state
 * Extracts and stores user account information from cookies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStore from './SecureStore';

const YT_USER_KEY = 'yt_user_info';
const YT_COOKIES_KEY = 'yt_cookies';

class YouTubeAuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
    this._initialized = false;
  }

  async init() {
    if (this._initialized) {
      return;
    }
    try {
      // Migrate legacy plaintext cookies into encrypted storage once.
      await SecureStore.migrateFromAsyncStorage();

      const [userInfo, cookies] = await Promise.all([
        AsyncStorage.getItem(YT_USER_KEY),
        SecureStore.getItem(YT_COOKIES_KEY),
      ]);

      if (userInfo) {
        this.user = JSON.parse(userInfo);
      }

      this.isAuthenticated = !!cookies && cookies.includes('SAPISID');
      this._initialized = true;
      this._notifyListeners();
    } catch (error) {
      console.error('YouTubeAuthService init error:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuth() {
    return this.isAuthenticated;
  }

  /**
   * Get current user info
   */
  getUser() {
    return this.user;
  }

  /**
   * Set user info after successful login
   * @param {Object} userInfo - { name, handle, avatarUrl }
   */
  async setUser(userInfo) {
    try {
      this.user = userInfo;
      this.isAuthenticated = true;
      await AsyncStorage.setItem(YT_USER_KEY, JSON.stringify(userInfo));
      this._notifyListeners();
    } catch (error) {
      console.error('YouTubeAuthService setUser error:', error);
    }
  }

  /**
   * Extract user info from YouTube page after login
   * This is called from WebView after successful authentication
   */
  async extractUserInfoFromPage(pageData) {
    try {
      // Parse the user info from the YouTube page data
      // The pageData should contain name and handle extracted via injected JS
      if (pageData && (pageData.name || pageData.handle)) {
        await this.setUser({
          name: pageData.name || 'YouTube User',
          handle: pageData.handle || '',
          avatarUrl: pageData.avatarUrl || null,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('extractUserInfoFromPage error:', error);
      return false;
    }
  }

  /**
   * Mark user as authenticated (when cookies are valid but no user info)
   */
  async setAuthenticated() {
    this.isAuthenticated = true;
    this._notifyListeners();
  }

  /**
   * Store YouTube auth cookies in encrypted storage.
   * Single write path for login flows (webview capture / manual paste).
   * @param {string} cookieString - Raw Cookie header value
   */
  async setCookies(cookieString) {
    try {
      await SecureStore.setItem(YT_COOKIES_KEY, cookieString);
      this.isAuthenticated = !!cookieString && cookieString.includes('SAPISID');
      // New session: make the streaming layer re-read cookies right away
      this._resetStreamingSession();
      this._notifyListeners();
    } catch (error) {
      console.error('YouTubeAuthService setCookies error:', error);
      throw error;
    }
  }

  /**
   * Get stored cookies for authenticated API requests
   * @returns {string|null} Cookie string or null if not authenticated
   */
  async getCookies() {
    try {
      const cookies = await SecureStore.getItem(YT_COOKIES_KEY);
      return cookies || null;
    } catch (error) {
      console.error('YouTubeAuthService getCookies error:', error);
      return null;
    }
  }

  /**
   * Drop cached copies of the cookie string outside this service.
   * Lazy requires avoid an import cycle with the streaming service.
   * @param {Object} options
   * @param {boolean} options.clearNative - Also clear the native extractor's cookies
   */
  _resetStreamingSession({ clearNative = false } = {}) {
    try {
      require('./YouTubeStreamingService').default.clearCookieCache();
    } catch (e) {
      // Streaming service not loaded yet: nothing cached
    }
    if (clearNative) {
      try {
        const StreamModule = require('./NativeStreaming').default;
        StreamModule?.clearCookies?.().catch?.(() => {});
      } catch (e) {
        // Older native build without clearCookies
      }
    }
  }

  /**
   * Logout - clear all auth data
   */
  async logout() {
    try {
      this.user = null;
      this.isAuthenticated = false;
      await Promise.all([
        AsyncStorage.removeItem(YT_USER_KEY),
        SecureStore.removeItem(YT_COOKIES_KEY),
      ]);

      // Also clear headers_auth.json
      try {
        const RNFS = require('react-native-fs');
        const path = `${RNFS.DocumentDirectoryPath}/headers_auth.json`;
        const exists = await RNFS.exists(path);
        if (exists) {
          await RNFS.unlink(path);
        }
      } catch (fsError) {
        console.warn('Could not delete headers_auth.json:', fsError);
      }

      // Stop sending the old session everywhere it is still held
      this._resetStreamingSession({ clearNative: true });
      try {
        // The login WebView's cookie jar; otherwise the next login screen
        // silently re-captures this account. (Only the login screen uses a
        // WebView, so clearing all WebView cookies is safe.)
        const CookieManager = require('@react-native-cookies/cookies').default;
        await CookieManager.clearAll();
      } catch (cookieError) {
        console.warn('Could not clear WebView cookies:', cookieError);
      }

      this._notifyListeners();
      return { success: true };
    } catch (error) {
      console.error('YouTubeAuthService logout error:', error);
      return { success: false, error };
    }
  }

  /**
   * Add a listener for auth state changes
   */
  addListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  /**
   * Notify all listeners of state change
   */
  _notifyListeners() {
    const state = {
      user: this.user,
      isAuthenticated: this.isAuthenticated,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

// Singleton instance
const ytAuthService = new YouTubeAuthService();

// Initialize on import
ytAuthService.init();

export default ytAuthService;
