import SpotifyService from './SpotifyService';
import YouTubeMusicService from './YouTubeMusicService';
import { detectLink } from './LinkDetector';
import { createPlaylistWithSongs } from './PlaylistManager';
import { getYTMusicSearchSongData } from '../Api/YTMusic';
import { SetLikedSongs } from '../LocalStorage/StoreLikedSongs';
import { SetLikedAlbum } from '../LocalStorage/StoreLikedAlbums';

/**
 * Universal Playlist Import Logic
 * Supports Spotify (Playlist, Album, Track) and YouTube/YouTube Music (Playlist, Album, Video)
 * @param {string} url - URL to import
 * @param {function} onProgress - Callback (current, total, message)
 * @returns {Promise<boolean>} Success status
 */
export const importFromLink = async (url, onProgress) => {
    try {
        // 1. Detect Link Type
        const linkInfo = detectLink(url);
        if (!linkInfo) {
            throw new Error('Unsupported or invalid link. Please use a valid Spotify or YouTube link.');
        }

        console.log('🔗 Link Detected:', linkInfo);
        const { source, type, id } = linkInfo;

        // 2. Route based on Source
        if (source === 'spotify') {
            return await handleSpotifyImport(type, id, onProgress);
        } else if (source === 'youtube' || source === 'ytmusic') {
            return await handleYouTubeImport(type, id, onProgress);
        }

        return false;

    } catch (error) {
        console.error('Import Logic Error:', error);
        throw error;
    }
};

/**
 * Import directly to Library (Favorites)
 * @param {string} url - URL to import
 * @param {function} onProgress - Callback
 */
export const importToLibrary = async (url, onProgress) => {
    try {
        const linkInfo = detectLink(url);
        if (!linkInfo) {
            throw new Error('Unsupported or invalid link.');
        }

        const { source, type, id } = linkInfo;
        let songsToImport = [];

        // 1. Fetch Songs
        if (source === 'spotify') {
            songsToImport = await fetchSpotifySongs(type, id, onProgress);
        } else {
            songsToImport = await fetchYouTubeSongs(type, id, onProgress);
        }

        if (!songsToImport || songsToImport.length === 0) {
            throw new Error('No songs found to import.');
        }

        // 2. Add to Favorites
        onProgress(0, songsToImport.length, 'Adding to Favorites...');
        let addedCount = 0;

        for (const song of songsToImport) {
            if (song) {
                // Determine if it's an album or song import
                // For now, we import everything as Liked Songs unless it's specifically an Album link acting on Liked Albums page
                // But the requirement says "Import any song... same do with albums".
                // We'll standard Add to Liked Songs

                await SetLikedSongs(
                    song.title,
                    song.artist,
                    song.artwork || song.image?.[0]?.url,
                    song.id,
                    song.url || `https://youtube.com/watch?v=${song.id}`,
                    song.duration,
                    song.language || 'unknown'
                );
                addedCount++;
                if (addedCount % 5 === 0) {
                    onProgress(addedCount, songsToImport.length, `Saved ${addedCount} songs...`);
                }
            }
        }

        onProgress(addedCount, addedCount, 'Done!');
        return true;

    } catch (error) {
        console.error('Library Import Error:', error);
        throw error;
    }
};


/**
 * Handle Spotify Imports (Playlist, Album, Track)
 */
const handleSpotifyImport = async (type, id, onProgress) => {


    let spotifyData = null;
    let tracksToMatch = [];

    onProgress(0, 0, `Fetching Spotify ${type}...`);

    if (type === 'playlist') {
        spotifyData = await SpotifyService.getPlaylist(id);
        tracksToMatch = spotifyData.tracks;
    } else if (type === 'album') {
        spotifyData = await SpotifyService.getAlbum(id);
        tracksToMatch = spotifyData.tracks;
    } else if (type === 'track') {
        spotifyData = await SpotifyService.getTrack(id);
        tracksToMatch = spotifyData.tracks;
    }

    if (!spotifyData) throw new Error('Failed to fetch Spotify data');

    const matchedSongs = await matchSpotifyTracksOnYouTube(tracksToMatch, onProgress);

    return await createPlaylistWithSongs(
        spotifyData.name,
        matchedSongs,
        spotifyData.image
    );
};

