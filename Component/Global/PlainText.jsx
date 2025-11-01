import { Dimensions } from "react-native";
import { Text, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { useEffect, useState, useContext } from "react";
import { GetFontSizeValue } from "../../LocalStorage/AppSettings";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";

export const PlainText = ({text, style, numberOfLine, songId, isSongTitle}) => {
  const width = Dimensions.get('window').width;
  const [Size, setSize] = useState(width * 0.035);
  // Get current playing track info
  const currentPlaying = useActiveTrack();
  const playerState = usePlaybackState();

  // Check if this text is for a song title that is currently active (even if paused)
  const isCurrentSong = isSongTitle && songId && currentPlaying?.id === songId;

  async function getFont(){
    const data = await GetFontSizeValue();
    if (data === "Medium"){
      setSize(width * 0.035);
    } else if (data === "Small"){
      setSize(width * 0.030);
    } else {
      setSize(width * 0.040);
    }
  }

  useEffect(() => {
    getFont();
  }, []);

  const theme = useTheme();
  
  // Determine text color - green for current song, otherwise use theme text color or style color
  const textColor = isCurrentSong ? '#1DB954' : (style?.color || theme.colors.text);

  // Handle numberOfLine prop properly for React Native
  const textProps = {};
  if (numberOfLine !== null && numberOfLine !== undefined) {
    textProps.numberOfLines = numberOfLine;
  } else if (numberOfLine === undefined) {
    // Default to 2 lines when undefined
    textProps.numberOfLines = 2;
  }
  // When numberOfLine is null, don't set numberOfLines prop at all (unlimited lines)

  return (
    <Text
      {...textProps}
      style={{
        color: textColor,
        fontSize: Size,
        fontWeight: isCurrentSong ? '700' : isSongTitle ? '600' : '500', // Increased weight for song titles
        letterSpacing: isSongTitle ? 0.3 : 0, // Slight letter spacing for song titles for better readability
        paddingRight: 10,
        fontFamily: 'roboto',
        ...StyleSheet.flatten(style),
      }}
    >
      {text || ''}
    </Text>
  );
};
