import Animated, { useAnimatedRef } from "react-native-reanimated";
import { LikedPagesTopHeader } from "../../Component/Library/TopHeaderLikedPages";
import { LikedDetails } from "../../Component/Library/LikedDetails";
import { useEffect, useState } from "react";
import { GetLikedPlaylist } from "../../LocalStorage/StoreLikedPlaylists";
import { EachPlaylistCard } from "../../Component/Global/EachPlaylistCard";
import { View, Dimensions, StyleSheet } from "react-native";
import { useTheme, useNavigation, useFocusEffect } from "@react-navigation/native";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import React from "react";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LikedPlaylistPage = () => {
  const theme = useTheme()
  const AnimatedRef = useAnimatedRef()
  const [LikedPlaylist, setLikedPlaylist] = useState([]);
  const navigation = useNavigation();
  
  // Removed BackHandler - let RootRoute handle navigation

  async function getAllLikedSongs(){
    const Playlists = await GetLikedPlaylist()
    const Temp = []
    for (const [key, value] of Object.entries(Playlists.playlist)) {
      Temp[value.count] = value
    }
    setLikedPlaylist(Temp.filter(Boolean)) // Filter out any empty entries
    console.log('Liked playlists loaded:', Temp.filter(Boolean).length);
  }
  
  // Use a focus effect to refresh the data whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('LikedPlaylistPage focused, refreshing playlists');
      getAllLikedSongs();
      return () => {};
    }, [])
  );
  
  // Initial load
  useEffect(() => {
    getAllLikedSongs();
  }, []);

  return (
    <Animated.ScrollView 
      scrollEventThrottle={16} 
      ref={AnimatedRef} 
      contentContainerStyle={{
        paddingBottom: 65,
        backgroundColor: theme.colors.background,
      }}
    >
      <LikedPagesTopHeader AnimatedRef={AnimatedRef} url={require("../../Images/LikedPlaylist.png")} />
      <LikedDetails name={"Liked Playlists"} dontShowPlayButton={true} textStyle={!theme.dark ? { color: '#FFFFFF' } : {}}/>
      <PaddingConatiner>
        <View style={styles.playlistContainer}>
          {LikedPlaylist.map((e, i) => {
            if (e) {
              return (
                <View key={e.id || `playlist-${i}`} style={styles.cardWrapper}>
                  <EachPlaylistCard 
                    name={e.name}
                    image={e.image}
                    id={e.id}
                    follower={e.follower}
                    MainContainerStyle={styles.playlistCard}
                  />
                </View>
              );
            }
            return null;
          })}
        </View>
      </PaddingConatiner>
    </Animated.ScrollView>
  );
};

// Add responsive styles
const styles = StyleSheet.create({
  playlistContainer: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingTop: 5,
  },
  cardWrapper: {
    width: SCREEN_WIDTH <= 360 ? '48%' : '48%', // Adjust based on screen size
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  playlistCard: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  }
});
