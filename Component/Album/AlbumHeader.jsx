import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Dimensions, StyleSheet, ToastAndroid } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Text, IconButton, Button } from 'react-native-paper';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer from 'react-native-track-player';
import { SetLikedAlbum, DeleteALikedAlbum } from '../../LocalStorage/StoreLikedAlbums';
import { DownloadButton } from '../Global/DownloadButton';
import { AddPlaylist, getIndexQuality } from '../../MusicPlayerFunctions';
import Context from '../../Context/Context';
import FormatArtist from '../../Utils/FormatArtists';
import FormatTitleAndArtist from '../../Utils/FormatTitleAndArtist';

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH * 0.40; // 40% of screen width

/**
 * Helper to validate image URL or provide default
 */
const getValidImageUrl = (url) => {
    if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
        return require('../../Images/default.jpg');
    }
    return { uri: url };
};

/**
 * Helper to format artist data properly
 */
const formatArtistData = (artistData) => {
    if (typeof artistData === 'string') return artistData;
    if (Array.isArray(artistData)) return FormatArtist(artistData);
    if (artistData?.primary && Array.isArray(artistData.primary)) {
        return FormatArtist(artistData.primary);
    }
    if (artistData?.name) return artistData.name;
    return 'Unknown Artist';
};

/**
 * Helper to safely get song URL
 */
const getSongUrl = (song, quality) => {
    if (song.downloadUrl?.length > quality && song.downloadUrl[quality]?.url) {
        return song.downloadUrl[quality].url;
    }
    if (song.download_url?.length > quality && song.download_url[quality]?.url) {
        return song.download_url[quality].url;
    }
    // Fallback to any available URL
    const urls = song.downloadUrl || song.download_url || [];
    for (const item of urls) {
        if (item?.url) return item.url;
    }
    return '';
};

/**
 * AlbumHeader Component
 * 
 * A modern, compact album header with:
 * - 40% width cover image on the left
 * - 60% content area on the right with title, year/song count, and action icons
 * - Separate full-width Play/Shuffle button row
 */
