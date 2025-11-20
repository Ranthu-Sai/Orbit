import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Dimensions, FlatList } from "react-native";
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

  const fetchYTMusicHomeData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);

      // Try cache first
      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem('ytmusic_home_section');
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('YTMusic Home - Using cached data:', parsed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setYtMusicItems(parsed);
            setHasData(true);
            if (!forceRefresh) setLoading(false);
            return;
          }
        }
      }

      // Fetch fresh data from REST API server
      console.log('YTMusic Home - Fetching fresh data from REST API...');

      let itemsArray = [];

      const response = await fetch('http://localhost:5000/api/homefeed?limit=10');
      const homeData = await response.json();
      console.log('YTMusic Home - Raw API response:', JSON.stringify(homeData, null, 2));

      // Handle the REST API response structure
      if (homeData.data && homeData.data.feed) {
        // REST API returns {status: "success", data: {feed: [...]}}
        for (const section of homeData.data.feed) {
          console.log(`Processing section: ${section.sectionTitle}, items: ${section.items?.length || 0}`);

          if (section.items && Array.isArray(section.items)) {
            // Filter playlists and albums (not songs)
            const sectionItems = section.items
              .filter(item => {
                console.log(`  Item: ${item.title}, type: ${item.type}`);
                return item.type === 'playlist' || item.type === 'album';
              })
              .map(item => ({
                ...item,
                sectionTitle: section.sectionTitle,
                // Use id as primary identifier
                downloadUrl: item.id
              }));

            itemsArray.push(...sectionItems);

            console.log(`Added ${sectionItems.length} items from section: ${section.sectionTitle}`);
          }
        }
      }

      console.log(`YTMusic Home - Total items collected: ${itemsArray.length}`);

      setYtMusicItems(itemsArray);
      setHasData(itemsArray.length > 0);

      // Cache the data
      await AsyncStorage.setItem('ytmusic_home_section', JSON.stringify(itemsArray));

    } catch (error) {
      console.error('Error fetching YTMusic home data:', error);

      // Set empty array on error to prevent undefined
      setYtMusicItems([]);
      setHasData(false);

      // Keep existing data if available - don't reset to undefined
    } finally {
      if (!forceRefresh) setLoading(false);
    }
  };

  useEffect(() => {
    console.log('YTMusicHomeSection - Component mounted, fetching data...');
    fetchYTMusicHomeData();
  }, []);

  // Process YTMusic items (playlists/albums) to match app format
  const processedItems = useMemo(() => {
    console.log('Processing YT Music items:', ytMusicItems);

    if (!Array.isArray(ytMusicItems) || ytMusicItems.length === 0) {
      console.log('No items to process, returning empty array');
      return [];
    }

    const processed = ytMusicItems.map(item => {
      console.log('Processing item:', item.title || 'unknown', `(type: ${item.type})`);

      // Get the best thumbnail (largest available)
      const bestThumbnail = item.thumbnails?.reduce((best, current) =>
        (current.height > (best?.height || 0)) ? current : best
      );

      return {
        id: item.id || `yt_${Math.random()}`,
        name: item.title || "Unknown Title",
        title: item.title || "Unknown Title",
        subtitle: item.type === 'playlist' ? 'YouTube Music Playlist' : (item.year ? `Album • ${item.year}` : 'Album'),
        image: item.thumbnails?.map(thumb => ({
          url: thumb.url,
          link: thumb.url, // Add link property for compatibility
          quality: thumb.height <= 192 ? "50x50" : thumb.height <= 226 ? "150x150" : "500x500"
        })) || [{
          url: "https://via.placeholder.com/150",
          link: "https://via.placeholder.com/150",
          quality: "150x150"
        }],
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
        thumbnailUrl: bestThumbnail?.url || item.thumbnails?.[0]?.url || 'https://via.placeholder.com/150'
      };
    });

    console.log('Processed items count:', processed.length);
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
