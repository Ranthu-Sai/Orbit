import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  View,
  BackHandler,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { LoadingComponent } from '../Global/Loading';
import { EachPlaylistCard } from '../Global/EachPlaylistCard';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import { getSearchPlaylistData } from '../../Api/Playlist';
import { Heading } from '../Global/Heading';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaylistItemWrapper } from './PlaylistItemWrapper';
import { CommonActions } from '@react-navigation/native';
import { CacheManager } from '../../Utils/NavigationCacheManager';
import {
  CACHE_TTL,
  CACHE_KEYS,
  generateCacheKey,
} from '../../Utils/CacheConfig';
import { GridSkeleton } from '../Global/GridSkeleton';

// Add a utility function to truncate text
const truncateText = (text, limit = 22) => {
  if (!text) {
    return '';
  }
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

// AsyncStorage key for navigation source
const NAVIGATION_SOURCE_KEY = 'orbit_navigation_source';

export default function ShowPlaylistofType({ route }) {
  const { Searchtext = 'most searched', navigationSource } =
    route?.params || {};
  const navigation = useNavigation();
  const currentRoute = useRoute();
  const limit = 30;
  const [Data, setData] = useState({});
  const [Loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [source, setSource] = useState(null);
  const { width } = Dimensions.get('window');
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // Store the navigation source when component mounts
  useEffect(() => {
    const getNavigationSource = async () => {
      try {
        // First check route params
        if (navigationSource) {
          setSource(navigationSource);
          await AsyncStorage.setItem(NAVIGATION_SOURCE_KEY, navigationSource);
          return;
        }

        // Then check for current route state
        const routeName = currentRoute?.name;
        const parentRoute = navigation.getState()?.routes?.[0]?.name;

        if (parentRoute && parentRoute !== 'Discover') {
          setSource(parentRoute);
          await AsyncStorage.setItem(NAVIGATION_SOURCE_KEY, parentRoute);
          return;
        }

        // Fallback to AsyncStorage
        const storedSource = await AsyncStorage.getItem(NAVIGATION_SOURCE_KEY);
        if (storedSource) {
          setSource(storedSource);
        } else {
          // Default to Discover if no source found
          setSource('Discover');
          await AsyncStorage.setItem(NAVIGATION_SOURCE_KEY, 'Discover');
        }
      } catch (error) {
        console.error('Error managing navigation source:', error);
        setSource('Discover'); // Default fallback
      }
    };

    getNavigationSource();
  }, [navigation, navigationSource, currentRoute]);

  // CACHE-FIRST LOADING for playlist data
  const addSearchData = useCallback(
    async (forceRefresh = false) => {
      if (!isMounted.current) {
        return;
      }

      const cacheKey = generateCacheKey(CACHE_KEYS.SEARCH, Searchtext);

      try {
        // Check cache first (unless force refresh) - HYBRID: RAM -> Disk
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
        const data = await getSearchPlaylistData(
          Searchtext || 'most searched',
          1,
          limit
        );

        if (!isMounted.current) {
          return;
        }

        if (data?.data) {
          setData(data);
          CacheManager.set(cacheKey, data, CACHE_TTL.SEARCH_RESULTS);
          setFetchError(null);
        } else {
          setFetchError('No results found');
        }
      } catch (e) {
        setFetchError(e.message);
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
          isInitialLoad.current = false;
        }
      }
    },
    [Searchtext, limit]
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    CacheManager.invalidate(generateCacheKey(CACHE_KEYS.SEARCH, Searchtext));
    addSearchData(true);
  }, [Searchtext, addSearchData]);

  // Initial load only (NO useFocusEffect - instant back navigation)
  useEffect(() => {
    addSearchData(false);
    return () => {
      isMounted.current = false;
    };
  }, [addSearchData]);

  // Add back handler for hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      // Navigate based on the source instead of always going to Discover
      if (source === 'HomePage') {
        navigation.navigate('Home', { screen: 'HomePage' });
      } else if (source === 'LibraryPage') {
        navigation.navigate('Library', { screen: 'LibraryPage' });
      } else {
        // Default to Discover (backward compatibility)
        try {
          // Use CommonActions.reset to ensure clean navigation state
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
          console.error('Navigation reset failed:', error);
          // Fallback to simple navigation
          navigation.navigate('Discover', { screen: 'DiscoverPage' });
        }
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
  }, [navigation, source]);

  // Calculate optimal card sizing based on screen width
  const getCardWidth = () => {
    // Allow for 2 columns with proper spacing
    const cardWidth = (width - 40) / 2; // Reduced from 60 to make cards larger and more compact
    return cardWidth;
  };

  const cardWidth = getCardWidth();

  return (
    <View style={{ flex: 1 }}>
      <PaddingConatiner>
        <Heading text={(Searchtext || 'Popular Playlists').toUpperCase()} />
      </PaddingConatiner>

      {/* Improved loading state - Skeleton UI */}
      {Loading && <GridSkeleton count={8} showHeader={false} noScroll={true} />}

      {/* Error state */}
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
            onPress={addSearchData}
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
        <>
          {Data?.data?.results?.length > 0 ? (
            <FlatList
              showsVerticalScrollIndicator={false}
              numColumns={2}
              keyExtractor={(item, index) => String(index)}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: 100,
                paddingTop: 4,
              }}
              columnWrapperStyle={{
                justifyContent: 'space-between',
                marginBottom: 12, // Reduced from 24 for less vertical space
                width: '100%',
              }}
              data={Data?.data?.results}
              renderItem={(item) => (
                <PlaylistItemWrapper
                  item={item.item}
                  cardWidth={cardWidth}
                  source="ShowPlaylistofType"
                  searchText={Searchtext}
                  navigationSource={source}
                />
              )}
              ListEmptyComponent={
                <View
                  style={{
                    flex: 1,
                    height: 400,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                  }}
                >
                  <PlainText
                    text={'No Playlists Found'}
                    style={{ textAlign: 'center' }}
                  />
                  <SmallText
                    text={'Try searching for something else'}
                    style={{ textAlign: 'center' }}
                  />
                </View>
              }
            />
          ) : (
            <View
              style={{
                flex: 1,
                height: 400,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20,
              }}
            >
              <PlainText
                text={'No Playlists Found'}
                style={{ textAlign: 'center' }}
              />
              <SmallText
                text={'Try searching for something else'}
                style={{ textAlign: 'center' }}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}
