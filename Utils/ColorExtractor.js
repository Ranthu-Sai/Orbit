import ImageColors from 'react-native-image-colors';

/**
 * Convert hex or rgb color string to rgba with given alpha
 */
export const getRgba = (color, alpha = 1) => {
  if (!color || color === 'transparent') {
    return `rgba(27, 67, 50, ${alpha})`;
  }

  // Handle rgb(...)
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }

  // Handle rgba(...)
  if (color.startsWith('rgba(')) {
    return color.replace(/,(\s*[\d\.]+)\)$/, `, ${alpha})`);
  }

  // Handle hex #fff or #ffffff
  let c = color.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
};

/**
 * Extract image URL from a multitude of possible image data structures
 * (string, array of objects, object with url/link/uri, etc.)
 */
export const extractImageUrl = (image) => {
  if (!image) return null;

  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed.startsWith('http') || trimmed.startsWith('file://')) {
      return trimmed;
    }
    return null;
  }

  if (Array.isArray(image) && image.length > 0) {
    // Look for highest quality item or index 2, or last item
    const candidate = image[2] || image[image.length - 1] || image[0];
    if (typeof candidate === 'string') {
      return extractImageUrl(candidate);
    }
    if (candidate && typeof candidate === 'object') {
      const url = candidate.url || candidate.link || candidate.uri;
      if (typeof url === 'string') {
        return extractImageUrl(url);
      }
    }
  }

  if (typeof image === 'object') {
    const url = image.url || image.link || image.uri;
    if (typeof url === 'string') {
      return extractImageUrl(url);
    }
  }

  return null;
};

/**
 * Resolve the best available image URL for a playlist from route params or full data
 */
export const resolvePlaylistImageUrl = (imageParam, playlistData) => {
  const fromParam = extractImageUrl(imageParam);
  if (fromParam) return fromParam;

  if (playlistData?.data) {
    const data = playlistData.data;
    const fromThumbnail = extractImageUrl(data.thumbnail);
    if (fromThumbnail) return fromThumbnail;

    const fromImage = extractImageUrl(data.image);
    if (fromImage) return fromImage;

    if (data.songs && data.songs.length > 0) {
      const first = data.songs[0];
      const fromSong =
        extractImageUrl(first.image) ||
        extractImageUrl(first.images) ||
        extractImageUrl(first.artwork) ||
        extractImageUrl(first.thumbnail);
      if (fromSong) return fromSong;
    }
  }

  return null;
};

/**
 * Extract prominent accent color using react-native-image-colors
 * Matches the logic in QuickPicksCarousel.jsx (Home)
 */
export const extractColorFromImage = async (imageUrl, fallback = '#1b4332') => {
  if (
    !imageUrl ||
    typeof imageUrl !== 'string' ||
    (!imageUrl.startsWith('http') && !imageUrl.startsWith('file://'))
  ) {
    return fallback;
  }

  try {
    const colors = await ImageColors.getColors(imageUrl, {
      fallback,
      cache: true,
      key: imageUrl,
    });

    let pickedColor = null;
    if (colors.platform === 'android') {
      pickedColor =
        colors.vibrant ||
        colors.darkVibrant ||
        colors.dominant ||
        colors.lightVibrant ||
        colors.muted ||
        colors.darkMuted ||
        colors.average;
    } else if (colors.platform === 'ios') {
      pickedColor =
        colors.background ||
        colors.primary ||
        colors.secondary ||
        colors.detail;
    } else {
      pickedColor = colors.vibrant || colors.dominant || colors.muted;
    }

    return pickedColor || fallback;
  } catch (err) {
    console.warn('Failed to extract color from image:', err);
    return fallback;
  }
};
