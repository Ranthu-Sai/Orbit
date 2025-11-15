/* eslint-disable keyword-spacing */
import React, { useState } from 'react'
import { Dimensions, FlatList, View } from 'react-native'
import { LoadingComponent } from '../Global/Loading'
import { PlainText } from '../Global/PlainText'
import { SmallText } from '../Global/SmallText'
import { EachAlbumCard } from '../Global/EachAlbumCard'
import { getSearchAlbumData } from '../../Api/Album'
import { useTheme } from '@react-navigation/native'

export default function AlbumsDisplay({data, limit, Searchtext}) {
  const [Data, setData] = useState(data)
  const totalPages = Math.ceil(Data?.data?.total ?? 1 / limit)
  const [Page, setPage] = useState(1)
  const [Loading, setLoading] = useState(false)
  const theme = useTheme()
  
  async function fetchSearchData(text,page){
    if (Page <= totalPages){
      if(Searchtext !== ""){
        try {
          setLoading(true)
          const fetchdata = await getSearchAlbumData(text,page,limit)
          const temp = Data
          const finalData = [...temp.data.results,...fetchdata.data.results]
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
  
  function FormatArtist(data){
    let artist = ""
    data?.map((e,i)=>{
      if (i === data.length - 1){
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
          data={[...Data?.data?.results ?? [], {LoadingComponent: true}]}
          renderItem={(item) => {
            if(item.item.LoadingComponent === true){
              return <LoadingComponent loading={Loading} height={100}/>
            } else {
              // Safely extract image URL with fallbacks for different data formats
              let imageUrl = '';
              if (item.item?.image) {
                if (Array.isArray(item.item.image) && item.item.image.length > 2) {
                  // Handle object array format (YTMusic)
                  if (item.item.image[2]?.url) {
                    imageUrl = item.item.image[2].url;
                  } else if (item.item.image[0]?.url) {
                    imageUrl = item.item.image[0].url;
                  }
                } else if (typeof item.item.image === 'string') {
                  // Handle direct URL string format (Saavn)
                  imageUrl = item.item.image;
                }
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
                  source="Search"
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
