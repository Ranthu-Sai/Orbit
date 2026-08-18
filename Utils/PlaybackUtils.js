import YouTubeMusicService from './YouTubeMusicService';
import dabMusicService from './DabMusicService';
import youtubeStreamingService from './YouTubeStreamingService';
import { enhanceYTMusicArtwork, getPrimaryArtworkUrl } from './ArtworkEnhancer';

// Helper function to get highest quality URL from an array of URL objects
export const getHighestQualityUrl = (urlData) => {
  try {
    // If it's undefined or null, handle the error gracefully
    if (urlData == null) {
      console.error('URL data is null or undefined');
      return null;
    }

    // If it's already a string, return it
    if (typeof urlData === 'string') {
      return urlData;
    }

    // If it's an array of quality objects
    if (Array.isArray(urlData)) {
      // Safety check for empty array
      if (urlData.length === 0) {
        console.error('URL data array is empty');
        return null;
      }

      try {
        // Check if the first item has a quality property (Saavn format)
        if (
          urlData[0] &&
          typeof urlData[0] === 'object' &&
          'quality' in urlData[0]
        ) {
          // Sort by quality (assuming quality is in format like "320kbps")
          const sortedUrls = [...urlData].sort((a, b) => {
            // Extract numbers from quality strings
            const qualityA = parseInt(a.quality?.replace(/[^\d]/g, '') || 0);
            const qualityB = parseInt(b.quality?.replace(/[^\d]/g, '') || 0);
            return qualityB - qualityA; // Descending order
          });
          return sortedUrls[0]?.url || '';
        }
        // If it's just an array of URLs, return the first one
        else if (typeof urlData[0] === 'string') {
          return urlData[0];
        }
        // If it's a different format with URL property
        else if (
          urlData[0] &&
          typeof urlData[0] === 'object' &&
          'url' in urlData[0]
        ) {
          return urlData[0].url;
        }
        // Special case for local files or downloaded files
        else if (
          urlData[0] &&
          typeof urlData[0] === 'object' &&
          (urlData[0].filePath || urlData[0].localFilePath)
        ) {
          return urlData[0].filePath || urlData[0].localFilePath;
        }
      } catch (error) {
        console.error('Error parsing URL array:', error);
        // Fallback to first item if possible
        if (urlData[0]) {
          if (typeof urlData[0] === 'string') {
            return urlData[0];
          }
          if (urlData[0].url) {
            return urlData[0].url;
          }
          if (urlData[0].filePath) {
            return urlData[0].filePath;
          }
          if (urlData[0].localFilePath) {
            return urlData[0].localFilePath;
          }
        }
        return null;
      }
    }

    // Handle object with multiple URLs
    if (urlData && typeof urlData === 'object') {
      // Check for common URL properties in different formats
      if ('url' in urlData) {
        return urlData.url;
      }
      if ('filePath' in urlData) {
        return urlData.filePath;
      }
      if ('localFilePath' in urlData) {
        return urlData.localFilePath;
      }
      if ('320kbps' in urlData) {
        return urlData['320kbps'];
      }
      if ('160kbps' in urlData) {
        return urlData['160kbps'];
      }
      if ('96kbps' in urlData) {
        return urlData['96kbps'];
      }
      if ('48kbps' in urlData) {
        return urlData['48kbps'];
      }

      // Try to find any property that looks like a URL
      for (const key in urlData) {
        if (
          typeof urlData[key] === 'string' &&
          (urlData[key].startsWith('http') ||
            urlData[key].startsWith('file:'))
        ) {
          return urlData[key];
        }
      }
    }

    // Unknown format, return empty string
    console.error('Could not determine URL from provided data');
    return null;
  } catch (error) {
    console.error('Critical error in getHighestQualityUrl:', error);
    return null;
  }
};

// Helper function to get highest quality artwork
export const getHighestQualityArtwork = (imageData) => {
  let artworkUrl = '';

  if (!imageData) {
    return '';
  }

  if (typeof imageData === 'string') {
    artworkUrl = imageData;
  } else if (Array.isArray(imageData) && imageData.length > 0) {
    // If array of objects, try to find highest quality or take last
    if (typeof imageData[0] === 'object') {
      const maxRes = imageData.find(
        (img) => img.quality === 'max' || img.quality === 'hd'
      );
      if (maxRes && maxRes.url) {
        artworkUrl = maxRes.url;
      } else {
        for (let i = imageData.length - 1; i >= 0; i--) {
          const img = imageData[i];
          if (img && (img.url || img.link)) {
            artworkUrl = img.url || img.link;
            break;
          }
        }
      }
    } else if (typeof imageData[0] === 'string') {
      const lastValid = imageData
        .filter((i) => i && typeof i === 'string' && i.trim() !== '')
        .pop();
      artworkUrl = lastValid || '';
    }
  } else if (typeof imageData === 'object') {
    artworkUrl = imageData.url || imageData.link || imageData.uri || '';
  }

  // Final enhancement pass
  if (artworkUrl && typeof artworkUrl === 'string') {
    const enhanced = enhanceYTMusicArtwork(artworkUrl, 'card');
    return getPrimaryArtworkUrl(enhanced) || artworkUrl;
  }

  return artworkUrl || '';
};

