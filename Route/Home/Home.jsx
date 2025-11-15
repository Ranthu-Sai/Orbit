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
import { EachPlaylistCard } from "../../Component/Global/EachPlaylistCard";
import { GetLanguageValue } from "../../LocalStorage/Languages";
import { TopHeader } from "../../Component/Home/TopHeader";
import { DisplayTopGenres } from "../../Component/Home/DisplayTopGenres";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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

export const Home = () => {
  const [showHeader, setShowHeader] = useState(true);
  const [Language, setLanguage] = useState('english');
  const [Loading, setLoading] = useState(true);
  const [homeData, setHomeData] = useState({});
  const [isConnected, setIsConnected] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = Dimensions.get('window');
  const [Data, setData] = useState({ data: { charts: [], playlists: [], trending: { albums: [] } } });
  // Remove randomization - we want to show all charts

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
        }
      }

      if (networkState.isConnected) {
        const Languages = await GetLanguageValue();
        const data = await getHomePageData(Languages);
        setData(data);

        // Cache the new data
        await AsyncStorage.setItem('homePageData', JSON.stringify(data));
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

  // Shuffle playlists and albums for more variety
  const shuffledPlaylists = useMemo(() =>
    shuffleArray(Data?.data?.playlists || []),
  [Data?.data?.playlists]);

  const shuffledAlbums = useMemo(() =>
    shuffleArray(Data?.data?.trending?.albums || []),
  [Data?.data?.trending?.albums]);

  return (
    <MainWrapper>
      <LoadingComponent loading={Loading}/>
      {
        !Loading &&  <View>
          <ScrollView 
            style={{zIndex:-1}} 
            onScroll={(e)=>{
              if (e.nativeEvent.contentOffset.y > 200 && !showHeader){
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
              paddingBottom:90,
            }}
          >
            <RouteHeading showSearch={true} showSettings={true}/>

            <DisplayTopGenres/>

            {/* Render all charts from API */}
            {Data?.data?.charts?.map((chart, index) => (
              <View key={`chart-${chart.id}-${index}`} style={{ paddingHorizontal: 13 }}>
                <HorizontalScrollSongs id={chart.id}/>
              </View>
            ))}

            <View style={{ paddingHorizontal: 13 }}>
              <Heading text={"Recommended"}/>
            </View>
            <FlatList
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: 10, // Reduced from 15
                paddingRight: 5, // Reduced from 10
                gap: 2, // Reduced from 20
              }}
              data={shuffledPlaylists}
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
                  name={truncateText(item.title, 30)}
                  follower={truncateText(item.subtitle, 30)}
                  key={index}
                  image={item.image[2].link}
                  id={item.id}
                  source="Home"
                  MainContainerStyle={{
                    marginHorizontal: 4, // Add horizontal margin
                  }}
                />
              )}
            />
            <View style={{ paddingHorizontal: 13 }}>
              <Heading text={"Trending Albums"}/>
            </View>
            <FlatList
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: 10, // Reduced from 15
                paddingRight: 5, // Reduced from 10
                gap: 2, // Reduced from 20
              }}
              data={shuffledAlbums}
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
                  image={item.image[2].link}
                  artists={truncateText(item.artists, 30)}
                  key={index}
                  name={truncateText(item.name, 30)}
                  id={item.id}
                  source="Home"
                />
              )}
            />

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
            <PaddingConatiner>
              <Heading text={"Top Charts"}/>
            </PaddingConatiner>
            <FlatList
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft:13,
              }}
              data={[1]}
              renderItem={()=><RenderTopCharts playlist={Data.data.charts}/>}
              keyExtractor={() => 'top-charts'}
            />
          </ScrollView>
          <TopHeader showHeader={showHeader}/>
        </View>
      }
    </MainWrapper>
  );
};
