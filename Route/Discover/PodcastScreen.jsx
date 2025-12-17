import React, { useEffect, useState, useCallback, useContext, useRef, memo } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    TextInput,
    Pressable,
    Text,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Search, ArrowLeft } from 'lucide-react-native';
import { MainWrapper } from '../../Layout/MainWrapper';
import { PodcastCard } from '../../Component/Podcast/PodcastCard';
import { EpisodeCardHorizontal } from '../../Component/Podcast/EpisodeCard';
import { PodcastHorizontalSlider } from '../../Component/Podcast/PodcastHorizontalSlider';
import { CategoryChipList } from '../../Component/Podcast/CategoryChip';
import { Heading } from '../../Component/Global/Heading';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import {
    getTrendingPodcasts,
    getRecentEpisodes,
    searchPodcasts,
    getCategories,
} from '../../Api/PodcastIndexAPI';
import { PlayOneSong } from '../../MusicPlayerFunctions';
import Context from '../../Context/Context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEMS_PER_PAGE = 20;

// Centralized Header Component to prevent hook order issues and remounting
const ListHeader = memo(({
    isSearching,
    dark,
    navigation,
    searchQuery,
    setSearchQuery,
    handleSearch,
    clearSearch,
    theme,
    recentEpisodes,
    loading,
    handlePlayEpisode,
    categories,
    selectedCategory,
    handleCategorySelect,
    trendingPodcasts
}) => {
    return (
        <View>
            {/* Common Top Header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingTop: 16,
                paddingBottom: 8,
            }}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.6 : 1,
                    })}
                >
                    <ArrowLeft size={22} color={dark ? '#FFFFFF' : '#000000'} />
                </Pressable>
                <Text style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: dark ? '#FFFFFF' : '#000000',
                    marginLeft: 12,
                }}>
                    {isSearching ? 'Search Results' : 'Podcasts'}
                </Text>
            </View>

            {/* Search Bar - Stable UI */}
            <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                }}>
                    <Search size={18} color={dark ? '#888888' : '#999999'} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        placeholder="Search podcasts..."
                        placeholderTextColor={dark ? '#888888' : '#999999'}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            paddingHorizontal: 10,
                            fontSize: 15,
                            color: dark ? '#FFFFFF' : '#000000',
                        }}
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={clearSearch}>
                            <Text style={{ color: theme.colors.primary, fontSize: 13 }}>Clear</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {!isSearching ? (
                <>
                    {/* Home Feed Content */}
                    <PodcastHorizontalSlider
                        title="New Episodes"
                        data={recentEpisodes}
                        loading={loading}
                        emptyText="No new episodes"
                        renderItem={(episode) => (
                            <EpisodeCardHorizontal
                                episode={episode}
                                width={280}
                                onPlay={handlePlayEpisode}
                            />
                        )}
                    />

                    <PaddingConatiner>
                        <Heading text="Categories" nospace={true} />
                    </PaddingConatiner>
                    <CategoryChipList
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleCategorySelect}
                    />

                    <PodcastHorizontalSlider
                        title="Trending Podcasts"
                        data={trendingPodcasts.slice(0, 10)}
                        loading={loading}
                        emptyText="No trending podcasts"
                        renderItem={(podcast) => (
                            <PodcastCard podcast={podcast} width={140} />
                        )}
                    />

                    <PaddingConatiner>
                        <Heading text="All Podcasts" />
                    </PaddingConatiner>
                </>
            ) : (
                <PaddingConatiner>
                    <Heading text="Results" />
                </PaddingConatiner>
            )}
        </View>
    );
});

