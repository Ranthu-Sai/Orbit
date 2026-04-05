import { useTheme } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useContext } from 'react';
import Context from '../../Context/Context';
import { IconButton } from 'react-native-paper';
// Repeat constants
const Repeats = {
  NoRepeat: 'repeat-off',
  RepeatAll: 'repeat',
  RepeatOne: 'repeat-once',
};
import { RepeatMode } from 'react-native-track-player';

import { SetRepeatMode } from '../../MusicPlayerFunctions';

export const RepeatSongButton = ({ size, color }) => {
  const theme = useTheme();
  const { Repeat, setRepeat } = useContext(Context);
  function onRepeatPress() {
    if (Repeat === Repeats.NoRepeat) {
      setRepeat(Repeats.RepeatAll);
      SetRepeatMode(RepeatMode.Queue);
    } else if (Repeat === Repeats.RepeatAll) {
      setRepeat(Repeats.RepeatOne);
      SetRepeatMode(RepeatMode.Track);
    } else {
      setRepeat(Repeats.NoRepeat);
      SetRepeatMode(RepeatMode.Off);
    }
  }
  return (
    <IconButton
      icon={() => (
        <MaterialCommunityIcons
          name={Repeat}
          size={size ? size : 15}
          color={
            Repeat === Repeats.NoRepeat
              ? color || theme.colors.text
              : theme.colors.primary
          }
        />
      )}
      size={32}
      onPress={onRepeatPress}
      style={{ margin: 0, padding: 0 }}
      rippleColor="rgba(255, 255, 255, 0.2)"
    />
  );
};
