import { useState } from 'react';
import { View, TextInput, Button, FlatList, Text } from 'react-native';
import {
  GetCustomPlaylists,
  CreateCustomPlaylist,
  AddSongToCustomPlaylist,
} from '../../LocalStorage/CustomPlaylists';
import { useTheme } from '@react-navigation/native';

export const CustomPlaylistManager = () => {
  const theme = useTheme();
  const [playlistName, setPlaylistName] = useState('');
  const [customPlaylists, setCustomPlaylists] = useState({});

  const loadCustomPlaylists = async () => {
    const playlists = await GetCustomPlaylists();
    setCustomPlaylists(playlists);
  };

  const handleCreatePlaylist = async () => {
    if (playlistName) {
      await CreateCustomPlaylist(playlistName);
      setPlaylistName('');
      loadCustomPlaylists(); // Refresh the list after creating a new playlist
    }
  };

  const handleAddSongToPlaylist = async (playlistName, song) => {
    await AddSongToCustomPlaylist(playlistName, song);
    loadCustomPlaylists(); // Refresh the list after adding a song
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Enter playlist name"
        value={playlistName}
        onChangeText={setPlaylistName}
        style={{
          borderColor: theme.colors.text,
          borderWidth: 1,
          marginVertical: 10,
          padding: 5,
        }}
      />
      <Button title="Create Playlist" onPress={handleCreatePlaylist} />
      <FlatList
        data={Object.keys(customPlaylists)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10 }}>
            <Text style={{ color: theme.colors.text }}>{item}</Text>
            <Button
              title="Add Song"
              onPress={() =>
                handleAddSongToPlaylist(item, {
                  /* song details */
                })
              }
            />
          </View>
        )}
      />
    </View>
  );
};
