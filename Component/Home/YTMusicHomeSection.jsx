import { useState, useEffect, useMemo } from "react";
import { View, Text, Dimensions, FlatList } from "react-native";
import { Heading } from "../Global/Heading";
import { EachPlaylistCard } from "../Global/EachPlaylistCard";
import { EachAlbumCard } from "../Global/EachAlbumCard";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacer } from "../Global/Spacer";

const { width } = Dimensions.get('window');

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const YTMusicHomeSection = () => {
  const [ytMusicItems, setYtMusicItems] = useState([]); // Changed from ytMusicSongs to ytMusicItems
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  // Complete cache reset function
  const resetAllCaches = async () => {
    try {
      console.log('� Ressetting ALL caches...');

      // Clear AsyncStorage completely
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('📋 Found AsyncStorage keys:', allKeys.length);

      // Remove all YTMusic related keys
      const ytMusicKeys = allKeys.filter(key =>
        key.toLowerCase().includes('ytmusic') ||
        key.toLowerCase().includes('homefeed') ||
        key.toLowerCase().includes('yt_music')
      );

      if (ytMusicKeys.length > 0) {
        await AsyncStorage.multiRemove(ytMusicKeys);
        console.log('🗑️  Removed YTMusic cache keys:', ytMusicKeys);
      }

      // Reset component state
      setYtMusicItems([]);
      setHasData(false);

      console.log('✅ Cache reset complete');
    } catch (error) {
      console.error('❌ Cache reset failed:', error);
    }
  };

  // Get the correct API base URL for React Native
  const getAPIBaseURL = () => {
    // Using localhost after adb reverse port forwarding
    // This works for both Android (after adb reverse) and iOS
    return 'http://localhost:5001';
  };

  // Debug function to test API directly
  const testAPIDirectly = async () => {
    try {
      const apiURL = getAPIBaseURL();
      console.log('🧪 Testing API directly at:', apiURL);
      const response = await fetch(`${apiURL}/api/homefeed?limit=5`);
      const data = await response.json();
      console.log('🧪 Direct API test result:', {
        status: data.status,
        sectionsCount: data.data?.feed?.length || 0,
        firstSection: data.data?.feed?.[0]?.sectionTitle || 'none'
      });
      return data;
    } catch (error) {
      console.error('🧪 Direct API test failed:', error.message);
      console.error('💡 If on physical device, update API URL to your computer IP address');
      return null;
    }
  };

  const fetchYTMusicHomeData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);

      // Force clear ALL possible cache keys
      const possibleCacheKeys = [
        'ytmusic_home_section',
        'ytmusic_homefeed',
        'yt_music_home',
        'ytmusic_data',
        'homefeed_data'
      ];

      for (const key of possibleCacheKeys) {
        await AsyncStorage.removeItem(key);
      }
      console.log('🧹 YTMusic Home - Cleared ALL cache keys, forcing fresh API call...');

      // Fetch fresh data from REST API server
      const apiURL = getAPIBaseURL();
      console.log('🌐 YTMusic Home - Making API call to:', `${apiURL}/api/homefeed`);

      let itemsArray = [];

      const response = await fetch(`${apiURL}/api/homefeed?limit=10`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      console.log('📡 YTMusic Home - API Response Status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const homeData = await response.json();
      console.log('📊 YTMusic Home - API Response Summary:', {
        status: homeData.status,
        sectionsCount: homeData.data?.feed?.length || 0,
        firstSectionTitle: homeData.data?.feed?.[0]?.sectionTitle || 'none'
      });

      // Only log full response if it's small
      if (JSON.stringify(homeData).length < 1000) {
        console.log('YTMusic Home - Raw API response:', JSON.stringify(homeData, null, 2));
      }

      // Handle the REST API response structure
      if (homeData.status === 'success' && homeData.data && homeData.data.feed) {
        console.log(`YTMusic Home - Processing ${homeData.data.feed.length} sections from API`);

        for (const section of homeData.data.feed) {
          console.log(`Processing section: "${section.sectionTitle}", items: ${section.items?.length || 0}`);

          if (section.items && Array.isArray(section.items)) {
            // Filter playlists and albums (not songs)
            const sectionItems = section.items
              .filter(item => {
                const isPlaylistOrAlbum = item.type === 'playlist' || item.type === 'album';
                console.log(`  Item: "${item.title}", type: ${item.type}, include: ${isPlaylistOrAlbum}`);
                return isPlaylistOrAlbum;
              })
              .map(item => ({
                ...item,
                sectionTitle: section.sectionTitle,
                // Use id as primary identifier
                downloadUrl: item.id
              }));

            if (sectionItems.length > 0) {
              itemsArray.push(...sectionItems);
              console.log(`✅ Added ${sectionItems.length} items from section: "${section.sectionTitle}"`);
            } else {
              console.log(`⚠️  No playlists/albums found in section: "${section.sectionTitle}"`);
            }
          }
        }
      } else {
        console.error('YTMusic Home - Invalid API response structure:', {
          status: homeData.status,
          hasData: !!homeData.data,
          hasFeed: !!(homeData.data && homeData.data.feed)
        });
      }

      console.log(`🎵 YTMusic Home - Total items collected: ${itemsArray.length}`);
      console.log(`📊 Breakdown: ${itemsArray.filter(i => i.type === 'playlist').length} playlists, ${itemsArray.filter(i => i.type === 'album').length} albums`);

      if (itemsArray.length > 0) {
        setYtMusicItems(itemsArray);
        setHasData(true);
        setLoading(false); // ✅ FIX: Set loading to false after data is loaded

        // Cache the data
        await AsyncStorage.setItem('ytmusic_home_section', JSON.stringify(itemsArray));
        console.log('✅ YTMusic data cached successfully');
        console.log('🎉 YTMusic content ready to display!');
      } else {
        console.log('⚠️  No playlists or albums found in API response');
        setYtMusicItems([]);
        setHasData(false);
        setLoading(false); // Set loading to false even if no data
      }

    } catch (error) {
      console.error('YTMusic homefeed error:', error);

      // Provide more detailed error information
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        console.error('Network Error Details:', {
          message: 'Cannot connect to YTMusic API server',
          suggestion: 'Make sure restapi_prod.py is running on port 5001',
          command: 'python restapi_prod.py'
        });
      } else if (error.message.includes('HTTP')) {
        console.error('HTTP Error Details:', {
          error: error.message,
          suggestion: 'Check if the API server is responding correctly'
        });
      }

      // Set empty array on error to prevent undefined
      setYtMusicItems([]);
      setHasData(false);

      // Keep existing data if available - don't reset to undefined
    } finally {
      // Always set loading to false when done, regardless of forceRefresh
      setLoading(false);
      console.log('🏁 YTMusic fetch complete, loading set to false');
    }
  };

  useEffect(() => {
    console.log('🚀 YTMusicHomeSection - Component mounted at', new Date().toISOString());

    const initializeYTMusic = async () => {
      // Step 1: Reset all caches
      await resetAllCaches();

      // Step 2: Test API connection
      console.log('🧪 Testing API connection...');
      const testResult = await testAPIDirectly();

      if (testResult && testResult.status === 'success') {
        console.log('✅ API test successful, proceeding with data fetch...');
        // Step 3: Fetch fresh data
        await fetchYTMusicHomeData(true);
      } else {
        console.error('❌ API test failed, cannot fetch YTMusic data');
        console.log('💡 Make sure restapi_prod.py is running on port 5001');
      }
    };

    initializeYTMusic();
  }, []);

  // Process YTMusic items (playlists/albums) to match app format
  const processedItems = useMemo(() => {
    console.log('Processing YT Music items:', ytMusicItems.length, 'items');

    if (!Array.isArray(ytMusicItems) || ytMusicItems.length === 0) {
      console.log('No items to process, returning empty array');
      return [];
    }

    const processed = ytMusicItems.map((item, index) => {
      console.log(`Processing item ${index + 1}:`, item.title || 'unknown', `(type: ${item.type})`);

      // Get the best thumbnail (largest available)
      const bestThumbnail = item.thumbnails?.reduce((best, current) =>
        (current.height > (best?.height || 0)) ? current : best
      );

      // Create proper image array for the UI components
      const imageArray = item.thumbnails?.map(thumb => ({
        url: thumb.url,
        link: thumb.url, // Add link property for compatibility
        quality: thumb.height <= 192 ? "50x50" : thumb.height <= 226 ? "150x150" : "500x500"
      })) || [{
        url: "https://via.placeholder.com/150",
        link: "https://via.placeholder.com/150",
        quality: "150x150"
      }];

      const processedItem = {
        id: item.id || `yt_${Math.random()}`,
        name: item.title || "Unknown Title",
        title: item.title || "Unknown Title",
        subtitle: item.type === 'playlist'
          ? `YouTube Music Playlist • ${item.sectionTitle || 'Curated'}`
          : (item.year ? `Album • ${item.year}` : `Album • ${item.sectionTitle || 'YouTube Music'}`),
        image: imageArray,
        artist: "YouTube Music",
        artists: "YouTube Music",
        duration: "0:00",
        language: "unknown",
        album: "",
        downloadUrl: item.id,
        primaryArtists: "YouTube Music",
        playlists: [],
        explicit: 0,
        views: "0",
        type: item.type, // playlist or album
        thumbnailUrl: bestThumbnail?.url || item.thumbnails?.[0]?.url || 'https://via.placeholder.com/150',
        sectionTitle: item.sectionTitle // Keep section info for debugging
      };

      console.log(`✅ Processed: "${processedItem.name}" (${processedItem.type})`);
      return processedItem;
    });

    console.log(`🎵 Total processed items: ${processed.length} (${processed.filter(i => i.type === 'playlist').length} playlists, ${processed.filter(i => i.type === 'album').length} albums)`);
    return processed;
  }, [ytMusicItems]);

  // Separate playlists and albums
  const playlists = useMemo(() => {
    return processedItems.filter(item => item.type === 'playlist');
  }, [processedItems]);

  const albums = useMemo(() => {
    return processedItems.filter(item => item.type === 'album');
  }, [processedItems]);

  // Always show the section if we have data or are loading for the first time
  const shouldShowSection = hasData || loading;

  console.log('YTMusicHomeSection - Render:', {
    loading,
    hasData,
    shouldShowSection,
    itemsCount: ytMusicItems.length,
    processedItemsCount: processedItems.length,
    playlistsCount: playlists.length,
    albumsCount: albums.length
  });

  // Show section even if no data yet, but don't render content
  return (
    <View>
      {shouldShowSection && (
        <>
          {/* YTMusic Brand Header */}
          <View style={{
            paddingHorizontal: 13,
            marginTop: 16,
            marginBottom: 8
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 4
            }}>
              <View style={{
                width: 20,
                height: 20,
                backgroundColor: '#FF0000',
                borderRadius: 4,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 'bold'
                }}>
                  YT
                </Text>
              </View>
              <Text style={{
                color: '#FF0000',
                fontSize: 18,
                fontWeight: 'bold'
              }}>
                YouTube Music
              </Text>
            </View>
            <Text style={{
              color: '#666',
              fontSize: 12,
              lineHeight: 16
            }}>
              Popular playlists and albums from YouTube Music
            </Text>
          </View>

          {/* YTMusic Playlists Section */}
          {(playlists.length > 0 || (loading && playlists.length === 0)) && (
            <>
              <Spacer />
              <Spacer />
              <Heading text={loading ? "Loading..." : "🎵 YouTube Music Playlists"} nospace={true} />
              <Spacer />

              {!loading && playlists.length > 0 && (
                <FlatList
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingLeft: 10,
                    paddingRight: 5,
                    gap: 2,
                  }}
                  data={playlists}
                  keyExtractor={(item, index) => `yt-playlist-${item.id}-${index}`}
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
                      name={truncateText(item.name, 30)}
                      follower={truncateText(item.subtitle, 30)}
                      key={index}
                      image={item.image?.[2]?.link || item.image?.[1]?.link || item.image?.[0]?.link || item.thumbnailUrl}
                      id={item.id}
                      source="YTMusic"
                      MainContainerStyle={{
                        marginHorizontal: 4,
                      }}
                    />
                  )}
                />
              )}

              {loading && (
                <View style={{
                  height: 280,
                }}>
                  <Text style={{
                    color: '#666',
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 20
                  }}>
                    Loading playlists from YouTube Music...
                  </Text>
                </View>
              )}
            </>
          )}

          {/* YTMusic Albums Section */}
          {(albums.length > 0 || (loading && albums.length === 0)) && (
            <>
              <Spacer />
              <Spacer />
              <Heading text={loading ? "Loading..." : "💿 YouTube Music Albums"} nospace={true} />
              <Spacer />

              {!loading && albums.length > 0 && (
                <FlatList
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingLeft: 10,
                    paddingRight: 5,
                    gap: 2,
                  }}
                  data={albums}
                  keyExtractor={(item, index) => `yt-album-${item.id}-${index}`}
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
                      image={item.image?.[2]?.link || item.image?.[1]?.link || item.image?.[0]?.link || item.thumbnailUrl}
                      artists={item.artists || "YouTube Music"}
                      key={index}
                      name={truncateText(item.name, 30)}
                      id={item.id}
                      source="YTMusic"
                    />
                  )}
                />
              )}

              {loading && (
                <View style={{
                  height: 280,
                }}>
                  <Text style={{
                    color: '#666',
                    fontSize: 14,
                    textAlign: 'center',
                    marginTop: 20
                  }}>
                    Loading albums from YouTube Music...
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Show empty state if no content and not loading */}
          {(!loading && playlists.length === 0 && albums.length === 0) && (
            <View style={{
              paddingHorizontal: 13,
              marginTop: 8,
              marginBottom: 16
            }}>
              <Text style={{
                color: '#666',
                fontSize: 14,
                textAlign: 'center',
                marginVertical: 10
              }}>
                No playlists or albums available from YouTube Music
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};
