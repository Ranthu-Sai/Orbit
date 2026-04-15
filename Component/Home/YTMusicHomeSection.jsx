import {
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { View, Text, Dimensions, FlatList } from 'react-native';
import { Heading } from '../Global/Heading';
import { EachPlaylistCard } from '../Global/EachPlaylistCard';

const { width } = Dimensions.get('window');
import { EachAlbumCard } from '../Global/EachAlbumCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Spacer } from '../Global/Spacer';
import YouTubeMusicService from '../../Utils/YouTubeMusicService';
import { PlaylistRowSkeleton } from './PlaylistRowSkeleton';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sections to filter out - these are YouTube video categories, not music
// OuterTune approach: hide video-like content and show only music-focused sections
const VIDEO_SECTION_TITLES = [
  'true crime',
  'religion',
  'motivation',
  'comedy',
  'gaming',
  'sports',
  'news',
  'education',
  'science & technology',
  'travel & events',
  'autos & vehicles',
  'pets & animals',
  'howto & style',
  'people & blogs',
  'entertainment',
  'film & animation',
  'nonprofits & activism',
];

// Sections the user explicitly asked to remove via screenshots
const EXCLUDED_SECTION_TITLES = [
  'chilled',
  'unwind and explore',
  'beast mode',
  'in the gym',
  'yoga',
  'outdoor',
  'top weekly videos',
  'new releases',
  'sweethearts & romance',
  'easy mornings',
  'charts',
  'power boost',
  'breakups & heartbreak',
];

// Check if a section is video-like (non-music content) or explicitly excluded
const isVideoSection = (section) => {
  const title = (section.title || '').toLowerCase().trim();

  // Check against known video category titles
  if (VIDEO_SECTION_TITLES.some((videoTitle) => title.includes(videoTitle))) {
    return true;
  }

  // Check against explicitly excluded titles from user screenshots
  if (EXCLUDED_SECTION_TITLES.some((exTitle) => title.includes(exTitle))) {
    return true;
  }

  // Check if items have video-like thumbnails (16:9 aspect ratio)
  const contents = section.contents || section.items || [];
  if (contents.length > 0) {
    const firstItem = contents[0];
    const thumbnails = firstItem?.thumbnails || [];

    if (thumbnails.length > 0) {
      const thumb = thumbnails[0];
      // Video thumbnails are typically 16:9 (width/height > 1.5)
      // Music thumbnails are typically 1:1 or close to square
      if (thumb.width && thumb.height) {
        const aspectRatio = thumb.width / thumb.height;
        // If aspect ratio is > 1.4, it's likely a video thumbnail
        if (aspectRatio > 1.4) {
          return true;
        }
      }
    }

    // Check if items don't have typical music identifiers
    const hasNoMusicContent = contents.every(
      (item) =>
        !item.videoId &&
        !item.playlistId &&
        !item.browseId?.startsWith('MPRE') &&
        !item.browseId?.startsWith('UC') &&
        !item.browseId?.startsWith('VL')
    );

    if (hasNoMusicContent && contents.length > 2) {
      return true;
    }
  }

  return false;
};

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) {
    return '';
  }
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const YTMusicHomeSection = forwardRef((props, ref) => {
  // Maximum sections to display in Hybrid mode for performance
  const MAX_SECTIONS = 6;

  const [ytMusicItems, setYtMusicItems] = useState([]); // Changed from ytMusicSongs to ytMusicItems
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const hasInitiallyLoaded = useRef(false);

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await fetchYTMusicHomeData(true);
    },
  }));

  // Complete cache reset function
  const resetAllCaches = async () => {
    try {
      // Clear AsyncStorage completely
      const allKeys = await AsyncStorage.getAllKeys();
      // Remove all YTMusic related keys
      const ytMusicKeys = allKeys.filter(
        (key) =>
          key.toLowerCase().includes('ytmusic') ||
          key.toLowerCase().includes('homefeed') ||
          key.toLowerCase().includes('yt_music')
      );

      if (ytMusicKeys.length > 0) {
        await AsyncStorage.multiRemove(ytMusicKeys);
      }

      // Reset component state
      setYtMusicItems([]);
      setHasData(false);
    } catch (error) {
      console.error('❌ Cache reset failed:', error);
    }
  };

  // Initialize Innertube Client
  const initializeInnertube = async () => {
    try {
      const success = await YouTubeMusicService.initialize();
      if (success) {
        return true;
      } else {
        console.error('❌ Innertube Client initialization failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Innertube Client initialization error:', error);
      return false;
    }
  };

  const fetchYTMusicHomeData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        setLoading(true);
      }

      // Clear local cache if forcing refresh
      if (forceRefresh) {
        const possibleCacheKeys = [
          'ytmusic_home_section',
          'ytmusic_homefeed',
          'yt_music_home',
          'ytmusic_data',
          'homefeed_data',
        ];

        for (const key of possibleCacheKeys) {
          await AsyncStorage.removeItem(key);
        }
      }
      // Fetch data using YouTube Music Service
      // Limit sections fetched for Hybrid mode performance
      const HOMEFEED_SECTION_LIMIT = 40; // Increased to ensure 'Albums for you' is found
      const homeData = await YouTubeMusicService.getHomeFeed(
        HOMEFEED_SECTION_LIMIT,
        forceRefresh
      );

      let itemsArray = [];

      // Process the YTMusic API response (direct from Python)
      if (Array.isArray(homeData) && homeData.length > 0) {
        for (const section of homeData) {
          const sectionTitle = section.title || 'Unknown Section';

          // Skip "Quick picks" section as requested
          if (
            sectionTitle.toLowerCase().includes('quick pick') ||
            isVideoSection(section)
          ) {
            continue;
          }

          // if (section.contents && Array.isArray(section.contents)) {
          // Filter and process playlists and albums
          const sectionItems = section.contents
            .filter((item) => {
              // Skip null or undefined items
              if (!item || typeof item !== 'object') {
                return false;
              }

              // Determine if item is a playlist or album based on available IDs
              // YTMusic playlists have playlistId (starts with RDCLAK, PL, VL, etc.)
              // YTMusic albums have browseId (starts with MPREb_)
              const hasPlaylistId =
                item.playlistId && typeof item.playlistId === 'string';
              const hasBrowseId =
                item.browseId && typeof item.browseId === 'string';
              const hasVideoId =
                item.videoId && typeof item.videoId === 'string';

              // Include if it has playlistId or browseId
              // Note: Some albums have videoId for "Quick Play" - we should still include them
              const include = hasPlaylistId || hasBrowseId;

              if (!include) {
              }

              return include;
            })
            .map((item) => {
              // Determine type based on ID patterns
              const isPlaylist =
                (item.playlistId && typeof item.playlistId === 'string') ||
                item.type === 'playlist';
              // browseId starting with MPRE or OLAK is strictly an album
              const isAlbum =
                (item.browseId &&
                  (item.browseId.startsWith('MPRE') ||
                    item.browseId.startsWith('OLAK'))) ||
                item.type === 'album';

              // Normalize the item structure
              const normalizedItem = {
                id: item.playlistId || item.browseId || `yt_${Math.random()}`,
                title: item.title || 'Unknown Title',
                type: isPlaylist ? 'playlist' : 'album',
                thumbnails: item.thumbnails || item.thumbnail || [],
                artists: item.artists || [],
                year: item.year,
                sectionTitle: sectionTitle,
                sectionStrapline: section.strapline,
                downloadUrl: item.playlistId || item.browseId,
              };

              return normalizedItem;
            });

          if (sectionItems.length > 0) {
            itemsArray.push(...sectionItems);
            // } else {
            // }
          }
        }
      } else {
        console.error('YTMusic Home - Invalid Python response structure:', {
          isArray: Array.isArray(homeData),
          length: homeData?.length || 0,
          type: typeof homeData,
        });
      }

      if (itemsArray.length > 0) {
        setYtMusicItems(itemsArray);
        setHasData(true);
        setLoading(false);

        // Cache the data locally
        await AsyncStorage.setItem(
          'ytmusic_home_section',
          JSON.stringify(itemsArray)
        );
      } else {
        setYtMusicItems([]);
        setHasData(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('YTMusic homefeed error:', error);

      // Provide more detailed error information
      if (
        error.message.includes('Python') ||
        error.message.includes('ModuleNotFoundError')
      ) {
        console.error('Python Error Details:', {
          message: error.message,
          suggestion: 'Check if YouTube Music Service is properly configured',
        });
      }

      // Set empty array on error to prevent undefined
      setYtMusicItems([]);
      setHasData(false);
    } finally {
      // Always set loading to false when done, regardless of forceRefresh
      setLoading(false);
      hasInitiallyLoaded.current = true;
    }
  };

  useEffect(() => {
    const initializeYTMusic = async () => {
      // Step 1: Check for cached data FIRST (don't reset on every mount!)
      try {
        const cachedData = await AsyncStorage.getItem('ytmusic_home_section');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (
            parsedData &&
            Array.isArray(parsedData) &&
            parsedData.length > 0
          ) {
            setYtMusicItems(parsedData);
            setHasData(true);
            setLoading(false);
            return; // EXIT - Use cached data
          }
        }
      } catch (cacheError) {}

      // Step 2: No valid cache - initialize and fetch fresh
      const bridgeReady = await initializeInnertube();

      if (bridgeReady) {
        // Fetch fresh data with higher limit to get more sections
        await fetchYTMusicHomeData(true);
      } else {
        console.error(
          '❌ YouTube Music Service initialization failed, cannot fetch YTMusic data'
        );
        setLoading(false);
      }
    };

    initializeYTMusic();
  }, []);

  // Process YTMusic items (playlists/albums) to match app format
  const processedItems = useMemo(() => {
    if (!Array.isArray(ytMusicItems) || ytMusicItems.length === 0) {
      return [];
    }

    const processed = ytMusicItems.map((item, index) => {
      // // Get the best thumbnail (largest available) safety check
      let bestThumbnail = null;
      if (
        item.thumbnails &&
        Array.isArray(item.thumbnails) &&
        item.thumbnails.length > 0
      ) {
        bestThumbnail = item.thumbnails.reduce(
          (best, current) =>
            current.height > (best?.height || 0) ? current : best,
          item.thumbnails[0]
        ); // Provide initial value just in case
      }

      // Create proper image array for the UI components
      const imageArray = item.thumbnails?.map((thumb) => ({
        url: thumb.url,
        link: thumb.url, // Add link property for compatibility
        quality:
          thumb.height <= 192
            ? '50x50'
            : thumb.height <= 226
            ? '150x150'
            : '500x500',
      })) || [
        {
          url: bestThumbnail?.url || 'https://via.placeholder.com/150',
          link: bestThumbnail?.url || 'https://via.placeholder.com/150',
          quality: '150x150',
        },
      ];

      const processedItem = {
        id: item.id || `yt_${Math.random()}`,
        name: item.title || 'Unknown Title',
        title: item.title || 'Unknown Title',
        subtitle:
          item.type === 'playlist'
            ? `YouTube Music Playlist • ${item.sectionTitle || 'Curated'}`
            : item.year
            ? `Album • ${item.year}`
            : `Album • ${item.sectionTitle || 'YouTube Music'}`,
        artist: item.artists?.[0]?.name || 'YouTube Music',
        artists: item.artists?.map((a) => a.name).join(', ') || 'YouTube Music',
        image: imageArray,
        duration: '0:00',
        language: 'unknown',
        album: '',
        downloadUrl: item.id,
        primaryArtists: item.artists?.[0]?.name || 'YouTube Music',
        playlists: [],
        explicit: 0,
        views: '0',
        type: item.type, // playlist or album
        thumbnailUrl:
          bestThumbnail?.url ||
          item.thumbnails?.[0]?.url ||
          'https://via.placeholder.com/150',
        sectionTitle: item.sectionTitle, // Keep section info for debugging
        sectionStrapline: item.sectionStrapline,
      };

      return processedItem;
    });

    return processed;
  }, [ytMusicItems]);

  // Group items by section title
  const sectionsByTitle = useMemo(() => {
    const sections = {};
    processedItems.forEach((item) => {
      const sectionTitle = item.sectionTitle || 'Other';
      if (!sections[sectionTitle]) {
        sections[sectionTitle] = [];
      }
      sections[sectionTitle].push(item);
    });
    return sections;
  }, [processedItems]);

  // Get section titles in order - LIMITED for Hybrid performance
  const sectionTitles = useMemo(() => {
    const allTitles = Object.keys(sectionsByTitle);

    // Prioritize "Albums for you" to ensure it's included in the limited sections
    const albumsForYouIndex = allTitles.findIndex((t) =>
      t.toLowerCase().includes('albums for you')
    );

    if (albumsForYouIndex !== -1 && albumsForYouIndex >= MAX_SECTIONS) {
      // If it exists but is outside the limit, move it to the last position of the limit
      const result = allTitles.slice(0, MAX_SECTIONS);
      result[MAX_SECTIONS - 1] = allTitles[albumsForYouIndex];
      return result;
    }

    return allTitles.slice(0, MAX_SECTIONS);
  }, [sectionsByTitle]);

  // Always show the section if we have data or are loading for the first time
  const shouldShowSection = hasData || loading;

  // Show section even if no data yet, but don't render content
  const renderAllSections = () => {
    // Only render sections starting from startIndex
    const visibleSectionTitles = sectionTitles.slice(props.startIndex || 0);

    return (
      <>
        {/* Render each section separately */}
        {visibleSectionTitles.map((sectionTitle, index) => {
          const actualIndex = index + (props.startIndex || 0);
          return renderSingleSection(sectionTitle, actualIndex);
        })}

        {/* Show empty state only after initial load has completed and failed */}
        {!loading && sectionTitles.length === 0 && hasInitiallyLoaded.current && (
          <PaddingConatiner>
            <View
              style={{
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: '#666',
                  fontSize: 14,
                  textAlign: 'center',
                  marginVertical: 10,
                }}
              >
                No content available from YouTube Music
              </Text>
            </View>
          </PaddingConatiner>
        )}
      </>
    );
  };

  const renderSingleSection = (sectionTitle, sectionIndex) => {
    const sectionItems = sectionsByTitle[sectionTitle];
    if (!sectionItems) {
      return null;
    }

    const playlistsInSection = sectionItems.filter(
      (item) => item.type === 'playlist'
    );
    const albumsInSection = sectionItems.filter(
      (item) => item.type === 'album'
    );

    return (
      <View key={`section-${sectionIndex}`}>
        {/* Section Header */}
        <Spacer />
        <Spacer />
        {!loading && (
          <PaddingConatiner>
            <Heading
              text={sectionTitle}
              description={sectionItems[0]?.sectionStrapline}
              nospace={true}
            />
          </PaddingConatiner>
        )}
        <Spacer />

        {/* Playlists in this section */}
        {playlistsInSection.length > 0 && (
          <>
            {!loading && (
              <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 10,
                  paddingRight: 5,
                  gap: 2,
                }}
                data={playlistsInSection}
                keyExtractor={(item, index) =>
                  `yt-playlist-${sectionTitle}-${item.id}-${index}`
                }
                ListEmptyComponent={() => (
                  <View
                    style={{
                      width: width - 30,
                      height: 250,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 16 }}>
                      No playlists available
                    </Text>
                  </View>
                )}
                renderItem={({ item, index }) => {
                  const thumbnail =
                    item.image?.[2]?.link ||
                    item.image?.[1]?.link ||
                    item.image?.[0]?.link ||
                    item.thumbnailUrl;
                  const itemTitle = item.title || item.name;
                  const subtitle = item.subtitle || item.artists?.[0]?.name;
                  const isPlaylist =
                    !!item.playlistId || item.type === 'playlist';
                  const browseId = item.browseId || item.id;
                  const isAlbum =
                    (browseId &&
                      (browseId.startsWith('MPRE') ||
                        browseId.startsWith('OLAK'))) ||
                    item.type === 'album';

                  if (isAlbum) {
                    return (
                      <EachAlbumCard
                        image={thumbnail}
                        name={truncateText(itemTitle, 30)}
                        artists={truncateText(subtitle, 30)}
                        id={browseId}
                        source="YTMusic"
                        key={`yt-album-${sectionTitle}-${item.id}-${index}`}
                      />
                    );
                  }

                  return (
                    <EachPlaylistCard
                      name={truncateText(itemTitle, 30)}
                      follower={truncateText(subtitle, 30)}
                      key={`yt-playlist-${sectionTitle}-${item.id}-${index}`}
                      image={thumbnail}
                      id={item.id}
                      source="YTMusic"
                      MainContainerStyle={{
                        marginHorizontal: 4,
                      }}
                    />
                  );
                }}
              />
            )}
          </>
        )}

        {/* Albums in this section */}
        {albumsInSection.length > 0 && (
          <>
            {!loading && (
              <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 10,
                  paddingRight: 5,
                  gap: 2,
                }}
                data={albumsInSection}
                keyExtractor={(item, index) =>
                  `yt-album-${sectionTitle}-${item.id}-${index}`
                }
                ListEmptyComponent={() => (
                  <View
                    style={{
                      width: width - 30,
                      height: 220,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 16 }}>
                      No albums available
                    </Text>
                  </View>
                )}
                renderItem={({ item, index }) => (
                  <EachAlbumCard
                    image={
                      item.image?.[2]?.link ||
                      item.image?.[1]?.link ||
                      item.image?.[0]?.link ||
                      item.thumbnailUrl
                    }
                    artists={item.artists || 'YouTube Music'}
                    key={index}
                    name={truncateText(item.name, 30)}
                    id={item.id}
                    source="YTMusic"
                  />
                )}
              />
            )}
          </>
        )}

        {/* Loading state for this section */}
        {loading && <PlaylistRowSkeleton count={3} showHeading={true} />}
      </View>
    );
  };

  return (
    <View>
      {shouldShowSection && (
        <>
          {(() => {
            const exclude = props.excludeKeyword?.toLowerCase().trim();

            // If sectionKeyword is provided, render only the matching section
            if (props.sectionKeyword) {
              const keyword = props.sectionKeyword.toLowerCase().trim();
              const matchingTitle = sectionTitles.find((t) =>
                t.toLowerCase().includes(keyword)
              );

              if (matchingTitle) {
                const sectionIndex = sectionTitles.indexOf(matchingTitle);
                // return renderSingleSection(matchingTitle, sectionIndex);
              }
              return null;
            }

            // If sectionIndex is provided, check if it should be excluded
            if (props.sectionIndex !== undefined) {
              const sectionTitle = sectionTitles[props.sectionIndex];
              if (sectionTitle) {
                // Check for exclusion
                if (exclude && sectionTitle.toLowerCase().includes(exclude)) {
                  // return null;
                }
                return renderSingleSection(sectionTitle, props.sectionIndex);
              }
              return null;
            }

            // Default: render all sections (respecting startIndex and excludeKeyword)
            const visibleSectionTitles = sectionTitles
              .slice(props.startIndex || 0)
              .filter((title) => {
                if (exclude && title.toLowerCase().includes(exclude)) {
                  return false;
                }
                return true;
              });

            return (
              <>
                {visibleSectionTitles.map((sectionTitle, index) => {
                  const actualIndex = index + (props.startIndex || 0);
                  return renderSingleSection(sectionTitle, actualIndex);
                })}
              </>
            );
          })()}
        </>
      )}
    </View>
  );
});
