import React from 'react';
import { View } from 'react-native';

export const HorizontalScrollSongs = ({ songs }) => {
  if (!songs || !Array.isArray(songs)) {
    return null;
  }

  return (
    <View style={{ flexDirection: 'row' }}>
      {songs.map((song, index) => (
        <View
          key={`song-${song.id || index}-${index}`}
          style={{ marginRight: 10 }}
        >
          {/* rest of your song rendering */}
        </View>
      ))}
    </View>
  );
};
