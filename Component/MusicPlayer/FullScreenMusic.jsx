import React, { useState, useContext, useMemo, useEffect } from "react";
import {
  Dimensions,
  ImageBackground,
  View,
  Pressable,
  ScrollView,
  ToastAndroid,
  Alert,
} from "react-native";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useActiveTrack } from "react-native-track-player";

import { Spacer } from "../Global/Spacer";
import ProgressBar from "./ProgressBar";
import QueueBottomSheet from "./QueueBottomSheet";
import { SleepTimerButton } from "./SleepTimer";
import { LyricsHandler } from "./LyricsHandler";
import { AlbumArtworkDisplay } from "./AlbumArtworkDisplay";
import { SongInfoDisplay } from "./SongInfoDisplay";
import { PlaybackControls } from "./PlaybackControls";
import { OfflineBanner, LocalTracksList, useOffline } from "../Offline";
import { useThemeManager } from "./ThemeManager";
import { TidalSourceSwitcher, useTidalIntegration } from "./TidalIntegration";
import { useNavigationHandler, BackButtonHandler } from "./NavigationHandler";

import { useLocalTracks, LocalTracksErrorBoundary } from "./LocalTracks";
import {
  FullScreenMusicMenuButton,
  FullScreenMusicMenuModal,
  useFullScreenMusicMenu,
} from "./FullScreenMusicMenu";

import Context from "../../Context/Context";
import useDynamicArtwork from "../../hooks/useDynamicArtwork.js";
import { useUnifiedDownload } from "../Download/useUnifiedDownload";
import { DownloadControl } from "../Download/DownloadControl";

import {
  useTheme,
  Surface,
  IconButton,
  Portal,
  Modal,
} from "react-native-paper";

export const FullScreenMusic = ({ Index, setIndex }) => {
  const width = Dimensions.get("window").width;
  const height = Dimensions.get("window").height;
  const currentPlaying = useActiveTrack();
  const { musicPreviousScreen } = useContext(Context);
  const { getArtworkSourceFromHook } = useDynamicArtwork();
  const [isLyricsActive, setIsLyricsActive] = useState(false);

  // Use the new unified download hook
  const {
    isDownloaded,
    isDownloading,
    downloadProgress,
    startDownload,
    canDownload,
  } = useUnifiedDownload(currentPlaying, false);

  // Memoize artwork source to prevent excessive hook calls
  const currentArtworkSource = useMemo(() => {
    return getArtworkSourceFromHook(currentPlaying);
  }, [
    currentPlaying?.id,
    currentPlaying?.artwork,
    currentPlaying?.isLocal,
    currentPlaying?.sourceType,
    getArtworkSourceFromHook,
  ]);

  const { getTextColor, getBackgroundOverlay, getGradientColors } =
    useThemeManager();
  const { isOffline } = useOffline();
  const { shouldShowTidalFeatures } = useTidalIntegration();
  const { handlePlayerClose } = useNavigationHandler({ musicPreviousScreen });

  const { menuVisible, menuPosition, showMenu, closeMenu, getMenuOptions } =
    useFullScreenMusicMenu(currentPlaying, isOffline);

  const {
    localTracks,
    showLocalTracks,
    playLocalTrack,
    closeLocalTracks,
    isLoading: localTracksLoading,
    error: localTracksError,
  } = useLocalTracks({ isOffline });

  const handleLyricsVisibilityChange = (visible) => {
    setIsLyricsActive(visible);
  };

  const handlePlayerCloseAction = () => {
    setIndex(0);
    handlePlayerClose();
  };

  const renderDownloadControl = () => {
    return (
      <DownloadControl
        isDownloaded={isDownloaded}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        onDownloadPress={startDownload}
        isOffline={isOffline}
        disabled={!canDownload}
        size={28}
      />
    );
  };

  const paperTheme = useTheme();

  return (
    <BackButtonHandler
      Index={Index}
      setIndex={setIndex}
      musicPreviousScreen={musicPreviousScreen}
    >
      <Animated.View
        entering={FadeInDown.delay(200)}
        style={{ 
          backgroundColor: paperTheme.colors.background, 
          flex: 1,
          paddingBottom: 24
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Background Artwork */}
          {((currentPlaying &&
            (currentPlaying.sourceType === "mymusic" ||
              currentPlaying.isLocal)) ||
            isOffline) && (
            <FastImage
            source={currentArtworkSource}
            style={{
              width: width,
              height: height,
              position: "absolute",
              top: 0,
              left: 0,
            }}
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
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 200,
              paddingTop: 60,
              paddingHorizontal: 20,
              backgroundColor: paperTheme.colors.surface,
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
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              colors={getGradientColors()}
              style={{ flex: 1, alignItems: "center" }}
            >
              {/* Header with back button */}
              <View
                style={{
                  width: "100%",
                  padding: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <IconButton
                  icon="chevron-down"
                  size={30}
                  onPress={() => setIndex(0)}
                  iconColor={paperTheme.colors.onSurface}
                  style={{
                    margin: 0,
                    backgroundColor: 'transparent',
                  }}
                />

                <View style={{ flexDirection: "row", alignItems: "center" }}>
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
              </View>

              <Spacer height={5} />

              {/* Album Artwork */}
              <Surface
                style={{
                  elevation: 4,
                  borderRadius: 12,
                  overflow: "hidden",
                  width: width * 0.8,
                  height: width * 0.8,
                  marginVertical: 16,
                  backgroundColor: "transparent",
                }}
              >
                <AlbumArtworkDisplay
                  currentPlaying={currentPlaying}
                  artworkSource={currentArtworkSource}
                  onClose={handlePlayerCloseAction}
                />
              </Surface>

              <Spacer height={8} />

              {/* Song Info */}
              <View style={{ 
                width: "100%", 
                paddingHorizontal: 16, 
                flex: 1,
                justifyContent: 'flex-start',
                paddingTop: 8,
                minHeight: Dimensions.get('window').height * 0.6
              }}>
                <View style={{ marginBottom: 16 }}>
                  <SongInfoDisplay
                    currentPlaying={currentPlaying}
                    isOffline={isOffline}
                    getTextColor={getTextColor}
                  />
                </View>

                {/* Progress Bar */}
                <View style={{ marginBottom: 16 }}>
                  <ProgressBar />
                </View>

                {/* Playback Controls */}
                <View style={{ marginBottom: 16 }}>
                  <PlaybackControls />
                </View>

                {/* Bottom Controls */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 24,
                    paddingVertical: 8,
                    marginTop: 16,
                    marginHorizontal: 16
                  }}
                >
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
              </View>
            </LinearGradient>
          </View>
        </ImageBackground>

        {/* Three-dot menu modal */}
        <Portal>
          <Modal
            visible={menuVisible}
            onDismiss={closeMenu}
            contentContainerStyle={{
              backgroundColor: paperTheme.colors.surface,
              padding: 20,
              margin: 20,
              borderRadius: 8,
              position: "absolute",
              right: menuPosition?.right || 0,
              top: menuPosition?.top || 0,
              minWidth: 200,
            }}
          >
            {getMenuOptions().map((option, index) => (
              <Surface
                key={index}
                style={{
                  marginVertical: 4,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <IconButton
                  icon={option.icon}
                  onPress={() => {
                    option.onPress();
                    closeMenu();
                  }}
                >
                  {option.title}
                </IconButton>
              </Surface>
            ))}
          </Modal>
        </Portal>
        </View>
        <QueueBottomSheet />
      </Animated.View>
    </BackButtonHandler>
  );
};
