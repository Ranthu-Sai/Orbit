import React, { useEffect, useState, useContext } from 'react';
import {
    View,
    ScrollView,
    Text,
    Image,
    Pressable,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { ArrowLeft, Play, Shuffle, Share2 } from 'lucide-react-native';
import { EpisodeCard } from '../../Component/Podcast/EpisodeCard';
import { Spacer } from '../../Component/Global/Spacer';
import {
    getPodcastByFeedId,
    getEpisodesByFeedId,
} from '../../Api/PodcastIndexAPI';
import LinearGradient from 'react-native-linear-gradient';
import { PlayOneSong, AddPlaylist } from '../../MusicPlayerFunctions';
import Context from '../../Context/Context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PodcastDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const theme = useTheme();
    const { dark } = theme;

    const { feedId, podcast: initialPodcast } = route.params || {};

    // State
    const [podcast, setPodcast] = useState(initialPodcast || null);
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingEpisodes, setLoadingEpisodes] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);

    useEffect(() => {
        fetchPodcastDetails();
    }, [feedId]);

    const fetchPodcastDetails = async () => {
        try {
            setLoading(true);

            // Fetch podcast details if not already provided
            if (!podcast && feedId) {
                const podcastResponse = await getPodcastByFeedId(feedId);
                if (podcastResponse.success) {
                    setPodcast(podcastResponse.data);
                }
            }
            setLoading(false);

            // Fetch episodes
            setLoadingEpisodes(true);
            const episodesResponse = await getEpisodesByFeedId(feedId, 50);
            if (episodesResponse.success) {
                setEpisodes(episodesResponse.data);
            }
            setLoadingEpisodes(false);
        } catch (error) {
            console.error('Error fetching podcast details:', error);
            setLoading(false);
            setLoadingEpisodes(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPodcastDetails();
        setRefreshing(false);
    };

    // Get context for player UI
    const { setIndex } = useContext(Context);

    // Helper to transform episode to track format
    const episodeToTrack = (episode) => ({
        id: String(episode.id || episode.guid),
        title: episode.title || 'Unknown Episode',
        artist: podcast?.title || episode.feedTitle || 'Unknown Podcast',
        artwork: episode.image || episode.feedImage || podcast?.artwork || 'https://via.placeholder.com/300',
        url: episode.enclosureUrl,
        duration: episode.duration || 0,
        type: 'podcast',
        isPodcast: true,
    });

    // Play episode handler
    const handlePlayEpisode = async (episode) => {
        // Find the index of the clicked episode
        const episodeIndex = episodes.findIndex(ep => ep.id === episode.id || ep.guid === episode.guid);

        if (episodeIndex === -1) {
            console.error('Episode not found in list');
            return;
        }

        console.log('🎙️ Playing podcast episode:', episode.title);
        console.log('📋 Adding', episodes.length - episodeIndex, 'episodes to queue');

        try {
            // Transform episodes starting from the clicked one
            const tracksFromEpisode = episodes.slice(episodeIndex).map(episodeToTrack);

            // Use AddPlaylist to add all episodes from this point onwards
            await AddPlaylist(tracksFromEpisode);
            setIndex(1);
        } catch (error) {
            console.error('Error playing podcast episode:', error);
        }
    };

    // Play all episodes (start from first, add all to queue)
    const handlePlayAll = async () => {
        if (episodes.length > 0) {
            console.log('🎙️ Playing all episodes, total:', episodes.length);

            try {
                // Transform all episodes to tracks
                const tracks = episodes.map(episodeToTrack);

                // Use AddPlaylist to add all episodes to queue and play
                await AddPlaylist(tracks);
                setIndex(1);
            } catch (error) {
                console.error('Error playing all episodes:', error);
                // Fallback to playing just the first episode
                handlePlayEpisode(episodes[0]);
            }
        }
    };

    // Shuffle play - play a random episode
    const handleShufflePlay = async () => {
        if (episodes.length > 0) {
            // Shuffle the episodes array
            const shuffledEpisodes = [...episodes].sort(() => Math.random() - 0.5);
            console.log('🎙️ Shuffle playing episodes');

            try {
                // Transform all shuffled episodes to tracks
                const tracks = shuffledEpisodes.map(episodeToTrack);

                // Use AddPlaylist to add all shuffled episodes to queue and play
                await AddPlaylist(tracks);
                setIndex(1);
            } catch (error) {
                console.error('Error shuffle playing episodes:', error);
            }
        }
    };

    // Get safe area insets for notch area handling
    const insets = useSafeAreaInsets();

    if (loading && !podcast) {
        return (
            <View style={{ flex: 1, backgroundColor: dark ? '#121212' : '#FFFFFF' }}>
                <StatusBar translucent backgroundColor="transparent" barStyle={dark ? "light-content" : "dark-content"} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: dark ? '#121212' : '#FFFFFF' }}>
            <StatusBar translucent backgroundColor="transparent" barStyle={dark ? "light-content" : "dark-content"} />
            <FlatList
                data={episodes}
                keyExtractor={(item) => item.id?.toString() || item.guid}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 160 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.colors.primary]}
                    />
                }
                ListHeaderComponent={() => (
                    <>
                        {/* Header with artwork and gradient */}
                        <View style={{ height: 320 }}>
                            {/* Background artwork */}
                            <Image
                                source={{ uri: podcast?.artwork || podcast?.image }}
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                }}
                                blurRadius={20}
                            />

                            {/* Gradient overlay */}
                            <LinearGradient
                                colors={['transparent', dark ? '#121212' : '#FFFFFF']}
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                }}
                            />

                            {/* Back button */}
                            <Pressable
                                onPress={() => navigation.goBack()}
                                style={({ pressed }) => ({
                                    position: 'absolute',
                                    top: insets.top + 8,
                                    left: 12,
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: pressed ? 0.6 : 1,
                                })}
                            >
                                <ArrowLeft size={22} color="#FFFFFF" />
                            </Pressable>

                            {/* Podcast artwork */}
                            <View style={{
                                alignItems: 'center',
                                marginTop: insets.top + 40,
                            }}>
                                <View style={{
                                    width: 180,
                                    height: 180,
                                    borderRadius: 16,
                                    overflow: 'hidden',
                                    elevation: 8,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                }}>
                                    <Image
                                        source={{ uri: podcast?.artwork || podcast?.image }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Podcast Info */}
                        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
                            {/* Title */}
                            <Text style={{
                                fontSize: 24,
                                fontWeight: '700',
                                color: dark ? '#FFFFFF' : '#000000',
                                textAlign: 'center',
                            }}>
                                {podcast?.title}
                            </Text>

                            {/* Author */}
                            <Text style={{
                                fontSize: 14,
                                color: dark ? '#B3B3B3' : '#666666',
                                textAlign: 'center',
                                marginTop: 6,
                            }}>
                                {podcast?.author}
                            </Text>

                            {/* Description */}
                            {podcast?.description && (
                                <Pressable onPress={() => setShowFullDescription(!showFullDescription)}>
                                    <Text
                                        numberOfLines={showFullDescription ? undefined : 3}
                                        style={{
                                            fontSize: 13,
                                            color: dark ? '#999999' : '#777777',
                                            marginTop: 12,
                                            lineHeight: 20,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {podcast.description.replace(/<[^>]*>/g, '')}
                                    </Text>
                                    {podcast.description.length > 150 && (
                                        <Text style={{
                                            color: theme.colors.primary,
                                            fontSize: 12,
                                            textAlign: 'center',
                                            marginTop: 4,
                                        }}>
                                            {showFullDescription ? 'Show less' : 'Show more'}
                                        </Text>
                                    )}
                                </Pressable>
                            )}

                            {/* Action Buttons */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginTop: 20,
                                gap: 12,
                            }}>
                                {/* Play Button */}
                                <Pressable
                                    onPress={handlePlayAll}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: theme.colors.primary || '#1DB954',
                                        paddingHorizontal: 28,
                                        paddingVertical: 12,
                                        borderRadius: 24,
                                        opacity: pressed ? 0.8 : 1,
                                    })}
                                >
                                    <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                                    <Text style={{
                                        color: '#FFFFFF',
                                        fontWeight: '600',
                                        marginLeft: 8,
                                        fontSize: 15,
                                    }}>
                                        Play
                                    </Text>
                                </Pressable>

                                {/* Shuffle Button */}
                                <Pressable
                                    onPress={handleShufflePlay}
                                    style={({ pressed }) => ({
                                        width: 44,
                                        height: 44,
                                        borderRadius: 22,
                                        backgroundColor: dark ? '#2E2E2E' : '#E8E8E8',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: pressed ? 0.8 : 1,
                                    })}
                                >
                                    <Shuffle size={20} color={dark ? '#FFFFFF' : '#333333'} />
                                </Pressable>
                            </View>

                            {/* Episodes count */}
                            <View style={{
                                marginTop: 24,
                                marginBottom: 8,
                            }}>
                                <Text style={{
                                    fontSize: 18,
                                    fontWeight: '700',
                                    color: dark ? '#FFFFFF' : '#000000',
                                }}>
                                    Episodes ({episodes.length})
                                </Text>
                            </View>
                        </View>

                        {/* Loading episodes */}
                        {loadingEpisodes && (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            </View>
                        )}
                    </>
                )}
                renderItem={({ item }) => (
                    <EpisodeCard
                        episode={item}
                        onPlay={handlePlayEpisode}
                    />
                )}
                ListEmptyComponent={() => (
                    !loadingEpisodes && (
                        <Text style={{
                            color: dark ? '#888' : '#666',
                            textAlign: 'center',
                            paddingVertical: 30,
                        }}>
                            No episodes available
                        </Text>
                    )
                )}
            />
        </View>
    );
};

export default PodcastDetailScreen;
