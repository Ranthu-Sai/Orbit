import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity, Pressable } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTheme, useNavigation, useRoute } from '@react-navigation/native';
import { usePlaybackState, useActiveTrack } from 'react-native-track-player';
import LinearGradient from 'react-native-linear-gradient';

import { EachSongCard } from '../Component/Global/EachSongCard';
import YouTubeMusicService from '../Utils/YouTubeMusicService';
import FastImage from 'react-native-fast-image';
import { AddPlaylist } from '../MusicPlayerFunctions';

import { SongsListSkeleton } from '../Component/Global/SongsListSkeleton';
import { GridSkeleton } from '../Component/Global/GridSkeleton';

const CARD_WIDTH_GRID = 160;

const SectionListPage = () => {
    const theme = useTheme();
    const navigation = useNavigation();
    const route = useRoute();
    const activeTrack = useActiveTrack();
    const playbackState = usePlaybackState();

    const { endpoint, title, type: initialType } = route.params || {};

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [continuation, setContinuation] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [pageTitle, setPageTitle] = useState(title || 'Items');

    // Fetch initial data
    useEffect(() => {
        loadData();
    }, [endpoint]);

    const loadData = async () => {
        if (!endpoint || (!endpoint.browseId && !endpoint.params)) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await YouTubeMusicService.getSection(endpoint.browseId, endpoint.params);

            if (data && data.items) {
                setItems(data.items);
                setContinuation(data.continuation);
                setHasMore(!!data.continuation);
                if (data.title) setPageTitle(data.title);
            }
        } catch (error) {
            console.error("Error fetching section:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!continuation || loading) return;

        try {
            const data = await YouTubeMusicService.getSection(null, null, continuation);

            if (data && data.items) {
                setItems(prev => [...prev, ...data.items]);
                setContinuation(data.continuation);
                setHasMore(!!data.continuation);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more section items:", error);
        }
    };

    const getType = (item) => {
        if (initialType) return initialType;
        return item.type || 'song';
    };

    const handlePress = useCallback((item) => {
        const itemType = getType(item);

        if (itemType === 'song' || itemType === 'video') {
            const song = item;
            // Ensure song object has necessary fields for AddPlaylist
            const listToPlay = items.filter(i => (getType(i) === 'song' || getType(i) === 'video')).map(s => ({
                ...s,
                url: s.videoId || s.id,
                artwork: s.thumbnail || s.thumbnails?.[0]?.url,
                artist: s.artist || s.artists?.map(a => a.name).join(', ') || 'Unknown'
            }));

            // Find index in the playlist
            const index = listToPlay.findIndex(s => (s.videoId === item.videoId) || (s.id === item.id));

            // Play generic list
            const queue = listToPlay.slice(index >= 0 ? index : 0);
            if (queue.length > 0) AddPlaylist(queue);

        } else if (itemType === 'album' || itemType === 'albums') {
            navigation.navigate('Album', { id: item.browseId || item.id, source: 'ytmusic' });
        } else if (itemType === 'playlist' || itemType === 'playlists') {
            navigation.navigate('Playlist', {
                id: item.playlistId || item.id,
                source: 'ytmusic',
                image: item.thumbnail || item.thumbnails?.[0]?.url
            });
        } else if (itemType === 'artist' || itemType === 'artists') {
            navigation.push('ArtistPage', { artistId: item.browseId || item.id, source: 'ytmusic' });
        }
    }, [items, navigation]);

    // Grid Card for Albums/Playlists
    const renderGridItem = ({ item }) => {
        const thumbnail = item.thumbnail || item.thumbnails?.[0]?.url;
        return (
            <Pressable
                onPress={() => {
                    handlePress(item);
                }}
                style={styles.gridCardContainer}
            >
                <View style={styles.gridCard}>
                    <FastImage
                        source={{ uri: thumbnail }}
                        style={styles.gridImage}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                </View>
                <Text style={[styles.gridTitle, { color: theme.colors.text }]} numberOfLines={2}>
                    {item.title || item.name}
                </Text>
                <Text style={[styles.gridSubtitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.subtitle || item.year || item.artist || ''}
                </Text>
            </Pressable>
        );
    };

    const renderItem = ({ item, index }) => {
        const type = getType(item);

        if (type === 'song' || type === 'video') {
            return (
                <EachSongCard
                    title={item.title || item.name}
                    artist={item.artist || item.artists?.map(a => a.name).join(', ') || 'Unknown'}
                    image={item.thumbnail || item.thumbnails?.[0]?.url}
                    id={item.videoId || item.id}
                    duration={item.duration}
                    index={index}
                    activeTrackId={activeTrack?.id}
                    isPlaying={playbackState.state === "playing"}
                    source="ytmusic"
                    width="100%"
                    showNumber={true}
                    onClick={() => handlePress(item)}
                />
            );
        }

        // Use Grid for everything else
        return renderGridItem({ item });
    };

    const isGrid = items.length > 0 && getType(items[0]) !== 'song' && getType(items[0]) !== 'video';

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
                <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
                <Text style={styles.headerTitle} numberOfLines={1}>{pageTitle}</Text>
            </View>

            {loading && items.length === 0 ? (
                initialType === 'song' || initialType === 'video' || (endpoint?.params && endpoint.params.includes('songs')) ? (
                    <SongsListSkeleton count={10} showHeader={false} />
                ) : (
                    <GridSkeleton count={8} showHeader={false} />
                )
            ) : (
                <FlatList
                    key={isGrid ? 'grid' : 'list'}
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => `${item.id || item.videoId}-${index}`}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    numColumns={isGrid ? 2 : 1}
                    columnWrapperStyle={isGrid ? styles.columnWrapper : null}
                    contentContainerStyle={styles.listContent}
                    ListFooterComponent={hasMore && items.length > 0 ? (
                        isGrid ? (
                            <GridSkeleton count={2} showHeader={false} />
                        ) : (
                            <SongsListSkeleton count={3} showHeader={false} />
                        )
                    ) : null}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: StatusBar.currentHeight || 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        // elevation: 0, // Removed elevation
        // zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 150,
        paddingHorizontal: 8,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },

    // Grid Item Styles
    gridCardContainer: {
        width: '48%',
        marginBottom: 16,
    },
    gridCard: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 8,
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0, // Hidden by default, could enable on press/hover if needed, but for touch mostly hidden
    },
    gridTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    gridSubtitle: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 2,
    },
});

export default SectionListPage;
