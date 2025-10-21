import React, { useState, useContext, useMemo, useEffect } from "react";
import { Dimensions, ImageBackground, View, Pressable, ToastAndroid, Alert } from "react-native";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useActiveTrack } from "react-native-track-player";

import { Spacer } from "../Global/Spacer";
import { ProgressBar } from "./ProgressBar";
import QueueBottomSheet from "./QueueBottomSheet";
import { SleepTimerButton } from './SleepTimer';
import { LyricsHandler } from './LyricsHandler';
import { AlbumArtworkDisplay } from './AlbumArtworkDisplay';
import { SongInfoDisplay } from './SongInfoDisplay';
import { PlaybackControls } from './PlaybackControls';
import { OfflineBanner, LocalTracksList, useOffline } from '../Offline';
import { useThemeManager } from './ThemeManager';
import { TidalSourceSwitcher, useTidalIntegration } from './TidalIntegration';
import { useNavigationHandler, BackButtonHandler } from './NavigationHandler';

import { useLocalTracks, LocalTracksErrorBoundary } from './LocalTracks';
import {
  FullScreenMusicMenuButton,
  FullScreenMusicMenuModal,
  useFullScreenMusicMenu
} from './FullScreenMusicMenu';

import Context from "../../Context/Context";
import useDynamicArtwork from '../../hooks/useDynamicArtwork.js';
import { StorageManager } from '../../Utils/StorageManager';
import { requestStoragePermission } from '../../Utils/PermissionManager';
import { UnifiedDownloadService } from '../../Utils/UnifiedDownloadService';
import EventRegister from '../../Utils/EventRegister';
import { DownloadControl } from '../Download/DownloadControl';

