import { MainWrapper } from "../../Layout/MainWrapper";
import { FlatList, ScrollView, View, Text, RefreshControl, Dimensions } from "react-native";
import { Heading } from "../../Component/Global/Heading";
import { HorizontalScrollSongs } from "../../Component/Global/HorizontalScrollSongs";
import { RouteHeading } from "../../Component/Home/RouteHeading";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { EachAlbumCard } from "../../Component/Global/EachAlbumCard";
import { RenderTopCharts } from "../../Component/Home/RenderTopCharts";
import { LoadingComponent } from "../../Component/Global/Loading";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getHomePageData } from "../../Api/HomePage";
import { getYTMusicHomeFeed } from "../../Api/YTMusic";
import { EachPlaylistCard } from "../../Component/Global/EachPlaylistCard";
import { GetLanguageValue } from "../../LocalStorage/Languages";
import { TopHeader } from "../../Component/Home/TopHeader";
import { DisplayTopGenres } from "../../Component/Home/DisplayTopGenres";
import NetInfo from '@react-native-community/netinfo';
import { YTMusicHomeSection } from '../../Component/Home/YTMusicHomeSection';
import { deduplicateAlbums } from '../../Utils/AlbumUtils';
import { CacheManager } from '../../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS, generateCacheKey } from '../../Utils/CacheConfig';

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

