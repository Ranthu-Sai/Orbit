/**
 * Shared helpers for local music scanning.
 * Keeps file-type rules and ID generation identical across all scanners.
 */

// Single source of truth for which files count as playable audio
export const AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'aac',
  'flac',
  'ogg',
  'opus',
  'wav',
];

const AUDIO_FILE_REGEX = new RegExp(`\\.(${AUDIO_EXTENSIONS.join('|')})$`, 'i');

export const isAudioFile = (fileName) =>
  !!fileName && AUDIO_FILE_REGEX.test(fileName);

/**
 * cyrb53 - fast 53-bit string hash. Works on any unicode input, so
 * non-Latin file names (Hindi, Japanese, ...) get distinct values.
 */
export const hashString = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

/**
 * Collision-free, filesystem-safe key for a file path.
 * A short readable prefix keeps keys debuggable; the hash keeps them unique.
 */
export const pathToKey = (path) => {
  if (!path) {
    return 'unknown';
  }
  const fileName = path.substring(path.lastIndexOf('/') + 1);
  const readable = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 24);
  return `${readable}_${hashString(path)}`;
};

export const stripFileScheme = (path) =>
  typeof path === 'string' && path.startsWith('file://')
    ? path.substring(7)
    : path;