/**
 * Fetch and Match Spotify Songs (Helper for both Playlist and Library import)
 */
const fetchSpotifySongs = async (type, id, onProgress) => {
    let spotifyData = null;
    let tracksToMatch = [];

    onProgress(0, 0, `Fetching Spotify ${type}...`);

    if (type === 'playlist') {
        spotifyData = await SpotifyService.getPlaylist(id);
        tracksToMatch = spotifyData.tracks;
    } else if (type === 'album') {
        spotifyData = await SpotifyService.getAlbum(id);
        tracksToMatch = spotifyData.tracks;
    } else if (type === 'track') {
        spotifyData = await SpotifyService.getTrack(id);
        tracksToMatch = spotifyData.tracks;
    }

    if (!tracksToMatch.length) throw new Error('No tracks found.');

    return await matchSpotifyTracksOnYouTube(tracksToMatch, onProgress);
};


/**
 * Helper to match Spotify tracks on YouTube Music
 * INCREASED CONCURRENCY
 */
const matchSpotifyTracksOnYouTube = async (tracks, onProgress) => {
    const matchedSongs = [];
    let processed = 0;
    const CHUNK_SIZE = 6; // Increased from 3 to 6

    for (let i = 0; i < tracks.length; i += CHUNK_SIZE) {
        const chunk = tracks.slice(i, i + CHUNK_SIZE);

        const promises = chunk.map(async (track) => {
            if (!track) return null;

            try {
                const query = `${track.title} ${track.artist}`;
                // Limit 1 result is minimal, but safe.
                const searchResult = await getYTMusicSearchSongData(query, 1, 1);

                if (searchResult && searchResult.success && searchResult.data.results.length > 0) {
                    const ytMatch = searchResult.data.results[0];
                    return {
                        id: ytMatch.id,
                        videoId: ytMatch.id,
                        title: track.title,
                        artist: track.artist,
                        album: track.album,
                        artwork: track.artwork || ytMatch.image?.[0]?.url,
                        image: [{ url: track.artwork || ytMatch.image?.[0]?.url }],
                        url: `https://youtube.com/watch?v=${ytMatch.id}`,
                        duration: track.duration,
                        source: 'ytmusic',
                        isYTMusic: true,
                        type: 'song',
                        spotifyMetadata: {
                            originalId: track.spotifyId,
                            originalSource: 'spotify'
                        }
                    };
                } else {
                    return null;
                }
            } catch (e) {
                console.error(`Error matching track ${track.title}:`, e);
                return null;
            }
        });

        const results = await Promise.all(promises);
        matchedSongs.push(...results.filter(s => s !== null));

        processed += chunk.length;
        onProgress(processed, tracks.length, `Matching: ${processed}/${tracks.length}`);
    }

    return matchedSongs;
};


/**
 * Handle YouTube / YouTube Music Imports
 */
const handleYouTubeImport = async (type, id, onProgress) => {
    onProgress(0, 0, `Fetching YouTube ${type}...`);

    // We need playlist info (name/image) + songs
    let name = 'Imported Playlist';
    let image = '';
    let songs = [];

    if (type === 'playlist') {
        const playlist = await YouTubeMusicService.getPlaylist(id);
        const tracks = playlist?.songs || playlist?.tracks;
        if (!tracks?.length) throw new Error('Playlist empty/not found');
        name = playlist.title;
        image = playlist.thumbnails?.[0]?.url;
        songs = tracks.map(mapYouTubeTrack);
    }
    else if (type === 'album') {
        const album = await YouTubeMusicService.getAlbum(id);
        const tracks = album?.tracks || album?.songs;
        if (!tracks?.length) throw new Error('Album empty/not found');
        name = album.title;
        image = album.thumbnails?.[0]?.url;
        songs = tracks.map(t => mapYouTubeTrack({
            ...t,
            album: { name: album.title, id: album.id },
            thumbnail: t.thumbnail || album.thumbnails?.[0]?.url
        }));
    }
    else if (type === 'video') {
        // Specialized video handling
        const videoData = await fetchVideoMetadata(id);
        if (!videoData) throw new Error('Video not found');
        name = videoData.title;
        image = videoData.thumbnail;
        songs = [mapYouTubeTrack(videoData)];
    }

    songs = songs.filter(Boolean);
    if (!songs.length) throw new Error('No songs to import');

    onProgress(songs.length, songs.length, 'Creating playlist...');
    return await createPlaylistWithSongs(name, songs, image);
};