// Helper function to shuffle array
const shuffleArray = (array) => {
  if (!array || !Array.isArray(array)) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Helper function to get image URL from different data structures
const getImageUrl = (imageData) => {
  if (!imageData) return null;

  // Handle YTMusic data structure (array of objects with url/link)
  if (Array.isArray(imageData)) {
    // Try to get the best quality image (usually index 2 or highest quality)
    const bestImage = imageData.find(img => img.quality === "500x500") ||
      imageData[2] ||
      imageData[1] ||
      imageData[0];

    return bestImage?.link || bestImage?.url || null;
  }

  // Handle regular data structure (direct URL string)
  if (typeof imageData === 'string') {
    return imageData;
  }

  // Handle object with direct url property
  if (typeof imageData === 'object' && imageData.url) {
    return imageData.url;
  }

  return null;
};

export const Home = () => {
  const [showHeader, setShowHeader] = useState(false);
  const [Language, setLanguage] = useState('english');
  const [Loading, setLoading] = useState(false); // Default to false - show cached data immediately
  const [homeData, setHomeData] = useState({});
  const [homefeedData, setHomefeedData] = useState({ playlists: [], albums: [] });
  const [isConnected, setIsConnected] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { width, height } = Dimensions.get('window');
  const [Data, setData] = useState({ data: { charts: [], playlists: [], trending: { albums: [] } } });
  const [chartIndices, setChartIndices] = useState([0, 1, 2, 3]); // Dynamic chart indices

  // Calculate 5% of screen height for scroll threshold
  const scrollThreshold = height * 0.05;

  // Track if initial load has happened
  const isInitialLoad = useRef(true);
  const isMounted = useRef(true);

  // Get random chart indices
  const randomizeCharts = useCallback((charts) => {
    if (!charts || charts.length === 0) return;

    // Create a shuffled array of indices
    const indices = Array.from({ length: charts.length }, (_, i) => i);
    setChartIndices(shuffleArray(indices).slice(0, 4)); // Take the first 4 shuffled indices

    console.log('Randomized chart indices:', chartIndices);
  }, []);

  // CACHE-FIRST LOADING: Check cache first, fetch only if needed
  async function fetchHomePageData(forceRefresh = false) {
    if (!isMounted.current) return;

    const cacheKey = generateCacheKey(CACHE_KEYS.HOME, 'main');
    const homefeedCacheKey = generateCacheKey(CACHE_KEYS.HOME, 'homefeed');

    try {
      // Step 1: SYNCHRONOUS RAM CHECK (Instant - prevents empty flash)
      // Check RAM immediately before any async operation
      if (!forceRefresh) {
        const ramData = CacheManager.get(cacheKey);
        const ramHomefeed = CacheManager.get(homefeedCacheKey);

        if (ramData) {
          console.log('[Home] RAM cache HIT - instant load');
          setData(ramData);
          // DON'T shuffle on cache hit - preserve original order
          if (ramHomefeed) {
            setHomefeedData(ramHomefeed);
          }
          setLoading(false);
          isInitialLoad.current = false;
          return; // EXIT - RAM hit
        }

        // Step 2: ASYNC DISK CHECK (50-100ms)
        // Only show loading if RAM missed and this is initial load
        if (isInitialLoad.current) {
          setLoading(true);
        }

        const diskData = await CacheManager.getAsync(cacheKey);
        const diskHomefeed = await CacheManager.getAsync(homefeedCacheKey);

        if (diskData) {
          console.log('[Home] Disk cache HIT - restored');
          setData(diskData);
          // DON'T shuffle on cache hit - preserve order
          if (diskHomefeed) {
            setHomefeedData(diskHomefeed);
          }
          setLoading(false);
          isInitialLoad.current = false;
          return; // EXIT - Disk hit
        }

        // Cache miss - continue to network fetch
        console.log('[Home] Cache MISS - fetching from network');
      }

      // Step 2: Check network
      const networkState = await NetInfo.fetch();
      setIsConnected(!networkState.isConnected);
      setOffline(!networkState.isConnected);

      if (networkState.isConnected) {
        // Step 3: Fetch fresh data
        const Languages = await GetLanguageValue();
        const [data, homefeedResult] = await Promise.allSettled([
          getHomePageData(Languages),
          getYTMusicHomeFeed(15)
        ]);

        if (!isMounted.current) return;

        if (data.status === 'fulfilled' && data.value) {
          setData(data.value);
          randomizeCharts(data.value?.data?.charts);
          // Cache the data with 15-minute TTL
          CacheManager.set(cacheKey, data.value, CACHE_TTL.HOME_DATA);
          console.log('[Home] Data cached with 15-minute TTL');
        }

        if (homefeedResult.status === 'fulfilled' && homefeedResult.value?.data) {
          const homefeed = homefeedResult.value.data || { playlists: [], albums: [] };
          setHomefeedData(homefeed);
          CacheManager.set(homefeedCacheKey, homefeed, CACHE_TTL.HOME_DATA);
          console.log('[Home] Homefeed cached');
        }
      }
    } catch (e) {
      console.log('[Home] Error fetching data:', e);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        isInitialLoad.current = false;
      }
    }
  }

  // Pull to refresh handler - ONLY way to force refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Invalidate cache before refresh
    CacheManager.invalidateByPrefix(CACHE_KEYS.HOME);
    fetchHomePageData(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initial load - only on mount, not on focus
  useEffect(() => {
    fetchHomePageData(false);
  }, []);

  // Combine playlists from both sources - NO SHUFFLE (preserve consistent order)
  const allPlaylists = useMemo(() => {
    const regularPlaylists = Data?.data?.playlists || [];
    const homefeedPlaylists = homefeedData?.playlists || [];
    // Combine without shuffle - consistent order on every render
    return [...regularPlaylists, ...homefeedPlaylists].slice(0, 20);
  }, [Data?.data?.playlists, homefeedData?.playlists]);

  // Combine albums from both sources and remove duplicates - NO SHUFFLE
  const allAlbums = useMemo(() => {
    const regularAlbums = Data?.data?.trending?.albums || [];
    const homefeedAlbums = homefeedData?.albums || [];
    const combined = [...regularAlbums, ...homefeedAlbums];
    // Apply deduplication (prioritizes Saavn over YTMusic) - NO shuffle
    const deduplicated = deduplicateAlbums(combined);
    return deduplicated.slice(0, 20);
  }, [Data?.data?.trending?.albums, homefeedData?.albums]);

  // Get a chart ID safely
  const getChartId = (index) => {
    if (!Data?.data?.charts || !chartIndices || chartIndices.length <= index) {
      return null;
    }
    return Data?.data?.charts[chartIndices[index]]?.id;
  };

  return (
    <MainWrapper>
      <LoadingComponent loading={Loading} />
      {
        !Loading && <View>
          <ScrollView
            style={{ zIndex: -1 }}
            onScroll={(e) => {
              if (e.nativeEvent.contentOffset.y > scrollThreshold && !showHeader) {
                setShowHeader(true)
              } else if (e.nativeEvent.contentOffset.y < scrollThreshold && showHeader) {
                setShowHeader(false)
              }
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1DB954']}
                tintColor={'#1DB954'}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 180, // Increased from 120 for more bottom margin
            }}
          >
            <RouteHeading showSearch={true} showSettings={true} />

            <DisplayTopGenres />
            <View style={{ paddingHorizontal: 13 }}>
              <HorizontalScrollSongs id={getChartId(0)} />
            </View>
            <View style={{ paddingHorizontal: 13 }}>
              <Heading text={"Recommended Playlists"} />
            </View>
            <FlatList
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: 10, // Reduced from 15
                paddingRight: 5, // Reduced from 10
                gap: 2, // Reduced from 20
              }}
              data={allPlaylists}
              keyExtractor={(item, index) => `playlist-${item.id}-${index}`}
              ListEmptyComponent={() => (
                <View style={{
                  width: width - 30,
                  height: 250,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: 'white', fontSize: 16 }}>No playlists available</Text>
                </View>
              )}
              renderItem={({ item, index }) => (
                <EachPlaylistCard
                  name={truncateText(item.title || item.name, 30)}
                  follower={truncateText(item.subtitle || item.artists, 30)}
                  key={index}
                  image={getImageUrl(item.image)}
                  id={item.id}
                  source="Home"
                  MainContainerStyle={{
                    marginHorizontal: 4, // Add horizontal margin
                  }}
                />
              )}
            />
            <View style={{ paddingHorizontal: 13 }}>
              <Heading text={"Trending Albums"} />
            </View>
            <FlatList
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: 10, // Reduced from 15
                paddingRight: 5, // Reduced from 10
                gap: 2, // Reduced from 20
              }}
              data={allAlbums}
              keyExtractor={(item, index) => `album-${item.id}-${index}`}
              ListEmptyComponent={() => (
                <View style={{
                  width: width - 30,
                  height: 220,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: 'white', fontSize: 16 }}>No albums available</Text>
                </View>
              )}
              renderItem={({ item, index }) => (
                <EachAlbumCard
                  image={getImageUrl(item.image)}
                  artists={truncateText(item.artists || item.artist, 30)}
                  key={index}
                  name={truncateText(item.name || item.title, 30)}
                  id={item.id}
                  source="Home"
                />
              )}
            />

            {/* YouTube Music Home Section */}
            <YTMusicHomeSection />

            <View style={{ paddingHorizontal: 13, marginTop: 8 }}>
              <HorizontalScrollSongs id={getChartId(1)} />
              {offline && (
                <View style={{
                  paddingHorizontal: 13,
                  marginTop: 8
                }}>
                  <Text style={{
                    color: '#666',
                    textAlign: 'center',
                    marginTop: 10,
                    marginBottom: 10
                  }}>
                    You're offline. Some content may not be available.
                  </Text>
                </View>
              )}
            </View>
            <PaddingConatiner>
              <Heading text={"Top Charts"} />
            </PaddingConatiner>
            <FlatList
              horizontal={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: 13,
              }}
              data={[1]}
              renderItem={() => <RenderTopCharts playlist={Data?.data?.charts || []} />}
              keyExtractor={() => 'top-charts'}
            />
            <PaddingConatiner>
              <HorizontalScrollSongs id={getChartId(2)} />
            </PaddingConatiner>
            <PaddingConatiner>
              <HorizontalScrollSongs id={getChartId(3)} />
            </PaddingConatiner>
          </ScrollView>
          <TopHeader showHeader={showHeader} />
        </View>
      }
    </MainWrapper>
  );
};
