import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  BackHandler,
  ToastAndroid,
  RefreshControl,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  DeviceEventEmitter,
} from "react-native";
import { useTheme, useNavigation } from "@react-navigation/native";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";

import { GetLikedSongs } from "../../LocalStorage/StoreLikedSongs";
import { GetLikedAlbums } from "../../LocalStorage/StoreLikedAlbums";
import { EachSongCard } from "../../Component/Global/EachSongCard";
import { Heading } from "../../Component/Global/Heading";
import { SmallText } from "../../Component/Global/SmallText";
import { Spacer } from "../../Component/Global/Spacer";
import { AddPlaylist, getIndexQuality } from "../../MusicPlayerFunctions";
import Context from "../../Context/Context";
import { useContext } from "react";
import { CacheManager } from "../../Utils/NavigationCacheManager";
import { CACHE_TTL, CACHE_KEYS } from "../../Utils/CacheConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

// Default images
const DEFAULT_ALBUM_IMAGE = require("../../Images/default.jpg");

export const LikedSongPage = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const { updateTrack } = useContext(Context);

  // Data states
  const [likedSongs, setLikedSongs] = useState([]);
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // View mode state: 'list' or 'card'
  const [viewMode, setViewMode] = useState("list");

  // Combined data for unified display
  const [combinedItems, setCombinedItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  // Animation state
  const [animationsInitialized, setAnimationsInitialized] = useState(false);
  const [animationValues] = useState({
    translateY: new Map(),
    opacity: new Map(),
  });

  // Track mount state
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // Initialize animation value for an item if it doesn't exist
  const getAnimationValues = (id, index) => {
    const key = id || `item-${index}`;

    if (!animationValues.translateY.has(key)) {
      animationValues.translateY.set(key, new Animated.Value(20));
      animationValues.opacity.set(key, new Animated.Value(0));
    }

    return {
      translateY: animationValues.translateY.get(key),
      opacity: animationValues.opacity.get(key),
    };
  };

  // Load view mode preference from AsyncStorage
  useEffect(() => {
    const loadViewPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem("favorites_view_mode");
        if (saved) {
          setViewMode(saved);
        }
      } catch (error) {
        console.error("Error loading view preference:", error);
      }
    };
    loadViewPreference();
  }, []);

  // Toggle view mode and save preference
  const toggleViewMode = async () => {
    const newMode = viewMode === "list" ? "card" : "list";
    setViewMode(newMode);
    try {
      await AsyncStorage.setItem("favorites_view_mode", newMode);
    } catch (error) {
      console.error("Error saving view preference:", error);
    }
  };

  // CACHE-FIRST LOADING for favorites data
  const loadFavoritesData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    const cacheKey = "favorites_data";

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = await CacheManager.getAsync(cacheKey);
        if (cached) {
          console.log("[LikedSongPage] Using cached data");
          setLikedSongs(cached.songs || []);
          setLikedAlbums(cached.albums || []);
          setLoading(false);
          return;
        }
      }

      // Only show loading on initial load
      if (isInitialLoad.current) {
        setLoading(true);
      }

      console.log("[LikedSongPage] Fetching favorites data...");

      // Load liked songs
      const songsData = await GetLikedSongs();
      const processedSongs = [];

      for (const [_, value] of Object.entries(songsData.songs || {})) {
        if (value) {
          processedSongs.push({
            type: 'song',
            url: value.url,
            title: value?.title,
            artist: value?.artist,
            artwork: value?.image,
            duration: value?.duration,
            id: value?.id,
            language: value?.language,
            artistID: value?.primary_artists_id,
            count: value.count,
            timestamp: value.timestamp || (value.count * 1000) || 0, // Use timestamp or fallback
          });
        }
      }

      // Load liked albums
      const albumsData = await GetLikedAlbums();
      const processedAlbums = [];

      for (const [_, value] of Object.entries(albumsData.albums || {})) {
        if (value) {
          processedAlbums.push({
            type: 'album',
            id: value.id,
            name: value.name,
            image: value.image,
            year: value.year,
            count: value.count,
            timestamp: value.timestamp || (value.count * 1000) || 0, // Use timestamp or fallback
          });
        }
      }

      if (isMounted.current) {
        setLikedSongs(processedSongs);
        setLikedAlbums(processedAlbums);
        setLoading(false);

        // Cache the data
        CacheManager.set(
          cacheKey,
          {
            songs: processedSongs,
            albums: processedAlbums,
          },
          CACHE_TTL.LIBRARY_DATA
        );
        console.log("[LikedSongPage] Data cached");
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
      if (isMounted.current) {
        setLoading(false);
        ToastAndroid.show("Failed to load favorites", ToastAndroid.SHORT);
      }
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
        isInitialLoad.current = false;
      }
    }
  }, []);

  // Combine and sort songs and albums by timestamp (most recent first)
  useEffect(() => {
    // Create combined list sorted by timestamp (most recent first)
    const songsWithType = likedSongs.map(s => ({ ...s, type: 'song' }));
    const albumsWithType = likedAlbums.map(a => ({ ...a, type: 'album' }));
    const combined = [...songsWithType, ...albumsWithType];
    // Sort by timestamp first (if available), fallback to count for older items
    combined.sort((a, b) => {
      const timeA = a.timestamp || (a.count * 1000) || 0;
      const timeB = b.timestamp || (b.count * 1000) || 0;
      return timeB - timeA; // Most recent first
    });
    setCombinedItems(combined);
  }, [likedSongs, likedAlbums]);

  // Filter items based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(combinedItems);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = combinedItems.filter(item => {
        if (item.type === 'song') {
          return (
            item.title?.toLowerCase().includes(query) ||
            item.artist?.toLowerCase().includes(query)
          );
        } else {
          return item.name?.toLowerCase().includes(query);
        }
      });
      setFilteredItems(filtered);
    }
  }, [searchQuery, combinedItems]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setAnimationsInitialized(false);
    animationValues.translateY.clear();
    animationValues.opacity.clear();
    // Clear cache to force fresh data
    CacheManager.invalidate("favorites_data");
    loadFavoritesData(true);
  }, [animationValues, loadFavoritesData]);

  // Load data on mount and listen for favorites updates
  useEffect(() => {
    setAnimationsInitialized(false);
    animationValues.translateY.clear();
    animationValues.opacity.clear();
    loadFavoritesData(false);

    // Listen for favorites update events
    const favoritesUpdateListener = DeviceEventEmitter.addListener(
      'favorites-updated',
      () => {
        console.log('[LikedSongPage] Favorites updated, refreshing...');
        // Clear cache and reload
        CacheManager.invalidate("favorites_data");
        loadFavoritesData(true);
      }
    );

    return () => {
      isMounted.current = false;
      favoritesUpdateListener.remove();
    };
  }, [animationValues, loadFavoritesData]);

  // Trigger animations when data loads
  useEffect(() => {
    if (filteredItems.length > 0 && !animationsInitialized) {
      filteredItems.forEach((item, index) => {
        const key = `${item.type}-${item.id}`;
        const vals = getAnimationValues(key, index);

        Animated.timing(vals.translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          delay: index * 50,
          useNativeDriver: true,
        }).start();

        Animated.timing(vals.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }).start();
      });

      setAnimationsInitialized(true);
    }
  }, [filteredItems, animationsInitialized]);

  // Back handler
  useEffect(() => {
    const handleBack = () => {
      if (showSearch) {
        setShowSearch(false);
        setSearchQuery("");
        return true;
      }
      navigation.navigate("Library", { screen: "LibraryPage" });
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBack
    );
    return () => backHandler.remove();
  }, [navigation, showSearch]);

  // Render song item (list view)
  const renderSongListItem = (item, index) => {
    const animations = getAnimationValues(`song-${item.id}`, index);

    return (
      <Animated.View
        key={`song-${item.id}-${index}`}
        style={{
          transform: [{ translateY: animations.translateY }],
          opacity: animations.opacity,
        }}
      >
        <Pressable
          style={styles.listItem}
          onPress={() => {
            const playData = [
              {
                url: typeof item.url === "string" ? item.url : item.url?.[0]?.url || "",
                title: item?.title || "Unknown",
                artist: item?.artist || "Unknown",
                artwork: typeof item?.artwork === "string" ? item.artwork : item?.artwork?.[2]?.url || "",
                duration: item?.duration || 0,
                id: item?.id || "",
                language: item?.language || "",
              },
            ];
            AddPlaylist(playData);
            updateTrack();
          }}
          android_ripple={{ color: theme.colors.card, borderless: false }}
        >
          <FastImage
            source={
              typeof item?.artwork === "string"
                ? { uri: item.artwork }
                : item?.artwork?.[2]?.url
                  ? { uri: item.artwork[2].url }
                  : DEFAULT_ALBUM_IMAGE
            }
            style={styles.listItemImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          <View style={styles.listItemDetails}>
            <Text
              style={[styles.listItemName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.listItemSubtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {item?.artist || "Unknown"} • Song
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Render song item (card view)
  const renderSongCardItem = (item, index) => {
    const animations = getAnimationValues(`song-${item.id}`, index);
    const imageSource =
      typeof item?.artwork === "string"
        ? { uri: item.artwork }
        : item?.artwork?.[2]?.url
          ? { uri: item.artwork[2].url }
          : DEFAULT_ALBUM_IMAGE;

    return (
      <Animated.View
        key={`song-card-${item.id}-${index}`}
        style={[
          styles.cardItem,
          {
            transform: [{ translateY: animations.translateY }],
            opacity: animations.opacity,
          },
        ]}
      >
        <Pressable
          style={styles.card}
          onPress={() => {
            const playData = [
              {
                url: typeof item.url === "string" ? item.url : item.url?.[0]?.url || "",
                title: item?.title || "Unknown",
                artist: item?.artist || "Unknown",
                artwork: typeof item?.artwork === "string" ? item.artwork : item?.artwork?.[2]?.url || "",
                duration: item?.duration || 0,
                id: item?.id || "",
                language: item?.language || "",
              },
            ];
            AddPlaylist(playData);
            updateTrack();
          }}
          android_ripple={{ color: theme.colors.card, borderless: false }}
        >
          <FastImage
            source={imageSource}
            style={styles.cardImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.95)"]}
            style={styles.cardGradient}
          >
            <Text
              style={styles.cardTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item?.title || "Unknown"}
            </Text>
            <Text
              style={styles.cardSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item?.artist || "Unknown"} • Song
            </Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  // Render album item (list view)
  const renderAlbumListItem = (item, index) => {
    const animations = getAnimationValues(`album-${item.id}`, index);
    const imageSource = item?.image ? { uri: item.image } : DEFAULT_ALBUM_IMAGE;

    return (
      <Animated.View
        key={`album-${item.id}-${index}`}
        style={{
          transform: [{ translateY: animations.translateY }],
          opacity: animations.opacity,
        }}
      >
        <Pressable
          style={styles.listItem}
          onPress={() => {
            navigation.navigate("Album", {
              id: item.id,
              name: item.name,
              timestamp: Date.now(),
              source: 'favorites',
            });
          }}
          android_ripple={{ color: theme.colors.card, borderless: false }}
        >
          <FastImage
            source={imageSource}
            style={styles.listItemImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          <View style={styles.listItemDetails}>
            <Text
              style={[styles.listItemName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={[styles.listItemSubtitle, { color: theme.colors.textSecondary }]}
            >
              Album
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Render album item (card view)
  const renderAlbumCardItem = (item, index) => {
    const animations = getAnimationValues(`album-${item.id}`, index);
    const imageSource = item?.image ? { uri: item.image } : DEFAULT_ALBUM_IMAGE;

    return (
      <Animated.View
        key={`album-card-${item.id}-${index}`}
        style={[
          styles.cardItem,
          {
            transform: [{ translateY: animations.translateY }],
            opacity: animations.opacity,
          },
        ]}
      >
        <Pressable
          style={styles.card}
          onPress={() => {
            navigation.navigate("Album", {
              id: item.id,
              name: item.name,
              timestamp: Date.now(),
              source: 'favorites',
            });
          }}
          android_ripple={{ color: theme.colors.card, borderless: false }}
        >
          <FastImage
            source={imageSource}
            style={styles.cardImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
            style={styles.cardGradient}
          >
            <Text
              style={styles.cardTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            <Text style={styles.cardSubtitle}>Album</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  };

  // Render item based on type and view mode
  const renderItem = (item, index) => {
    if (item.type === 'song') {
      return viewMode === 'list'
        ? renderSongListItem(item, index)
        : renderSongCardItem(item, index);
    } else {
      return viewMode === 'list'
        ? renderAlbumListItem(item, index)
        : renderAlbumCardItem(item, index);
    }
  };

  // Render content based on view mode
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="heart-multiple"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Loading your favorites...
          </Text>
        </View>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name={searchQuery ? "magnify-close" : "heart-plus-outline"}
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {searchQuery ? "No results found" : "No favorites yet"}
          </Text>
          <SmallText
            text={searchQuery ? `No matches for "${searchQuery}"` : "Like songs and albums to see them here"}
            style={{ color: theme.colors.textSecondary, marginTop: 8 }}
          />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        {/* Unified list - no categories/headers */}
        {viewMode === "list" ? (
          <View style={styles.listContainer}>
            {filteredItems.map((item, index) => renderItem(item, index))}
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredItems.map((item, index) => renderItem(item, index))}
          </View>
        )}

        {/* Bottom padding for mini player */}
        <Spacer height={150} />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={theme.colors.text}
            />
          </Pressable>
          {!showSearch && (
            <Heading
              text="Favorites"
              nospace={true}
              style={{ fontSize: 28, fontWeight: "900", marginLeft: 12 }}
            />
          )}
        </View>

        <View style={styles.headerRight}>
          {/* Search icon */}
          <Pressable
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true, radius: 20 }}
          >
            <MaterialCommunityIcons
              name={showSearch ? "close" : "magnify"}
              size={26}
              color={theme.colors.text}
            />
          </Pressable>

          {/* View mode toggle */}
          <Pressable
            style={styles.iconButton}
            onPress={toggleViewMode}
            android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true, radius: 20 }}
          >
            <MaterialCommunityIcons
              name={viewMode === "list" ? "view-grid" : "view-list"}
              size={26}
              color={theme.colors.primary}
            />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search favorites..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
      )}

      {/* Stats bar */}
      {!showSearch && combinedItems.length > 0 && (
        <View style={styles.statsBar}>
          <SmallText
            text={`${likedSongs.length} songs • ${likedAlbums.length} albums`}
            style={{ color: theme.colors.textSecondary }}
          />
        </View>
      )}

      {/* Content */}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButton: {
    padding: 4,
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  statsBar: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContainer: {
    paddingHorizontal: 4,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  // List item styles (unified for songs and albums)
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  listItemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  listItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  listItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  // Card styles (unified for songs and albums)
  cardItem: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  card: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
});