export const PodcastScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { dark } = theme;
    const { setIndex } = useContext(Context);

    // Initial Loading State
    const [initialLoading, setInitialLoading] = useState(true);

    // State for home feed
    const [trendingPodcasts, setTrendingPodcasts] = useState([]);
    const [recentEpisodes, setRecentEpisodes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState({ id: null, name: 'All' });

    // Pagination state for trending
    const [trendingPage, setTrendingPage] = useState(0);
    const [hasMoreTrending, setHasMoreTrending] = useState(true);
    const [loadingMoreTrending, setLoadingMoreTrending] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchPage, setSearchPage] = useState(0);
    const [hasMoreSearch, setHasMoreSearch] = useState(true);
    const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
    const lastSearchQuery = useRef('');

    // Loading states
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Initial data fetch
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setInitialLoading(true);

            // Fetch first page of trending podcasts
            const trendingResponse = await getTrendingPodcasts(ITEMS_PER_PAGE * 2);
            if (trendingResponse.success) {
                setTrendingPodcasts(trendingResponse.data);
                setTrendingPage(1);
                setHasMoreTrending(trendingResponse.data.length >= ITEMS_PER_PAGE);
            }

            // Fetch recent episodes
            const episodesResponse = await getRecentEpisodes(15);
            if (episodesResponse.success) {
                setRecentEpisodes(episodesResponse.data);
            }

            // Fetch categories
            const categoriesResponse = await getCategories();
            if (categoriesResponse.success) {
                setCategories(categoriesResponse.data.slice(0, 10));
            }
        } catch (error) {
            console.error('Error fetching podcast data:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    // Load more trending podcasts
    const loadMoreTrending = async () => {
        if (loadingMoreTrending || !hasMoreTrending || isSearching) return;

        setLoadingMoreTrending(true);
        try {
            const max = (trendingPage + 1) * ITEMS_PER_PAGE * 2;
            const catName = selectedCategory?.id !== null ? selectedCategory?.name : null;
            const response = await getTrendingPodcasts(max, null, catName);

            if (response.success) {
                const newPodcasts = response.data;
                if (newPodcasts.length > trendingPodcasts.length) {
                    setTrendingPodcasts(newPodcasts);
                    setTrendingPage(prev => prev + 1);
                    setHasMoreTrending(newPodcasts.length >= max);
                } else {
                    setHasMoreTrending(false);
                }
            }
        } catch (error) {
            console.error('Error loading more trending:', error);
        } finally {
            setLoadingMoreTrending(false);
        }
    };

    // Search handler
    const handleSearch = useCallback(async () => {
        const query = searchQuery.trim();
        if (!query) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        lastSearchQuery.current = query;
        setIsSearching(true);
        setLoadingSearch(true);
        setSearchPage(0);

        try {
            const response = await searchPodcasts(query, ITEMS_PER_PAGE);
            if (response.success) {
                setSearchResults(response.data);
                setSearchPage(1);
                setHasMoreSearch(response.data.length >= ITEMS_PER_PAGE);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoadingSearch(false);
        }
    }, [searchQuery]);

    // Load more search results
    const loadMoreSearch = async () => {
        if (loadingMoreSearch || !hasMoreSearch || !isSearching) return;

        setLoadingMoreSearch(true);
        try {
            const max = (searchPage + 1) * ITEMS_PER_PAGE;
            const response = await searchPodcasts(lastSearchQuery.current, max);

            if (response.success) {
                const newResults = response.data;
                if (newResults.length > searchResults.length) {
                    setSearchResults(newResults);
                    setSearchPage(prev => prev + 1);
                    setHasMoreSearch(newResults.length >= max);
                } else {
                    setHasMoreSearch(false);
                }
            }
        } catch (error) {
            console.error('Error loading more search results:', error);
        } finally {
            setLoadingMoreSearch(false);
        }
    };

    // Category filter handler
    const handleCategorySelect = useCallback(async (category) => {
        setSelectedCategory(category);
        setInitialLoading(true);

        try {
            const catName = category.id !== null ? category.name : null;
            const response = await getTrendingPodcasts(ITEMS_PER_PAGE * 2, null, catName);
            if (response.success) {
                setTrendingPodcasts(response.data);
                setTrendingPage(1);
                setHasMoreTrending(response.data.length >= ITEMS_PER_PAGE);
            }
        } catch (error) {
            console.error('Error filtering by category:', error);
        } finally {
            setInitialLoading(false);
        }
    }, []);

    // Refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        if (isSearching) {
            await handleSearch();
        } else {
            await fetchInitialData();
        }
        setRefreshing(false);
    };

    // Play episode handler
    const handlePlayEpisode = useCallback(async (episode) => {
        const track = {
            id: String(episode.id || episode.guid),
            title: episode.title || 'Unknown Episode',
            artist: episode.feedTitle || 'Unknown Podcast',
            artwork: episode.image || episode.feedImage || 'https://via.placeholder.com/300',
            url: episode.enclosureUrl,
            duration: episode.duration || 0,
            type: 'podcast',
            isPodcast: true,
        };

        console.log('🎙️ Playing podcast episode:', track.title);

        try {
            await PlayOneSong(track);
            setIndex(1);
        } catch (error) {
            console.error('Error playing podcast episode:', error);
        }
    }, [setIndex]);

    // Clear search
    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setIsSearching(false);
        setSearchResults([]);
        setSearchPage(0);
        setHasMoreSearch(true);
    }, []);

    // Render footer with loading indicator
    const renderFooter = useCallback(() => {
        const loading = isSearching ? loadingMoreSearch : loadingMoreTrending;
        const hasMore = isSearching ? hasMoreSearch : hasMoreTrending;

        if (!hasMore || !loading) return <View style={{ height: 40 }} />;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    }, [isSearching, loadingMoreSearch, loadingMoreTrending, hasMoreSearch, hasMoreTrending, theme.colors.primary]);

    // Get data for FlatList - Pre-calculate for performance
    const listData = (() => {
        const sourceData = isSearching ? searchResults : trendingPodcasts.slice(10);
        const pairs = [];
        for (let i = 0; i < sourceData.length; i += 2) {
            pairs.push({
                id: `${isSearching ? 's' : 't'}-${sourceData[i].id || i}`,
                left: sourceData[i],
                right: sourceData[i + 1] || null,
            });
        }
        return pairs;
    })();

    // Render row with 2 cards
    const renderRow = useCallback(({ item }) => (
        <View style={{
            flexDirection: 'row',
            paddingHorizontal: 12,
            marginBottom: 12,
            gap: 12,
        }}>
            <PodcastCard
                podcast={item.left}
                width={(SCREEN_WIDTH - 48) / 2}
                noMargin={true}
            />
            {item.right && (
                <PodcastCard
                    podcast={item.right}
                    width={(SCREEN_WIDTH - 48) / 2}
                    noMargin={true}
                />
            )}
        </View>
    ), []);

    // Handle end reached
    const handleEndReached = () => {
        if (isSearching) {
            loadMoreSearch();
        } else {
            loadMoreTrending();
        }
    };

    return (
        <MainWrapper>
            <FlatList
                data={listData}
                keyExtractor={(item) => item.id}
                renderItem={renderRow}
                ListHeaderComponent={
                    <ListHeader
                        isSearching={isSearching}
                        dark={dark}
                        navigation={navigation}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        handleSearch={handleSearch}
                        clearSearch={clearSearch}
                        theme={theme}
                        recentEpisodes={recentEpisodes}
                        loading={initialLoading}
                        handlePlayEpisode={handlePlayEpisode}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        handleCategorySelect={handleCategorySelect}
                        trendingPodcasts={trendingPodcasts}
                    />
                }
                ListFooterComponent={renderFooter}
                ListEmptyComponent={() => (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        {initialLoading ? (
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                        ) : (
                            <Text style={{ color: dark ? '#888' : '#666' }}>
                                {isSearching
                                    ? loadingSearch
                                        ? 'Searching...'
                                        : `No podcasts found for "${searchQuery}"`
                                    : 'No podcasts available'
                                }
                            </Text>
                        )}
                    </View>
                )}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
            />
        </MainWrapper>
    );
};

export default PodcastScreen;
