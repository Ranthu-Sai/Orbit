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
import { Heading } from '../Global/Heading';
import { EachPlaylistCard } from '../Global/EachPlaylistCard';
import { EachAlbumCard } from '../Global/EachAlbumCard';
import { EachSongCard } from '../Global/EachSongCard';
import { PlaylistRowSkeleton } from './PlaylistRowSkeleton';
import { QuickPicksSkeleton } from './YTMusic/QuickPicksSkeleton';
import YouTubeMusicService from '../../Utils/YouTubeMusicService';
import ytAuthService from '../../Utils/YouTubeAuthService';
import localRecommendationService from '../../Utils/LocalRecommendationService';
import { CacheManager } from '../../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS, generateCacheKey } from '../../Utils/CacheConfig';

// Cache key for sections (without Quick Picks) - 24hr disk cache
const SECTIONS_CACHE_KEY = 'ytmusic_home_sections_v1';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sections to filter out - these are YouTube video categories, not music
// OuterTune approach: hide video-like content and show only music-focused sections
const VIDEO_SECTION_TITLES = [
    'true crime',
    'religion',
    'motivation',
    'comedy',
    'gaming',
    'sports',
    'news',
    'education',
    'science & technology',
    'travel & events',
    'autos & vehicles',
    'pets & animals',
    'howto & style',
    'people & blogs',
    'entertainment',
    'film & animation',
    'nonprofits & activism',
    // Add more as needed
];

