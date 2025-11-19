import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { Heading } from "../Global/Heading";
import { EachSongCard } from "../Global/EachSongCard";
import { getYTMusicHomeFeed, transformYTMusicHomeToOrbit } from "../../Api/YTMusic";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacer } from "../Global/Spacer";

const { width } = Dimensions.get('window');

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const YTMusicHomeSection = () => {
  const [ytMusicSongs, setYtMusicSongs] = useState([]);
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
            setYtMusicSongs(parsed);
            setHasData(true);
            if (!forceRefresh) setLoading(false);
            return;
          }
        }
      }

      // Fetch fresh data from actual YTMusic API
      console.log('YTMusic Home - Fetching fresh data from actual API...');

      let songsArray = [];

      try {
        const response = await fetch('http://localhost:8080/test/get_home?limit=10');

        if (response.ok) {
          const homeData = await response.json();
          console.log('YTMusic Home - Raw API response:', homeData);
          songsArray = Array.isArray(homeData) ? homeData : [];
        } else {
          console.log('HTTP server not available, using mock data');
          // Use some mock data for testing when server isn't running
          songsArray = [
            {
              videoId: "dQw4w9WgXcQ",
              title: "Rick Astley - Never Gonna Give You Up",
              artists: [{ name: "Rick Astley" }],
              thumbnails: [
                { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", height: 180, width: 320 }
              ],
              views: "1.5B",
              album: { name: "Whenever You Need Somebody" }
            },
            {
              videoId: "JGwWNGJdvx8",
              title: "Billie Eilish - bad guy",
              artists: [{ name: "Billie Eilish" }],
              thumbnails: [
                { url: "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg", height: 180, width: 320 }
              ],
              views: "2.1B",
              album: { name: "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?" }
            },
            {
              videoId: "hTWKbfoikeg",
              title: "The Weeknd - Blinding Lights",
              artists: [{ name: "The Weeknd" }],
              thumbnails: [
                { url: "https://img.youtube.com/vi/hTWKbfoikeg/mqdefault.jpg", height: 180, width: 320 }
              ],
              views: "4.2B",
              album: { name: "After Hours" }
            },
            {
              videoId: "fJ9rUzIMcZQ",
              title: "Daft Punk - Harder, Better, Faster, Stronger",
              artists: [{ name: "Daft Punk" }],
              thumbnails: [
                { url: "https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg", height: 180, width: 320 }
              ],
              views: "820M",
              album: { name: "Discovery" }
            }
          ];
        }

        // Set songs directly (API returns array of songs)
        setYtMusicSongs(songsArray);
        setHasData(songsArray.length > 0);

        // Cache the data
        await AsyncStorage.setItem('ytmusic_home_section', JSON.stringify(songsArray));

      } catch (error) {
        console.log('Network request failed, using fallback mock data');

        // Fallback mock data when network completely fails
        songsArray = [
          {
            videoId: "dQw4w9WgXcQ",
            title: "Classic Hit - Never Gonna Give You Up",
            artists: [{ name: "Rick Astley" }],
            thumbnails: [
              { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", height: 180, width: 320 }
            ],
            views: "1B+",
            album: { name: "Classic Album" }
          },
          {
            videoId: "JGwWNGJdvx8",
            title: "Modern Hit - bad guy",
            artists: [{ name: "Billie Eilish" }],
            thumbnails: [
              { url: "https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg", height: 180, width: 320 }
            ],
            views: "2B+",
            album: { name: "Modern Album" }
          }
        ];

        setYtMusicSongs(songsArray);
        setHasData(songsArray.length > 0);
        await AsyncStorage.setItem('ytmusic_home_section', JSON.stringify(songsArray));
      }

    } catch (error) {
      console.error('Error fetching YTMusic home data:', error);

      // Set empty array on error to prevent undefined
      setYtMusicSongs([]);
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

  // Process YTMusic songs to match app format
  const processedSongs = useMemo(() => {
    console.log('Processing songs:', ytMusicSongs);

    if (!Array.isArray(ytMusicSongs) || ytMusicSongs.length === 0) {
      console.log('No songs to process, returning empty array');
      return [];
    }

    const processed = ytMusicSongs.slice(0, 8).map(song => {
      console.log('Processing song:', song.title || 'unknown');
      return {
        id: song.videoId || song.id || `yt_${Math.random()}`,
        name: song.title || "Unknown Title",
        title: song.title || "Unknown Title",
        subtitle: song.artists?.map(artist => artist.name).join(", ") || "YouTube Music",
        image: song.thumbnails?.map(thumb => ({
          url: thumb.url,
          quality: thumb.height === 60 ? "50x50" : thumb.height === 120 ? "150x150" : "500x500"
        })) || [],
        artist: song.artists?.[0]?.name || "YouTube Music",
        artists: {
          primary: song.artists || []
        },
        duration: "0:00", // YTMusic doesn't provide duration
        language: "unknown",
        album: song.album?.name || "",
        downloadUrl: song.videoId || "",
        primaryArtists: song.artists?.[0]?.name || "YouTube Music",
        playlists: [],
        explicit: song.isExplicit ? 1 : 0,
        views: song.views || "0"
      };
    });

    console.log('Processed songs count:', processed.length);
    return processed;
  }, [ytMusicSongs]);

  // Split songs into two groups for 2-row layout
  const getSongGroups = useMemo(() => {
    if (!processedSongs || processedSongs.length === 0) {
      return { firstGroup: [], secondGroup: [] };
    }
    return {
      firstGroup: processedSongs.slice(0, 4),
      secondGroup: processedSongs.slice(4, 8)
    };
  }, [processedSongs]);

  // Always show the section if we have data or are loading for the first time
  const shouldShowSection = hasData || loading;

  console.log('YTMusicHomeSection - Render:', {
    loading,
    hasData,
    shouldShowSection,
    songsCount: ytMusicSongs.length,
    processedSongsCount: processedSongs.length
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
              Popular songs trending on YouTube Music
            </Text>
          </View>

          {/* YTMusic Trending Songs Section */}
          {(processedSongs.length > 0 || loading) && (
            <>
              <Spacer />
              <Spacer />
              <Heading text={loading ? "Loading..." : "🔥 Trending Songs"} nospace={true} />
              <Spacer />

              {!loading && processedSongs.length > 0 && (
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
                  <View>
                    {getSongGroups.firstGroup.map((song, i) => (
                      <View key={`yt-first-${song.id}-${i}`} style={{ marginBottom: 1, marginVertical: 0 }}>
                        <EachSongCard
                          index={i}
                          artist={truncateText(song.artists.primary?.map(a => a.name).join(", ") || song.artist, 30)}
                          language={song.language}
                          image={song.image[2]?.url || song.image[1]?.url || song.image[0]?.url || ''}
                          id={song.id}
                          width={width * 0.80}
                          title={truncateText(song.name, 30)}
                          url={song.downloadUrl}
                          titleandartistwidth={width * 0.5}
                          showNumber={false}
                          source="YTMusic"
                        />
                      </View>
                    ))}
                  </View>
                  <View>
                    {getSongGroups.secondGroup.map((song, i) => (
                      <View key={`yt-second-${song.id}-${i}`} style={{ marginBottom: 1, marginVertical: 0 }}>
                        <EachSongCard
                          index={i + 4}
                          artist={truncateText(song.artists.primary?.map(a => a.name).join(", ") || song.artist, 30)}
                          language={song.language}
                          image={song.image[2]?.url || song.image[1]?.url || song.image[0]?.url || ''}
                          id={song.id}
                          width={width * 0.80}
                          title={truncateText(song.name, 30)}
                          url={song.downloadUrl}
                          titleandartistwidth={width * 0.5}
                          showNumber={false}
                          source="YTMusic"
                        />
                      </View>
                    ))}
                  </View>
                </ScrollView>
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
                    Loading trending songs from YouTube Music...
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Show empty state if no songs and not loading */}
          {(!loading && processedSongs.length === 0) && (
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
                No trending songs available from YouTube Music
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};
