/**
 * PlaceholderArtwork.js
 *
 * Local fallback artwork. via.placeholder.com has been unreliable (dead
 * responses / DNS failures), which rendered every card without artwork as a
 * broken image. Bundled assets can be required statically, and a data-URI
 * works for components that expect a remote-looking URL string.
 */

// Bundled locally so it works fully offline and cannot 404.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PLACEHOLDER_SOURCE = require('../Images/default.jpg');

// base64 of a 1x1 gray PNG pixel - a guaranteed-valid data URI for components
// that only accept string URLs (e.g. track-player artwork fields).
const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Placeholder for `<Image source={...}>` components.
 * Returns a local require() source that always resolves.
 */
export const placeholderImageSource = PLACEHOLDER_SOURCE;

/**
 * Placeholder for string-URL fields (artwork / image / link properties that
 * flow into FastImage, TrackPlayer metadata, playlists stored in AsyncStorage,
 * etc.).
 *
 * @returns {string} A data URI that renders as a neutral gray square.
 */
export const placeholderArtworkUrl = () => PIXEL_PNG;

export default {
  placeholderImageSource,
  placeholderArtworkUrl,
};