// Check if a section is video-like (non-music content)
const isVideoSection = (section) => {
    const title = (section.title || '').toLowerCase().trim();

    // Check against known video category titles
    if (VIDEO_SECTION_TITLES.some(videoTitle => title.includes(videoTitle))) {
        return true;
    }

    // Check if items have video-like thumbnails (16:9 aspect ratio)
    const contents = section.contents || section.items || [];
    if (contents.length > 0) {
        const firstItem = contents[0];
        const thumbnails = firstItem?.thumbnails || [];

        if (thumbnails.length > 0) {
            const thumb = thumbnails[0];
            // Video thumbnails are typically 16:9 (width/height > 1.5)
            // Music thumbnails are typically 1:1 or close to square
            if (thumb.width && thumb.height) {
                const aspectRatio = thumb.width / thumb.height;
                // If aspect ratio is > 1.4, it's likely a video thumbnail
                if (aspectRatio > 1.4) {
                    console.log(`[YTMusicHomeFeed] Filtering video section: "${section.title}" (aspect ratio: ${aspectRatio.toFixed(2)})`);
                    return true;
                }
            }
        }

        // Check if items don't have typical music identifiers
        const hasNoMusicContent = contents.every(item =>
            !item.videoId && !item.playlistId && !item.browseId?.startsWith('MPRE') &&
            !item.browseId?.startsWith('UC') && !item.browseId?.startsWith('VL')
        );

        if (hasNoMusicContent && contents.length > 2) {
            console.log(`[YTMusicHomeFeed] Filtering non-music section: "${section.title}"`);
            return true;
        }
    }

    return false;
};

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

    // Lazy loading state - show 3 sections initially, load 2 more on scroll
    const INITIAL_SECTIONS = 3;
    const SECTIONS_PER_LOAD = 2;
    const [visibleCount, setVisibleCount] = useState(INITIAL_SECTIONS);


    const fetchHomeData = async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                setLoading(true);
            }

            const cacheKey = generateCacheKey(CACHE_KEYS.HOME, 'ytmusic_sections');

            // Always fetch Quick Picks (they have their own cache in LocalRecommendationService)
            const quickPicksPromise = localRecommendationService.getQuickPicks(forceRefresh);

            // Check disk cache for sections (24hr TTL) - NOT Quick Picks
            let cachedSections = null;
            if (!forceRefresh) {
                // Try RAM cache first
                cachedSections = CacheManager.get(cacheKey);
                if (cachedSections) {
                    console.log('[YTMusicHomeFeed] RAM cache HIT for sections:', cachedSections.length);
                } else {
                    // Try disk cache
                    cachedSections = await CacheManager.getAsync(cacheKey);
                    if (cachedSections) {
                        console.log('[YTMusicHomeFeed] Disk cache HIT for sections:', cachedSections.length);
                    }
                }
            }

            // Clear cache on force refresh
            if (forceRefresh) {
                CacheManager.invalidate(cacheKey);
                await localRecommendationService.clearCache();
                console.log('[YTMusicHomeFeed] Cache cleared, fetching fresh...');
            }

            let processedSections = cachedSections;

            // Fetch from API if no cache or force refresh
            if (!processedSections) {
                console.log('[YTMusicHomeFeed] Fetching sections from API...');

                const homeData = await YouTubeMusicService.getHomeFeed(100, forceRefresh);

                if (homeData && Array.isArray(homeData) && homeData.length > 0 && isMounted.current) {
                    console.log('[YTMusicHomeFeed] Received sections:', homeData.length);

                    // Filter out video-like sections (OuterTune approach)
                    const filteredData = homeData.filter(section => !isVideoSection(section));
                    console.log('[YTMusicHomeFeed] After filtering video sections:', filteredData.length);

                    // Process music-only sections from the API
                    processedSections = filteredData.map(section => {
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

                    // Remove any "Quick Picks" or "Start Radio" from API sections (we inject our own)
                    processedSections = processedSections.filter(s =>
                        !s.title.toLowerCase().includes('quick picks') &&
                        !s.title.toLowerCase().includes('start radio')
                    );

                    // Cache sections (without Quick Picks) to disk for 24 hours
                    CacheManager.set(cacheKey, processedSections, CACHE_TTL.HOME_DATA);
                    console.log('[YTMusicHomeFeed] Cached sections to disk:', processedSections.length);
                }
            }

            // Wait for Quick Picks and inject them
            const localQuickPicks = await quickPicksPromise;

            if (processedSections && isMounted.current) {
                let finalSections = [...processedSections];

                // Inject Local Quick Picks at the top if available
                if (localQuickPicks && localQuickPicks.length > 0) {
                    console.log('✨ [YTMusicHomeFeed] Injecting Local Quick Picks:', localQuickPicks.length);
                    finalSections.unshift({
                        title: 'Quick Picks',
                        type: 'songs',
                        songs: localQuickPicks,
                        items: localQuickPicks
                    });
                }

                console.log('[YTMusicHomeFeed] Final sections with Quick Picks:', finalSections.length);
                setSections(finalSections);
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

    // Initial load and auth listener
    useEffect(() => {
        isMounted.current = true;

        const updateAuthState = () => {
            setIsLoggedIn(ytAuthService.isAuth());
            setUserName(ytAuthService.getUser()?.name || '');
        };

        updateAuthState();
        ytAuthService.addListener(updateAuthState);

        fetchHomeData(false);

        return () => {
            isMounted.current = false;
            ytAuthService.removeListener(updateAuthState);
        };
    }, []);



    // Get the visible sections based on lazy loading
    const visibleSections = sections.slice(0, visibleCount);
    const hasMoreSections = visibleCount < sections.length;

    // Load more sections callback - called from parent scroll
    const loadMoreSections = () => {
        if (hasMoreSections) {
            console.log(`[YTMusicHomeFeed] Loading more sections: ${visibleCount} -> ${visibleCount + SECTIONS_PER_LOAD}`);
            setVisibleCount(prev => Math.min(prev + SECTIONS_PER_LOAD, sections.length));
        }
    };

    // Expose methods to parent via ref - MUST be before conditional returns
    useImperativeHandle(ref, () => ({
        refresh: async () => {
            console.log('🔄 YTMusicHomeFeed - Hard refresh triggered');
            setVisibleCount(INITIAL_SECTIONS); // Reset lazy loading on refresh
            await fetchHomeData(true);
        },
        loadMore: loadMoreSections,
    }), [hasMoreSections, visibleCount, sections.length]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <QuickPicksSkeleton />
                <PlaylistRowSkeleton count={4} showHeading={true} />
                <PlaylistRowSkeleton count={4} showHeading={true} />
                <PlaylistRowSkeleton count={4} showHeading={true} />
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* Render visible sections with lazy loading */}
            {visibleSections.map((section, index) => {
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

            {/* Loading indicator for more sections */}
            {hasMoreSections && (
                <View style={styles.loadMoreContainer}>
                    <PlaylistRowSkeleton count={4} showHeading={true} />
                </View>
            )}

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
    loadMoreContainer: {
        marginTop: 8,
    },
    emptyText: {
        fontSize: 14,
        opacity: 0.6,
        textAlign: 'center',
    },
});

export default YTMusicHomeFeed;
