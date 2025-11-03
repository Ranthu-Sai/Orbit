import { Pressable, View, Dimensions } from "react-native";
import { PlainText } from "./PlainText";
import { SmallText } from "./SmallText";
import { SpaceBetween } from "../../Layout/SpaceBetween";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import FastImage from "react-native-fast-image";
import { memo, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../Context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LanguageTag } from "./LanguageTag";

// AsyncStorage keys
const CURRENT_ALBUM_ID_KEY = "orbit_current_album_id";
const CURRENT_ALBUM_DATA_KEY = "orbit_current_album_data";
const CURRENT_PLAYLIST_ID_KEY = "orbit_current_playlist_id";
const CURRENT_PLAYLIST_DATA_KEY = "orbit_current_playlist_data";

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const EachPlaylistCard = memo(function EachPlaylistCard ({
  image, 
  name, 
  follower, 
  id, 
  MainContainerStyle, 
  ImageStyle,
  source,
  searchText,
  language,
  navigationSource,
  style
}){
  const { theme } = useThemeContext();
  const navigation = useNavigation()
  const { width, height } = Dimensions.get('window');
  
  // Calculate responsive dimensions based on screen size
  const responsiveStyles = useMemo(() => {
    // Match album card width (42% of screen width with minimum 180px)
    const cardWidth = Math.max(180, width * 0.42);
    // Keep aspect ratio similar to before
    const cardHeight = cardWidth * 1.2;
    // Slightly reduced image height
    const imageHeight = cardWidth * 0.9;
    
    return {
      container: {
        width: cardWidth,
        height: cardHeight,
        marginRight: 4, // Reduced right margin for tighter grid
        marginBottom: 0, // Removed bottom margin
      },
      image: {
        height: imageHeight,
        width: "100%",
      },
      textContainer: {
        minHeight: 40, // Set a minimum height for the text container
        marginTop: 0,
        paddingTop: 2,
        paddingBottom: 2,
        justifyContent: 'center', // Center content vertically
      }
    };
  }, [width]);
  
  const handleNavigation = async () => {
    try {
      // Clear any existing album and playlist data to prevent navigation conflicts
      // Await all operations to ensure they complete before navigation
      await Promise.all([
        AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
        AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
        AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
        AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY)
      ]);
      
      const params = {
        id,
        image,
        name,
        follower,
        timestamp: Date.now() // Add timestamp to ensure fresh navigation and prevent caching issues
      };
      
      // Store the current screen information to handle proper back navigation
      try {
        // Safer way to get current route name from navigation state
        const navState = navigation.getState();
        let currentRouteName = 'Unknown';
        
        if (navState && navState.routes && navState.routes.length > 0) {
          // Get the current active route index
          const currentRouteIndex = navState.index;
          currentRouteName = navState.routes[currentRouteIndex]?.name || 'Unknown';
        }
        
        console.log(`Current screen before navigation: ${currentRouteName}`);
        
        // Always set previousScreen parameter to ensure proper back navigation
        params.previousScreen = currentRouteName;
        
        // If coming from LikedPlaylists, save that specifically
        if (currentRouteName === 'LikedPlaylists' || currentRouteName === 'LikedPlaylistPage') {
          params.previousScreen = 'LikedPlaylists';
          // Also save to AsyncStorage as backup
          await AsyncStorage.setItem('NAVIGATION_SOURCE', 'Library');
        } else {
          await AsyncStorage.setItem('NAVIGATION_SOURCE', currentRouteName);
        }
      } catch (navError) {
        console.log('Could not determine current screen:', navError);
        // Use fallback navigation source to ensure we can navigate back somewhere
        params.previousScreen = 'Home';
        await AsyncStorage.setItem('NAVIGATION_SOURCE', 'Home');
      }
      
      if (source) {
        params.source = source;
        
        if (source === 'ShowPlaylistofType' && searchText) {
          params.searchText = searchText;
        } else if (source === 'LanguageDetail' && language) {
          params.language = language;
        }
      }
      
      // Pass along the navigation source if available
      if (navigationSource) {
        params.navigationSource = navigationSource;
      } else {
        // If navigationSource not provided, derive it from navState
        const navState = navigation.getState();
        const routeName = navState && navState.routes && navState.routes.length > 0 
          ? navState.routes[navState.index]?.name || '' 
          : '';
          
        if (routeName.includes('Home')) {
          params.navigationSource = 'Home';
        } else if (routeName.includes('Library')) {
          params.navigationSource = 'Library';
        } else if (routeName.includes('Search')) {
          params.navigationSource = 'Search';
        } else {
          // Default to Home if we can't determine
          params.navigationSource = 'Home';
        }
      }
      
      console.log(`Navigating to PlaylistPage with params:`, JSON.stringify(params));
      navigation.navigate("Playlist", params);
    } catch (error) {
      console.error('Error navigating to Playlist:', error);
      // Fallback navigation to prevent dead-end
      navigation.navigate("Home");
    }
  };
  
  // Add validation for empty image URLs
  const imageSource = image && image !== "" 
    ? { uri: image } 
    : require('../../Images/default.jpg');
  
  return (
    <Pressable onPress={handleNavigation} style={{
      ...(style || {}),
      margin: 4,
      borderRadius: 8,
      overflow: 'hidden',
      ...responsiveStyles.container,
      ...MainContainerStyle,
      backgroundColor: 'transparent', // Ensure no background color is applied
    }}>
      <View style={{ position: 'relative' }}>
        <FastImage source={imageSource} style={{
          ...responsiveStyles.image,
          borderRadius: 10,
          ...ImageStyle,
        }}/>
        {language && <LanguageTag language={language} />}
      </View>
      <SpaceBetween style={{
        ...responsiveStyles.textContainer,
        paddingHorizontal: 5, // Even padding on both sides
        backgroundColor: 'transparent', // Ensure no background color is applied
      }}>
        <View style={{
          width: "100%",
          flex: 1,
          justifyContent: 'flex-start',
          paddingRight: 5,
        }}>
          <PlainText 
            text={name}
            style={{
              marginTop: 4,  // Added top margin
              marginBottom: 2,
              fontWeight: 'bold',
              lineHeight: 19,
              maxHeight: 38,
              overflow: 'hidden',
              fontSize: 16,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          />
        </View>
      </SpaceBetween>
    </Pressable>
  );
})
