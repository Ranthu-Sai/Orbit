import { MainWrapper } from "../Layout/MainWrapper";
import Tabs from "../Component/Global/Tabs/Tabs";
import { useEffect, useState, useCallback } from "react";
import { getSearchSongData, getSearchArtistData } from "../Api/Songs";
import { View, TouchableOpacity, TextInput, Pressable, Dimensions, FlatList, StyleSheet, Text } from "react-native";
import SongDisplay from "../Component/SearchPage/SongDisplay";
import { LoadingComponent } from "../Component/Global/Loading";
import { getSearchPlaylistData } from "../Api/Playlist";
import PlaylistDisplay from "../Component/SearchPage/PlaylistDisplay";
import { getSearchAlbumData } from "../Api/Album";
import AlbumsDisplay from "../Component/SearchPage/AlbumDisplay";
import ArtistDisplay from "../Component/SearchPage/ArtistDisplay";
import { Spacer } from "../Component/Global/Spacer";
import { useTheme } from "@react-navigation/native";
import Entypo from "react-native-vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Divider } from 'react-native-paper';
import SwipeableHistoryItem from '../Component/SearchPage/SwipeableHistoryItem';

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 20;

export const SearchPage = ({navigation}) => {
  const { colors } = useTheme();
  const width = Dimensions.get("window").width;
  const [ActiveTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState("");
  const [SearchText, setSearchText] = useState("");
  const [Loading, setLoading] = useState(false);
  const [Data, setData] = useState({ data: { results: [] } });
  const [searchHistory, setSearchHistory] = useState([]);
  const [selectedSource] = useState('saavn');
  const limit = 20;

  async function fetchSearchData(text){
    if (!text) {
      setData({ data: { results: [] } });
      return;
    }

    try {
      setLoading(true);
      let data = null;

      if (ActiveTab === 0) {
        data = await getSearchSongData(text, 1, limit);
      } else if (ActiveTab === 1) {
        data = await getSearchPlaylistData(text, 1, limit);
      } else if (ActiveTab === 2) {
        data = await getSearchAlbumData(text, 1, limit);
      } else if (ActiveTab === 3) {
        data = await getSearchArtistData(text, 1, limit);
      }

      if (data && data.success !== false) {
        setData(data);
      } else {
        setData({ data: { results: [] } });
      }
    } catch (e) {
      console.error('Search error:', e);
      setData({ data: { results: [] } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (SearchText) {
      fetchSearchData(SearchText);
    } else {
      setData({ data: { results: [] } });
    }
  }, [SearchText, ActiveTab]);

  // Load search history on mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    };
    loadSearchHistory();
  }, []);

  // Save search query to history
  const saveToHistory = useCallback(async (query) => {
    if (!query || query.length < 2) return; // Don't save very short queries
    
    try {
      const updatedHistory = [
        query,
        ...searchHistory.filter(item => item.toLowerCase() !== query.toLowerCase())
      ].slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }, [searchHistory]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        setSearchText(query);
      } else {
        setSearchText('');
        setData({ data: { results: [] } });
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle search from history item
  const handleHistoryItemPress = (item) => {
    setQuery(item);
  };

  // Clear search history
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const handleManualSearch = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 1) { // Only save if query has more than 1 character
      saveToHistory(trimmedQuery);
      setSearchText(trimmedQuery);
    } else if (trimmedQuery.length > 0) {
      setSearchText(trimmedQuery);
    }
  };

  // Handle delete history item
  const handleDeleteHistoryItem = async (itemToDelete) => {
    try {
      const updatedHistory = searchHistory.filter(item => item !== itemToDelete);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  // Render search history item with swipe to delete
  const renderHistoryItem = ({ item }) => (
    <SwipeableHistoryItem
      item={item}
      onPress={() => handleHistoryItemPress(item)}
      onDelete={() => handleDeleteHistoryItem(item)}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          handleDeleteHistoryItem(item);
        }
      }}
    />
  );

  // Render search history list
  const renderSearchHistory = () => (
    <View style={{ flex: 1, marginTop: 10 }}>
      <View style={[styles.historyHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>
          Recent Searches
        </Text>
        {searchHistory.length > 0 && (
          <Pressable 
            onPress={() => {
              AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
              setSearchHistory([]);
            }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Clear All</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={searchHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) => index.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.historyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <MainWrapper>
      <Spacer />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            cursorColor={colors.text}
            placeholder="Search songs, albums, artists"
            placeholderTextColor={colors.text + '80'}
            style={[styles.searchInput, { color: colors.text }]}
            onChangeText={setQuery}
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
            autoFocus={true}
            value={query}
          />
        </View>

        <Pressable 
          onPress={() => { 
            if (query) {
              setQuery('');
              setSearchText('');
            } else {
              navigation.goBack();
            }
          }} 
          style={[styles.clearButton, { backgroundColor: colors.card }]}
        >
          <Entypo 
            name="cross" 
            size={20} 
            color={colors.text} 
          />
        </Pressable>
      </View>

      <Tabs tabs={["Songs", "Playlists", "Albums", "Artists"]} setState={setActiveTab} state={ActiveTab} />
      <Spacer height={15} />
      
      {!SearchText && searchHistory.length > 0 ? (
        renderSearchHistory()
      ) : Loading ? (
        <LoadingComponent loading={Loading} />
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          {ActiveTab === 0 && <SongDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
          {ActiveTab === 1 && <PlaylistDisplay data={Data} limit={limit} Searchtext={SearchText} />}
          {ActiveTab === 2 && <AlbumsDisplay data={Data} limit={limit} Searchtext={SearchText} />}
          {ActiveTab === 3 && <ArtistDisplay data={Data} limit={limit} Searchtext={SearchText} />}
        </View>
      )}
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  searchInputContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'gray',
    marginRight: 10,
  },
  searchInput: {
    fontSize: 18,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    paddingBottom: 20,
  },
});

