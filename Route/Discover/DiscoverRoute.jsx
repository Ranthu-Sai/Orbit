import { Playlist } from "../Playlist";
import { createStackNavigator } from '@react-navigation/stack';
import { Discover } from "./Discover";
import { SearchPage } from "../SearchPage";
import { LanguageDetailPage } from "../../Component/Discover/LanguageDetailPage";
import ShowPlaylistofType from "../../Component/Discover/ShowPlaylistofType";
import { PodcastScreen } from "./PodcastScreen";
import { PodcastDetailScreen } from "./PodcastDetailScreen";
const Stack = createStackNavigator();

export const DiscoverRoute = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        // INSTANCE REUSE: Keep screens in memory for instant back navigation
        detachPreviousScreen: false,
      }}
    >
      <Stack.Screen name="DiscoverPage" component={Discover} />
      <Stack.Screen name="Playlist" component={Playlist} />
      <Stack.Screen name="Search" component={SearchPage} />
      <Stack.Screen name="LanguageDetail" component={LanguageDetailPage} />
      <Stack.Screen name="ShowPlaylistofType" component={ShowPlaylistofType} />
      <Stack.Screen name="PodcastScreen" component={PodcastScreen} />
      <Stack.Screen name="PodcastDetail" component={PodcastDetailScreen} />
    </Stack.Navigator>
  );
};

