import { useTheme } from 'react-native-paper';
import { IconButton } from 'react-native-paper';
import { PlayNextSong } from "../../MusicPlayerFunctions";

export const NextSongButton = ({ size = 24, color, style }) => {
  const theme = useTheme();
  
  const handlePress = () => {
    PlayNextSong().catch(error => {
      console.log("Error playing next song:", error);
    });
  };

  return (
    <IconButton
      icon="skip-next"
      size={size}
      iconColor={color || theme.colors.onSurface}
      onPress={handlePress}
      style={[{
        margin: 0,
      }, style]}
      animated={true}
      rippleColor={theme.dark ? theme.colors.primary : 'rgba(255,255,255,0.3)'}
    />
  );
};
