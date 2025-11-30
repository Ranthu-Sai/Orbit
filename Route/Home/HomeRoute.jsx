
import { Home } from "./Home";
import { Playlist } from "../Playlist";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SearchPage } from "../SearchPage";
import { Album } from "../Album";
import ArtistPage from "../ArtistPage";
import { LikedSongPage } from "../Library/LikedSongPage";
import { LikedPlaylistPage } from "../Library/LikedPlaylistPage";
import { SettingsPage } from "./SettingsPage";
import { LoginScreen } from "../LoginScreen";
import { RegisterScreen } from "../RegisterScreen";
import { ChangeName } from "./ChangeName";
import { SelectLanguages } from "./SelectLanguages";
import ShowPlaylistofType from "../../Component/Discover/ShowPlaylistofType";

const Stack = createNativeStackNavigator();
export const HomeRoute = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="HomePage" component={Home} />
      <Stack.Screen
        name="Playlist"
        component={Playlist}
        options={{
          headerShown: true,
          headerTransparent: true,
          title: '', // Ensure no default title from navigation
          headerBackVisible: false,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            color: '#FFFFFF',
          },
        }}
      />
      <Stack.Screen
        name={"Album"}
        component={Album}
        options={{
          headerShown: true,
          headerTransparent: true,
          title: '', // Ensure no default title from navigation
          headerBackVisible: false, // Hide native back button
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            color: '#FFFFFF',
          },
        }}
      />
      <Stack.Screen name="Search" component={SearchPage} />
      <Stack.Screen name="ArtistPage" component={ArtistPage} />
      <Stack.Screen name={"LikedSongs"} component={LikedSongPage} />
      <Stack.Screen name={"LikedPlaylists"} component={LikedPlaylistPage} />
      <Stack.Screen name={"Settings"} component={SettingsPage} />
      <Stack.Screen
        name={"Login"}
        component={LoginScreen}
        options={{ title: 'DAB Music Login' }}
      />
      <Stack.Screen
        name={"Register"}
        component={RegisterScreen}
        options={{ title: 'DAB Music Register' }}
      />
      <Stack.Screen name={"ChangeName"} component={ChangeName} />
      <Stack.Screen name={"SelectLanguages"} component={SelectLanguages} />
      <Stack.Screen name="ShowPlaylistofType" component={ShowPlaylistofType} />

    </Stack.Navigator>
  );
};
