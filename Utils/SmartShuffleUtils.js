/**
 * Smart Shuffle Utilities
 * Implements Artist Diversity + Album-Aware shuffle algorithms
 * Preserves currently playing song and maintains seamless playback
 */

/**
 * Normalize artist name for comparison
 */
const normalizeArtistName = (artist) => {
    if (!artist) return 'unknown';
    // Handle both string and object formats
    if (typeof artist === 'string') {
        return artist.toLowerCase().trim();
    }
    if (artist.name) {
        return artist.name.toLowerCase().trim();
    }
    return 'unknown';
};

/**
 * Extract artist names from various formats
 */
const extractArtistNames = (song) => {
    if (!song) return ['unknown'];

    // Try different artist field formats
    if (song.artist && typeof song.artist === 'string') {
        return [normalizeArtistName(song.artist)];
    }

    if (song.artists) {
        if (typeof song.artists === 'string') {
            return [normalizeArtistName(song.artists)];
        }
        if (Array.isArray(song.artists)) {
            return song.artists.map(normalizeArtistName);
        }
        if (song.artists.primary && Array.isArray(song.artists.primary)) {
            return song.artists.primary.map(normalizeArtistName);
        }
    }

    if (song.primaryArtists && typeof song.primaryArtists === 'string') {
        return [normalizeArtistName(song.primaryArtists)];
    }

    return ['unknown'];
};

/**
 * Extract album name from song
 */
const extractAlbumName = (song) => {
    if (!song) return 'unknown';

    if (song.album && typeof song.album === 'string') {
        return song.album.toLowerCase().trim();
    }

    if (song.albumId && typeof song.albumId === 'string') {
        return song.albumId.toLowerCase().trim();
    }

    return 'unknown';
};

/**
 * Fisher-Yates shuffle algorithm (standard random shuffle)
 */