export const FullScreenMusic = ({ Index, setIndex }) => {
  const width = Dimensions.get("window").width;
  const height = Dimensions.get("window").height;
  const currentPlaying = useActiveTrack();
  const { musicPreviousScreen } = useContext(Context);
  const { getArtworkSourceFromHook } = useDynamicArtwork();
  const [isLyricsActive, setIsLyricsActive] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadInProgress, setDownloadInProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Memoize artwork source to prevent excessive hook calls
  const currentArtworkSource = useMemo(() => {
    return getArtworkSourceFromHook(currentPlaying);
  }, [currentPlaying?.id, currentPlaying?.artwork, currentPlaying?.isLocal, currentPlaying?.sourceType, getArtworkSourceFromHook]);

  const { getTextColor, getBackgroundOverlay, getGradientColors } = useThemeManager();
  const { isOffline } = useOffline();
  const { shouldShowTidalFeatures } = useTidalIntegration();
  const { handlePlayerClose } = useNavigationHandler({ musicPreviousScreen });

  const {
    menuVisible,
    menuPosition,
    showMenu,
    closeMenu,
    getMenuOptions,
  } = useFullScreenMusicMenu(currentPlaying, isOffline);

  const {
    localTracks,
    showLocalTracks,
    playLocalTrack,
    closeLocalTracks,
    isLoading: localTracksLoading,
    error: localTracksError
  } = useLocalTracks({ isOffline });

  // Check download status
  useEffect(() => {
    const checkDownloadStatus = async () => {
      if (currentPlaying?.id) {
        try {
          const downloaded = await StorageManager.isSongDownloaded(currentPlaying.id);
          setIsDownloaded(downloaded);
        } catch (error) {
          console.error('Error checking download status:', error);
          setIsDownloaded(false);
        }
      }
    };

    checkDownloadStatus();
  }, [currentPlaying?.id]);

  // Listen for download events
  useEffect(() => {
    let downloadListener = null;
    let downloadStartedListener = null;

    try {
      downloadListener = EventRegister.addEventListener('download-complete', (songId) => {
        if (songId === currentPlaying?.id) {
          setIsDownloaded(true);
          setDownloadInProgress(false);
          setDownloadProgress(100);
        }
      });

      downloadStartedListener = EventRegister.addEventListener('download-started', (songId) => {
        if (songId === currentPlaying?.id) {
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
  }, [currentPlaying?.id]);

  const handleLyricsVisibilityChange = (visible) => {
    setIsLyricsActive(visible);
  };

  const handlePlayerCloseAction = () => {
    setIndex(0);
    handlePlayerClose();
  };

  const handleDownload = async () => {
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
      setDownloadProgress(0);

      // Prepare song object for unified service
      const songData = {
        id: currentPlaying?.id,
        title: currentPlaying?.title,
        artist: currentPlaying?.artist,
        url: currentPlaying?.url,
        image: currentPlaying?.artwork,
        artwork: currentPlaying?.artwork,
        duration: currentPlaying?.duration,
        language: currentPlaying?.language,
        artistID: currentPlaying?.artistID,
        downloadUrl: currentPlaying?.downloadUrl
      };

      // Use the unified download service with progress callback
      const success = await UnifiedDownloadService.downloadSong(
        songData,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      if (success) {
        setIsDownloaded(true);
        setDownloadProgress(100);
      }

    } catch (error) {
      console.error('Download failed:', error);
      ToastAndroid.show(`Download failed: ${error.message}`, ToastAndroid.LONG);
    } finally {
      setDownloadInProgress(false);
    }
  };

  const renderDownloadControl = () => {
    return (
      <DownloadControl
        isDownloaded={isDownloaded}
        isDownloading={downloadInProgress}
        downloadProgress={downloadProgress}
        onDownloadPress={handleDownload}
        isOffline={isOffline}
        disabled={!currentPlaying || isOffline}
        size={28}
      />
    );
  };

  return (
    <BackButtonHandler
      Index={Index}
      setIndex={setIndex}
      musicPreviousScreen={musicPreviousScreen}
    >
      <Animated.View entering={FadeInDown.delay(200)} style={{ backgroundColor: "rgb(0,0,0)", flex: 1 }}>
        {((currentPlaying && (currentPlaying.sourceType === 'mymusic' || currentPlaying.isLocal)) || isOffline) && (
          <FastImage
            source={currentArtworkSource}
            style={{ width: width, height: height, position: 'absolute', top: 0, left: 0 }}
            resizeMode={FastImage.resizeMode.cover}
            key={`dynamic-bg-${JSON.stringify(currentArtworkSource)}`}
          />
        )}

        <LocalTracksErrorBoundary>
          <LocalTracksList
            localTracks={localTracks}
            onTrackPress={playLocalTrack}
            onClose={closeLocalTracks}
            visible={showLocalTracks}
            isLoading={localTracksLoading}
            error={localTracksError}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 200,
              paddingTop: 60,
              paddingHorizontal: 20
            }}
          />
        </LocalTracksErrorBoundary>

        <ImageBackground
          source={currentArtworkSource}
          style={{ flex: 1 }}
          resizeMode="cover"
          blurRadius={isLyricsActive ? 25 : 10}
          key={`bg-${JSON.stringify(currentArtworkSource)}`}
        >
          <View style={{ flex: 1, backgroundColor: getBackgroundOverlay() }}>
            <OfflineBanner />
          <LinearGradient
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            colors={getGradientColors()}
            style={{ flex: 1, alignItems: "center" }}
          >
            <Pressable
              onPress={() => setIndex(0)}
              style={({ pressed }) => [
                {
                  position: 'absolute',
                  top: 12,
                  left: 20,
                  zIndex: 10,
                  padding: 8,
                  borderRadius: 20,
                }
              ]}
            >
              <Ionicons name="chevron-down" size={30} color={getTextColor('primary')} />
            </Pressable>

            <View style={{
              width: "90%",
              marginTop: 5,
              height: 60,
              alignItems: "center",
              justifyContent: "flex-end",
              flexDirection: "row",
              paddingLeft: 10,
              paddingRight: 2
            }}>
              <LyricsHandler
                currentPlayingTrack={currentPlaying}
                isOffline={isOffline}
                Index={Index}
                onLyricsVisibilityChange={handleLyricsVisibilityChange}
                currentArtworkSource={currentArtworkSource}
              />
              <View style={{ width: 8 }} />
              <FullScreenMusicMenuButton
                onPress={() => showMenu()}
                size={25}
              />
            </View>

            <Spacer height={5} />
            <AlbumArtworkDisplay
              currentPlaying={currentPlaying}
              artworkSource={currentArtworkSource}
              onClose={handlePlayerCloseAction}
            />
            <Spacer height={20} />

            <SongInfoDisplay
              currentPlaying={currentPlaying}
              isOffline={isOffline}
              getTextColor={getTextColor}
            />
            <ProgressBar />
            <PlaybackControls />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "80%" }}>
              <SleepTimerButton size={25} />

              {shouldShowTidalFeatures(isOffline) && (
                <TidalSourceSwitcher
                  currentTrack={currentPlaying}
                  variant="chip"
                  size="small"
                />
              )}

              {renderDownloadControl()}
            </View>
          </LinearGradient>
        </View>
      </ImageBackground>
      <QueueBottomSheet Index={1} />

      {/* Three-dot menu modal */}
      <FullScreenMusicMenuModal
        visible={menuVisible}
        onClose={closeMenu}
        menuOptions={getMenuOptions()}
        position={menuPosition}
      />


    </Animated.View>
    </BackButtonHandler>
  );
};