import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';

const MusicFetcher = () => {
  // State variables for music files, loading status, and errors
  const [musicFiles, setMusicFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to request READ_EXTERNAL_STORAGE permission
  const requestPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Music App Storage Permission',
          message: 'This app needs access to your storage to read music files.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  };

  // Effect hook to fetch music files on component mount
  useEffect(() => {
    const fetchMusic = async () => {
      setLoading(true);

      // Request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setError('Permission denied');
        setLoading(false);
        return;
      }

      try {
        // Define directories to search for music files
        const directories = [
          RNFS.ExternalStorageDirectoryPath + '/Music',
          RNFS.ExternalStorageDirectoryPath + '/Download',
        ];

        // Define supported audio file extensions
        const audioExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.flac'];

        // Read all directories concurrently
        const allFiles = await Promise.all(
          directories.map(async (dir) => {
            try {
              const files = await RNFS.readDir(dir);
              // Filter for audio files
              return files.filter(
                (file) =>
                  file.isFile() &&
                  audioExtensions.some((ext) =>
                    file.name.toLowerCase().endsWith(ext)
                  )
              );
            } catch (err) {
              console.warn(`Directory ${dir} not found or inaccessible`);
              return []; // Return empty array if directory is inaccessible
            }
          })
        );

        // Flatten the array and map to a format suitable for FlatList
        const musicFilesList = allFiles
          .flat()
          .map((file) => {
            const lastDotIndex = file.name.lastIndexOf('.');
            const title = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
            return {
              id: file.path,
              title: title,
              url: 'file://' + file.path
            };
          });
        setMusicFiles(musicFilesList);
      } catch (err) {
        setError('Error reading directories');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMusic();
  }, []); // Empty dependency array to run once on mount

  // Render error state
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{error}</Text>
      </View>
    );
  }

  // Render the list of music files
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={musicFiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={{ padding: 10 }}>{item.title}</Text>
        )}
        ListEmptyComponent={<Text>No music files found.</Text>}
      />
    </View>
  );
};

export default MusicFetcher;