/**
 * Fetch YouTube Songs helper
 */
const fetchYouTubeSongs = async (type, id, onProgress) => {
    let songs = [];

    if (type === 'playlist') {
        const playlist = await YouTubeMusicService.getPlaylist(id);
        const tracks = playlist?.songs || playlist?.tracks || [];
        songs = tracks.map(mapYouTubeTrack);
    }
    else if (type === 'album') {
        const album = await YouTubeMusicService.getAlbum(id);
        const tracks = album?.tracks || album?.songs || [];
        songs = tracks.map(t => mapYouTubeTrack({
            ...t,
            album: { name: album.title, id: album.id },
            thumbnail: t.thumbnail || album.thumbnails?.[0]?.url
        }));
    }
    else if (type === 'video') {
        const videoData = await fetchVideoMetadata(id);
        if (videoData) songs = [mapYouTubeTrack(videoData)];
    }

    return songs.filter(Boolean);
};

/**
 * Robust Video Metadata Fetcher
 */
const fetchVideoMetadata = async (videoId) => {
    // Method 1: Search by ID (Reliable for YTM)
    try {
        const searchResults = await YouTubeMusicService.search(videoId, 'songs');
        // Check if parsing worked and matched ID
        const match = searchResults?.find(r => r.videoId === videoId);
        if (match) return match;

        // If not found in songs, try videos filter
        const videoResults = await YouTubeMusicService.search(videoId, 'videos');
        const vidMatch = videoResults?.find(r => r.videoId === videoId);
        if (vidMatch) return vidMatch;

        // Method 2: Fallback to simple object if we can't fetch but have ID
        // (Better than failing, user can play it)
        return {
            videoId: videoId,
            title: `YouTube Video ${videoId}`,
            artist: 'YouTube Import',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };

    } catch (e) {
        console.warn('Video fetch failed', e);
        return {
            videoId: videoId,
            title: 'Imported Video',
            artist: 'Unknown',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };
    }
};

/**
 * Map YouTube/Innertube Track to Internal Song Format
 */
const mapYouTubeTrack = (ytTrack) => {
    if (!ytTrack || !ytTrack.videoId) return null;

    let artwork = ytTrack.thumbnail;
    if (Array.isArray(ytTrack.thumbnails) && ytTrack.thumbnails.length > 0) {
        artwork = ytTrack.thumbnails[ytTrack.thumbnails.length - 1].url;
    }

    let artistName = 'Unknown Artist';
    if (Array.isArray(ytTrack.artists)) {
        artistName = ytTrack.artists.map(a => a.name).join(', ');
    } else if (ytTrack.artist) {
        artistName = ytTrack.artist;
    }

    return {
        id: ytTrack.videoId,
        videoId: ytTrack.videoId,
        title: ytTrack.title || ytTrack.name,
        artist: artistName,
        album: ytTrack.album?.name || '',
        artwork: artwork,
        image: [{ url: artwork }],
        url: `https://youtube.com/watch?v=${ytTrack.videoId}`,
        duration: ytTrack.duration || 0,
        source: 'ytmusic',
        isYTMusic: true,
        type: 'song',
        ytMetadata: { ...ytTrack }
    };
};

/**
 * Legacy Export
 * @deprecated
 */
export const importSpotifyPlaylist = importFromLink;
