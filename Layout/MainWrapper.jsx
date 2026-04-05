import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { memo } from 'react';
import { StatusBar, LogBox } from 'react-native';
import PlaylistSelectorWrapper from '../Component/Playlist/PlaylistSelectorWrapper';

// Ignore specific harmless warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Possible Unhandled Promise Rejection',
]);

export const MainWrapper = memo(function MainWrapper({ children }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar
        backgroundColor={theme.colors.background}
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        animated={true}
      />
      {children}
      <PlaylistSelectorWrapper />
    </SafeAreaView>
  );
});
