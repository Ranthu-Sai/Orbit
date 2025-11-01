import { useTheme } from 'react-native-paper';
import { IconButton } from 'react-native-paper';
import { PlayPreviousSong } from "../../MusicPlayerFunctions";

export const PreviousSongButton = ({ size = 24, color, style }) => {
  const theme = useTheme();
  
  const handlePress = () => {
    PlayPreviousSong().catch(error => {
      console.log("Error playing previous song:", error);
    });
  };

  return (
    <IconButton
      icon="skip-previous"
      size={size}
      iconColor={color || theme.colors.onSurface}
      onPress={handlePress}
      style={[{
        margin: 0,
      }, style]}
      animated={true}
      rippleColor={theme.colors.primary}
    />
  );
};
