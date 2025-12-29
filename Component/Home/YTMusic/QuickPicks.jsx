/**
 * QuickPicks.jsx
 * 
 * OuterTune-style Quick Picks component.
 * Compact horizontal scroll with 4 songs per column, minimal UI.
 */

import React from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { PlayOneSong } from '../../../MusicPlayerFunctions';
import FormatTitleAndArtist from '../../../Utils/FormatTitleAndArtist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.88;
const SONGS_PER_COLUMN = 4;

// Get best thumbnail
const getBestThumbnail = (thumbnails, videoId = null) => {
    if (videoId) {
        return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    }
    if (!thumbnails) return null;
    if (Array.isArray(thumbnails)) {
        const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
        return sorted[0]?.url || thumbnails[0]?.url;
    }
    if (typeof thumbnails === 'string') return thumbnails;
    if (thumbnails?.url) return thumbnails.url;
    return null;
};

// Single song item - compact OuterTune style
const QuickPickItem = ({ song, onPress, colors, isLast }) => {
    const thumbnail = getBestThumbnail(song.thumbnails, song.videoId);
    const title = song.title || song.name || '';
    const artist = song.artist || song.artists?.[0]?.name || '';

    return (
        <TouchableOpacity
            style={[styles.itemContainer, !isLast && styles.itemBorder]}
            onPress={() => onPress(song)}
            activeOpacity={0.6}
        >
            <Image
                source={{ uri: thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
            />
            <View style={styles.textContainer}>
                <Text
                    style={[styles.title, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {FormatTitleAndArtist(title)}
                </Text>
                <Text
                    style={[styles.artist, { color: colors.textSecondary || 'rgba(255,255,255,0.6)' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {FormatTitleAndArtist(artist)}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// Column of 4 songs
const QuickPickColumn = ({ songs, onPress, colors }) => {
    return (
        <View style={styles.column}>
            {songs.map((song, idx) => (
                <QuickPickItem
                    key={`${song.videoId || song.id}-${idx}`}
                    song={song}
                    onPress={onPress}
                    colors={colors}
                    isLast={idx === songs.length - 1}
                />
            ))}
        </View>
    );
};

export const QuickPicks = ({ songs = [], title = 'Quick picks' }) => {
    const { colors } = useTheme();

    const handlePress = async (song) => {
        // Play the song
        const songData = {
            url: '',
            title: song.title || song.name,
            artist: song.artist || song.artists?.[0]?.name || '',
            artwork: getBestThumbnail(song.thumbnails, song.videoId),
            id: song.videoId || song.id,
            duration: song.duration,
            source: 'ytmusic'
        };

        try {
            await PlayOneSong(songData);
        } catch (e) {
            console.error('QuickPicks play error:', e);
        }
    };

    if (!songs || songs.length === 0) {
        return null;
    }

    // Group songs into columns of 4
    const columns = [];
    for (let i = 0; i < songs.length; i += SONGS_PER_COLUMN) {
        columns.push(songs.slice(i, i + SONGS_PER_COLUMN));
    }

    return (
        <View style={styles.container}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={columns}
                keyExtractor={(_, index) => `column-${index}`}
                contentContainerStyle={styles.listContainer}
                snapToInterval={COLUMN_WIDTH + 12}
                decelerationRate="fast"
                renderItem={({ item: columnSongs }) => (
                    <QuickPickColumn
                        songs={columnSongs}
                        onPress={handlePress}
                        colors={colors}
                    />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 4,
    },
    listContainer: {
        paddingHorizontal: 12,
    },
    column: {
        width: COLUMN_WIDTH,
        marginRight: 12,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    itemBorder: {
        // Subtle separator between items
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: '#333',
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 20,
    },
    artist: {
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
});

export default QuickPicks;
