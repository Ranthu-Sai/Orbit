import { ImageBackground, Pressable, View, Dimensions } from "react-native";
import { PlainText } from "./PlainText";
import { SmallText } from "./SmallText";
import { memo, useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../Context/ThemeContext";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FastImage from "react-native-fast-image";



export const EachAlbumCard = memo(function EachAlbumCard({image, name, artists, id, mainContainerStyle, Search, source, searchText, language}) {
  const navigation = useNavigation()
  const { theme } = useThemeContext();
  const dark = theme.dark;
  let artistsNames = ""
  const { width, height } = Dimensions.get('window');
  
  // Calculate responsive dimensions based on screen size
  const responsiveStyles = useMemo(() => {
    // Base width is ~42% of screen width with some minimum size
    const cardWidth = Math.max(180, width * 0.42);
    // Height maintains aspect ratio (roughly square)
    const cardHeight = cardWidth;
    
    return {
      container: {
        width: cardWidth,
        height: cardHeight,
        borderRadius: 10,
        marginRight: 8, // Increased to 8px right margin
      },
      image: {
        height: "100%",
        width: "100%",
      }
    };
  }, [width]);
  
  // Improved truncation function that works for any text
  function truncateText(text, limit = 20) {
    if (!text) return "";
    return text.length > limit ? text.slice(0, limit) + "..." : text;
  }
  
  if (!Search){
    if (Array.isArray(artists) && artists.length > 0) {
      if (artists.length > 3){
        for (let i = 0; i < 3; i++){
          if ( i === 2){
            artistsNames += artists[i].name
          } else {
            const additionName = artists[i].name + ", "
            artistsNames += additionName
          }
        }
        artistsNames += " ..."
      } else {
        artists.map((e,i)=>{
          if (i === artists.length - 1){
            artistsNames += e.name
          } else {
            const additionName = e.name + ", "
            artistsNames += additionName
          }
        })
      }
    } else if (typeof artists === 'string') {
      // Handle when artists is a string instead of an array
      artistsNames = artists;
    }
    
    // Truncate the combined artists string if it's too long
    artistsNames = truncateText(artistsNames);
  }
  
  // Add validation for empty image URLs
  const imageSource = image && image !== "" 
    ? { uri: image } 
    : require('../../Images/default.jpg');
  
  return (
    <Pressable
      onPress={async () => {
      try {
        // Add current screen to breadcrumbs before navigating
        const currentScreenName = source || 'Home';
        const currentDisplayName = source === 'Search' ? 'Search' :
                                  source === 'ShowPlaylistofType' ? 'Playlists' :
                                  source === 'LanguageDetail' ? 'Language' : 'Home';



        // Create params object with source tracking
        const params = {
          id,
          name: name, // Add album name for breadcrumb display
          timestamp: Date.now() // Add timestamp to ensure fresh navigation and prevent caching issues
        };

        // Add source tracking if available
        if (source) {
          params.source = source;

          if (source === 'ShowPlaylistofType' && searchText) {
            params.searchText = searchText;
          } else if (source === 'LanguageDetail' && language) {
            params.language = language;
          }

          // First, clear any existing album and playlist data to prevent navigation conflicts
          // Await all operations to ensure they complete before navigation
          await Promise.all([
            AsyncStorage.removeItem("orbit_current_album_id"),
            AsyncStorage.removeItem("orbit_current_album_data"),
            AsyncStorage.removeItem("orbit_current_playlist_id"),
            AsyncStorage.removeItem("orbit_current_playlist_data")
          ]);

          // Choose the appropriate navigation method based on source
          if (source === 'Home') {
            navigation.navigate("Home", {
              screen: "Album",
              params: params
            });
          } else {
            navigation.navigate("Album", params);
          }
        } else {
          // Default navigation if no source is provided
          // First, clear any existing album and playlist data to prevent navigation conflicts
          // Await all operations to ensure they complete before navigation
          await Promise.all([
            AsyncStorage.removeItem("orbit_current_album_id"),
            AsyncStorage.removeItem("orbit_current_album_data"),
            AsyncStorage.removeItem("orbit_current_playlist_id"),
            AsyncStorage.removeItem("orbit_current_playlist_data")
          ]);

          navigation.navigate("Album", { id, name: name, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Error navigating to Album:', error);
        // Fallback navigation to prevent dead-end
        navigation.navigate("Home", { screen: "HomePage" });
      }
    }}
      style={{
        ...(mainContainerStyle || {}),
        margin: 2,
        borderRadius: 8,
        overflow: 'hidden',
        ...responsiveStyles.container,
      }}
    >
      <View style={{
        ...responsiveStyles.image,
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <FastImage 
          source={imageSource} 
          style={{ 
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 8, // Match the parent container's border radius
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={{
          width:"100%",
          height:"100%",
          justifyContent:"flex-end",
          backgroundColor: dark ? "rgba(0,0,0,0.27)" : "rgba(0,0,0,0.1)",
        }}>
          <LinearGradient 
            start={{x: 0, y: 0}} 
            end={{x: 0, y: 1}} 
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
            style={{
            padding: 10,
            paddingTop: 15,
          }}>
            <PlainText 
              text={truncateText(name, 15)} 
              style={{
                fontWeight: 'bold',
                color: '#FFFFFF',
                fontSize: 15,
              }}
            />
            <SmallText 
              text={!Search ? truncateText(artistsNames, 30) : truncateText(artists, 30)} 
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontWeight: '500',
              }}
            />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
})
