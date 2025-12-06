import { MainWrapper } from "../../Layout/MainWrapper";
import { FlatList, ScrollView, View, Text, RefreshControl, Dimensions } from "react-native";
import { Heading } from "../../Component/Global/Heading";
import { HorizontalScrollSongs } from "../../Component/Global/HorizontalScrollSongs";
import { RouteHeading } from "../../Component/Home/RouteHeading";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { EachAlbumCard } from "../../Component/Global/EachAlbumCard";
import { RenderTopCharts } from "../../Component/Home/RenderTopCharts";
import { LoadingComponent } from "../../Component/Global/Loading";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getHomePageData } from "../../Api/HomePage";
import { getYTMusicHomeFeed } from "../../Api/YTMusic";
import { EachPlaylistCard } from "../../Component/Global/EachPlaylistCard";
import { GetLanguageValue } from "../../LocalStorage/Languages";
import { TopHeader } from "../../Component/Home/TopHeader";
import { DisplayTopGenres } from "../../Component/Home/DisplayTopGenres";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { YTMusicHomeSection } from '../../Component/Home/YTMusicHomeSection';
import { deduplicateAlbums } from '../../Utils/AlbumUtils';

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
  const [showHeader, setShowHeader] = useState(true);
  const [Language, setLanguage] = useState('english');
  const [Loading, setLoading] = useState(true);
  const [homeData, setHomeData] = useState({});
  const [homefeedData, setHomefeedData] = useState({ playlists: [], albums: [] });
  const [isConnected, setIsConnected] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = Dimensions.get('window');
  const [Data, setData] = useState({ data: { charts: [], playlists: [], trending: { albums: [] } } });
  const [chartIndices, setChartIndices] = useState([0, 1, 2, 3]); // Dynamic chart indices

  // Get random chart indices
  const randomizeCharts = useCallback((charts) => {
    if (!charts || charts.length === 0) return;

    // Create a shuffled array of indices
    const indices = Array.from({ length: charts.length }, (_, i) => i);
    setChartIndices(shuffleArray(indices).slice(0, 4)); // Take the first 4 shuffled indices

    console.log('Randomized chart indices:', chartIndices);
  }, []);

  async function fetchHomePageData(forceRefresh = false) {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }

      const networkState = await NetInfo.fetch();
      setIsConnected(!networkState.isConnected);
      setOffline(!networkState.isConnected);

      // Try to load cached data first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await AsyncStorage.getItem('homePageData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setData(parsedData);
          // Randomize chart indices with the cached data
          randomizeCharts(parsedData?.data?.charts);
        }

        // Try to load cached homefeed data
        const cachedHomefeed = await AsyncStorage.getItem('homefeedData');
        if (cachedHomefeed) {
          const parsedHomefeed = JSON.parse(cachedHomefeed);
          setHomefeedData(parsedHomefeed.data || { playlists: [], albums: [] });
        }
      }

      if (networkState.isConnected) {
        // Fetch both homepage data and homefeed data simultaneously
        const Languages = await GetLanguageValue();
        const [data, homefeedResult] = await Promise.allSettled([
          getHomePageData(Languages),
          getYTMusicHomeFeed(15) // Get 15 sections of homefeed
        ]);

        if (data.status === 'fulfilled') {
          setData(data.value);
          // Randomize chart indices with the new data
          randomizeCharts(data.value?.data?.charts);
          // Cache the new data
          await AsyncStorage.setItem('homePageData', JSON.stringify(data.value));
        }

        if (homefeedResult.status === 'fulfilled') {
          setHomefeedData(homefeedResult.value?.data || { playlists: [], albums: [] });
          // Cache the homefeed data
          await AsyncStorage.setItem('homefeedData', JSON.stringify(homefeedResult.value));
          console.log('Homefeed data loaded:', homefeedResult.value?.data);
        }
      }
    } catch (e) {
      console.log('Error fetching data:', e);
      // If there's an error and we're offline, we'll continue with cached data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomePageData(true);
  }, []);

  useEffect(() => {
    fetchHomePageData();
  }, []);

  // Combine playlists from both sources
  const allPlaylists = useMemo(() => {
    const regularPlaylists = Data?.data?.playlists || [];
    const homefeedPlaylists = homefeedData?.playlists || [];
    return shuffleArray([...regularPlaylists, ...homefeedPlaylists]).slice(0, 20);
  }, [Data?.data?.playlists, homefeedData?.playlists]);

  // Combine albums from both sources and remove duplicates
  const allAlbums = useMemo(() => {
    const regularAlbums = Data?.data?.trending?.albums || [];
    const homefeedAlbums = homefeedData?.albums || [];
    const combined = [...regularAlbums, ...homefeedAlbums];
    // Apply deduplication (prioritizes Saavn over YTMusic)
    const deduplicated = deduplicateAlbums(combined);
    return shuffleArray(deduplicated).slice(0, 20);
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
              if (e.nativeEvent.contentOffset.y > 200 && !showHeader) {
                setShowHeader(true)
              } else if (e.nativeEvent.contentOffset.y < 200 && showHeader) {
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
              paddingBottom: 90,
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
