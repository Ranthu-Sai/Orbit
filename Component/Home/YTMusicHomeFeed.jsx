/**
 * YTMusicHomeFeed.jsx
 * 
 * YTMusic-only home feed using Orbit's existing UI components.
 * Renders ALL sections from YTMusic API with consistent styling.
 * Uses chips to fetch diverse content (OuterTune approach).
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, FlatList, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heading } from '../Global/Heading';
import { EachPlaylistCard } from '../Global/EachPlaylistCard';
import { EachAlbumCard } from '../Global/EachAlbumCard';
import { EachSongCard } from '../Global/EachSongCard';
import { PlaylistRowSkeleton } from './PlaylistRowSkeleton';
import YouTubeMusicService from '../../Utils/YouTubeMusicService';
import ytAuthService from '../../Utils/YouTubeAuthService';
import listeningHistoryService from '../../Utils/ListeningHistoryService';

const CACHE_KEY = 'ytmusic_home_feed_full_v6';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Get best thumbnail from array
const getBestThumbnail = (thumbnails, videoId = null) => {
    if (videoId) {
        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
    if (!thumbnails) return null;
    if (Array.isArray(thumbnails)) {
        const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
        return sorted[0]?.url || thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
    }
    if (typeof thumbnails === 'string') return thumbnails;
    if (thumbnails?.url) return thumbnails.url;
    return null;
};

// Quick Picks section - uses EachSongCard in horizontal scroll (original Orbit style)
const QuickPicksSection = ({ title, songs }) => {
    if (!songs || songs.length === 0) return null;

    // Split songs into columns for horizontal scrolling
    const SONGS_PER_COLUMN = 4;
    const columns = [];
    for (let i = 0; i < songs.length; i += SONGS_PER_COLUMN) {
        columns.push(songs.slice(i, i + SONGS_PER_COLUMN));
    }

    return (
        <View style={styles.sectionContainer}>
            <View style={styles.headingContainer}>
                <Heading text={title} />
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPicksContainer}
                data={columns}
                keyExtractor={(_, index) => `column-${index}`}
                renderItem={({ item: columnSongs }) => (
                    <View style={styles.quickPicksColumn}>
                        {columnSongs.map((song, idx) => (
                            <EachSongCard
                                key={`${song.videoId || song.id}-${idx}`}
                                title={song.title || song.name}
                                artist={song.artist || song.artists?.[0]?.name || ''}
                                image={getBestThumbnail(song.thumbnails, song.videoId)}
                                id={song.videoId || song.id}
                                duration={song.duration}
                                source="ytmusic"
                                width={SCREEN_WIDTH * 0.85}
                                titleandartistwidth={SCREEN_WIDTH * 0.55}
                            />
                        ))}
                    </View>
                )}
            />
        </View>
    );
};

// Section for playlists/albums using existing Orbit cards
const ContentSection = ({ title, items, type }) => {
    if (!items || items.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <View style={styles.headingContainer}>
                <Heading text={title} />
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                data={items.slice(0, 15)}
                keyExtractor={(item, index) => `${type}-${item.id || item.browseId || item.playlistId}-${index}`}
                renderItem={({ item }) => {
                    const thumbnail = getBestThumbnail(item.thumbnails || item.thumbnail);
                    const itemTitle = item.title || item.name || '';
                    const subtitle = item.subtitle || item.artists?.[0]?.name || item.author || item.year || '';

                    if (type === 'album') {
                        return (
                            <EachAlbumCard
                                image={thumbnail}
                                name={itemTitle}
                                artists={subtitle}
                                id={item.browseId || item.id}
                                source="YTMusic"
                            />
                        );
                    }

                    return (
                        <EachPlaylistCard
                            image={thumbnail}
                            name={itemTitle}
                            follower={subtitle}
                            id={item.playlistId || item.browseId || item.id}
                            source="YTMusic"
                            MainContainerStyle={{ marginHorizontal: 4 }}
                        />
                    );
                }}
            />
        </View>
    );
};

// Artist section with circular images
const ArtistSection = ({ title, items }) => {
    const { colors } = useTheme();

    if (!items || items.length === 0) return null;

    return (
        <View style={styles.sectionContainer}>
            <View style={styles.headingContainer}>
                <Heading text={title} />
            </View>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                data={items.slice(0, 12)}
                keyExtractor={(item, index) => `artist-${item.browseId || item.id}-${index}`}
                renderItem={({ item }) => (
                    <EachPlaylistCard
                        image={getBestThumbnail(item.thumbnails || item.thumbnail)}
                        name={item.title || item.name || ''}
                        follower={item.subtitle || ''}
                        id={item.browseId || item.id}
                        source="YTMusic"
                        isArtist={true}
                        MainContainerStyle={{ marginHorizontal: 4 }}
                    />
                )}
            />
        </View>
    );
};

export const YTMusicHomeFeed = forwardRef(({ refreshing, onRefreshComplete }, ref) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [sections, setSections] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState('');
    const isMounted = useRef(true);

    useImperativeHandle(ref, () => ({
        refresh: async () => {
            console.log('🔄 YTMusicHomeFeed - Hard refresh triggered');
            await fetchHomeData(true);
        }
    }));

    const fetchHomeData = async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                setLoading(true);
            }

            // Check cache first
            if (!forceRefresh) {
                try {
                    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                    if (cachedData) {
                        const parsed = JSON.parse(cachedData);
                        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                            console.log('[YTMusicHomeFeed] Cache hit, sections:', parsed.length);
                            setSections(parsed);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (e) {
                    console.log('[YTMusicHomeFeed] Cache read error:', e.message);
                }
            }

            // Clear cache on force refresh
            if (forceRefresh) {
                await AsyncStorage.removeItem(CACHE_KEY);
            }

            console.log('[YTMusicHomeFeed] Fetching from API with chips support...');

            const homeData = await YouTubeMusicService.getHomeFeed(100, forceRefresh);

            if (homeData && Array.isArray(homeData) && homeData.length > 0 && isMounted.current) {
                console.log('[YTMusicHomeFeed] Received sections:', homeData.length);

                // Process ALL sections from the API
                const processedSections = homeData.map(section => {
                    const sectionTitle = section.title || 'Music';
                    const contents = section.contents || [];

                    // Categorize items by type
                    const songs = contents.filter(item =>
                        item.videoId && !item.playlistId && !item.browseId?.startsWith('MPRE')
                    );

                    const playlists = contents.filter(item =>
                        item.playlistId ||
                        (item.browseId && (item.browseId.startsWith('VL') || item.browseId.startsWith('RDCLAK')))
                    );

                    const albums = contents.filter(item =>
                        item.browseId && (item.browseId.startsWith('MPRE') || item.browseId.startsWith('OLAK'))
                    );

                    const artists = contents.filter(item =>
                        item.browseId && item.browseId.startsWith('UC')
                    );

                    // Determine primary content type
                    let type = 'mixed';
                    let items = contents;

                    if (songs.length > playlists.length && songs.length > albums.length) {
                        type = 'songs';
                        items = songs;
                    } else if (albums.length > playlists.length) {
                        type = 'album';
                        items = albums;
                    } else if (playlists.length > 0) {
                        type = 'playlist';
                        items = playlists;
                    } else if (artists.length > 0) {
                        type = 'artist';
                        items = artists;
                    }

                    return {
                        title: sectionTitle,
                        type,
                        items,
                        songs,
                        playlists,
                        albums,
                        artists
                    };
                }).filter(section => section.items && section.items.length > 0);

                console.log('[YTMusicHomeFeed] Processed sections:', processedSections.length);

                // Log section breakdown
                const breakdown = processedSections.reduce((acc, s) => {
                    acc[s.type] = (acc[s.type] || 0) + 1;
                    return acc;
                }, {});
                console.log('[YTMusicHomeFeed] Section breakdown:', breakdown);

                setSections(processedSections);

                // Cache the processed data
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(processedSections));
            }
        } catch (error) {
            console.error('[YTMusicHomeFeed] Fetch error:', error);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };

    // Handle refresh from parent
    useEffect(() => {
        if (refreshing) {
            const doRefresh = async () => {
                await fetchHomeData(true);
                if (onRefreshComplete) onRefreshComplete();
            };
            doRefresh();
        }
    }, [refreshing]);

    // Initial load, auth listener, and listening history subscription
    useEffect(() => {
        isMounted.current = true;

        const updateAuthState = () => {
            setIsLoggedIn(ytAuthService.isAuth());
            setUserName(ytAuthService.getUser()?.name || '');
        };

        updateAuthState();
        ytAuthService.addListener(updateAuthState);

        // Subscribe to listening history for personalized Quick Picks refresh
        const unsubscribeHistory = listeningHistoryService.subscribe(async () => {
            console.log('📊 YTMusicHomeFeed: Personalization triggered, refreshing...');
            // Auto-refresh when user has listened to enough songs
            await fetchHomeData(true);
        });

        fetchHomeData(false);

        return () => {
            isMounted.current = false;
            ytAuthService.removeListener(updateAuthState);
            unsubscribeHistory();
        };
    }, []);


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <PlaylistRowSkeleton count={4} showHeading={true} />
                <PlaylistRowSkeleton count={4} showHeading={true} />
                <PlaylistRowSkeleton count={4} showHeading={true} />
                <PlaylistRowSkeleton count={4} showHeading={true} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Auth Status Banner */}
            {isLoggedIn && userName && (
                <View style={[styles.authBanner, { backgroundColor: colors.card }]}>
                    <Text style={[styles.authText, { color: colors.text }]}>
                        Welcome back, {userName}
                    </Text>
                </View>
            )}

            {/* Render ALL sections from API */}
            {sections.map((section, index) => {
                // Quick Picks / Song sections
                if (section.type === 'songs' && section.songs?.length > 0) {
                    return (
                        <QuickPicksSection
                            key={`section-${index}`}
                            title={section.title}
                            songs={section.songs}
                        />
                    );
                }

                // Artist sections
                if (section.type === 'artist' && section.artists?.length > 0) {
                    return (
                        <ArtistSection
                            key={`section-${index}`}
                            title={section.title}
                            items={section.artists}
                        />
                    );
                }

                // Playlist/Album sections using existing Orbit cards
                return (
                    <ContentSection
                        key={`section-${index}`}
                        title={section.title}
                        items={section.items}
                        type={section.type}
                    />
                );
            })}

            {/* Empty State */}
            {sections.length === 0 && !loading && (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.text }]}>
                        No content available from YouTube Music.
                        {!isLoggedIn && '\n\nLog in for personalized recommendations.'}
                    </Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        paddingVertical: 20,
    },
    sectionContainer: {
        marginTop: 12,
    },
    headingContainer: {
        paddingHorizontal: 13,
    },
    listContent: {
        paddingLeft: 10,
        paddingRight: 5,
        gap: 2,
    },
    quickPicksContainer: {
        paddingLeft: 0,
        paddingRight: 10,
    },
    quickPicksColumn: {
        width: SCREEN_WIDTH * 0.85,
        marginRight: 8,
    },
    authBanner: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    authText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.6,
        textAlign: 'center',
    },
});

export default YTMusicHomeFeed;