export const AlbumHeader = ({
    imageUrl,
    title,
    songCount = 0,
    albumId,
    year,
    songsData = [],
    albumData = null, // Full album data object
}) => {
    const theme = useTheme();
    const { updateTrack } = useContext(Context);
    const [isLiked, setIsLiked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Check if album is liked on mount
    useEffect(() => {
        const checkLikedStatus = async () => {
            if (!albumId) return;

            try {
                const albums = await AsyncStorage.getItem('LikedAlbums');
                if (albums) {
                    const parsed = JSON.parse(albums);
                    if (parsed?.albums?.[albumId]) {
                        setIsLiked(true);
                    }
                }
            } catch (error) {
                console.error('Error checking liked status:', error);
            }
        };

        checkLikedStatus();
    }, [albumId]);

    // Check playback state
    useEffect(() => {
        const checkPlaybackState = async () => {
            try {
                const state = await TrackPlayer.getState();
                const isPlayerPlaying = state === TrackPlayer.STATE_PLAYING || state === 3;
                const currentTrackIndex = await TrackPlayer.getCurrentTrack();

                if (currentTrackIndex === null) {
                    setIsPlaying(false);
                    return;
                }

                const currentTrack = await TrackPlayer.getTrack(currentTrackIndex);
                if (currentTrack?.albumId === albumId) {
                    setIsPlaying(isPlayerPlaying);
                } else {
                    setIsPlaying(false);
                }
            } catch (error) {
                setIsPlaying(false);
            }
        };

        checkPlaybackState();

        const stateListener = TrackPlayer.addEventListener('playback-state', checkPlaybackState);
        const trackListener = TrackPlayer.addEventListener('playback-track-changed', checkPlaybackState);

        return () => {
            stateListener.remove();
            trackListener.remove();
        };
    }, [albumId, songsData]);

    // Toggle like/unlike album
    const handleLikePress = useCallback(async () => {
        if (!albumId) return;

        try {
            if (isLiked) {
                await DeleteALikedAlbum(albumId);
                setIsLiked(false);
                ToastAndroid.show('Removed from Favorites', ToastAndroid.SHORT);
            } else {
                const displayImage = imageUrl || '';
                const displayName = title || 'Album';
                const displayYear = year || '';
                await SetLikedAlbum(displayImage, displayName, displayYear, albumId);
                setIsLiked(true);
                ToastAndroid.show('Added to Favorites', ToastAndroid.SHORT);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            ToastAndroid.show('Error updating favorites', ToastAndroid.SHORT);
        }
    }, [isLiked, albumId, title, imageUrl, year]);

    // Format songs for player
    const formatSongsForPlayer = useCallback(async (shuffle = false) => {
        const quality = await getIndexQuality();
        const songs = songsData || albumData?.data?.songs || [];

        console.log(`AlbumHeader: Formatting ${songs.length} songs for player`);

        const formatted = [];
        for (const song of songs) {
            if (!song) continue;

            // For YTMusic songs, use videoId as the identifier
            const isYTMusic = song.source === 'ytmusic' || song.downloadUrl === song.id || typeof song.downloadUrl === 'string';

            let songUrl = '';
            if (isYTMusic) {
                // For YTMusic, we'll get the URL at playback time
                songUrl = song.id || song.videoId || song.downloadUrl;
            } else {
                // For Saavn, get from downloadUrl array
                songUrl = getSongUrl(song, quality);
            }

            // Don't skip songs without URL - they'll be fetched at playback time
            if (!songUrl) {
                console.warn('Song missing ID:', song);
                continue;
            }

            const artistData = song.artists || song.primary_artists;

            formatted.push({
                url: songUrl,
                title: FormatTitleAndArtist(song.name || song.title || song.song || ''),
                artist: FormatTitleAndArtist(formatArtistData(artistData)),
                artwork: song.image?.[2]?.url || song.images?.[2]?.url || '',
                image: song.image?.[2]?.url || song.images?.[2]?.url || '',
                duration: song.duration || 0,
                id: song.id || song.videoId || '',
                language: song.language || '',
                albumId: albumId || '',
                downloadUrl: song.downloadUrl || song.download_url || [],
                source: song.source || (isYTMusic ? 'ytmusic' : 'saavn'),
            });
        }

        console.log(`AlbumHeader: Formatted ${formatted.length} songs successfully`);

        if (shuffle && formatted.length > 0) {
            // Fisher-Yates shuffle
            for (let i = formatted.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [formatted[i], formatted[j]] = [formatted[j], formatted[i]];
            }
        }

        return formatted;
    }, [songsData, albumData, albumId]);

    // Play all songs
    const handlePlayPress = useCallback(async () => {
        if (isLoading) return;

        try {
            // If already playing this album, toggle pause/play
            if (isPlaying) {
                await TrackPlayer.pause();
                setIsPlaying(false);
                return;
            }

            // Check if album is already in queue
            const currentTrackIndex = await TrackPlayer.getCurrentTrack();
            if (currentTrackIndex !== null) {
                const currentTrack = await TrackPlayer.getTrack(currentTrackIndex);
                if (currentTrack?.albumId === albumId) {
                    await TrackPlayer.play();
                    setIsPlaying(true);
                    return;
                }
            }

            setIsLoading(true);
            const songs = songsData || albumData?.data?.songs || [];

            if (songs.length === 0) {
                ToastAndroid.show('No songs available to play', ToastAndroid.SHORT);
                setIsLoading(false);
                return;
            }

            await AddPlaylist(songs);
            setIsPlaying(true);
            updateTrack?.();
            ToastAndroid.show(`Playing ${songs.length} songs`, ToastAndroid.SHORT);
        } catch (error) {
            console.error('Error playing album:', error);
            ToastAndroid.show('Failed to play album', ToastAndroid.SHORT);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, isPlaying, albumId, songsData, albumData, updateTrack]);

    // Shuffle and play
    const handleShufflePress = useCallback(async () => {
        if (isLoading) return;

        try {
            setIsLoading(true);
            const songs = songsData || albumData?.data?.songs || [];

            if (songs.length === 0) {
                ToastAndroid.show('No songs available to shuffle', ToastAndroid.SHORT);
                setIsLoading(false);
                return;
            }

            // Shuffle the songs array
            const shuffled = [...songs];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            await AddPlaylist(shuffled);
            setIsPlaying(true);
            updateTrack?.();
            ToastAndroid.show(`Shuffling ${shuffled.length} songs`, ToastAndroid.SHORT);
        } catch (error) {
            console.error('Error shuffling album:', error);
            ToastAndroid.show('Failed to shuffle album', ToastAndroid.SHORT);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, songsData, albumData, updateTrack]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Top Section: Image + Info */}
            <View style={styles.topSection}>
                {/* Cover Image - 40% width */}
                <FastImage
                    source={getValidImageUrl(imageUrl)}
                    style={styles.coverImage}
                    resizeMode={FastImage.resizeMode.cover}
                />

                {/* Content Section - 60% width */}
                <View style={styles.contentSection}>
                    {/* Title */}
                    <Text
                        variant="titleLarge"
                        style={[styles.title, { color: theme.colors.text }]}
                        numberOfLines={2}
                    >
                        {title || 'Album'}
                    </Text>

                    {/* Year + Song Count */}
                    <Text
                        variant="bodyMedium"
                        style={[styles.songCount, { color: theme.colors.text, opacity: 0.7 }]}
                    >
                        {year && `${year} • `}{songCount} {songCount === 1 ? 'song' : 'songs'}
                    </Text>

                    {/* Action Icons Row: Like, Download, More */}
                    <View style={styles.actionIconsRow}>
                        {/* Like Button */}
                        <IconButton
                            icon={isLiked ? 'heart' : 'heart-outline'}
                            iconColor={isLiked ? '#E91E63' : theme.colors.text}
                            size={26}
                            onPress={handleLikePress}
                            style={styles.actionIcon}
                        />

                        {/* Download Button */}
                        <IconButton
                            icon="download-outline"
                            iconColor={theme.colors.text}
                            size={26}
                            onPress={() => {/* TODO: Download all songs */ }}
                            style={styles.actionIcon}
                        />

                        {/* More Options */}
                        <IconButton
                            icon="dots-vertical"
                            iconColor={theme.colors.text}
                            size={26}
                            onPress={() => {/* TODO: Show options menu */ }}
                            style={styles.actionIcon}
                        />
                    </View>
                </View>
            </View>

            {/* Bottom Section: Play & Shuffle Buttons */}
            <View style={styles.buttonRow}>
                {/* Play Button */}
                <Button
                    mode="contained"
                    icon={isPlaying ? 'pause' : 'play'}
                    onPress={handlePlayPress}
                    loading={isLoading}
                    disabled={isLoading}
                    style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
                    labelStyle={[styles.buttonLabel, { color: '#FFFFFF' }]}
                    contentStyle={styles.buttonContent}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </Button>

                {/* Shuffle Button */}
                <Button
                    mode="outlined"
                    icon="shuffle"
                    onPress={handleShufflePress}
                    disabled={isLoading}
                    style={[styles.shuffleButton, { borderColor: theme.colors.text }]}
                    labelStyle={[styles.buttonLabel, { color: theme.colors.text }]}
                    contentStyle={styles.buttonContent}
                >
                    Shuffle
                </Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    coverImage: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    contentSection: {
        flex: 1,
        marginLeft: 20,
        paddingLeft: 4,
        justifyContent: 'flex-start',
        paddingTop: 8,
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
    songCount: {
        marginBottom: 12,
    },
    actionIconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -4,
        gap: 8,
    },
    actionIcon: {
        margin: 0,
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    playButton: {
        flex: 1,
        borderRadius: 24,
    },
    shuffleButton: {
        flex: 1,
        borderRadius: 24,
        borderWidth: 1,
    },
    buttonLabel: {
        fontWeight: '600',
        fontSize: 15,
    },
    buttonContent: {
        height: 44,
    },
});

export default AlbumHeader;
