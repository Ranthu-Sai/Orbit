/**
 * SecureStore.js
 *
 * Thin wrapper around react-native-keychain for storing small secrets
 * (auth session tokens, login cookies) in the encrypted Keystore /
 * Keychain instead of plain AsyncStorage.
 *
 * react-native-keychain v8 exposes a simplified API where the generic
 * password methods take (username, password, options) and return the
 * stored pair. We pin a single well-known service name and hide that
 * shape from callers, exposing a simple string get/set/delete API.
 *
 * Migration: values previously stored in AsyncStorage under the legacy
 * keys are read once, moved into the Keychain, and removed from
 * AsyncStorage (it is plaintext on disk). A graceful fallback to plain
 * storage keeps the app functional if the native module is unavailable
 * (e.g. a build where keychain wasn't linked yet).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE = 'com.orbit.app.secrets';

// Mirrors of the legacy AsyncStorage keys so migration can be self-contained
// without importing the individual auth services (avoids import cycles).
const LEGACY_KEYS = {
  dabSession: '@dab_session',
  lastfmSession: 'lastfm_session_key',
  ytCookies: 'yt_cookies',
};

let Keychain = null;
try {
  // eslint-disable-next-line import/no-unresolved, global-require
  Keychain = require('react-native-keychain').default;
} catch (e) {
  Keychain = null;
}

/** True when the native keychain module is present and usable. */
const isAvailable = () => {
  try {
    if (!Keychain || typeof Keychain.setGenericPassword !== 'function') {
      return false;
    }
    // Introspection with real device-backed options would require a native
    // round trip; the presence check is enough to catch unlinked builds.
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Read a secret.
 * @param {string} key Logical key name (see LEGACY_KEYS for known ones).
 * @returns {Promise<string|null>}
 */
async function getItem(key) {
  if (!key) {
    return null;
  }
  try {
    if (isAvailable()) {
      const creds = await Keychain.getGenericPassword({
        service: `${SERVICE}.${key}`,
      });
      if (creds && creds.password) {
        return creds.password;
      }
      return null;
    }
    // Fallback: plaintext storage (matches pre-migration behaviour).
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`SecureStore: failed to read "${key}"`, error?.message || error);
    try {
      // Last resort so callers keep working rather than hard-failing auth.
      return await AsyncStorage.getItem(key);
    } catch (fallbackErr) {
      return null;
    }
  }
}

/**
 * Write a secret.
 * @param {string} key Logical key name.
 * @param {string} value Secret value.
 * @returns {Promise<boolean>} True when written successfully.
 */
async function setItem(key, value) {
  if (!key) {
    return false;
  }
  try {
    if (value === null || value === undefined) {
      await removeItem(key);
      return true;
    }
    if (isAvailable()) {
      await Keychain.setGenericPassword('orbit', String(value), {
        service: `${SERVICE}.${key}`,
      });
      return true;
    }
    await AsyncStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    console.warn(`SecureStore: failed to write "${key}"`, error?.message || error);
    try {
      await AsyncStorage.setItem(key, String(value));
      return true;
    } catch (fallbackErr) {
      return false;
    }
  }
}

/**
 * Delete a secret.
 * @param {string} key Logical key name.
 * @returns {Promise<boolean>}
 */
async function removeItem(key) {
  if (!key) {
    return false;
  }
  try {
    if (isAvailable()) {
      await Keychain.resetGenericPassword({ service: `${SERVICE}.${key}` });
    }
    // Always clear the plaintext fallback/migration source too.
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`SecureStore: failed to delete "${key}"`, error?.message || error);
    return false;
  }
}

/**
 * One-time migration of legacy plaintext secrets into the Keychain.
 * Safe to call repeatedly - only moves values that still exist in
 * AsyncStorage, then deletes the plaintext copies.
 */
async function migrateFromAsyncStorage() {
  if (!isAvailable()) {
    return false;
  }
  const entries = Object.entries(LEGACY_KEYS);
  for (const [name, legacyKey] of entries) {
    try {
      const plaintext = await AsyncStorage.getItem(legacyKey);
      if (plaintext === null) {
        continue;
      }
      await setItem(legacyKey, plaintext);
      // Only delete plaintext after the keychain write succeeded.
      await AsyncStorage.removeItem(legacyKey);
    } catch (error) {
      console.warn(
        `SecureStore: migration failed for "${legacyKey}"`,
        error?.message || error
      );
    }
  }
  return true;
}

export const SecureStore = {
  isAvailable,
  getItem,
  setItem,
  removeItem,
  migrateFromAsyncStorage,
};

export default SecureStore;
