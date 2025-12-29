/**
 * YTSectionRow.jsx
 * 
 * Reusable horizontal scroll row for YTMusic sections (playlists, albums, artists).
 * Based on OuterTune's LazyRow pattern.
 */

import React from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

const ITEM_WIDTH = 140;
const ITEM_HEIGHT = 140;

const truncateText = (text, limit = 18) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
};

const SectionItem = ({ item, type, onPress }) => {
    const { colors } = useTheme();
    const isArtist = type === 'artist';

    const getThumbnail = () => {
        if (item.thumbnail) return item.thumbnail;
        if (item.thumbnails && item.thumbnails.length > 0) {
            return item.thumbnails[item.thumbnails.length - 1]?.url || item.thumbnails[0]?.url;
        }
        if (item.image && Array.isArray(item.image)) {
            return item.image[item.image.length - 1]?.url || item.image[0]?.url;
        }
        return null;
    };

    const getSubtitle = () => {
        if (type === 'album') return item.year || item.artist || 'Album';
        if (type === 'playlist') return item.author || 'Playlist';
        if (type === 'artist') return 'Artist';
        return item.subtitle || '';
    };

    return (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => onPress(item, type)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: getThumbnail() }}
                style={[
                    styles.thumbnail,
                    isArtist && styles.artistThumbnail
                ]}
                resizeMode="cover"
            />
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {truncateText(item.title || item.name, 18)}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]} numberOfLines={1}>
                {truncateText(getSubtitle(), 20)}
            </Text>
        </TouchableOpacity>
    );
};

export const YTSectionRow = ({
    title,
    items = [],
    type = 'playlist',
    onItemPress,
    onSeeAll
}) => {
    const { colors } = useTheme();
    const navigation = useNavigation();

    const handlePress = (item, itemType) => {
        if (onItemPress) {
            onItemPress(item, itemType);
            return;
        }

        // Default navigation behavior
        const id = item.browseId || item.playlistId || item.id;
        if (itemType === 'album') {
            navigation.navigate('Album', { id, source: 'YTMusic' });
        } else if (itemType === 'playlist') {
            navigation.navigate('Playlist', { id, source: 'YTMusic' });
        } else if (itemType === 'artist') {
            navigation.navigate('ArtistPage', { id, source: 'YTMusic' });
        }
    };

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
                {onSeeAll && (
                    <TouchableOpacity onPress={onSeeAll}>
                        <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                    </TouchableOpacity>
                )}
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={items}
                keyExtractor={(item, index) => `${type}-${item.id || item.browseId || index}`}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                    <SectionItem item={item} type={type} onPress={handlePress} />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 12,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContainer: {
        paddingHorizontal: 12,
    },
    itemContainer: {
        width: ITEM_WIDTH,
        marginHorizontal: 6,
    },
    thumbnail: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    artistThumbnail: {
        borderRadius: ITEM_WIDTH / 2,
    },
    title: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 8,
        lineHeight: 18,
    },
    subtitle: {
        fontSize: 12,
        opacity: 0.6,
        marginTop: 2,
    },
});

export default YTSectionRow;
