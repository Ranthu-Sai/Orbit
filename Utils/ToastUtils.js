/**
 * Platform-safe toast. ToastAndroid is Android-only; importing it on iOS
 * yields `undefined` so calling `.show()` throws. On non-Android platforms
 * this helper is a silent no-op (the app has no iOS toast UI to fall back
 * to; iOS feedback currently surfaces through modals/alerts instead).
 */

import { Platform, ToastAndroid } from 'react-native';

/**
 * @param {string} message Message to show.
 * @param {'SHORT'|'LONG'} [duration] Toast duration, defaults to 'SHORT'.
 * @returns {void}
 */
export const showToast = (message, duration = 'SHORT') => {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    ToastAndroid.show(message, ToastAndroid[duration] || ToastAndroid.SHORT);
  } catch (e) {
    // Toasting must never crash playback/UI flows.
  }
};

export default showToast;
