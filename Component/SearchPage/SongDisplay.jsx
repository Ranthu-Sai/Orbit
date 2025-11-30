import React, { useState, useEffect } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { EachSongCard } from '../Global/EachSongCard';
import { LoadingComponent } from '../Global/Loading';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import { useTheme } from '@react-navigation/native';

export default function SongDisplay({ data, source = 'saavn' }) {
  const [displayData, setDisplayData] = useState(data);
  const theme = useTheme();

  useEffect(() => {
    setDisplayData(data);

    // Tidal support removed: no preloading will occur.
  }, [data, source]);

  const width = Dimensions.get('window').width;

  function FormatArtist(artists) {
    if (!artists || !Array.isArray(artists)) return '';
    return artists.map(e => e.name).join(', ');
  }

  if (!displayData?.data?.results || displayData.data.results.length === 0) {
    return (
      <View style={{ height: 400, alignItems: 'center', justifyContent: 'center' }}>
        <PlainText
          text={'No Songs Found!'}
          style={{
            color: theme.dark ? '#CCCCCC' : '#666666',
            fontSize: 18,
            fontWeight: '600'
          }}
        />
        <SmallText
          text={'Try searching for something else. T_T'}
          style={{
            color: theme.dark ? '#999999' : '#888888',
            marginTop: 8
          }}
        />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
        contentContainerStyle={{ paddingBottom: 220 }}
        data={displayData.data.results}
        renderItem={({ item }) => {
          if (!item || !item.id) return null; // Render nothing if item is invalid
          return (
            <EachSongCard
              artistID={item?.primaryArtistsId || item?.primary_artists_id}
              language={item?.language}
              duration={item?.duration}
              image={item?.image?.[2]?.url ?? item?.image?.[0]?.url ?? ''}
              id={item?.id}
              width={width * 0.95}
              title={item?.name || item?.title}
              artist={FormatArtist(item?.artists?.primary)}
              url={item?.downloadUrl} // This is used for Saavn downloads, YTMusic doesn't have downloads yet
              showNumber={false}
              source={source === 'ytmusic' ? 'ytmusic' : 'search'} // Mark YTMusic songs appropriately
              Data={displayData}
              index={displayData.data.results.findIndex(x => x.id === item.id)}
            />
          );
        }}
      />
    </View>
  );
}
