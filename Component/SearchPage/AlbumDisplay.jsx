/* eslint-disable keyword-spacing */
import React, { useState } from 'react'
import { Dimensions, FlatList, View } from 'react-native'
import { LoadingComponent } from '../Global/Loading'
import { PlainText } from '../Global/PlainText'
import { SmallText } from '../Global/SmallText'
import { EachAlbumCard } from '../Global/EachAlbumCard'
import { getSearchAlbumData } from '../../Api/Album'
import { useTheme } from '@react-navigation/native'

export default function AlbumsDisplay({ data, limit, Searchtext, source }) {
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
            const { getYTMusicSearchAlbumData } = require('../../Api/YTMusic');
            fetchdata = await getYTMusicSearchAlbumData(text, page, limit);
          } else if (source === 'spotify') {
            // Spotify search returns all results at once, no pagination needed
            return;
          } else {
            fetchdata = await getSearchAlbumData(text, page, limit);
          }
          const temp = Data
          const finalData = [...temp.data.results, ...fetchdata.data.results]
          temp.data.results = finalData
          setData(temp)
        } catch (e) {
        } finally {
          setLoading(false)
        }
      }
    }
  }

  function FormatArtist(data) {
    let artist = ""
    data?.map((e, i) => {
      if (i === data.length - 1) {
        artist += e.name
      } else {
        artist += e.name + ", "
      }
    })
    return artist
  }

  const { width } = Dimensions.get("window")

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
            marginBottom: 15,
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
                if (Array.isArray(item.item.image) && item.item.image.length > 0) {
                  // Handle object array format (YTMusic, Spotify)
                  // Prefer highest quality (index 2), fall back to last item, then first
                  const bestImage = item.item.image[2] || item.item.image[item.item.image.length - 1] || item.item.image[0];
                  if (bestImage) {
                    imageUrl = bestImage.url || bestImage.link || '';
                  }
                } else if (typeof item.item.image === 'string') {
                  // Handle direct URL string format (Saavn)
                  imageUrl = item.item.image;
                }
              }
              // Fallback to artwork if image not found
              if (!imageUrl && item.item?.artwork) {
                imageUrl = item.item.artwork;
              }

              return (
                <EachAlbumCard
                  Search={true}
                  mainContainerStyle={{
                    width: width * 0.46,
                    height: width * 0.66,
                    margin: 0,
                  }}
                  image={imageUrl}
                  artists={FormatArtist(item.item?.artists?.primary)}
                  name={item?.item?.name ?? ""}
                  id={item?.item?.id ?? ""}
                  source={source || "Search"} // Pass source
                  searchText={Searchtext}
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
            text={"No Album found!"}
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
