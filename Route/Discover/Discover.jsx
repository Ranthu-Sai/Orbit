import { MainWrapper } from '../../Layout/MainWrapper';
import { DiscoverCard } from '../../Component/Discover/DiscoverCard';
import { AlbumCard } from '../../Component/Discover/AlbumCard';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Spacer } from '../../Component/Global/Spacer';
import { Heading } from '../../Component/Global/Heading';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import { BundleEachLanguage } from '../../Component/Discover/BundleEachLanguage';
import { BundleEachMomentanGenres } from '../../Component/Discover/BundleEachMomentanGenres';
import { RouteHeading } from '../../Component/Home/RouteHeading';
import React, { useEffect, useState } from 'react';
import { useNavigation, useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingUp,
  BarChart3,
  Music,
  Headphones,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import { getYTMusicNewReleases, getYTMusicCharts } from '../../Api/YTMusic';
import {
  DiscoverSkeletonLoader,
  AlbumRowSkeleton,
  ArtistRowSkeleton,
} from '../../Component/Discover/DiscoverSkeletonLoader';

export const Discover = () => {
  const width = Dimensions.get('window').width;
  const navigation = useNavigation();
  const theme = useTheme();
  const { dark } = theme;

  // State for new releases
  const [newReleases, setNewReleases] = useState([]);
  const [loadingReleases, setLoadingReleases] = useState(true);

  // State for charts & artists
  const [charts, setCharts] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch new releases with caching
  useEffect(() => {
    const CACHE_KEY = '@discover_new_releases';
    const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

    const fetchNewReleases = async () => {
      try {
        // Try to load from cache first
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const now = Date.now();

          // Use cached data if not expired
          if (now - timestamp < CACHE_EXPIRY) {
            setNewReleases(data);
            setLoadingReleases(false);
            return;
          }
        }

        // Fetch fresh data
        setLoadingReleases(true);
        const response = await getYTMusicNewReleases(50);
        if (response.success && response.data) {
          setNewReleases(response.data);

          // Save to cache
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              data: response.data,
              timestamp: Date.now(),
            })
          );
        }
      } catch (error) {
        console.error('Error fetching new releases:', error);
      } finally {
        setLoadingReleases(false);
      }
    };

    fetchNewReleases();
  }, []);

  // Fetch Charts
  useEffect(() => {
    const fetchCharts = async () => {
      try {
        setLoadingCharts(true);
        const response = await getYTMusicCharts();

        if (response.success && response.data) {
          setCharts(response.data.charts || []);
          setArtists(response.data.artists || []);
        } else {
        }
      } catch (error) {
        console.error('Error fetching charts:', error);
      } finally {
        setLoadingCharts(false);
      }
    };

    fetchCharts();
  }, []);

  // Clear any nested navigation params when Discover screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Get the current navigation state
      const state = navigation.getState();

      // Check if we're in a nested stack with params that might cause issues
      if (state.routes && state.routes.length > 0) {
        const currentRoute = state.routes[state.index];

        // If the current route has params that would redirect to Playlist, clear them
        if (
          currentRoute.params &&
          (currentRoute.params.screen === 'Playlist' ||
            (currentRoute.params.params &&
              currentRoute.params.params.screen === 'Playlist'))
        ) {
          // Reset the navigation state to just the Discover screen
          navigation.setParams(null);
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear caches
      await AsyncStorage.removeItem('@discover_new_releases');

      // Refetch data
      setLoadingReleases(true);
      setLoadingCharts(true);

      // Pass true to force refresh charts
      const [releasesResponse, chartsResponse] = await Promise.all([
        getYTMusicNewReleases(50, true), // Force refresh with limit 50 (same as initial load)
        getYTMusicCharts(true), // Force refresh for charts
      ]);

      // Update New Releases
      if (releasesResponse.success && releasesResponse.data) {
        setNewReleases(releasesResponse.data);
        // Re-save to cache
        await AsyncStorage.setItem(
          '@discover_new_releases',
          JSON.stringify({
            data: releasesResponse.data,
            timestamp: Date.now(),
          })
        );
      }

      // Update Charts & Artists
      if (chartsResponse.success && chartsResponse.data) {
        setCharts(chartsResponse.data.charts || []);
        setArtists(chartsResponse.data.artists || []);
      }
    } catch (error) {
      console.error('Error refreshing discover page:', error);
    } finally {
      setLoadingReleases(false);
      setLoadingCharts(false);
      setRefreshing(false);
    }
  };

  // Show skeleton during initial load (both releases and charts loading)
  const isInitialLoading = loadingReleases && loadingCharts;

  if (isInitialLoading) {
    return (
      <MainWrapper>
        <DiscoverSkeletonLoader />
      </MainWrapper>
    );
  }

  return (
    <MainWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 170 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        <RouteHeading bottomText={'Discover music'} showSearch={true} />
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 12,
          }}
        >
          <DiscoverCard
            text={'Trending Now'}
            icon={TrendingUp}
            width={width * 0.46}
            navigate={'trending'}
          />
          <DiscoverCard
            text={'Most Searched'}
            icon={BarChart3}
            width={width * 0.46}
            navigate={'most searched'}
          />
        </View>
        <Spacer />
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 12,
          }}
        >
          <DiscoverCard
            text={'Pop Hits'}
            icon={Music}
            width={width * 0.46}
            navigate={'pop'}
          />
          <DiscoverCard
            text={'Lofi Beats'}
            icon={Headphones}
            width={width * 0.46}
            navigate={'lofi'}
          />
        </View>
        <Spacer />
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            paddingHorizontal: 12,
          }}
        >
          <DiscoverCard
            text={'Podcasts'}
            icon={Mic}
            width={width * 0.46}
            navigate={'podcasts'}
          />
          <DiscoverCard
            text={'New Release'}
            icon={Sparkles}
            width={width * 0.46}
            navigate={'new release'}
          />
        </View>

        {/* New Releases Section */}
        <Spacer />
        <PaddingConatiner>
          <Heading text={'New Albums & Singles'} />
          {loadingReleases ? (
            <AlbumRowSkeleton count={4} />
          ) : newReleases.length > 0 ? (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {newReleases.map((album, index) => (
                <AlbumCard key={index} album={album} width={140} />
              ))}
            </ScrollView>
          ) : (
            <Text
              style={{
                color: dark ? '#999' : '#666',
                fontSize: 13,
                paddingVertical: 8,
              }}
            >
              No new releases available
            </Text>
          )}
        </PaddingConatiner>

        {/* Charts Section */}
        <Spacer />
        <PaddingConatiner>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Heading text={'Top Charts'} nospace={true} />
          </View>

          {loadingCharts ? (
            <AlbumRowSkeleton count={4} />
          ) : charts.length > 0 ? (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {charts.map((chart, index) => (
                <AlbumCard key={index} album={chart} width={140} />
              ))}
            </ScrollView>
          ) : (
            <Text
              style={{
                color: dark ? '#999' : '#666',
                fontSize: 13,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              No charts available
            </Text>
          )}
        </PaddingConatiner>
        <PaddingConatiner>
          <Heading text={'Languages'} />
          <ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal={true}
            contentContainerStyle={{ gap: 10 }}
          >
            <BundleEachLanguage languages={['English', 'Hindi']} />
            <BundleEachLanguage languages={['Punjabi', 'Tamil']} />
            <BundleEachLanguage languages={['Telugu', 'Marathi']} />
            <BundleEachLanguage languages={['Gujarati', 'Bengali']} />
            <BundleEachLanguage languages={['Kannada', 'Bhojpuri']} />
            <BundleEachLanguage languages={['Malayalam', 'Urdu']} />
            <BundleEachLanguage languages={['Odia', 'Assamese']} />
          </ScrollView>

          {/* Top Artists Section */}
          {artists.length > 0 && (
            <>
              <Heading text={'Top Artists'} />
              {loadingCharts ? (
                <ArtistRowSkeleton count={4} />
              ) : (
                <ScrollView
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                >
                  {artists.map((artist, index) => (
                    <AlbumCard
                      key={index}
                      album={artist}
                      width={140}
                      isArtist={true}
                      onPress={() =>
                        navigation.navigate('ArtistPage', {
                          artistId: artist.id || artist.browseId,
                          artistName: artist.name || artist.title,
                          source: 'ytmusic',
                        })
                      }
                    />
                  ))}
                </ScrollView>
              )}
            </>
          )}

          <Heading text={'Moments'} />
          <ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal={true}
            contentContainerStyle={{ gap: 10 }}
          >
            <BundleEachMomentanGenres
              list={['Workout', 'Focus']}
              color={['rgb(220,123,123)', 'rgb(137,87,65)']}
            />
            <BundleEachMomentanGenres
              list={['Chill', 'Party']}
              color={['rgb(78,159,188)', 'rgb(233,125,241)']}
            />
            <BundleEachMomentanGenres
              list={['Long Drive', 'Sleep']}
              color={['rgb(208,186,99)', 'rgb(88,140,208)']}
            />
            <BundleEachMomentanGenres
              list={['Late Night', 'Study']}
              color={['rgb(143,172,99)', 'rgb(145,94,186)']}
            />
          </ScrollView>
          <Heading text={'Genres'} />
          <ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal={true}
            contentContainerStyle={{ gap: 10 }}
          >
            <BundleEachMomentanGenres
              list={['Hip Hop', 'Jazz']}
              color={['rgb(227,148,124)', 'rgb(110,236,192)']}
            />
            <BundleEachMomentanGenres
              list={['Retro', 'Classical']}
              color={['rgb(123,234,132)', 'rgb(246,208,82)']}
            />
            <BundleEachMomentanGenres
              list={['K-Pop', 'Lofi']}
              color={['rgb(178,109,234)', 'rgb(109,145,223)']}
            />
            <BundleEachMomentanGenres
              list={['Romance', 'Sad']}
              color={['rgb(236,144,199)', 'rgb(199,229,148)']}
            />
          </ScrollView>
        </PaddingConatiner>
      </ScrollView>
    </MainWrapper>
  );
};
