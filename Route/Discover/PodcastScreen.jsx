import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    TextInput,
    Pressable,
    Text,
    Dimensions,
} from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Search, ArrowLeft } from 'lucide-react-native';
import { MainWrapper } from '../../Layout/MainWrapper';
import { RouteHeading } from '../../Component/Home/RouteHeading';
import { PodcastCard } from '../../Component/Podcast/PodcastCard';
import { EpisodeCardHorizontal } from '../../Component/Podcast/EpisodeCard';
import { PodcastHorizontalSlider } from '../../Component/Podcast/PodcastHorizontalSlider';
import { CategoryChipList } from '../../Component/Podcast/CategoryChip';
import { Heading } from '../../Component/Global/Heading';
import { Spacer } from '../../Component/Global/Spacer';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import {
    getTrendingPodcasts,
    getRecentEpisodes,
    searchPodcasts,
    getCategories,
} from '../../Api/PodcastIndexAPI';
import { PlayOneSong, AddPlaylist } from '../../MusicPlayerFunctions';
import Context from '../../Context/Context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PodcastScreen = () => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { dark } = theme;

    // State
    const [trendingPodcasts, setTrendingPodcasts] = useState([]);
    const [recentEpisodes, setRecentEpisodes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Loading states
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [loadingEpisodes, setLoadingEpisodes] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch initial data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch trending podcasts
            setLoadingTrending(true);
            const trendingResponse = await getTrendingPodcasts(20);
            if (trendingResponse.success) {
                setTrendingPodcasts(trendingResponse.data);
            }
            setLoadingTrending(false);

            // Fetch recent episodes
            setLoadingEpisodes(true);
            const episodesResponse = await getRecentEpisodes(15);
            if (episodesResponse.success) {
                setRecentEpisodes(episodesResponse.data);
            }
            setLoadingEpisodes(false);

            // Fetch categories
            const categoriesResponse = await getCategories();
            if (categoriesResponse.success) {
                setCategories(categoriesResponse.data.slice(0, 10)); // Limit to 10
            }
        } catch (error) {
            console.error('Error fetching podcast data:', error);
            setLoadingTrending(false);
            setLoadingEpisodes(false);
        }
    };

    // Refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // Search handler
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setLoadingSearch(true);

        try {
            const response = await searchPodcasts(searchQuery.trim(), 20);
            if (response.success) {
                setSearchResults(response.data);
            }
        } catch (error) {
            console.error('Search error:', error);
        }

        setLoadingSearch(false);
    };

    // Category filter handler
    const handleCategorySelect = async (category) => {
        setSelectedCategory(category);

        if (category.id === null) {
            // "All" selected - show default trending
            setLoadingTrending(true);
            const response = await getTrendingPodcasts(20);
            if (response.success) {
                setTrendingPodcasts(response.data);
            }
            setLoadingTrending(false);
        } else {
            // Filter by category
            setLoadingTrending(true);
            const response = await getTrendingPodcasts(20, null, category.name);
            if (response.success) {
                setTrendingPodcasts(response.data);
            }
            setLoadingTrending(false);
        }
    };

    // Get context for player UI
    const { setIndex } = useContext(Context);

    // Play episode handler
    const handlePlayEpisode = async (episode) => {
        // Transform episode to track format for the player
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
            // Use existing PlayOneSong function to play the episode
            await PlayOneSong(track);
            // Open the music player UI (Index 1 = full screen player)
            setIndex(1);
        } catch (error) {
            console.error('Error playing podcast episode:', error);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
        setSearchResults([]);
    };

    return (
        <MainWrapper>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                    />
                }
            >
                {/* Header */}
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
                        Podcasts
                    </Text>
                </View>

                {/* Search Bar */}
                <View style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                }}>
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
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={clearSearch}>
                                <Text style={{ color: theme.colors.primary, fontSize: 13 }}>Clear</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Show search results if searching */}
                {isSearching ? (
                    <PaddingConatiner>
                        <Heading text="Search Results" />
                        {loadingSearch ? (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <Text style={{ color: dark ? '#888' : '#666' }}>Searching...</Text>
                            </View>
                        ) : searchResults.length > 0 ? (
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 12,
                            }}>
                                {searchResults.map((podcast, index) => (
                                    <PodcastCard
                                        key={podcast.id || index}
                                        podcast={podcast}
                                        width={(SCREEN_WIDTH - 48) / 2}
                                        noMargin={true}
                                    />
                                ))}
                            </View>
                        ) : (
                            <Text style={{
                                color: dark ? '#888' : '#666',
                                textAlign: 'center',
                                paddingVertical: 30,
                            }}>
                                No podcasts found for "{searchQuery}"
                            </Text>
                        )}
                    </PaddingConatiner>
                ) : (
                    <>
                        {/* New Episodes - Horizontal Slider */}
                        <PodcastHorizontalSlider
                            title="New Episodes"
                            data={recentEpisodes}
                            loading={loadingEpisodes}
                            emptyText="No new episodes"
                            renderItem={(episode) => (
                                <EpisodeCardHorizontal
                                    episode={episode}
                                    width={280}
                                    onPlay={handlePlayEpisode}
                                />
                            )}
                        />

                        {/* Categories */}
                        <PaddingConatiner>
                            <Heading text="Categories" nospace={true} />
                        </PaddingConatiner>
                        <CategoryChipList
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelectCategory={handleCategorySelect}
                        />

                        {/* Trending Podcasts - Horizontal Slider */}
                        <PodcastHorizontalSlider
                            title="Trending Podcasts"
                            data={trendingPodcasts.slice(0, 10)}
                            loading={loadingTrending}
                            emptyText="No trending podcasts"
                            renderItem={(podcast) => (
                                <PodcastCard podcast={podcast} width={140} />
                            )}
                        />

                        {/* Popular Podcasts - Grid */}
                        <PaddingConatiner>
                            <Heading text="Popular Podcasts" />
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 12,
                            }}>
                                {trendingPodcasts.slice(10, 20).map((podcast, index) => (
                                    <PodcastCard
                                        key={podcast.id || index}
                                        podcast={podcast}
                                        width={(SCREEN_WIDTH - 48) / 2}
                                        noMargin={true}
                                    />
                                ))}
                            </View>
                        </PaddingConatiner>
                    </>
                )}
            </ScrollView>
        </MainWrapper>
    );
};

export default PodcastScreen;
