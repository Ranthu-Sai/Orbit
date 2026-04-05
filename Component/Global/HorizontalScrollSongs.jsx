import { EachSongCard } from './EachSongCard';
import { Dimensions, ScrollView, View } from 'react-native';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { useEffect, useState, useMemo } from 'react';
import { getPlaylistData } from '../../Api/Playlist';
import { getChartData } from '../../Api/Chart';
import { HorizontalSongsSkeleton } from '../Home/HorizontalSongsSkeleton';
import { Heading } from './Heading';
import FormatArtist from '../../Utils/FormatArtists';
import { Spacer } from './Spacer';

// Add utility function to truncate text
const truncateText = (text, limit = 30) => {
  if (!text) {
    return '';
  }
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

export const HorizontalScrollSongs = ({ id, type = 'playlist' }) => {
  const width = Dimensions.get('window').width;
  const [Loading, setLoading] = useState(true);
  const [Data, setData] = useState({});
  const [randomOffset, setRandomOffset] = useState(0);
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  // Get a random starting point for songs
  useEffect(() => {
    // Only randomize if we have songs
    if (Data?.data?.songs?.length > 8) {
      // Generate a random offset, but ensure there are at least 8 songs after the offset
      const maxOffset = Data.data.songs.length - 8;
      const offset = Math.floor(Math.random() * maxOffset);
      setRandomOffset(offset);
    }
  }, [Data?.data?.songs, id]);

  // Function to get songs with random offset
  const getRandomizedSongs = useMemo(() => {
    if (!Data?.data?.songs) {
      return { firstGroup: [], secondGroup: [] };
    }

    const songsWithOffset = [...Data.data.songs.slice(randomOffset)];
    return {
      firstGroup: songsWithOffset.slice(0, 4),
      secondGroup: songsWithOffset.slice(4, 8),
    };
  }, [Data?.data?.songs, randomOffset]);

  async function fetchData() {
    try {
      setLoading(true);
      if (!id) {
        setLoading(false);
        return;
      }
      let data;
      if (type === 'chart') {
        data = await getChartData(id);
      } else {
        data = await getPlaylistData(id);
      }
      setData(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id, type]);
  return (
    <>
      {id && (
        <>
          <Spacer />
          <Spacer />
          {!Loading && (
            <Heading text={truncateText(Data?.data?.name, 30)} nospace={true} />
          )}
          <Spacer />
          {!Loading && (
            <ScrollView
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            >
              <View>
                {getRandomizedSongs.firstGroup.map((e, i) => (
                  <View
                    key={`first-${e.id}-${i}`}
                    style={{ marginBottom: 1, marginVertical: 0 }}
                  >
                    <EachSongCard
                      index={randomOffset + i}
                      isFromPlaylist={true}
                      Data={Data}
                      artist={truncateText(
                        e?.primaryArtists || FormatArtist(e?.artists?.primary),
                        30
                      )}
                      language={e?.language}
                      playlist={true}
                      artistID={e?.primaryArtistsId || e?.primary_artists_id}
                      duration={e?.duration}
                      image={
                        e?.image?.[2]?.link ||
                        e?.image?.[2]?.url ||
                        e?.images?.[2]?.link ||
                        e?.images?.[2]?.url ||
                        ''
                      }
                      id={e?.id}
                      width={width * 0.8}
                      title={truncateText(e?.name, 30)}
                      url={e?.downloadUrl}
                      titleandartistwidth={width * 0.5}
                      showNumber={false} // Explicitly set to false for homescreen
                      activeTrackId={activeTrack?.id}
                      isPlaying={
                        playbackState.state === 'playing' ||
                        playbackState.state === 3
                      }
                    />
                  </View>
                ))}
              </View>
              <View>
                {getRandomizedSongs.secondGroup.map((e, i) => (
                  <View
                    key={`second-${e.id}-${i}`}
                    style={{ marginBottom: 1, marginVertical: 0 }}
                  >
                    <EachSongCard
                      index={randomOffset + i + 4}
                      Data={Data}
                      isFromPlaylist={true}
                      artist={truncateText(
                        e?.primaryArtists || FormatArtist(e?.artists?.primary),
                        30
                      )}
                      language={e?.language}
                      playlist={true}
                      artistID={e?.primaryArtistsId || e?.primary_artists_id}
                      duration={e?.duration}
                      image={
                        e?.image?.[2]?.link ||
                        e?.image?.[2]?.url ||
                        e?.images?.[2]?.link ||
                        e?.images?.[2]?.url ||
                        ''
                      }
                      id={e?.id}
                      width={width * 0.8}
                      title={truncateText(e?.name, 30)}
                      url={e?.downloadUrl}
                      titleandartistwidth={width * 0.5}
                      showNumber={false} // Explicitly set to false for homescreen
                      activeTrackId={activeTrack?.id}
                      isPlaying={
                        playbackState.state === 'playing' ||
                        playbackState.state === 3
                      }
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          {Loading && <HorizontalSongsSkeleton />}
        </>
      )}
    </>
  );
};
