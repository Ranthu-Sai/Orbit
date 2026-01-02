import { MainWrapper } from "../../Layout/MainWrapper";
import { FlatList, ScrollView, View, Text, RefreshControl, Dimensions } from "react-native";
import { Heading } from "../../Component/Global/Heading";
import { HorizontalScrollSongs } from "../../Component/Global/HorizontalScrollSongs";
import { RouteHeading } from "../../Component/Home/RouteHeading";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { EachAlbumCard } from "../../Component/Global/EachAlbumCard";
import { RenderTopCharts } from "../../Component/Home/RenderTopCharts";
import { HomeSkeletonLoader } from "../../Component/Home/HomeSkeletonLoader";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getHomePageData } from "../../Api/HomePage";
import { getYTMusicHomeFeed } from "../../Api/YTMusic";
import { useFocusEffect } from "@react-navigation/native";
import { clearCache as clearApiCache, CACHE_GROUPS as API_CACHE_GROUPS } from "../../Api/CacheManager";
import { EachPlaylistCard } from "../../Component/Global/EachPlaylistCard";
import { GetLanguageValue } from "../../LocalStorage/Languages";
import { GetHomeFeedSource } from "../../LocalStorage/AppSettings";
import { TopHeader } from "../../Component/Home/TopHeader";
import { DisplayTopGenres } from "../../Component/Home/DisplayTopGenres";
import NetInfo from '@react-native-community/netinfo';
import { YTMusicHomeSection } from '../../Component/Home/YTMusicHomeSection';
import { SaavnHomeFeed } from '../../Component/Home/SaavnHomeFeed';
import { YTMusicHomeFeed } from '../../Component/Home/YTMusicHomeFeed';
import { deduplicateAlbums } from '../../Utils/AlbumUtils';
import { CacheManager } from '../../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS, generateCacheKey } from '../../Utils/CacheConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [chartIndices, setChartIndices] = useState([0, 1, 2, 3]);
  const [homeFeedSource, setHomeFeedSource] = useState(null); // Initialize as null to avoid flicker

  // Lazy loading state for Hybrid mode
  const INITIAL_HYBRID_SECTIONS = 6;
  const HYBRID_SECTIONS_PER_LOAD = 2;
  const [hybridVisibleCount, setHybridVisibleCount] = useState(INITIAL_HYBRID_SECTIONS);

  // Calculate 5% of screen height for scroll threshold
  const scrollThreshold = height * 0.05;

  // Track if initial load has happened
  const isInitialLoad = useRef(true);
  const isMounted = useRef(true);
  const ytMusicSectionRef = useRef(null);
  const ytMusicFeedRef = useRef(null);
  const saavnFeedRef = useRef(null);

  // Get random chart indices
  const randomizeCharts = useCallback((charts) => {
    if (!charts || charts.length === 0) return;

    // Create a shuffled array of indices
    const indices = Array.from({ length: charts.length }, (_, i) => i);
    setChartIndices(shuffleArray(indices).slice(0, 4)); // Take the first 4 shuffled indices
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
      }

      // Step 2: Check network
      const networkState = await NetInfo.fetch();
      setIsConnected(!networkState.isConnected);
      setOffline(!networkState.isConnected);

      if (networkState.isConnected) {
        // Step 3: Fetch fresh data
        const Languages = await GetLanguageValue();
        const [data, homefeedResult] = await Promise.allSettled([
          getHomePageData(Languages, forceRefresh),
          getYTMusicHomeFeed(15, forceRefresh)
        ]);

        if (!isMounted.current) return;

        if (data.status === 'fulfilled' && data.value) {
          // Create a mutable copy to shuffle if needed
          const fetchedData = JSON.parse(JSON.stringify(data.value));

          // On manual refresh, shuffle Saavn playlists and albums for new positions
          if (forceRefresh && fetchedData.data) {
            if (fetchedData.data.playlists && fetchedData.data.playlists.length > 0) {
              fetchedData.data.playlists = shuffleArray(fetchedData.data.playlists);
            }
            if (fetchedData.data.trending?.albums && fetchedData.data.trending.albums.length > 0) {
              fetchedData.data.trending.albums = shuffleArray(fetchedData.data.trending.albums);
            }
          }

          // Diagnostic: Log what Saavn API returned
          const saavnPlaylists = fetchedData?.data?.playlists || [];
          const saavnAlbums = fetchedData?.data?.trending?.albums || [];
          const saavnCharts = fetchedData?.data?.charts || [];


          setData(fetchedData);
          // Always randomize charts on refresh
          randomizeCharts(fetchedData?.data?.charts);
          // Cache the shuffled data
          CacheManager.set(cacheKey, fetchedData, CACHE_TTL.HOME_DATA);
        }

        if (homefeedResult.status === 'fulfilled' && homefeedResult.value?.data) {
          const homefeed = homefeedResult.value.data || { playlists: [], albums: [] };
          setHomefeedData(homefeed);
          CacheManager.set(homefeedCacheKey, homefeed, CACHE_TTL.HOME_DATA);
        }
      }
    } catch (e) {
    } finally {
      if (isMounted.current) {
        setLoading(false);
        // Do NOT set refreshing to false here, let onRefresh handle it
        if (!forceRefresh) {
          setRefreshing(false);
        }
        isInitialLoad.current = false;
      }
    }
  }

  // Pull to refresh handler - ONLY way to force refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Invalidate UI-level cache (NavigationCacheManager)
    CacheManager.invalidateByPrefix(CACHE_KEYS.HOME);
    // Clear API-level cache (Api/CacheManager) to force fresh network requests
    await clearApiCache(API_CACHE_GROUPS.HOME);
    // Clear additional Saavn-specific cache keys from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const saavnKeys = allKeys.filter(k =>
        k.includes('home_') || k.includes('cache_home') || k.includes('api_cache_home')
      );
      if (saavnKeys.length > 0) {
        await AsyncStorage.multiRemove(saavnKeys);
      }
    } catch (e) {
    }
    // Trigger hard refresh for both sections
    setHybridVisibleCount(INITIAL_HYBRID_SECTIONS); // Reset lazy loading for Hybrid mode

    // Refresh the specific feed source
    const homePromise = fetchHomePageData(true);
    let ytPromise = Promise.resolve();

    if (homeFeedSource === 'YTMusic' && ytMusicFeedRef.current?.refresh) {
      ytPromise = ytMusicFeedRef.current.refresh();
    } else if (homeFeedSource === 'Saavn' && saavnFeedRef.current?.refresh) {
      ytPromise = saavnFeedRef.current.refresh();
    } else if (homeFeedSource === 'Hybrid' && ytMusicSectionRef.current?.refresh) {
      ytPromise = ytMusicSectionRef.current.refresh();
    }

    await Promise.allSettled([homePromise, ytPromise]);

    if (isMounted.current) {
      setRefreshing(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initial load effect (runs once on mount)
  useEffect(() => {
    // Only fetch if we haven't determined the source yet
    if (homeFeedSource === null) {
      GetHomeFeedSource().then(source => {
        if (isMounted.current) {
          setHomeFeedSource(source || 'Hybrid');
          fetchHomePageData(false);
        }
      });
    }
  }, []);

  // Reactive source update when screen is focused (returns from settings)
  useFocusEffect(
    useCallback(() => {
      let isEffectMounted = true;

      GetHomeFeedSource().then(source => {
        if (!isEffectMounted) return;

        const activeSource = source || 'Hybrid';

        // If source changed, update and reload
        if (activeSource !== homeFeedSource && homeFeedSource !== null) {
          setLoading(true);
          // Invalidate cache prefix to ensure fresh feed
          CacheManager.invalidateByPrefix(CACHE_KEYS.HOME);
          setHomeFeedSource(activeSource);
          fetchHomePageData(false);
        }
      });

      return () => {
        isEffectMounted = false;
      };
    }, [homeFeedSource])
  );

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

  // Define sections for Hybrid mode
  const hybridSections = [
    { id: 'genres', component: <DisplayTopGenres key="genres" /> },
    { id: 'songs-0', component: <View key="songs-0" style={{ paddingHorizontal: 13 }}><HorizontalScrollSongs id={getChartId(0)} /></View> },
    { id: 'ytmusic-0', component: <YTMusicHomeSection key="ytmusic-0" ref={ytMusicSectionRef} sectionIndex={0} excludeKeyword="Albums for you" /> },
    { id: 'ytmusic-4', component: <YTMusicHomeSection key="ytmusic-4" sectionIndex={4} excludeKeyword="Albums for you" /> },
    { id: 'ytmusic-albums', component: <YTMusicHomeSection key="ytmusic-albums" sectionKeyword="Albums for you" /> },
    { id: 'ytmusic-5', component: <YTMusicHomeSection key="ytmusic-5" sectionIndex={5} excludeKeyword="Albums for you" /> },
    {
      id: 'songs-1', component: (
        <View key="songs-1" style={{ paddingHorizontal: 13, marginTop: 8 }}>
          <HorizontalScrollSongs id={getChartId(1)} />
        </View>
      )
    },
    { id: 'ytmusic-1', component: <YTMusicHomeSection key="ytmusic-1" sectionIndex={1} excludeKeyword="Albums for you" /> },
    { id: 'ytmusic-6', component: <YTMusicHomeSection key="ytmusic-6" sectionIndex={6} excludeKeyword="Albums for you" /> },
    {
      id: 'playlists', component: (
        <View key="playlists">
          <View style={{ paddingHorizontal: 13 }}><Heading text={"Recommended Playlists"} /></View>
          <FlatList
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 10, paddingRight: 5, gap: 2 }}
            data={allPlaylists}
            keyExtractor={(item, index) => `playlist-${item.id}-${index}`}
            renderItem={({ item, index }) => (
              <EachPlaylistCard
                name={truncateText(item.title || item.name, 30)}
                follower={truncateText(item.subtitle || item.artists, 30)}
                image={getImageUrl(item.image)}
                id={item.id}
                source="Home"
                MainContainerStyle={{ marginHorizontal: 4 }}
              />
            )}
          />
        </View>
      )
    },
    {
      id: 'songs-2', component: (
        <View key="songs-2" style={{ paddingHorizontal: 13, marginTop: 8 }}>
          <HorizontalScrollSongs id={getChartId(2)} />
        </View>
      )
    },
    { id: 'ytmusic-2', component: <YTMusicHomeSection key="ytmusic-2" sectionIndex={2} excludeKeyword="Albums for you" /> },
    { id: 'ytmusic-7', component: <YTMusicHomeSection key="ytmusic-7" sectionIndex={7} excludeKeyword="Albums for you" /> },
    {
      id: 'albums', component: (
        <View key="albums">
          <View style={{ paddingHorizontal: 13 }}><Heading text={"Trending Albums"} /></View>
          <FlatList
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 10, paddingRight: 5, gap: 2 }}
            data={allAlbums}
            keyExtractor={(item, index) => `album-${item.id}-${index}`}
            renderItem={({ item, index }) => (
              <EachAlbumCard
                image={getImageUrl(item.image)}
                artists={truncateText(item.artists || item.artist, 30)}
                name={truncateText(item.name || item.title, 30)}
                id={item.id}
                source="Home"
              />
            )}
          />
        </View>
      )
    },
    { id: 'songs-3', component: <PaddingConatiner key="songs-3"><HorizontalScrollSongs id={getChartId(3)} /></PaddingConatiner> },
    { id: 'ytmusic-extra', component: <YTMusicHomeSection key="ytmusic-extra" startIndex={8} excludeKeyword="Albums for you" /> },
    {
      id: 'top-charts', component: (
        <View key="top-charts">
          <PaddingConatiner><Heading text={"Top Charts"} /></PaddingConatiner>
          <FlatList
            horizontal={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 13 }}
            data={[1]}
            renderItem={() => <RenderTopCharts playlist={Data?.data?.charts || []} />}
            keyExtractor={() => 'top-charts'}
          />
          {offline && (
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 10 }}>
              You're offline. Some content may not be available.
            </Text>
          )}
        </View>
      )
    },
  ];

  // Determine if we should show skeleton (loading or no data yet)
  const hasData = allPlaylists.length > 0 || allAlbums.length > 0;
  const showSkeleton = Loading || homeFeedSource === null || (!hasData && isInitialLoad.current);

  // Render feed content based on homeFeedSource setting
  const renderFeedContent = () => {
    if (homeFeedSource === 'Saavn') {
      return (
        <SaavnHomeFeed
          ref={saavnFeedRef}
          refreshing={refreshing}
          onRefreshComplete={() => setRefreshing(false)}
        />
      );
    }

    if (homeFeedSource === 'YTMusic') {
      return (
        <>
          <RouteHeading showSearch={true} showSettings={true} />
          <YTMusicHomeFeed
            ref={ytMusicFeedRef}
            refreshing={refreshing}
            onRefreshComplete={() => setRefreshing(false)}
          />
        </>
      );
    }

    // Hybrid mode - show both Saavn and YTMusic content
    return (
      <>
        {hybridSections.slice(0, hybridVisibleCount).map(s => s.component)}
      </>
    );
  };

  return (
    <MainWrapper>
      {
        showSkeleton ? (
          <HomeSkeletonLoader source={homeFeedSource} />
        ) : (
          <View>
            <ScrollView
              style={{ zIndex: -1 }}
              onScroll={(e) => {
                const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;

                // Header visibility logic
                if (contentOffset.y > scrollThreshold && !showHeader) {
                  setShowHeader(true)
                } else if (contentOffset.y < scrollThreshold && showHeader) {
                  setShowHeader(false)
                }

                // Lazy loading trigger - load more when 80% scrolled
                const scrollProgress = (contentOffset.y + layoutMeasurement.height) / contentSize.height;
                if (scrollProgress > 0.8) {
                  // 1. YTMusic feed ref
                  if (homeFeedSource === 'YTMusic' && ytMusicFeedRef.current?.loadMore) {
                    ytMusicFeedRef.current.loadMore();
                  }
                  // 2. Saavn feed ref
                  if (homeFeedSource === 'Saavn' && saavnFeedRef.current?.loadMore) {
                    saavnFeedRef.current.loadMore();
                  }
                  // 3. Hybrid mode (local to this component)
                  if (homeFeedSource === 'Hybrid') {
                    if (hybridVisibleCount < hybridSections.length) {
                      setHybridVisibleCount(prev => Math.min(prev + HYBRID_SECTIONS_PER_LOAD, hybridSections.length));
                    }
                  }
                }
              }}
              scrollEventThrottle={16}
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
                paddingBottom: 180,
              }}
            >
              {homeFeedSource !== 'YTMusic' && <RouteHeading showSearch={true} showSettings={true} />}
              {renderFeedContent()}
            </ScrollView>
            <TopHeader showHeader={showHeader} />
          </View>
        )}
    </MainWrapper>
  );
};
