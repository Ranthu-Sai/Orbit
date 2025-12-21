import { Dimensions, Pressable, View, Image, ToastAndroid, Alert } from "react-native";
import { PlainText } from "./PlainText";
import { SmallText } from "./SmallText";
import { AddPlaylist, getIndexQuality, PlayOneSong } from "../../MusicPlayerFunctions";
import { useTheme } from "@react-navigation/native";
import { memo, useContext, useState, useEffect } from "react";
import Context from "../../Context/Context";
// Removed unused TrackPlayer hooks
import FormatTitleAndArtist, { truncateText } from "../../Utils/FormatTitleAndArtist";
import FormatArtist from "../../Utils/FormatArtists";
import { EachSongMenuButton } from "../MusicPlayer/EachSongMenuButton";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { StorageManager } from '../../Utils/StorageManager';
import EventRegister from '../../Utils/EventRegister';
import Octicons from 'react-native-vector-icons/Octicons';
import { requestStoragePermission } from '../../Utils/PermissionManager';
import { UnifiedDownloadService } from '../../Utils/UnifiedDownloadService';
import queueManager from '../../Utils/QueueManager';

export const EachSongCard = memo(function EachSongCard({ title, artist, image, id, url, duration, language, artistID, isLibraryLiked, width, titleandartistwidth, isFromPlaylist, isFromAlbum = false, Data, index, showNumber = false, source = 'saavn', truncateTitle = false, onDeleteComplete, activeTrackId, isPlaying, item }) {
  const theme = useTheme();
  const { colors } = theme;
  const width1 = Dimensions.get("window").width;
  const { updateTrack } = useContext(Context)
  // Removed hooks to prevent excessive listeners
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadInProgress, setDownloadInProgress] = useState(false);

  // Simple string image URI handling
  let imageSource = null;
  let safeImageUri = '';

  try {
    if (id === (activeTrackId ?? "") && isPlaying) {
      imageSource = require("../../Images/playing.gif");
    } else if (id === (activeTrackId ?? "") && !isPlaying) {
      imageSource = require("../../Images/songPaused.gif");
    } else {
      if (typeof image === 'string') {
        safeImageUri = image;
      } else if (image && typeof image === 'object') {
        try {
          if (typeof image.uri === 'string') {
            safeImageUri = image.uri;
          } else if (typeof image.url === 'string') {
            safeImageUri = image.url;
          } else if (Array.isArray(image) && image.length > 0 && typeof image[0] === 'string') {
            safeImageUri = image[0];
          }
        } catch (e) {
          safeImageUri = '';
        }
      }
      imageSource = safeImageUri ? { uri: safeImageUri } : null;
    }
  } catch (error) {
    console.error('Error preparing image source:', error);
    imageSource = null;
    safeImageUri = '';
  }

  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (id) {
        try {
          const downloaded = await StorageManager.isSongDownloaded(id);
          setIsDownloaded(downloaded);
        } catch (error) {
          console.error('Error checking download status:', error);
          setIsDownloaded(false);
        }
      }
    };

    checkDownloadStatus();
  }, [id]);

  useEffect(() => {
    let downloadListener = null;
    let downloadStartedListener = null;

    try {
      downloadListener = EventRegister.addEventListener('download-complete', (songId) => {
        if (songId === id) {
          setIsDownloaded(true);
          setDownloadInProgress(false);
        }
      });

      downloadStartedListener = EventRegister.addEventListener('download-started', (songId) => {
        if (songId === id) {
          setDownloadInProgress(true);
        }
      });
    } catch (error) {
      console.error('Error setting up download listeners:', error);
    }

    return () => {
      try {
        if (downloadListener !== null) {
          EventRegister.removeEventListener(downloadListener);
        }
        if (downloadStartedListener !== null) {
          EventRegister.removeEventListener(downloadStartedListener);
        }
      } catch (error) {
        console.error('Error cleaning up download listeners:', error);
      }
    };
  }, [id]);

  const formatText = (text) => {
    if (!text) return "Unknown";
    try {
      const formattedText = FormatTitleAndArtist(String(text));
      if (!formattedText) return "Unknown";
      return formattedText.length > 15 ? formattedText.substring(0, 20) + "..." : formattedText;
    } catch (error) {
      console.warn('Error formatting text:', error);
      return "Unknown";
    }
  }

  // Format duration from seconds to MM:SS format (like OuterTune)
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0 || seconds === '0') return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return ` • ${mins}:${secs.toString().padStart(2, '0')}`;
  }

  async function AddSongToPlayer() {
    console.log(`[Playback] Clicked on song: "${title}", Source: ${source}, ID: ${id}`);

    if (isFromPlaylist) {
      const songs = Data?.data?.songs || [];
      const current = songs[index];

      // If this playlist is from YTMusic, play only the clicked song immediately,
      // then queue a small batch of next songs in background.
      const isYtMusicPlaylist = current && ((current.source === 'ytmusic') || (typeof current.id === 'string' && current.id.length === 11));

      if (isYtMusicPlaylist && current) {
        // Use the new AddPlaylist logic which handles slicing and lazy loading
        // Pass the full songs array and the ID of the song to start from
        console.log(`[Playback] YTMusic Playlist: Playing from song ${current.id || current.videoId} (Index: ${index})`);

        // Pass the raw songs array - AddPlaylist processes it
        await AddPlaylist(songs, current.id || current.videoId);

        updateTrack();
        return;
      }

      // Non-YTMusic playlist: keep existing Saavn-style behavior
      const ForMusicPlayer = []
      const quality = await getIndexQuality()

      for (let i = index; i < songs.length; i++) {
        const e = songs[i]
        if (!e) continue;

        let songUrl = "";

        if (e.downloadUrl && Array.isArray(e.downloadUrl) && e.downloadUrl.length > quality && e.downloadUrl[quality]?.url) {
          songUrl = e.downloadUrl[quality].url;
        }
        else if (e.download_url && Array.isArray(e.download_url) && e.download_url.length > quality && e.download_url[quality]?.url) {
          songUrl = e.download_url[quality].url;
        }
        else if (e.downloadUrl && Array.isArray(e.downloadUrl) && e.downloadUrl.length > 0 && e.downloadUrl[0]?.url) {
          songUrl = e.downloadUrl[0].url;
        }
        else if (e.download_url && Array.isArray(e.download_url) && e.download_url.length > 0 && e.download_url[0]?.url) {
          songUrl = e.download_url[0].url;
        }

        if (!songUrl) {
          continue;
        }

        let artworkUri = '';
        try {
          if (typeof e?.image === 'string') {
            artworkUri = e.image;
          } else if (e?.image && typeof e.image === 'object') {
            if (typeof e.image.uri === 'string') {
              artworkUri = e.image.uri;
            } else if (typeof e.image.url === 'string') {
              artworkUri = e.image.url;
            } else if (Array.isArray(e.image) && e.image.length > 0) {
              if (typeof e.image[0] === 'string') {
                artworkUri = e.image[0];
              } else if (e.image[0] && typeof e.image[0].url === 'string') {
                artworkUri = e.image[0].url;
              }
            }
          }
        } catch (error) {
          console.error('Error extracting artwork URI:', error);
        }

        ForMusicPlayer.push({
          url: songUrl,
          title: formatText(e?.name),
          artist: formatText(FormatArtist(e?.artists?.primary)),
          artwork: artworkUri,
          image: artworkUri,
          duration: e?.duration,
          id: e?.id,
          language: e?.language,
          downloadUrl: e?.downloadUrl || e?.download_url || [],
        })
      }

      if (ForMusicPlayer.length > 0) {
        await AddPlaylist(ForMusicPlayer)
        updateTrack()
      }
    } else if (isLibraryLiked) {
      const Final = []

      for (let i = index; i < Data.length; i++) {
        const e = Data[i]

        let artworkUri = '';
        try {
          if (typeof e?.artwork === 'string') {
            artworkUri = e.artwork;
          } else if (e?.artwork && typeof e.artwork === 'object') {
            if (typeof e.artwork.uri === 'string') {
              artworkUri = e.artwork.uri;
            } else if (typeof e.artwork.url === 'string') {
              artworkUri = e.artwork.url;
            } else if (Array.isArray(e.artwork) && e.artwork.length > 0) {
              if (typeof e.artwork[0] === 'string') {
                artworkUri = e.artwork[0];
              } else if (e.artwork[0] && typeof e.artwork[0].url === 'string') {
                artworkUri = e.artwork[0].url;
              }
            }
          }
        } catch (error) {
          console.error('Error extracting artwork URI:', error);
        }

        let songUrl;
        if (e?.url) {
          if (typeof e.url === 'string') {
            songUrl = e.url;
          } else if (Array.isArray(e.url) && e.url.length > 0) {
            const quality = await getIndexQuality();
            songUrl = e.url[quality]?.url || e.url[0]?.url || '';
          }
        }

        if (!songUrl) {
          continue;
        }

        Final.push({
          url: songUrl,
          title: formatText(e?.title),
          artist: formatText(e?.artist),
          artwork: artworkUri,
          duration: e?.duration,
          id: e?.id,
          language: e?.language,
          artistID: e?.primary_artists_id,
          downloadUrl: e?.downloadUrl,
          // Preserve additional metadata for song info display
          year: e?.year,
          playCount: e?.playCount,
          label: e?.label,
          copyright: e?.copyright,
          hasLyrics: e?.hasLyrics,
          album: e?.album,
          artists: e?.artists,
          releaseDate: e?.releaseDate,
          explicitContent: e?.explicitContent
        })
      }

      await AddPlaylist(Final)
    } else {
      // Handle single song playback
      if (source === 'ytmusic') {
        // Handle YTMusic songs - let PlayOneSong fetch the stream URL
        const song = {
          url: '', // PlayOneSong will fetch the stream URL
          title: formatText(title),
          artist: formatText(artist),
          artwork: safeImageUri,
          image: safeImageUri,
          duration: duration,
          id,  // This is the video ID
          language,
          artistID,
          downloadUrl: id, // Store video ID for potential downloads
          // Preserve additional metadata
          ...(Data?.data?.results?.[index] && {
            year: Data.data.results[index].year,
            playCount: Data.data.results[index].playCount,
            label: Data.data.results[index].label,
            copyright: Data.data.results[index].copyright,
            hasLyrics: Data.data.results[index].hasLyrics,
            album: Data.data.results[index].album,
            artists: Data.data.results[index].artists,
            releaseDate: Data.data.results[index].releaseDate,
            explicitContent: Data.data.results[index].explicitContent
          })
        };
        PlayOneSong(song);
        return;
      } else {
        // Handle Saavn songs (existing logic)
        const quality = await getIndexQuality()

        let songUrl;
        if (url) {
          if (Array.isArray(url) && url.length > quality && url[quality]?.url) {
            songUrl = url[quality].url;
          } else if (Array.isArray(url) && url.length > 0 && url[0]?.url) {
            songUrl = url[0].url;
          } else if (typeof url === 'string') {
            songUrl = url;
          }
        }

        if (!songUrl) {
          return;
        }

        const song = {
          url: songUrl,
          title: formatText(title),
          artist: formatText(artist),
          artwork: safeImageUri,
          duration,
          id,
          language,
          artistID: artistID,
          image: safeImageUri,
          downloadUrl: url,
          // Preserve additional metadata for song info display
          ...(Data?.data?.results?.[index] && {
            year: Data.data.results[index].year,
            playCount: Data.data.results[index].playCount,
            label: Data.data.results[index].label,
            copyright: Data.data.results[index].copyright,
            hasLyrics: Data.data.results[index].hasLyrics,
            album: Data.data.results[index].album,
            artists: Data.data.results[index].artists,
            releaseDate: Data.data.results[index].releaseDate,
            explicitContent: Data.data.results[index].explicitContent
          })
        }
        PlayOneSong(song)
      }
    }

    // --- Injected: If played from search, add album songs to queue ---
    if (source === 'search' && Data?.data?.results?.[index]?.album?.id) {
      try {
        const { getAlbumData } = require('../../Api/Album');
        const albumId = Data.data.results[index].album.id;
        const albumData = await getAlbumData(albumId);
        if (albumData?.data?.songs?.length > 0) {
          const quality = await getIndexQuality();
          const albumSongs = albumData.data.songs
            .filter(e => e.id !== id)
            .map(e => {
              let songUrl = '';
              if (e.downloadUrl && Array.isArray(e.downloadUrl) && e.downloadUrl.length > quality && e.downloadUrl[quality]?.url) {
                songUrl = e.downloadUrl[quality].url;
              } else if (e.download_url && Array.isArray(e.download_url) && e.download_url.length > quality && e.download_url[quality]?.url) {
                songUrl = e.download_url[quality].url;
              } else if (e.downloadUrl && Array.isArray(e.downloadUrl) && e.downloadUrl.length > 0 && e.downloadUrl[0]?.url) {
                songUrl = e.downloadUrl[0].url;
              } else if (e.download_url && Array.isArray(e.download_url) && e.download_url.length > 0 && e.download_url[0]?.url) {
                songUrl = e.download_url[0].url;
              }
              let artworkUri = '';
              if (typeof e?.image === 'string') {
                artworkUri = e.image;
              } else if (e?.image && typeof e.image === 'object') {
                if (typeof e.image.uri === 'string') {
                  artworkUri = e.image.uri;
                } else if (typeof e.image.url === 'string') {
                  artworkUri = e.image.url;
                } else if (Array.isArray(e.image) && e.image.length > 0) {
                  if (typeof e.image[0] === 'string') {
                    artworkUri = e.image[0];
                  } else if (e.image[0] && typeof e.image[0].url === 'string') {
                    artworkUri = e.image[0].url;
                  }
                }
              }
              return {
                url: songUrl,
                title: e?.name,
                artist: FormatArtist(e?.artists?.primary),
                artwork: artworkUri,
                image: artworkUri,
                duration: e?.duration,
                id: e?.id,
                language: e?.language,
                downloadUrl: e?.downloadUrl || e?.download_url || [],
                albumId: albumId
              };
            });
          if (albumSongs.length > 0) {
            const { AddSongsToQueue } = require('../../MusicPlayerFunctions');
            await AddSongsToQueue(albumSongs);
          }
        }
      } catch (err) {
        console.error('Error adding album songs to queue from search:', err);
      }
      // --- Injected: After album, add 10 songs for each artist (untruncated) ---
      try {
        const { getArtistSongsPaginated } = require('../../Api/Songs');
        const { AddSongsToQueue } = require('../../MusicPlayerFunctions');
        // Extract full artist objects from the original song (not truncated)
        const songObj = Data?.data?.results?.[index];
        const artistArr = songObj?.artists?.primary || [];
        for (const artist of artistArr) {
          const artistId = artist.id;
          if (!artistId) continue;
          const artistSongsData = await getArtistSongsPaginated(artistId, 1, 10);
          const artistSongs = (artistSongsData?.data?.songs || [])
            .filter(e => e.id !== id && (!songObj.album || e.album?.id !== songObj.album.id)) // avoid current and album songs
            .map(e => {
              let songUrl = '';
              const quality = 4; // fallback to high quality if not user-selected
              if (e.downloadUrl && Array.isArray(e.downloadUrl) && e.downloadUrl.length > quality && e.downloadUrl[quality]?.url) {
                songUrl = e.downloadUrl[quality].url;
              } else if (e.download_url && Array.isArray(e.download_url) && e.download_url.length > quality && e.download_url[quality]?.url) {
                songUrl = e.download_url[quality].url;
              } else if (e.downloadUrl && Array.isArray(e.downloadUrl) && e.downloadUrl.length > 0 && e.downloadUrl[0]?.url) {
                songUrl = e.downloadUrl[0].url;
              } else if (e.download_url && Array.isArray(e.download_url) && e.download_url.length > 0 && e.download_url[0]?.url) {
                songUrl = e.download_url[0].url;
              }
              let artworkUri = '';
              if (typeof e?.image === 'string') {
                artworkUri = e.image;
              } else if (e?.image && typeof e.image === 'object') {
                if (typeof e.image.uri === 'string') {
                  artworkUri = e.image.uri;
                } else if (typeof e.image.url === 'string') {
                  artworkUri = e.image.url;
                } else if (Array.isArray(e.image) && e.image.length > 0) {
                  if (typeof e.image[0] === 'string') {
                    artworkUri = e.image[0];
                  } else if (e.image[0] && typeof e.image[0].url === 'string') {
                    artworkUri = e.image[0].url;
                  }
                }
              }
              return {
                url: songUrl,
                title: e?.name,
                artist: FormatArtist(e?.artists?.primary),
                artwork: artworkUri,
                image: artworkUri,
                duration: e?.duration,
                id: e?.id,
                language: e?.language,
                downloadUrl: e?.downloadUrl || e?.download_url || [],
                albumId: e?.album?.id || null
              };
            });
          if (artistSongs.length > 0) {
            await AddSongsToQueue(artistSongs);
          }
        }
      } catch (err) {
        console.error('Error adding artist songs to queue from search:', err);
      }
    }

    updateTrack()
  }

  const handleDownload = async () => {
    // YTMusic downloads are now supported via streaming URL

    if (isDownloaded) {
      ToastAndroid.show('Song is already downloaded!', ToastAndroid.SHORT);
      return;
    }
    if (downloadInProgress) {
      ToastAndroid.show('Download already in progress.', ToastAndroid.SHORT);
      return;
    }

    try {
      const permissionGranted = await requestStoragePermission();
      if (!permissionGranted) {
        Alert.alert(
          'Permission Denied',
          'Storage permission is required to download songs. Please grant it in your device settings.',
        );
        return;
      }

      setDownloadInProgress(true);

      // Prepare song object for unified service
      // Use item's original source (from DAB/YTMusic transform) if available
      const actualSource = item?.source || source || 'saavn';
      console.log('📥 [Download] Source detection:', {
        itemSource: item?.source,
        propSource: source,
        actualSource: actualSource,
        isDabTrack: item?.isDabTrack,
        hasItem: !!item
      });
      const songData = {
        id,
        title,
        artist,
        url,
        image: typeof image === 'string' ? image : (image?.uri || safeImageUri),
        artwork: typeof image === 'string' ? image : (image?.uri || safeImageUri),
        duration,
        language,
        artistID,
        source: actualSource, // Preserve original source (dab, ytmusic, saavn)
        isDabTrack: item?.isDabTrack || false // Preserve DAB flag for detection
      };

      // Use the unified download service
      const success = await UnifiedDownloadService.downloadSong(songData);

      if (success) {
        setIsDownloaded(true);
      }
    } catch (error) {
      console.error('Download failed:', error);
      ToastAndroid.show(`Download failed for ${title}: ${error.message}`, ToastAndroid.LONG);
    } finally {
      setDownloadInProgress(false);
    }
  };

  const handleDelete = async (songId, songTitle) => {
    try {
      // Delete using StorageManager
      await StorageManager.removeDownloadedSongMetadata(songId);

      // Update local state
      setIsDownloaded(false);

      // Notify parent component that deletion is complete
      if (onDeleteComplete) {
        onDeleteComplete(songId);
      }

      ToastAndroid.show('Song deleted', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Delete failed:', error);
      ToastAndroid.show(`Delete failed: ${error.message}`, ToastAndroid.LONG);
    }
  };

  return (
    <>
      <Pressable
        onPress={AddSongToPlayer}
        android_ripple={{
          color: theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
          borderless: false,
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: id === activeTrackId ? colors.playingCard : 'transparent',
        }}>
        {showNumber && (
          <View style={{ marginRight: 10 }}>
            <PlainText text={index + 1} />
          </View>
        )}
        <View style={{ marginRight: 10 }}>
          <Image
            source={imageSource || require('../../Images/default.jpg')}
            style={{
              width: isFromAlbum ? 45 : 50,
              height: isFromAlbum ? 45 : 50,
              borderRadius: 4,
            }}
          />
        </View>
        <View
          style={{
            flex: 1,
          }}>
          <PlainText
            text={truncateTitle ? truncateText(formatText(title), isFromAlbum ? 15 : isFromPlaylist ? 15 : 15) : formatText(title)}
            songId={id}
            isSongTitle={true}
            isCurrentlyPlaying={id === activeTrackId}
            style={{
              width: titleandartistwidth ? titleandartistwidth : width1 * (isFromAlbum ? 0.65 : isFromPlaylist ? 0.63 : 0.66),
              marginBottom: 2,
              color: theme.dark ? colors.text : '#333333',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
          <SmallText
            text={truncateText(formatText(artist), isFromAlbum ? 30 : isFromPlaylist ? 32 : 35) + formatDuration(duration)}
            isArtistName={true}
            style={{
              width: titleandartistwidth ? titleandartistwidth : width1 * (isFromAlbum ? 0.63 : isFromPlaylist ? 0.59 : 0.63),
              color: theme.dark ? colors.textSecondary : '#666666',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            minWidth: isFromAlbum ? 70 : isFromPlaylist ? 70 : 65,
          }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            style={{
              padding: 4,
              marginRight: isFromAlbum ? 5 : isFromPlaylist ? 5 : 5,
            }}>
            {isDownloaded ? (
              <Octicons name="check-circle" size={20} color="#1DB954" />
            ) : downloadInProgress ? (
              <MaterialCommunityIcons name="loading" size={22} color="#FFA500" />
            ) : (
              <Octicons name="download" size={20} color={theme.dark ? '#ffffff' : '#333333'} />
            )}
          </Pressable>

          <EachSongMenuButton
            song={{
              title,
              artist,
              artwork: typeof safeImageUri === 'string' ? safeImageUri : '',
              image: typeof safeImageUri === 'string' ? safeImageUri : '',
              id,
              url,
              duration,
              language,
              artistID,
            }}
            isFromPlaylist={isFromPlaylist}
            isFromAlbum={isFromAlbum}
            size={isFromAlbum ? 36 : 32}
            marginRight={isFromAlbum ? 0 : 0}
            isDownloaded={isDownloaded}
            onDelete={handleDelete}
          />
        </View>
      </Pressable>
    </>
  );
})

