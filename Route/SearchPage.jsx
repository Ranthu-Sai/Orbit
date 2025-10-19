import { MainWrapper } from "../Layout/MainWrapper";
import Tabs from "../Component/Global/Tabs/Tabs";
import { useEffect, useState } from "react";
import { getSearchSongData, getSearchArtistData } from "../Api/Songs";
import { View, TouchableOpacity, ToastAndroid, TextInput, Pressable, Dimensions } from "react-native";
import SongDisplay from "../Component/SearchPage/SongDisplay";
import { LoadingComponent } from "../Component/Global/Loading";
import { getSearchPlaylistData } from "../Api/Playlist";
import PlaylistDisplay from "../Component/SearchPage/PlaylistDisplay";
import { getSearchAlbumData } from "../Api/Album";
import AlbumsDisplay from "../Component/SearchPage/AlbumDisplay";
import ArtistDisplay from "../Component/SearchPage/ArtistDisplay";
import { Spacer } from "../Component/Global/Spacer";
import { PlainText } from "../Component/Global/PlainText";
import { useTheme } from "@react-navigation/native";
import Entypo from "react-native-vector-icons/Entypo";

export const SearchPage = ({navigation}) => {
  const { colors } = useTheme();
  const width = Dimensions.get("window").width;
  const [ActiveTab, setActiveTab] = useState(0)
  const [query, setQuery] = useState("");
  const [SearchText, setSearchText] = useState("")
  const [Loading, setLoading] = useState(false)
  const [Data, setData] = useState({});
  const [selectedSource] = useState('saavn'); // only Saavn supported now
  const [manualSearch, setManualSearch] = useState(false);
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

  // Debounce query -> SearchText
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchText(query);
      setManualSearch(false);
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleManualSearch = () => {
    setSearchText(query);
    setManualSearch(true);
  };

  return (
    <MainWrapper>
      <Spacer />

      <View style={{
        flexDirection: "row",
        gap: 2,
        alignItems: "center",
        height: 60,
        marginHorizontal: 10,
      }}>
        <View style={{
          flex: 1,
          paddingHorizontal: 5,
          backgroundColor: "rgba(0,0,0,0)",
          borderTopLeftRadius: 10,
          borderBottomLeftRadius: 10
        }}>
          <TextInput
            cursorColor={colors.text}
            placeholder="Search songs"
            placeholderTextColor={colors.text + '80'}
            style={{
              color: colors.text,
              fontSize: 25,
              fontFamily: "roboto",
            }}
            onChangeText={(text) => setQuery(text)}
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
            autoFocus={true}
            value={query}
          />
        </View>

        <Pressable onPress={() => { navigation.goBack(); }} style={{
          backgroundColor: "white",
          height: 43,
          justifyContent: "center",
          width: 43,
          borderRadius: 100000,
          elevation: 10,
          alignItems: "center",
        }}>
          <Entypo name={"cross"} size={width * 0.045} color={"black"} />
        </Pressable>
      </View>

      <Tabs tabs={["Songs", "Playlists", "Albums", "Artists"]} setState={setActiveTab} state={ActiveTab} />

      <Spacer height={15} />
      {Loading && <LoadingComponent loading={Loading} />}
      {!Loading && <View style={{ paddingHorizontal: 10 }}>
        {ActiveTab === 0 && !Loading && <SongDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
        {ActiveTab === 1 && !Loading && <PlaylistDisplay data={Data} limit={limit} Searchtext={SearchText} />}
        {ActiveTab === 2 && !Loading && <AlbumsDisplay data={Data} limit={limit} Searchtext={SearchText} />}
        {ActiveTab === 3 && !Loading && <ArtistDisplay data={Data} limit={limit} Searchtext={SearchText} />}
      </View>}
    </MainWrapper>
  );
};

