import { Playlist } from '../Playlist';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Library } from './Library';
import { LikedSongPage } from './LikedSongPage';
import { LikedPlaylistPage } from './LikedPlaylistPage';
import { AboutProject } from './AboutProject';
import { CustomPlaylist } from './CustomPlaylist';
import { CustomPlaylistView } from '../../Component/Playlist/CustomPlaylistView';
import { MyMusicPage } from './MyMusicPage';
import DownloadScreen from '../../Component/Library/DownloadScreen';
import { HistoryPage } from './HistoryPage';

const Stack = createNativeStackNavigator();
export const LibraryRoute = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        // INSTANCE REUSE: Keep screens frozen in memory for instant back navigation
        freezeOnBlur: true,
        detachInactiveScreens: false, // CRITICAL: Keep screens mounted to preserve state
      }}
    >
      <Stack.Screen name="LibraryPage" component={Library} />
      <Stack.Screen name="Playlist" component={Playlist} />
      <Stack.Screen name={'LikedSongs'} component={LikedSongPage} />
      <Stack.Screen name={'CustomPlaylist'} component={CustomPlaylist} />
      <Stack.Screen
        name={'CustomPlaylistView'}
        component={CustomPlaylistView}
      />
      <Stack.Screen name={'LikedPlaylists'} component={LikedPlaylistPage} />
      <Stack.Screen name={'AboutProject'} component={AboutProject} />
      <Stack.Screen name={'MyMusicPage'} component={MyMusicPage} />
      <Stack.Screen name={'DownloadScreen'} component={DownloadScreen} />
      <Stack.Screen name={'HistoryPage'} component={HistoryPage} />
    </Stack.Navigator>
  );
};
