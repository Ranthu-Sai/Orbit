/* eslint-disable keyword-spacing */
import React, { useState } from 'react'
import { Dimensions, FlatList, View } from 'react-native'
import { LoadingComponent } from '../Global/Loading'
import { EachPlaylistCard } from '../Global/EachPlaylistCard'
import { PlainText } from '../Global/PlainText'
import { SmallText } from '../Global/SmallText'
import { getSearchPlaylistData } from '../../Api/Playlist'
import { useTheme } from '@react-navigation/native'

export default function PlaylistDisplay({ data, limit, Searchtext, source }) {
  const [Data, setData] = useState(data)
  const totalPages = Math.ceil(Data?.data?.total ?? 1 / limit)
  const [Page, setPage] = useState(1)
  const [Loading, setLoading] = useState(false)
  const theme = useTheme()

  async function fetchSearchData(text, page) {
    if (Page <= totalPages) {
      if (Searchtext !== "") {
        try {
          setLoading(true)
          let fetchdata;
          // Use correct API based on source
          if (source === 'ytmusic') {
            const { getYTMusicSearchPlaylistData } = require('../../Api/YTMusic');
            fetchdata = await getYTMusicSearchPlaylistData(text, page, limit);
          } else {
            fetchdata = await getSearchPlaylistData(text, page, limit);
          }

          const temp = Data
          const finalData = [...temp.data.results, ...fetchdata.data.results]
          temp.data.results = finalData
          setData(temp)
        } catch (e) {
          console.log(e);
        } finally {
          setLoading(false)
        }
      }
    }
  }

  const { width } = Dimensions.get("window")

  // Function to truncate text
  const truncateText = (text, limit = 30) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  return (
    <>
      {Data?.data?.results?.length !== 0 &&
        <FlatList
          showsVerticalScrollIndicator={false}
          numColumns={2}
          keyExtractor={(item, index) => String(index)}
          onEndReached={() => {
            setTimeout(() => {
              setPage(Page + 1)
              fetchSearchData(Searchtext, Page)
            }, 200)
          }}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingBottom: 120, // Extra padding for bottom player
            alignItems: "center",
          }}
          columnWrapperStyle={{
            justifyContent: 'space-between',
            marginBottom: 20,
            width: '100%',
          }}
          data={[...Data?.data?.results ?? [], { LoadingComponent: true }]}
          renderItem={(item) => {
            if (item.item.LoadingComponent === true) {
              return <LoadingComponent loading={Loading} height={100} />
            } else {
              // Safely extract image URL with fallbacks for different data formats
              let imageUrl = '';
              if (item.item?.image) {
                if (Array.isArray(item.item.image) && item.item.image.length > 2) {
                  // Handle object array format (YTMusic)
                  if (item.item.image[2]?.link) {
                    imageUrl = item.item.image[2].link;
                  } else if (item.item.image[2]?.url) {
                    imageUrl = item.item.image[2].url;
                  } else if (item.item.image[0]?.url) {
                    imageUrl = item.item.image[0].url;
                  }
                } else {
                  // Handle direct URL string format (Saavn fallback)
                  imageUrl = item.item.image;
                }
              }

              return (
                <EachPlaylistCard
                  name={truncateText(item.item?.name, 30)}
                  follower={truncateText("Total " + (item.item?.songCount || 0) + " Songs", 30)}
                  key={item.index}
                  image={imageUrl}
                  id={item.item?.id}
                  source={source || "Search"} // Pass source ('ytmusic' or 'saavn')
                  searchText={Searchtext}
                  MainContainerStyle={{
                    width: width * 0.42,
                    height: width * 0.62,
                    margin: 8,
                  }}
                  ImageStyle={{
                    height: width * 0.46,
                    borderRadius: 8,
                  }}
                />
              )
            }
          }}
        />
      }
      {Data?.data?.results?.length === 0 &&
        <View style={{
          flex: 1,
          height: 400,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}>
          <PlainText
            text={"No Playlist found!"}
            style={{
              textAlign: 'center',
              color: theme.dark ? '#CCCCCC' : '#666666',
              fontSize: 18,
              fontWeight: '600'
            }}
          />
          <SmallText
            text={"Opps!  T_T"}
            style={{
              textAlign: 'center',
              color: theme.dark ? '#999999' : '#888888',
              marginTop: 8
            }}
          />
        </View>
      }
    </>
  )
}
