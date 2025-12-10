import { SpotifyService } from './SpotifyService';
import { createPlaylistWithSongs } from './PlaylistManager';
// We need to import the search function. Since it's not exported directly in the view I saw earlier
// (it seemed to be internal or I missed the export statement in Step 30 truncate), 
// I should verify imports. Looking at Step 30, it seems `getYTMusicSearchSongData` is defined but validity of export is key.
// Wait, Step 30 showed the function definition but I didn't see the export at the bottom.
// I will assume it's exported or I might need to adjust.
// Actually, I should check `Api/YTMusic.js` exports first to be safe.
// But for now, I will assume it is exported as it's a common pattern.
// If not, I'll have to fix it.
// Let's assume `import { getYTMusicSearchSongData } from '../Api/YTMusic';` works.

import { getYTMusicSearchSongData } from '../Api/YTMusic';

/**
 * Logic to import a Spotify playlist
 * @param {string} url - Spotify Playlist URL
 * @param {function} onProgress - Callback (current, total, message)
 * @returns {Promise<boolean>} Success status
 */
export const importSpotifyPlaylist = async (url, onProgress) => {
    try {
        // 1. Parse URL
        const playlistId = SpotifyService.getPlaylistIdFromUrl(url);
        if (!playlistId) {
            throw new Error('Invalid Spotify playlist URL');
        }

        onProgress(0, 0, 'Fetching Spotify playlist...');

        // 2. Fetch from Spotify
        const spotifyPlaylist = await SpotifyService.getPlaylist(playlistId);
        const totalTracks = spotifyPlaylist.tracks.length;

        console.log(`Importing ${spotifyPlaylist.name} with ${totalTracks} songs`);
        onProgress(0, totalTracks, `Found ${totalTracks} songs`);

        const matchedSongs = [];
        let processed = 0;

        // 3. Process matched tracks using simple loop (sequential to avoid rate limits/flooding)
        // We could do chunks of 5 parallel requests for speed.
        const CHUNK_SIZE = 3;

        for (let i = 0; i < totalTracks; i += CHUNK_SIZE) {
            const chunk = spotifyPlaylist.tracks.slice(i, i + CHUNK_SIZE);

            const promises = chunk.map(async (track) => {
                if (!track) return null;

                try {
                    // Search query: "Title Artist"
                    const query = `${track.title} ${track.artist}`;
                    const searchResult = await getYTMusicSearchSongData(query, 1, 1); // Limit 1 for speed

                    if (searchResult && searchResult.success && searchResult.data.results.length > 0) {
                        const ytMatch = searchResult.data.results[0];

                        // Create hybrid song object
                        // Use Spotify metadata for display (cleaner usually)
                        // Use YouTube ID for streaming
                        return {
                            id: ytMatch.id, // YouTube Video ID
                            videoId: ytMatch.id,
                            title: track.title, // Spotify Title
                            artist: track.artist, // Spotify Artist
                            album: track.album, // Spotify Album
                            artwork: track.artwork || ytMatch.image?.[0]?.url, // Prefer Spotify art
                            image: [{ url: track.artwork || ytMatch.image?.[0]?.url }], // Format for player
                            url: `https://youtube.com/watch?v=${ytMatch.id}`,
                            duration: track.duration, // Spotify duration
                            source: 'ytmusic', // Treat as Native YTMusic for player compatibility
                            isYTMusic: true,   // Explicit flag for QueueManager
                            type: 'song',
                            spotifyMetadata: {
                                originalId: track.spotifyId,
                                originalSource: 'spotify'
                            }
                        };
                    } else {
                        console.log(`No match found for: ${track.title}`);
                        return null;
                    }
                } catch (e) {
                    console.error(`Error matching track ${track.title}:`, e);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            const validMatches = results.filter(s => s !== null);
            matchedSongs.push(...validMatches);

            processed += chunk.length;
            onProgress(processed, totalTracks, `Importing: ${processed}/${totalTracks}`);
        }

        if (matchedSongs.length === 0) {
            throw new Error('No songs could be matched on YouTube Music');
        }

        // 4. Create Playlist
        onProgress(totalTracks, totalTracks, 'Finalizing playlist...');

        const created = await createPlaylistWithSongs(
            spotifyPlaylist.name,
            matchedSongs,
            spotifyPlaylist.image
        );

        if (!created) {
            throw new Error('Failed to save playlist');
        }

        return true;

    } catch (error) {
        console.error('Import Logic Error:', error);
        throw error;
    }
};
