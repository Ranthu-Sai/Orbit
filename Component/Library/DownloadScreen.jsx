import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, Dimensions, RefreshControl, ToastAndroid, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlainText } from '../Global/PlainText';
import { DownloadedSongCard } from './DownloadedSongCard';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme,useNavigation } from '@react-navigation/native';
import { StorageManager } from '../../Utils/StorageManager';
import { safeExists } from '../../Utils/FileUtils';
import { analyticsService } from '../../Utils/AnalyticsUtils';

const { width, height } = Dimensions.get('window');

export default function DownloadScreen(props) {
  const { colors, dark } = useTheme();
  const styles = getStyles(colors, dark);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    getDownloadedSongs();
    
    // Track active user for analytics
    analyticsService.trackActiveUser();
    
    // Removed BackHandler - let RootRoute handle navigation
  }, []);

  // Filter songs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(downloadedSongs);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = downloadedSongs.filter(song => 
        (song.title && song.title.toLowerCase().includes(query)) || 
        (song.artist && song.artist.toLowerCase().includes(query))
      );
      setFilteredSongs(filtered);
    }
  }, [searchQuery, downloadedSongs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await getDownloadedSongs();
    setRefreshing(false);
  };

  // Function to clean up the song name from filename
  const cleanupSongName = (name) => {
    if (!name) return "Unknown Title";
    
    // Replace underscores with spaces
    let cleanName = name.replace(/_/g, ' ');
    
    // Remove any ID prefixes if present (assuming they're at the start with underscore or dash)
    cleanName = cleanName.replace(/^[a-zA-Z0-9]+[-_]/, '');
    
    // First letter capitalized and rest as is
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  };

  // Improved check if file exists with proper error handling using safeExists
  const checkFileExists = async (path) => {
    try {
      // Handle null, undefined or empty paths
      if (!path) {
        console.warn('Empty path provided to checkFileExists');
        return false;
      }
      
      // Convert to string if it's not already
      let stringPath = path;
      if (typeof path !== 'string') {
        try {
          // If it's an object with a path property
          if (path.path && typeof path.path === 'string') {
            stringPath = path.path;
          } else {
            // Force string conversion
            stringPath = String(path);
          }
          console.log('Converted non-string path:', stringPath);
        } catch (conversionError) {
          console.error('Error converting path to string:', conversionError);
          return false;
        }
      }
      
      if (!stringPath) return false;
      
      // Use safeExists from FileUtils if available
      if (typeof safeExists === 'function') {
        return await safeExists(stringPath);
      }
      
      // Fallback to RNFS.exists
      return await RNFS.exists(stringPath);
    } catch (error) {
      console.error(`Error checking if file exists:`, error);
      return false;
    }
  };

  // Get fallback artwork path if needed
  const getDefaultArtworkPath = () => {
    return 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png';
  };

  const getDownloadedSongs = async () => {
    try {
      setIsLoading(true);

      // Clean up orphaned metadata first
      await StorageManager.cleanupOrphanedMetadata();

      const allMetadata = await StorageManager.getAllDownloadedSongsMetadata();

      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        setDownloadedSongs([]);
        setIsLoading(false);
        return;
      }

      analyticsService.trackDownloadCount(Object.keys(allMetadata).length);

      const formattedTracks = await Promise.all(
        Object.values(allMetadata).map(async (metadata) => {
          try {
            // Ensure metadata and id exist
            if (!metadata || !metadata.id) {
              return null;
            }

            const songPath = await StorageManager.getSongPath(metadata.id, metadata.title);
            const songExists = await safeExists(songPath);

            if (!songExists) {
              return null;
            }

            let finalArtworkUri = getDefaultArtworkPath(); // Default placeholder
            if (metadata.localArtworkPath) {
              const artworkExists = await safeExists(metadata.localArtworkPath);
              if (artworkExists) {
                finalArtworkUri = `file://${metadata.localArtworkPath}`;
              } else {
                console.warn(`Artwork file not found for song ${metadata.id} at ${metadata.localArtworkPath}. Using default.`);
              }
            }

            return {
              id: metadata.id,
              url: `file://${songPath}`,
              title: metadata.title || 'Unknown Title',
              artist: metadata.artist || 'Unknown Artist',
              artwork: finalArtworkUri, // Use the verified path or the default
              duration: metadata.duration || 0,
              language: metadata.language,
              isDownloaded: true,
            };
          } catch (error) {
            console.error(`Error processing metadata for song ${metadata.id}:`, error);
            return null; // Skip this song on error
          }
        })
      );

      const validSongs = formattedTracks.filter(song => song !== null);
      setDownloadedSongs(validSongs);

    } catch (error) {
      console.error('Failed to get downloaded songs:', error);
      ToastAndroid.show('Could not load downloaded songs.', ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle song deletion without confirmation
  const handleDeleteSong = async (songId, songTitle) => {
    try {
      // Delete the song using StorageManager
      await StorageManager.removeDownloadedSongMetadata(songId);

      // Remove from local state
      setDownloadedSongs(prev => prev.filter(song => song.id !== songId));
      setFilteredSongs(prev => prev.filter(song => song.id !== songId));

      // Show short toast notification
      ToastAndroid.show('Song deleted', ToastAndroid.SHORT);
    } catch (error) {
      ToastAndroid.show('Error deleting song', ToastAndroid.SHORT);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <PlainText text="Downloads" style={styles.title} />
        
        {showSearch ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              selectionColor={colors.primary}
              autoFocus={true}
            />
            <TouchableOpacity onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.searchIcon}>
            <MaterialIcons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={filteredSongs}
        renderItem={({ item }) => (
          <DownloadedSongCard 
            song={item} 
            refetch={getDownloadedSongs}
            onDeleteRequest={handleDeleteSong}
          />
        )}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={styles.songsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="music-off" size={50} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery 
                ? `No downloads matching "${searchQuery}"` 
                : "No downloaded songs found"}
            </Text>
            <Text style={styles.emptySubText}>
              {searchQuery 
                ? "Try a different search term" 
                : "Download your favorite songs to listen offline"}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (colors, dark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark ? '#121212' : '#FFFFFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchIcon: {
    padding: 4,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark ? '#242424' : '#EFEFEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginLeft: 16,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: colors.text,
    fontSize: 16,
  },
  songsList: {
    paddingBottom: 150, // Extra padding for bottom tabs and player
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    height: height * 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
}); 