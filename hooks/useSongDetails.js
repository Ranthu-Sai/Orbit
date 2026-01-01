import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { formatDuration } from '../Utils/SongFormatters';

// Helper function to format artists
const formatArtists = (artists) => {
  if (!artists || !Array.isArray(artists)) return 'N/A';
  return artists.map(a => a.name).join(', ');
};

// Helper to get best available image
const getBestImage = (images) => {
  if (!images || !images.length) return null;
  // Prefer higher quality images
  const bestImage = [...images].sort((a, b) =>
    parseInt(b.quality) - parseInt(a.quality)
  )[0];
  return bestImage?.url || null;
};

const useSongDetails = (track) => {
  const [songDetails, setSongDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSongDetails = async () => {
      if (!track?.id) return;

      setLoading(true);
      setError(null);

      try {
        // For local tracks, use the available metadata
        if (track.isLocal) {
          setSongDetails({
            basicInfo: [
              { label: 'Title', value: track.title || 'Unknown Track' },
              { label: 'Artist', value: track.artist || 'Unknown Artist' },
              { label: 'Album', value: track.album || 'Unknown Album' },
              { label: 'Duration', value: formatDuration(track.duration) },
              { label: 'Year', value: track.year || 'N/A' },
              { label: 'Genre', value: track.genre || 'N/A' },
            ],
            fileInfo: [
              { label: 'File Type', value: track.url ? track.url.split('.').pop().toUpperCase() : 'N/A' },
              { label: 'Bitrate', value: track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : 'N/A' },
              { label: 'File Size', value: track.size ? `${(track.size / (1024 * 1024)).toFixed(2)} MB` : 'N/A' },
              { label: 'Location', value: 'Local Storage' },
            ]
          });
          setLoading(false);
          return;
        }

        // For YouTube Music tracks, use existing track data (no API call needed)
        const isYTMusicTrack = track.isYTMusic ||
          track.source === 'ytmusic' ||
          (track.id?.length === 11 && !track.isLocalMusic);

        if (isYTMusicTrack) {
          // Trust currentPlayingQuality from MusicPlayerFunctions (contains actual bitrate like 'Opus 148kbps')
          let actualQuality = track.currentPlayingQuality || 'Opus ~148kbps';
          // Ensure we never show Saavn-inherited 320kbps for YouTube tracks
          if (actualQuality === '320kbps' || actualQuality === '320kbs' || actualQuality === 'High Quality') {
            actualQuality = 'Opus ~148kbps';
          }

          // Extract artist info from various fields
          const artistInfo = track.artist || track.primaryArtists ||
            (track.artists?.primary ? formatArtists(track.artists.primary) : 'Unknown Artist');

          setSongDetails({
            basicInfo: [
              { label: 'Title', value: track.title || track.name || 'Unknown Track' },
              { label: 'Artist', value: artistInfo },
              { label: 'Album', value: track.album || 'N/A' },
              { label: 'Duration', value: formatDuration(track.duration) },
              { label: 'Source', value: 'YouTube Music', highlight: true },
              { label: 'Language', value: track.language !== 'unknown' ? track.language?.toUpperCase() : 'N/A' },
            ],
            additionalInfo: [
              { label: 'Video ID', value: track.id || 'N/A' },
              { label: 'Quality', value: actualQuality },
              { label: 'Type', value: track.type || 'Song' },
              { label: 'Year', value: track.year || 'N/A' },
            ],
            mediaInfo: [
              { label: 'Streaming', value: 'YouTube Music' },
              { label: 'Song ID', value: track.id || 'N/A' },
            ],
            imageUrl: track.artwork || track.image,
            availableQualities: ['Opus ~128-160kbps'],
          });
          setLoading(false);
          return;
        }

        // For Spotify tracks, use existing track data
        const isSpotifyTrack = track.source === 'spotify' || track.spotifyId;
        if (isSpotifyTrack) {
          // Trust currentPlayingQuality from MusicPlayerFunctions (contains actual bitrate like 'Opus 148kbps')
          let actualQuality = track.currentPlayingQuality || 'Opus ~148kbps';
          // Ensure we never show Saavn-inherited 320kbps for Spotify tracks
          if (actualQuality === '320kbps' || actualQuality === '320kbs' || actualQuality === 'Mapped Stream' || actualQuality === 'High Quality') {
            actualQuality = 'Opus ~148kbps';
          }

          setSongDetails({
            basicInfo: [
              { label: 'Title', value: track.title || track.name || 'Unknown Track' },
              { label: 'Artist', value: track.artist || 'Unknown Artist' },
              { label: 'Album', value: track.album || 'N/A' },
              { label: 'Duration', value: formatDuration(track.duration) },
              { label: 'Source', value: 'Spotify', highlight: true },
              { label: 'Streaming VIA', value: 'YouTube Music', highlight: true },
            ],
            additionalInfo: [
              { label: 'Spotify ID', value: track.id || track.spotifyId || 'N/A' },
              { label: 'Quality', value: actualQuality },
              { label: 'Explicit', value: track.explicit ? 'Yes' : 'No' },
              { label: 'Preview', value: track.previewUrl ? 'Available' : 'N/A' },
            ],
            mediaInfo: [
              { label: 'Primary Source', value: 'Spotify' },
              { label: 'YT Content ID', value: track.ytMusicVideoId || 'Mapped on Play' },
            ],
            imageUrl: track.artwork || track.image,
            availableQualities: ['Opus ~128-160kbps (YT Mapped)'],
          });
          setLoading(false);
          return;
        }

        // For DAB tracks, use existing track data
        const isDabTrack = track.isDabTrack ||
          track.source === 'dab' ||
          track.sourceType === 'dab' ||
          (track.url && (track.url.includes('qobuz') || track.url.includes('dab-music'))) ||
          (!isNaN(track.url) && String(track.url).length > 5 && String(track.url).length < 15) ||
          (!isNaN(track.id) && String(track.id).length >= 6 && String(track.id).length <= 7); // Reliable DAB ID detection

        if (isDabTrack) {
          // Real-time quality detection from URL (most accurate)
          let actualQuality = track.currentPlayingQuality || track.qualityLabel || 'Lossless FLAC';
          if (track.url && (track.url.includes('qobuz') || track.url.includes('dab-music'))) {
            const fmtMatch = track.url.match(/[?&]fmt=(\d+)/);
            const fmt = fmtMatch ? fmtMatch[1] : null;
            const formatMap = {
              '5': 'MP3 320kbps',
              '6': 'FLAC 16-bit/44.1kHz',
              '7': 'FLAC 24-bit/96kHz',
              '27': 'FLAC 24-bit/192kHz'
            };
            if (fmt && formatMap[fmt]) actualQuality = formatMap[fmt];
          }

          setSongDetails({
            basicInfo: [
              { label: 'Title', value: track.title || track.name || 'Unknown Track' },
              { label: 'Artist', value: track.artist || 'Unknown Artist' },
              { label: 'Album', value: track.album || 'N/A' },
              { label: 'Duration', value: formatDuration(track.duration) },
              { label: 'Source', value: 'Qobuz', highlight: true },
            ],
            additionalInfo: [
              { label: 'Track ID', value: track.id || 'N/A' },
              { label: 'Quality', value: actualQuality },
              { label: 'Explicit', value: track.explicit ? 'Yes' : 'No' },
              { label: 'Type', value: 'Qobuz' },
            ],
            mediaInfo: [
              { label: 'Streaming', value: 'Qobuz Direct' },
              { label: 'Bitrate', value: 'High Fidelity' },
            ],
            imageUrl: track.artwork || track.image,
            availableQualities: ['Lossless FLAC'],
          });
          setLoading(false);
          return;
        }

        // For online tracks, fetch from API
        const response = await axios.get(`https://jiosavan-api-with-playlist.vercel.app/api/songs/${track.id}`);

        if (response.data && response.data.success) {
          const data = response.data.data?.[0]; // Get first item from array
          if (!data) throw new Error('No song data found');

          // Format artists
          const primaryArtists = formatArtists(data.artists?.primary);
          const featuredArtists = formatArtists(data.artists?.featured);
          const allArtists = formatArtists(data.artists?.all);

          // Format download qualities
          const availableQualities = data.downloadUrl?.map(item => item.quality) || [];
          const bestQuality = availableQualities.length > 0
            ? availableQualities[availableQualities.length - 1]
            : 'N/A';

          // Format basic info
          const basicInfo = [
            { label: 'Title', value: data.name || track.title || 'Unknown Track' },
            { label: 'Artists', value: primaryArtists },
            { label: 'Album', value: data.album?.name || track.album || 'Unknown Album' },
            { label: 'Duration', value: formatDuration(data.duration || track.duration) },
            { label: 'Year', value: data.year || track.year || 'N/A' },
            { label: 'Language', value: data.language ? data.language.toUpperCase() : 'N/A' },
          ];

          // Format additional details
          const additionalInfo = [
            { label: 'Release Date', value: data.releaseDate || 'N/A' },
            { label: 'Label', value: data.label || 'N/A' },
            { label: 'Copyright', value: data.copyright || 'N/A' },
            { label: 'Explicit', value: data.explicitContent ? 'Yes' : 'No' },
            { label: 'Lyrics', value: data.hasLyrics ? 'Available' : 'Not Available' },
            { label: 'Type', value: data.type || 'N/A' },
          ];

          // Format media info
          const mediaInfo = [
            { label: 'Best Quality', value: bestQuality },
            { label: 'Play Count', value: data.playCount?.toLocaleString() || 'N/A' },
            { label: 'Song ID', value: data.id || 'N/A' },
            { label: 'Album ID', value: data.album?.id || 'N/A' },
          ];

          setSongDetails({
            basicInfo,
            additionalInfo,
            mediaInfo,
            availableQualities,
            imageUrl: getBestImage(data.image),
            featuredArtists: featuredArtists !== 'N/A' ? featuredArtists : null,
            allArtists: allArtists !== primaryArtists ? allArtists : null,
            rawData: data
          });
        } else {
          // Fallback to basic track info if API call fails
          setSongDetails({
            basicInfo: [
              { label: 'Title', value: track.title || 'Unknown Track' },
              { label: 'Artist', value: track.artist || 'Unknown Artist' },
              { label: 'Album', value: track.album || 'Unknown Album' },
              { label: 'Duration', value: formatDuration(track.duration) },
            ],
            additionalInfo: [
              { label: 'Status', value: 'Using local track data' },
              { label: 'ID', value: track.id || 'N/A' },
              { label: 'Source', value: track.isLocal ? 'Local File' : 'Streaming' }
            ]
          });
        }
      } catch (err) {
        console.error('Error fetching song details:', err);
        setError('Failed to load song details. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchSongDetails();
  }, [track]);

  return { songDetails, loading, error };
};

export default useSongDetails;
