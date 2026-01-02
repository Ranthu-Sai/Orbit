import Animated, { useAnimatedRef } from "react-native-reanimated";
import { LikedPagesTopHeader } from "../../Component/Library/TopHeaderLikedPages";
import { LikedDetails } from "../../Component/Library/LikedDetails";
import { useEffect, useState, useRef, useCallback } from "react";
import { GetLikedPlaylist } from "../../LocalStorage/StoreLikedPlaylists";
import { EachPlaylistCard } from "../../Component/Global/EachPlaylistCard";
import { View, Dimensions, StyleSheet, RefreshControl } from "react-native";
import { useTheme, useNavigation } from "@react-navigation/native";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import React from "react";
import { CacheManager } from '../../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS } from '../../Utils/CacheConfig';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LikedPlaylistPage = () => {
  const theme = useTheme()
  const AnimatedRef = useAnimatedRef()
  const [LikedPlaylist, setLikedPlaylist] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // Removed BackHandler - let RootRoute handle navigation

  // CACHE-FIRST LOADING for liked playlists
  const getAllLikedSongs = useCallback(async (forceRefresh = false) => {
    const cacheKey = CACHE_KEYS.LIKED_PLAYLISTS;

    // Check cache first (unless force refresh) - HYBRID: RAM -> Disk
    if (!forceRefresh) {
      const cached = await CacheManager.getAsync(cacheKey);
      if (cached) {
        setLikedPlaylist(cached);
        return;
      }
    }

    const Playlists = await GetLikedPlaylist();
    const Temp = [];
    for (const [key, value] of Object.entries(Playlists.playlist)) {
      Temp[value.count] = value;
    }
    const result = Temp.filter(Boolean);

    if (isMounted.current) {
      setLikedPlaylist(result);
      // Cache with 10-minute TTL
      CacheManager.set(cacheKey, result, CACHE_TTL.LIBRARY_DATA);
    }
  }, []);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    CacheManager.invalidate(CACHE_KEYS.LIKED_PLAYLISTS);
    await getAllLikedSongs(true);
    setRefreshing(false);
  }, [getAllLikedSongs]);

  // Initial load only (NO useFocusEffect - no reload on back navigation)
  useEffect(() => {
    getAllLikedSongs(false);

    return () => {
      isMounted.current = false;
    };
  }, [getAllLikedSongs]);

  return (
    <Animated.ScrollView
      scrollEventThrottle={16}
      ref={AnimatedRef}
      contentContainerStyle={{
        paddingBottom: 65,
        backgroundColor: theme.colors.background,
      }}
    >
      <LikedPagesTopHeader AnimatedRef={AnimatedRef} url={require("../../Images/LikedPlaylist.png")} />
      <LikedDetails name={"Liked Playlists"} dontShowPlayButton={true} textStyle={!theme.dark ? { color: '#FFFFFF' } : {}} />
      <PaddingConatiner>
        <View style={styles.playlistContainer}>
          {LikedPlaylist.map((e, i) => {
            if (e) {
              return (
                <View key={e.id || `playlist-${i}`} style={styles.cardWrapper}>
                  <EachPlaylistCard
                    name={e.name}
                    image={e.image}
                    id={e.id}
                    follower={e.follower}
                    MainContainerStyle={styles.playlistCard}
                  />
                </View>
              );
            }
            return null;
          })}
        </View>
      </PaddingConatiner>
    </Animated.ScrollView>
  );
};

// Add responsive styles
const styles = StyleSheet.create({
  playlistContainer: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingTop: 5,
  },
  cardWrapper: {
    width: SCREEN_WIDTH <= 360 ? '48%' : '48%', // Adjust based on screen size
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  playlistCard: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  }
});
