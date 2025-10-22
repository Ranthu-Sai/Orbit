import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, PermissionsAndroid, StyleSheet, Button, Linking, Platform, ToastAndroid, Image, Pressable, BackHandler, RefreshControl } from 'react-native';
import { AnimatedSearchBar } from '../../Component/Global/AnimatedSearchBar';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
// Import MusicFiles with error handling
let MusicFiles = null;
try {
  MusicFiles = require('react-native-get-music-files').default || require('react-native-get-music-files');
} catch (error) {
  // Silent error handling
}
import { LocalMusicCard } from '../../Component/MusicPlayer/LocalMusicCard';
import Context from '../../Context/Context';
import { useTheme, useNavigation } from '@react-navigation/native';
import { StorageManager } from '../../Utils/StorageManager';
import NetInfo from '@react-native-community/netinfo';
import TrackPlayer, { useActiveTrack } from 'react-native-track-player';
import { useTrackPlayerEvents, Event } from 'react-native-track-player';
import Ionicons from "react-native-vector-icons/Ionicons";
import Cover from "../../Images/Music.jpeg";
import { AudioFileValidator } from '../../Utils/AudioFileValidator';



export const MyMusicPage = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [localMusic, setLocalMusic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentPlaying = useActiveTrack();
  const { Index, setIndex } = useContext(Context);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      padding: 16,
      color: theme.colors.text,
    },
    listContainer: {
      paddingBottom: 70, // Extra padding to account for controls
    },
    listItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    loadingText: {
      marginTop: 8,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    errorText: {
      fontSize: 16,
      color: '#D32F2F',
      textAlign: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      padding: 16,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10, // Reduced padding from 16 to 10
      paddingBottom: 5, // Added smaller bottom padding
      marginBottom: 0, // Added to ensure no extra margin
    },
    offlineIcon: {
      width: 24,
      height: 24,
      marginRight: 8,
    },
    offlineBannerText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    controlButton: {
      padding: 10,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      paddingTop: 5, // Reduced top padding to bring it closer to the offline message
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    }
  });

  const requestStoragePermission = async () => {
    try {
      const androidVersion = Platform.Version;
      let permissionResult;

      if (androidVersion >= 33) {
        // Android 13+ uses READ_MEDIA_AUDIO permission
        permissionResult = await check(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO);

        if (permissionResult !== RESULTS.GRANTED) {
          permissionResult = await request(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO);
        }
      } else {
        // For Android 12 and below, use READ_EXTERNAL_STORAGE
        const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

        if (alreadyGranted) {
          return { granted: true };
        }

        permissionResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Music App Storage Permission',
            message: 'This app needs access to your storage to fetch music files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      }

      if (permissionResult === RESULTS.GRANTED || permissionResult === PermissionsAndroid.RESULTS.GRANTED) {
        return { granted: true };
      } else if (permissionResult === RESULTS.BLOCKED || permissionResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return { granted: false, neverAskAgain: true };
      } else {
        return { granted: false };
      }
    } catch (err) {
      return { granted: false };
    }
  };

  const fetchLocalMusic = async (useCache = true) => {
    setLoading(true);
    setError(null);

    // Try to load from cache first if useCache is true
    let hasCachedData = false;
    if (useCache) {
      try {
        const cachedData = await StorageManager.getLocalMusicCache();
        if (cachedData && cachedData.music && cachedData.music.length > 0) {
          setLocalMusic(cachedData.music);
          hasCachedData = true;
          setLoading(false); // Show cached data immediately
          return; // Return early if we have cached data
        } else if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          // Handle case where cache data is directly an array (old format)
          setLocalMusic(cachedData);
          hasCachedData = true;
          setLoading(false); // Show cached data immediately
          return; // Return early if we have cached data
        }
      } catch (cacheError) {
        // Continue without cache
      }
    }

    const permissionStatus = await requestStoragePermission();

    if (!permissionStatus.granted) {
      if (permissionStatus.neverAskAgain) {
        setError('Permission denied permanently. Please enable it in settings.');
        // Automatically open settings when permissions are permanently denied
        ToastAndroid.show('Please enable storage permission in settings', ToastAndroid.LONG);
        Linking.openSettings();
      } else {
        setError('Permission denied. Please grant storage access to view music files.');
      }
      setLoading(false);
      return;
    }

    try {
      let tracks = [];
      let fetchError = null;

      // Try RNFS method first (more reliable)
      try {
        const RNFS = require('react-native-fs');

        // Enhanced music file scanning with more directories and better filtering
        const isMusicFile = (filename) => {
          if (!filename) return false;
          const ext = filename.toLowerCase().split('.').pop();
          const supportedFormats = [
            'mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac', 'opus', 'm4b', 'm4p', 'amr', '3gp'
          ];
          return supportedFormats.includes(ext);
        };

        // Define directories to search for music files
        const directories = [
          // Standard music directories
          RNFS.ExternalStorageDirectoryPath + '/Music',
          RNFS.ExternalStorageDirectoryPath + '/Media/Music',
          RNFS.MusicDirectoryPath,
          RNFS.ExternalDirectoryPath + '/Music',
          
          // Messaging apps
          RNFS.ExternalStorageDirectoryPath + '/WhatsApp/Media/WhatsApp Music',
          RNFS.ExternalStorageDirectoryPath + '/WhatsApp/Media/WhatsApp Voice Notes',
          RNFS.ExternalStorageDirectoryPath + '/WhatsApp/Media/WhatsApp Audio',
          RNFS.ExternalStorageDirectoryPath + '/Telegram/Telegram Audio',
          RNFS.ExternalStorageDirectoryPath + '/Telegram/Telegram Voice',
          RNFS.ExternalStorageDirectoryPath + '/Signal/Media/Signal Audio',
          RNFS.ExternalStorageDirectoryPath + '/Signal/Media/Signal Voice Notes',
          RNFS.ExternalStorageDirectoryPath + '/Download/Telegram',
          RNFS.ExternalStorageDirectoryPath + '/Download/WhatsApp',
          
          // Voice recordings and system sounds
          RNFS.ExternalStorageDirectoryPath + '/Recordings',
          RNFS.ExternalStorageDirectoryPath + '/Voice Recorder',
          RNFS.ExternalStorageDirectoryPath + '/Voice Recordings',
          RNFS.ExternalStorageDirectoryPath + '/Sounds',
          RNFS.ExternalStorageDirectoryPath + '/Notifications',
          RNFS.ExternalStorageDirectoryPath + '/Alarms',
          RNFS.ExternalStorageDirectoryPath + '/Ringtones',
          
          // Common download locations
          RNFS.ExternalStorageDirectoryPath + '/Download',
          RNFS.ExternalStorageDirectoryPath + '/Downloads',
          RNFS.DownloadDirectoryPath,
          RNFS.ExternalStorageDirectoryPath + '/DCIM',
          RNFS.ExternalStorageDirectoryPath + '/Pictures',
          RNFS.ExternalStorageDirectoryPath + '/Documents',
          
          // Cloud storage folders
          RNFS.ExternalStorageDirectoryPath + '/Google Drive',
          RNFS.ExternalStorageDirectoryPath + '/Dropbox',
          RNFS.ExternalStorageDirectoryPath + '/OneDrive',
          
          // App-specific folders
          RNFS.ExternalStorageDirectoryPath + '/Pocket Casts',
          RNFS.ExternalStorageDirectoryPath + '/Podcasts',
          RNFS.ExternalStorageDirectoryPath + '/Audiobooks',
          
          // Hidden folders that might contain audio
          RNFS.ExternalStorageDirectoryPath + '/.media',
        ].filter(dir => dir && !dir.includes('undefined') && !dir.includes('null') && !dir.includes('/data/user/0/'));

        // Recursive directory scanning
        const scanDirectory = async (dirPath) => {
          let results = [];
          try {
            const items = await RNFS.readDir(dirPath);
            for (const item of items) {
              try {
                if (item.isDirectory()) {
                  // Skip some known non-music directories
                  if (item.name.startsWith('.') || 
                      ['Android', 'Cache', 'temp', 'thumbnails', 'cache', 'logs'].includes(item.name)) {
                    continue;
                  }
                  // Recursively scan subdirectories
                  const subResults = await scanDirectory(item.path);
                  results = [...results, ...subResults];
                } else if (item.isFile() && isMusicFile(item.name)) {
                  results.push(item);
                }
              } catch (e) {
                console.warn(`Error processing ${item.path}:`, e);
              }
            }
          } catch (error) {
            console.warn(`Error reading directory ${dirPath}:`, error);
          }
          return results;
        };

        // Scan all directories concurrently with progress feedback
        const scanPromises = directories.map(dir => 
          scanDirectory(dir).catch(err => {
            console.warn(`Error scanning ${dir}:`, err);
            return [];
          })
        );

        const allFiles = await Promise.all(scanPromises);
        const allFilesFlat = allFiles.flat();

        // Convert RNFS files to track objects for validation
        const rawTracks = allFilesFlat.map((file) => {
          const title = file.name.replace(/\.(mp3|m4a|wav|ogg|flac|aac)$/i, ''); // Remove file extension
          const artist = extractArtistFromTitle(title); // Extract artist name
          return {
            path: file.path,
            name: file.name,
            title: title,
            artist: artist, // Use extracted artist name
            duration: 0, // We don't have duration info from RNFS
            size: file.size || 0,
            cover: null // No cover info from RNFS
          };
        });

        // Quick validation - only check file extension for faster loading
        tracks = rawTracks.filter(track => {
          if (!track.path) return false;
          const extension = track.path.toLowerCase().split('.').pop();
          return ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac'].includes(extension);
        });

      } catch (rnfsErr) {
        fetchError = rnfsErr;
      }

      // If RNFS fails, try MusicFiles library as fallback with optimized settings
      if ((!tracks || tracks.length === 0) && MusicFiles && MusicFiles.getAll) {
        try {
          tracks = await MusicFiles.getAll({
            title: true,
            artist: true,
            duration: true,
            cover: false, // Disable cover fetching for faster loading
            minimumSongDuration: 5000, // Reduced from 10000
            batchNumber: 50, // Reduced batch size for faster processing
          });
        } catch (err) {
          // Keep the original RNFS error
        }
      }

      // Save tracks to cache if we have any
      if (tracks && tracks.length > 0) {
        await StorageManager.saveLocalMusicCache(tracks);
      }



      if (!tracks || tracks.length === 0) {
        // If we have cached data, use it even if fresh fetch failed
        if (hasCachedData && localMusic.length > 0) {
          // Keep the cached data that's already loaded
        } else if (fetchError && useCache) {
          // Try to load cached data if available when fetch fails
          const cachedData = await StorageManager.getLocalMusicCache();
          if (cachedData?.music?.length) {
            tracks = cachedData.music;
          } else {
            setError('No music files found on your device.');
          }
        } else {
          setError('No music files found on your device.');
        }
      } else {
        const musicFilesList = tracks.map((song, index) => {
          // Create a unique ID using path and index to avoid duplicates
          const uniqueId = `${song.path}_${index}_${Date.now()}`;

          const musicItem = {
            id: uniqueId,
            title: song.title && song.title.length > 20 ? `${song.title.substring(0, 20)}...` : song.title || song.path?.split('/').pop() || `Track ${index + 1}`,
            artist: song.artist && song.artist.length > 20 ? `${song.artist.substring(0, 20)}...` : song.artist || 'Unknown Artist',
            duration: formatDuration(song.duration || 0),
            path: song.path,
            cover: Cover, // Use Music.jpeg for all local tracks
            artwork: Cover, // Ensure artwork is set to Music.jpeg
            isLocal: true, // Mark as local track
            sourceType: 'mymusic' // Set source type
          };
          return musicItem;
        });

        // Save to cache and update state
        await StorageManager.saveLocalMusicCache(musicFilesList);
        setLocalMusic(musicFilesList);
      }
    } catch (err) {
      setError('Failed to fetch music files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    // Initial fetch with shorter timeout
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Loading timed out. Please try refreshing.');
      }
    }, 15000); // 15 second timeout (reduced from 30)

    fetchLocalMusic().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const formatDuration = (duration) => {
    if (!duration || isNaN(duration)) return '00:00';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Function to extract artist from title
  const extractArtistFromTitle = (title) => {
    const regex = /- (.+)$/; // Matches everything after the last hyphen
    const match = title.match(regex);
    return match ? match[1].trim() : "Unknown Artist"; // Return the artist name or "Unknown Artist"
  };

  const loadLocalTracks = async () => {
    try {
      // Format tracks for TrackPlayer without heavy validation for faster loading
      const formattedTracks = localMusic
        .filter(song => song.path) // Basic check for path existence
        .map(song => ({
          id: song.id,
          url: `file://${song.path}`,
          title: song.title,
          artist: song.artist,
          artwork: Cover, // Use Music.jpeg for all local tracks
          isLocal: true,
          sourceType: 'mymusic' // Set source type for proper artwork handling
        }));

      // Reset the queue and add all tracks
      await TrackPlayer.reset();
      await TrackPlayer.add(formattedTracks);
    } catch (error) {
      // Silent error handling
    }
  };

  const loadAndPlayTrack = async (index) => {
    if (index < 0 || index >= localMusic.length) return;
    
    try {
      // Find the track at the requested index
      const song = localMusic[index];

      // Basic validation - just check if path exists
      if (!song.path) {
        ToastAndroid.show('Cannot play track: Invalid file path', ToastAndroid.LONG);
        return;
      }

      // Format tracks for the queue without heavy validation for faster loading
      const formattedTracks = localMusic
        .filter(track => track.path) // Basic check for path existence
        .map(track => ({
          id: track.id,
          url: `file://${track.path}`,
          title: track.title,
          artist: track.artist,
          artwork: Cover, // Use Music.jpeg for all local tracks
          isLocal: true,
          sourceType: 'mymusic' // Set source type for proper artwork handling
        }));
      
      // Reset player and add all tracks, starting with the selected one
      await TrackPlayer.reset();
      await TrackPlayer.add([
        ...formattedTracks.slice(index),
        ...formattedTracks.slice(0, index)
      ]);
      await TrackPlayer.play();
      
      // Open the fullscreen player
      setIndex(1);
    } catch (error) {
      // Silent error handling
    }
  };

  const events = [Event.PlaybackActiveTrackChanged,
    Event.PlaybackError,
    Event.PlaybackState,
    Event.PlaybackQueueEnded
  ];

  useTrackPlayerEvents(events, async (event) => {
    try {
      if (event.type === Event.PlaybackState) {
        const state = await TrackPlayer.getState();
        if (state === TrackPlayer.STATE_STOPPED || state === TrackPlayer.STATE_ENDED) {
          // When playback stops or ends, automatically play the next track
          const queue = await TrackPlayer.getQueue();
          const currentTrack = await TrackPlayer.getCurrentTrack();
          
          if (queue.length > 0) {
            if (currentTrack === null) {
              // If no track is playing, start from the beginning
              await TrackPlayer.skip(0);
            } else {
              // Try to play the next track
              const nextTrack = await TrackPlayer.getTrack(currentTrack + 1);
              if (nextTrack) {
                await TrackPlayer.skipToNext();
              } else {
                // If we're at the end, loop back to the first track
                await TrackPlayer.skip(0);
              }
            }
            await TrackPlayer.play();
          }
        }
      } else if (event.type === Event.PlaybackQueueEnded) {
        // When the queue ends, restart from the beginning
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          await TrackPlayer.skip(0);
          await TrackPlayer.play();
        }
      } else if (event.type === Event.PlaybackError) {

        // Get current track info for error handling
        try {
          const currentTrack = await TrackPlayer.getActiveTrack();
          if (currentTrack) {
            // Check if it's a known problematic file type or unsupported format
            const isProblematicFile = currentTrack.url && (
              currentTrack.url.includes('ElevenLabs_') ||
              currentTrack.url.includes('_pvc_') ||
              currentTrack.url.includes('.tmp') ||
              currentTrack.url.includes('.part')
            );

            const isUnsupportedFormat = event.code === 'android-parsing-container-unsupported' ||
              event.message?.includes('Source error') ||
              event.message?.includes('unsupported');

            if (isProblematicFile || isUnsupportedFormat) {
              // Try to skip to next track automatically
              try {
                const queue = await TrackPlayer.getQueue();
                if (queue.length > 1) {
                  await TrackPlayer.skipToNext();
                } else {
                  await TrackPlayer.stop();
                }
              } catch (skipError) {
                try {
                  await TrackPlayer.stop();
                } catch (stopError) {
                }
              }
            }
          }
        } catch (trackError) {
        }
        try {
          await TrackPlayer.skipToNext();
          await TrackPlayer.play();
        } catch (recoveryError) {
        }
      }
    } catch (error) {
    }
  });

  // Functions to handle track navigation
  const playPreviousSong = useCallback(async () => {
    try {
      const currentTrack = await TrackPlayer.getActiveTrack();
      if (!currentTrack) {
        // If no track is currently playing, play the first one
        await loadAndPlayTrack(0);
        return;
      }

      const currentIndex = localMusic.findIndex(track => track.id === currentTrack.id);
      const prevIndex = (currentIndex - 1 + localMusic.length) % localMusic.length; // Wrap around to the last track
      await loadAndPlayTrack(prevIndex);
    } catch (error) {
    }
  }, [localMusic]);

  const playNextSong = useCallback(async () => {
    try {
      const currentTrack = await TrackPlayer.getActiveTrack();
      if (!currentTrack) {
        // If no track is currently playing, play the first one
        await loadAndPlayTrack(0);
        return;
      }

      const currentIndex = localMusic.findIndex(track => track.id === currentTrack.id);
      const nextIndex = (currentIndex + 1) % localMusic.length; // Wrap around to the first track
      await loadAndPlayTrack(nextIndex);
    } catch (error) {
    }
  }, [localMusic]);

  // Removed problematic BackHandler - let RootRoute handle navigation
  // The normal navigation stack will handle back gesture properly

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLocalMusic(false); // Don't use cache when refreshing
    setRefreshing(false);
  }, []);



  if (loading && !localMusic.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>{isOffline ? 'Loading cached music...' : 'Fetching your music...'}</Text>
        <Text style={[styles.loadingText, { fontSize: 14, marginTop: 10, color: '#1E90FF' }]}>
          This may take a few seconds...
        </Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 5, color: '#666' }]}>
          Scanning music files on your device
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {error.includes('settings') && (
          <Button
            title="Open Settings"
            onPress={() => Linking.openSettings()}
          />
        )}
        {!error.includes('settings') && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title="Try Again"
              onPress={() => fetchLocalMusic(false)}
            />
            <Button
              title="Refresh Cache"
              onPress={() => {
                StorageManager.clearLocalMusicCache();
                fetchLocalMusic(false);
              }}
            />
          </View>
        )}
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 10, color: '#666' }]}>
          Make sure you have music files in your Music or Download folders
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Image
            source={require('../../Images/offline.png')}
            style={styles.offlineIcon}
            resizeMode="contain"
          />
          <Text style={styles.offlineBannerText}>You're currently offline</Text>
        </View>
      )}
      
      <FlatList
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.title}>My Music</Text>
            <AnimatedSearchBar
              onChange={setSearchQuery}
              placeholder="Search songs..."
            />
          </View>
        }
        data={localMusic.filter(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.artist.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <LocalMusicCard 
            song={item} 
            index={index} 
            allSongs={localMusic} 
            artist={item.artist.length > 20 ? item.artist.substring(0, 20) + "..." : item.artist}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No music files available.</Text>}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1DB954']}
          />
        }
      />
      
      {/* Add buttons for next and previous song */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
        <Pressable onPress={playPreviousSong} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={24} color="white" />
        </Pressable>
        <Pressable onPress={playNextSong} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={24} color="white" />
        </Pressable>
      </View>
    </View>
  );
};

export default MyMusicPage;