export const standardShuffle = (array) => {
    if (!Array.isArray(array) || array.length <= 1) {
        return array;
    }

    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Smart Shuffle: Artist Diversity + Album-Aware
 * 
 * Algorithm:
 * 1. Group songs by artist
 * 2. Within each artist group, sub-group by album
 * 3. Distribute artists evenly across the queue
 * 4. Avoid consecutive songs from same album
 * 5. Add controlled randomness (20%)
 */
export const smartShuffleQueue = (songs) => {
    if (!Array.isArray(songs) || songs.length <= 2) {
        return songs; // Not enough songs to shuffle intelligently
    }

    // Group songs by artist
    const artistGroups = {};
    songs.forEach(song => {
        const artists = extractArtistNames(song);
        const primaryArtist = artists[0]; // Use first artist as primary

        if (!artistGroups[primaryArtist]) {
            artistGroups[primaryArtist] = [];
        }
        artistGroups[primaryArtist].push(song);
    });

    const artistNames = Object.keys(artistGroups);

    // If only one artist, fall back to album-aware shuffle
    if (artistNames.length === 1) {
        return albumAwareShuffle(songs);
    }

    // Calculate distribution interval for artists
    const interval = Math.ceil(songs.length / artistNames.length);

    // Create result array
    const result = new Array(songs.length);
    let resultIndex = 0;

    // Shuffle each artist's songs with album awareness
    artistNames.forEach(artist => {
        artistGroups[artist] = albumAwareShuffle(artistGroups[artist]);
    });

    // Distribute artists evenly using round-robin
    let artistIndex = 0;
    const artistIterators = {};
    artistNames.forEach(artist => {
        artistIterators[artist] = 0;
    });

    // Shuffle artist order for variety
    const shuffledArtists = standardShuffle(artistNames);

    // Interleave artists
    while (resultIndex < songs.length) {
        const currentArtist = shuffledArtists[artistIndex % shuffledArtists.length];
        const artistSongs = artistGroups[currentArtist];
        const iterator = artistIterators[currentArtist];

        if (iterator < artistSongs.length) {
            result[resultIndex] = artistSongs[iterator];
            artistIterators[currentArtist]++;
            resultIndex++;
        }

        artistIndex++;

        // Safety check: if we've gone through all artists and still have empty slots
        if (artistIndex > shuffledArtists.length * 100) {
            break; // Prevent infinite loop
        }
    }

    // Fill any remaining null slots (shouldn't happen, but safety)
    const filtered = result.filter(song => song !== undefined && song !== null);

    // Add 20% controlled randomness to prevent predictability
    // Swap ~20% of adjacent songs (but not the first few)
    const swapCount = Math.floor(filtered.length * 0.1);
    for (let i = 0; i < swapCount; i++) {
        const index = Math.floor(Math.random() * (filtered.length - 5)) + 3; // Start after first 3
        if (index + 1 < filtered.length) {
            [filtered[index], filtered[index + 1]] = [filtered[index + 1], filtered[index]];
        }
    }

    return filtered;
};

/**
 * Album-Aware Shuffle
 * Prevents consecutive songs from the same album
 */
const albumAwareShuffle = (songs) => {
    if (!Array.isArray(songs) || songs.length <= 2) {
        return songs;
    }

    // Group by album
    const albumGroups = {};
    songs.forEach(song => {
        const album = extractAlbumName(song);
        if (!albumGroups[album]) {
            albumGroups[album] = [];
        }
        albumGroups[album].push(song);
    });

    const albums = Object.keys(albumGroups);

    // If only one album, return standard shuffle
    if (albums.length === 1) {
        return standardShuffle(songs);
    }

    // Shuffle songs within each album
    albums.forEach(album => {
        albumGroups[album] = standardShuffle(albumGroups[album]);
    });

    // Interleave albums
    const result = [];
    const albumIterators = {};
    albums.forEach(album => albumIterators[album] = 0);

    const shuffledAlbums = standardShuffle(albums);
    let albumIndex = 0;

    while (result.length < songs.length) {
        const currentAlbum = shuffledAlbums[albumIndex % shuffledAlbums.length];
        const albumSongs = albumGroups[currentAlbum];
        const iterator = albumIterators[currentAlbum];

        if (iterator < albumSongs.length) {
            result.push(albumSongs[iterator]);
            albumIterators[currentAlbum]++;
        }

        albumIndex++;

        // Safety check
        if (albumIndex > shuffledAlbums.length * 100) {
            break;
        }
    }

    return result;
};

/**
 * Shuffle queue while preserving current track
 * This is the main function to call from components
 * 
 * @param {Array} queue - Current queue
 * @param {number} currentIndex - Index of currently playing song
 * @param {boolean} useSmart - Use smart shuffle or standard
 * @returns {Array} New queue with current song preserved at same position
 */
export const shuffleQueuePreservingCurrent = async (queue, currentIndex, useSmart = true) => {
    if (!Array.isArray(queue) || queue.length <= 1) {
        return queue;
    }

    // If no current track or invalid index, shuffle all
    if (currentIndex === null || currentIndex === undefined || currentIndex < 0 || currentIndex >= queue.length) {
        return useSmart ? smartShuffleQueue(queue) : standardShuffle(queue);
    }

    // Preserve current track
    const currentTrack = queue[currentIndex];

    // Get tracks before and after current
    const beforeCurrent = queue.slice(0, currentIndex);
    const afterCurrent = queue.slice(currentIndex + 1);

    // Combine all tracks except current
    const tracksToShuffle = [...beforeCurrent, ...afterCurrent];

    // Shuffle the tracks
    const shuffled = useSmart ? smartShuffleQueue(tracksToShuffle) : standardShuffle(tracksToShuffle);

    // Rebuild queue: current track stays at same position
    const newQueue = [
        ...shuffled.slice(0, currentIndex),
        currentTrack,
        ...shuffled.slice(currentIndex)
    ];

    return newQueue;
};