// Resolve song source type based on heuristics
export const resolveSongSource = (song) => {
  if (!song) return 'unknown';

  // Check if this is a YouTube Music song (11-character video ID)
  const isYouTubeSong =
    song.id &&
    typeof song.id === 'string' &&
    song.id.length === 11 &&
    !song.isLocalMusic;
    
  // Check if this is a DAB Music track (multiple detection methods)
  const isDabTrack =
    song.isDabTrack ||
    song.source === 'dab' ||
    (!isNaN(song.url) && String(song.url).length > 5);
    
  // Check if this is a Spotify track
  const isSpotifyTrack =
    song.source === 'spotify' ||
    song.spotifyId ||
    song._needsSpotifyMapping ||
    (typeof song.url === 'string' && song.url?.startsWith('spotify://'));

  if (isSpotifyTrack) return 'spotify';
  if (isDabTrack) return 'dab';
  if (isYouTubeSong || song.source === 'ytmusic') return 'ytmusic';
  return song.source || 'saavn';
};

// Resolve stream and format track
export const formatTrackForPlayer = async (song) => {
  if (!song?.id && !song?.url) {
    throw new Error('No song data available');
  }

  const actualSource = resolveSongSource(song);

  let songUrl = '';
  let songMetadata = { ...song };

  if (actualSource === 'spotify') {
    // For Spotify songs, map to YouTube Music to get stream URL
    const ytMusicResult = await YouTubeMusicService.searchAndStream(
      song.title || song.name,
      song.artist || ''
    );

    if (ytMusicResult && ytMusicResult.url && !ytMusicResult.error) {
      songUrl = ytMusicResult.url;
      songMetadata = {
        ...songMetadata,
        url: ytMusicResult.url,
        headers: ytMusicResult.headers,
        userAgent: ytMusicResult.headers?.['User-Agent'],
        artwork: ytMusicResult.thumbnail || songMetadata.artwork,
        mappedFromSpotify: true,
      };
    } else {
      throw new Error('Failed to get Spotify stream URL');
    }
  } else if (actualSource === 'ytmusic') {
    // For YouTube songs, fetch the actual stream URL
    const streamData = await youtubeStreamingService.getStreamUrl(song.id);

    if (streamData && streamData.url) {
      songUrl = streamData.url;
      songMetadata = {
        ...songMetadata,
        url: streamData.url,
        headers: streamData.headers, // Add headers for TrackPlayer
        userAgent: streamData.headers?.['User-Agent'],
        artwork:
          getPrimaryArtworkUrl(
            enhanceYTMusicArtwork(streamData.thumbnail, 'playing')
          ) ||
          streamData.thumbnail ||
          songMetadata.artwork,
        duration: streamData.duration || songMetadata.duration,
        title: streamData.title || songMetadata.title,
      };
    } else {
      throw new Error('Failed to get YouTube stream URL');
    }
  } else if (actualSource === 'dab') {
    // For DAB tracks, fetch the actual stream URL
    await dabMusicService.initialize();
    const streamUrl = await dabMusicService.getStreamUrl(song.id);

    if (streamUrl) {
      songUrl = streamUrl;
      songMetadata = {
        ...songMetadata,
        url: streamUrl,
      };
    } else {
      throw new Error('Failed to load DAB stream URL');
    }
  } else {
    // For non-YouTube/non-DAB songs, get the URL from song data
    songUrl = getHighestQualityUrl(song.url);
  }
  
  if (!songUrl) {
    throw new Error('Invalid song URL format');
  }

  // Format the track object
  const trackToAdd = {
    url: songUrl,
    title: songMetadata.title || 'Unknown Title',
    artist: songMetadata.artist || 'Unknown Artist',
    artwork: getHighestQualityArtwork(
      songMetadata.artwork || songMetadata.image
    ),
    id: song.id || Date.now().toString(),
    duration: songMetadata.duration || 0,
    language: songMetadata.language || '',
    artistID: songMetadata.artistID || '',
    source: actualSource,
    spotifyId: actualSource === 'spotify' ? song.id : song.spotifyId,
    album: songMetadata.album || song.album || '',
    mappedFromSpotify: songMetadata.mappedFromSpotify || false,
    ...(songMetadata.headers && { headers: songMetadata.headers }),
    ...(songMetadata.userAgent && { userAgent: songMetadata.userAgent }),
  };

  return trackToAdd;
};
