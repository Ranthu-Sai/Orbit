import { getDabStreamingUrl } from '../Api/DabAPI';
import DabAuthService from './DabAuthService';

/**
 * DAB Music Handler
 * Utilities for handling DAB music tracks
 */

/**
 * Check if a track is from DAB source
 * @param {Object} track - Track object
 * @returns {boolean} True if track is from DAB
 */
export function isDabTrack(track) {
  return track?.source === 'dab' || track?.api === 'dab';
}

/**
 * Get streaming URL for DAB track
 * @param {Object} track - Track object
 * @param {string} quality - Quality setting (default: "27")
 * @returns {Promise<string>} Streaming URL
 */
export async function getDabTrackStreamUrl(track, quality = '27') {
  if (!isDabTrack(track)) {
    throw new Error('Track is not from DAB source');
  }

  const trackId = track.id || track.downloadUrl;

  if (!trackId) {
    throw new Error('Track ID not found');
  }

  try {
    const streamUrl = await getDabStreamingUrl(trackId, quality);
    return streamUrl;
  } catch (error) {
    console.error('Error getting DAB stream URL:', error);
    throw error;
  }
}

/**
 * Get quality label for DAB track
 * @param {Object} track - Track object
 * @returns {string} Quality label
 */
export function getDabQualityLabel(track) {
  if (!track?.audioQuality) {
    return 'Standard';
  }

  const { isHiRes, maximumBitDepth, maximumSamplingRate } = track.audioQuality;

  if (isHiRes) {
    return `Hi-Res ${maximumBitDepth}bit/${maximumSamplingRate}kHz`;
  }

  if (maximumBitDepth && maximumSamplingRate) {
    return `${maximumBitDepth}bit/${maximumSamplingRate}kHz`;
  }

  return 'Lossless';
}

/**
 * Check if user is logged into DAB
 * @returns {boolean} Login status
 */
export function isDabLoggedIn() {
  return DabAuthService.isAuth();
}

/**
 * Get current DAB user
 * @returns {Object|null} User object
 */
export function getDabUser() {
  return DabAuthService.getUser();
}

/**
 * Format DAB track for display
 * @param {Object} track - Track object
 * @returns {Object} Formatted track info
 */
export function formatDabTrack(track) {
  return {
    title: track.title || track.name,
    artist: track.artist || track.subtitle,
    album: track.album || '',
    duration: track.duration || 0,
    image: track.image?.[track.image.length - 1]?.url || '',
    quality: getDabQualityLabel(track),
    isHiRes: track.audioQuality?.isHiRes || false,
  };
}

/**
 * Check if DAB track supports high-res audio
 * @param {Object} track - Track object
 * @returns {boolean} True if Hi-Res
 */
export function isDabHiRes(track) {
  return track?.audioQuality?.isHiRes || false;
}

/**
 * Get DAB track metadata
 * @param {Object} track - Track object
 * @returns {Object} Metadata
 */
export function getDabTrackMetadata(track) {
  return {
    source: 'DAB Music',
    quality: getDabQualityLabel(track),
    isHiRes: isDabHiRes(track),
    bitDepth: track.audioQuality?.maximumBitDepth || null,
    sampleRate: track.audioQuality?.maximumSamplingRate || null,
    genre: track.genre || null,
  };
}

export default {
  isDabTrack,
  getDabTrackStreamUrl,
  getDabQualityLabel,
  isDabLoggedIn,
  getDabUser,
  formatDabTrack,
  isDabHiRes,
  getDabTrackMetadata,
};
