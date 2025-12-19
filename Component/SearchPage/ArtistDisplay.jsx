/* eslint-disable keyword-spacing */
import React, { useState, useEffect } from 'react'
import { Dimensions, FlatList, View } from 'react-native'
import { getYTMusicSearchArtistData } from '../../Api/YTMusic'
import { LoadingComponent } from '../Global/Loading'
import { PlainText } from '../Global/PlainText'
import { SmallText } from '../Global/SmallText'
import { EachArtistCardGrid } from '../Global/EachArtistCardGrid'
import { useTheme } from '@react-navigation/native'

// Helper function to normalize artist names for comparison
function normalizeArtistName(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Remove all Unicode control characters and invisible characters
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to remove duplicates from artist array
function removeDuplicateArtists(artists) {
  if (!artists || !Array.isArray(artists)) {
    return [];
  }

  const seen = new Set();
  const seenNames = new Set();

  return artists.filter((artist, index) => {
    if (!artist || !artist.id) {
      return false; // Remove invalid entries
    }

    // Check for duplicate IDs
    if (seen.has(artist.id)) {
      console.log(`Removing duplicate artist ID: ${artist.id} - ${artist.name}`);
      return false;
    }

    // Check for duplicate normalized names
    const normalizedName = normalizeArtistName(artist.name);
    if (seenNames.has(normalizedName)) {
      console.log(`Removing duplicate artist name: "${artist.name}" (normalized: "${normalizedName}")`);
      return false;
    }

    // Add to seen sets
    seen.add(artist.id);
    seenNames.add(normalizedName);

    return true;
  });
}

export default function ArtistDisplay({ data, limit, Searchtext }) {
  const [Data, setData] = useState(data)
  const totalPages = Math.ceil(Data?.data?.total ?? 1 / limit)
  const [Page, setPage] = useState(1)
  const [Loading, setLoading] = useState(false)
  const theme = useTheme()

  // Update data when props change with deduplication
  useEffect(() => {
    if (data && data.data && data.data.results) {
      const deduplicatedResults = removeDuplicateArtists(data.data.results);
      const cleanData = {
        ...data,
        data: {
          ...data.data,
          results: deduplicatedResults,
          total: deduplicatedResults.length
        }
      };
      setData(cleanData);
    } else {
      setData(data);
    }
  }, [data]);

  async function fetchSearchData(text, page) {
    if (Page <= totalPages) {
      if (Searchtext !== "") {
        try {
          setLoading(true)
          let fetchdata;
          // Always use YTMusic for artist search for consistent UI
          fetchdata = await getYTMusicSearchArtistData(text, page, limit);

          // Check if fetchdata has valid structure
          if (fetchdata && fetchdata.data && fetchdata.data.results) {
            if (Data && Data.data && Data.data.results) {
              // Combine existing and new results, then remove duplicates
              const combinedData = [...Data.data.results, ...fetchdata.data.results]
              const finalData = removeDuplicateArtists(combinedData)

              console.log(`Combined ${Data.data.results.length} existing + ${fetchdata.data.results.length} new = ${combinedData.length} total`);
              console.log(`After deduplication: ${finalData.length} unique artists`);

              // Create new data object instead of mutating existing one
              const newData = {
                ...Data,
                data: {
                  ...Data.data,
                  results: finalData,
                  total: finalData.length
                }
              }
              setData(newData)
            } else {
              // First load - just set the data with deduplication
              const finalData = removeDuplicateArtists(fetchdata.data.results)
              const newData = {
                ...fetchdata,
                data: {
                  ...fetchdata.data,
                  results: finalData,
                  total: finalData.length
                }
              }
              setData(newData)
            }
          }
        } catch (e) {
          console.log(e);
        } finally {
          setLoading(false)
        }
      }
    }
  }
  const width = Dimensions.get("window").width

  return (
    <View>
      {Data?.data?.results?.length !== 0 && <FlatList
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => item?.id ? `artist_${item.id}_${index}` : `artist_index_${index}`}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
        onEndReached={() => {
          setTimeout(() => {
            setPage(Page + 1)
            fetchSearchData(Searchtext, Page)
          }, 200)
        }}
        contentContainerStyle={{
          paddingBottom: 220,
          paddingHorizontal: 10,
        }}
        data={Data?.data?.results ?? []}
        ListFooterComponent={() => Loading ? <LoadingComponent loading={Loading} height={100} /> : null}
        renderItem={(item) => {
          // Safely extract image URL with fallbacks for different data formats
          let imageUrl = '';
          if (item.item?.image) {
            if (Array.isArray(item.item.image) && item.item.image.length > 0) {
              // Handle object array format (YTMusic/Saavn)
              if (item.item.image[2]?.url) {
                imageUrl = item.item.image[2].url;
              } else if (item.item.image[0]?.url) {
                imageUrl = item.item.image[0].url;
              }
            } else if (typeof item.item.image === 'string') {
              // Handle direct URL string format
              imageUrl = item.item.image;
            }
          }

          return <EachArtistCardGrid
            id={item.item?.id}
            name={item.item?.name}
            role={item.item?.role}
            image={imageUrl}
            followerCount={item.item?.followerCount || item.item?.follower_count || 0}
            searchText={Searchtext}
            mainContainerStyle={{
              marginBottom: 5,
            }}
          />
        }}
      />}
      {Data?.data?.results?.length === 0 && <View style={{
        height: 400,
        alignItems: "center",
        justifyContent: "center",
      }}>
        <PlainText
          text={"No Artist found!"}
          style={{
            color: theme.dark ? '#CCCCCC' : '#666666',
            fontSize: 18,
            fontWeight: '600'
          }}
        />
        <SmallText
          text={"Opps!  T_T"}
          style={{
            color: theme.dark ? '#999999' : '#888888',
            marginTop: 8
          }}
        />
      </View>}
    </View>
  )
}
