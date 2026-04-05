import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FullScreenLocalTrackItem = ({ song, onPress }) => {
  // Determine the source for the image
  let imageSource;
  // Use Music.jpeg for all local tracks
  if (song.isLocal || song.sourceType === 'mymusic') {
    imageSource = require('../../Images/Music.jpeg');
  } else {
    imageSource = song.artwork
      ? { uri: song.artwork }
      : require('../../Images/Music.jpeg');
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(song)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        marginBottom: 8,
      }}
    >
      <FastImage
        source={imageSource}
        style={{ width: 50, height: 50, borderRadius: 4 }}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={{ marginLeft: 15, flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          {song.title || 'Unknown Title'}
        </Text>
        <Text
          style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}
        >
          {song.artist || 'Unknown Artist'}
        </Text>
      </View>
      <Ionicons name="play-circle-outline" size={28} color="white" />
    </TouchableOpacity>
  );
};

export default FullScreenLocalTrackItem;
