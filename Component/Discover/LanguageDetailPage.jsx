import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { getHomePageData } from '../../Api/HomePage';
import { MainWrapper } from '../../Layout/MainWrapper';
import { LoadingComponent } from '../Global/Loading';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  FlatList,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  View,
  Pressable,
  RefreshControl,
} from 'react-native';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import { Heading } from '../Global/Heading';
import { EachPlaylistCard } from '../Global/EachPlaylistCard';
import { HorizontalScrollSongs } from '../Global/HorizontalScrollSongs';
import { EachAlbumCard } from '../Global/EachAlbumCard';
import { RenderTopCharts } from '../Home/RenderTopCharts';
import { Spacer } from '../Global/Spacer';
import { useNavigation } from '@react-navigation/native';
import { PlainText } from '../Global/PlainText';
import { CommonActions } from '@react-navigation/native';
import { deduplicateAlbums } from '../../Utils/AlbumUtils';
import { CacheManager } from '../../Utils/NavigationCacheManager';
import {
  CACHE_TTL,
  CACHE_KEYS,
  generateCacheKey,
} from '../../Utils/CacheConfig';

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) {
    return '';
  }
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const LanguageDetailPage = ({ route }) => {
  const [Loading, setLoading] = useState(false);
  const [Data, setData] = useState({});
  const [fetchError, setFetchError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { language = 'hindi' } = route?.params || {};
  const navigation = useNavigation();
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // CACHE-FIRST LOADING
  const fetchHomePageData = useCallback(
    async (forceRefresh = false) => {
      if (!isMounted.current) {
        return;
      }

      const cacheKey = generateCacheKey(CACHE_KEYS.LANGUAGE, language);

      try {
        // Check cache first - HYBRID: RAM -> Disk
        if (!forceRefresh) {
          const cached = await CacheManager.getAsync(cacheKey);
          if (cached) {
            setData(cached);
            setLoading(false);
            return;
          }
        }

        if (isInitialLoad.current) {
          setLoading(true);
        }
        const data = await getHomePageData(language || 'hindi');

        if (!isMounted.current) {
          return;
        }

        if (data?.data) {
          setData(data);
          CacheManager.set(cacheKey, data, CACHE_TTL.LANGUAGE_DATA);
          setFetchError(null);
        } else {
          setFetchError('Failed to load music data');
        }
      } catch (e) {
        setFetchError(e.message || 'An error occurred while loading data');
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
          isInitialLoad.current = false;
        }
      }
    },
    [language]
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    CacheManager.invalidate(generateCacheKey(CACHE_KEYS.LANGUAGE, language));
    fetchHomePageData(true);
  }, [language, fetchHomePageData]);

  // Initial load only (NO useFocusEffect)
  useEffect(() => {
    fetchHomePageData(false);
    return () => {
      isMounted.current = false;
    };
  }, [fetchHomePageData]);

  // Add back handler for hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      // Use CommonActions to reset the navigation state completely
      try {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: 'MainRoute',
                state: {
                  routes: [
                    {
                      name: 'Discover',
                      state: {
                        routes: [{ name: 'DiscoverPage' }],
                        index: 0,
                      },
                    },
                  ],
                  index: 0,
                },
              },
            ],
          })
        );
      } catch (error) {
        console.error('Error in navigation reset:', error);
        // Fallback to simpler navigation
        navigation.reset({
          index: 0,
          routes: [{ name: 'DiscoverPage' }],
        });
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      backHandler.remove();
    };
  }, [navigation]);

  function capitalizeFirstLetter(string) {
    if (!string) {
      return '';
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Get unique, deduplicated albums
  const uniqueAlbums = useMemo(() => {
    if (!Data?.data?.trending?.albums) {
      return [];
    }
    return deduplicateAlbums(Data.data.trending.albums);
  }, [Data?.data?.trending?.albums]);

  return (
    <MainWrapper>
      {Loading && (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#1DB954" />
          <PlainText
            text={`Loading ${capitalizeFirstLetter(language)} music...`}
            style={{ marginTop: 10 }}
          />
        </View>
      )}

      {fetchError && !Loading && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            height: 300,
            paddingHorizontal: 20,
          }}
        >
          <PlainText
            text={fetchError}
            style={{ marginBottom: 10, textAlign: 'center' }}
          />
          <Pressable
            onPress={fetchHomePageData}
            style={{
              padding: 10,
              backgroundColor: '#1DB954',
              borderRadius: 5,
              marginTop: 10,
            }}
          >
            <PlainText text="Retry" style={{ color: 'white' }} />
          </Pressable>
        </View>
      )}

      {!Loading && !fetchError && (
        <Animated.View entering={FadeInDown.delay(200)}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 90,
            }}
          >
            <Spacer />
            <PaddingConatiner>
              <Heading
                nospace={true}
                text={capitalizeFirstLetter(language || 'music')}
              />
              <Heading text={'Recommended'} />
            </PaddingConatiner>

            {/* Safe render for playlists */}
            {Data?.data?.playlists && Data.data.playlists.length > 0 ? (
              <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 15,
                  paddingRight: 10,
                  gap: 15,
                }}
                data={Data.data.playlists}
                renderItem={(item, i) => (
                  <EachPlaylistCard
                    name={truncateText(item.item.title, 30)}
                    follower={truncateText(item.item.subtitle, 30)}
                    key={item.index}
                    image={item.item.image[2].link}
                    id={item.item.id}
                    source="LanguageDetail"
                    language={language}
                  />
                )}
              />
            ) : (
              <View
                style={{
                  height: 220,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <PlainText
                  text="No playlists available"
                  style={{ textAlign: 'center' }}
                />
              </View>
            )}

            <PaddingConatiner>
              {Data?.data?.charts?.[4]?.id && (
                <HorizontalScrollSongs id={Data.data.charts[4].id} />
              )}
              <Heading text={'Trending Albums'} />
            </PaddingConatiner>

            {/* Safe render for albums */}
            {Data?.data?.trending?.albums &&
            Data.data.trending.albums.length > 0 ? (
              <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 15,
                  paddingRight: 10,
                  gap: 15,
                }}
                data={deduplicateAlbums(Data.data.trending.albums)}
                renderItem={(item) => (
                  <EachAlbumCard
                    image={item.item.image[2].link}
                    artists={truncateText(item.item.artists, 30)}
                    key={item.index}
                    name={truncateText(item.item.name, 30)}
                    id={item.item.id}
                    source="LanguageDetail"
                    language={language}
                  />
                )}
              />
            ) : (
              <View
                style={{
                  height: 220,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <PlainText
                  text="No trending albums available"
                  style={{ textAlign: 'center' }}
                />
              </View>
            )}

            <PaddingConatiner>
              {Data?.data?.charts?.[1]?.id && (
                <HorizontalScrollSongs id={Data.data.charts[1].id} />
              )}
            </PaddingConatiner>

            <PaddingConatiner>
              <Heading text={'Top Charts'} />
            </PaddingConatiner>

            {/* Safe render for charts */}
            {Data?.data?.charts?.filter((e) => e.type === 'playlist')?.length >
            0 ? (
              <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 13,
                }}
                data={[1]}
                renderItem={() => (
                  <RenderTopCharts
                    playlist={
                      Data.data.charts.filter((e) => e.type === 'playlist') ||
                      []
                    }
                  />
                )}
              />
            ) : (
              <View
                style={{
                  height: 150,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <PlainText text="No charts available" />
              </View>
            )}

            <PaddingConatiner>
              {Data?.data?.charts?.[3]?.id && (
                <HorizontalScrollSongs id={Data.data.charts[3].id} />
              )}
            </PaddingConatiner>

            <PaddingConatiner>
              {Data?.data?.charts?.[2]?.id && (
                <HorizontalScrollSongs id={Data.data.charts[2].id} />
              )}
            </PaddingConatiner>
          </ScrollView>
        </Animated.View>
      )}
    </MainWrapper>
  );
};
