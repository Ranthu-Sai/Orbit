import 'react-native-get-random-values'; // Must be imported before any crypto operations
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { DeviceEventEmitter, Linking, ToastAndroid } from 'react-native';
import ContextState from './Context/ContextState';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService, AnalyticsEvents } from './Utils/AnalyticsUtils';
import { ThemeProvider } from './Context/ThemeContext';
import { StorageManager } from './Utils/StorageManager';
import { darkTheme } from './Theme/darkTheme';
import { PaperProvider } from 'react-native-paper';
import { PlayOneSong, setupPlayer } from './MusicPlayerFunctions';
import NativeMetadataReader from './Utils/NativeMetadataReader';
import lastFMService from './Utils/LastFMService';
import dabRecommendationService from './Utils/DABRecommendationService';
import { LASTFM_API_KEY, LASTFM_API_SECRET } from './Utils/secrets';
import updateService from './Utils/UpdateService';
import UpdateModal from './Component/Modals/UpdateModal';
import SuspenseFallback from './Component/Global/SuspenseFallback';
import { showToast } from './Utils/ToastUtils';
import { ImportPlaylistModal } from './Component/Playlist/ImportPlaylistModal';
import { detectLink, extractUrlFromText } from './Utils/LinkDetector';
import { importFromLink } from './Utils/PlaylistImportLogic';

// Lazy-loaded screen components for faster startup
const RootRoute = lazy(() => import('./Route/RootRoute.jsx').then(m => ({ default: m.RootRoute })));
const RouteOnboarding = lazy(() => import('./Route/OnboardingScreen/RouteOnboarding').then(m => ({ default: m.RouteOnboarding })));
const InitialScreen = lazy(() => import('./Route/InitialScreen').then(m => ({ default: m.InitialScreen })));
const Album = lazy(() => import('./Route/Album').then(m => ({ default: m.Album })));
const ArtistPage = lazy(() => import('./Route/ArtistPage'));
const ArtistSongs = lazy(() => import('./Route/ArtistSongs'));
const ArtistItems = lazy(() => import('./Route/ArtistItems'));
const SectionListPage = lazy(() => import('./Route/SectionListPage'));
const LoginScreen = lazy(() => import('./Component/Auth/LoginScreen'));
const ChangeName = lazy(() => import('./Route/Home/ChangeName').then(m => ({ default: m.ChangeName })));
const SelectLanguages = lazy(() => import('./Route/Home/SelectLanguages').then(m => ({ default: m.SelectLanguages })));

type ThemeContextType = {
  theme: typeof darkTheme;
  paperTheme: any;
  themeMode: string;
  colorSchemeName: string;
  colorScheme: any;
  toggleTheme: () => Promise<void>;
  changeColorScheme: (scheme: string) => Promise<void>;
  isThemeLoaded: boolean;
};

const Stack = createStackNavigator();

const SHARE_URL_PREFIX = 'com.orbit.app://share';
const SHARED_LINK_DOMAINS = ['spotify.com', 'youtube.com', 'youtu.be'];
// Ignore the same shared link if it arrives again within this window
const SHARE_DEDUPE_MS = 5000;

// Where each imported entity type lands in the Library stack
const SHARE_DESTINATIONS: Record<string, string> = {
  playlist: 'CustomPlaylist',
  // Liked albums are listed on the Favorites (LikedSongs) page
  album: 'LikedSongs',
  track: 'LikedSongs',
  video: 'LikedSongs',
};

// Returns the raw shared text for share intents / direct music links, otherwise null
const getSharedText = (url: string): string | null => {
  if (url.startsWith(SHARE_URL_PREFIX)) {
    const match = url.match(/[?&]text=([^&]*)/);
    if (!match) {
      return '';
    }
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (e) {
      return match[1];
    }
  }
  if (
    /^https?:\/\//i.test(url) &&
    SHARED_LINK_DOMAINS.some((domain) => url.includes(domain))
  ) {
    return url;
  }
  return null;
};

function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Update modal state
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // Shared-link import modal state (Share Sheet -> Orbit)
  const [sharedModalVisible, setSharedModalVisible] = useState(false);
  const [sharedUrl, setSharedUrl] = useState('');
  const lastSharedRef = useRef<{ url: string; time: number }>({
    url: '',
    time: 0,
  });

  // Startup update check
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const result = await updateService.shouldShowUpdate();
        if (result.show && result.updateInfo) {
          setUpdateInfo(result.updateInfo);
          setUpdateModalVisible(true);
        }
      } catch (error) {}
    };

    // Delay update check to not block app startup
    const timeout = setTimeout(checkForUpdates, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Update modal handlers
  const handleUpdateDismiss = async () => {
    setUpdateModalVisible(false);
    if (updateInfo?.latestVersion) {
      await updateService.dismissUpdate(updateInfo.latestVersion);
    }
  };

  // link is the APK download or the release page, chosen in the modal
  const handleUpdateNow = async (link?: string) => {
    const target = link || updateInfo?.url;
    if (target) {
      await updateService.openUpdateLink(target);
    }
  };

  const handleSharedImportClose = () => {
    setSharedModalVisible(false);
    setSharedUrl('');
  };

  const handleSharedImportSuccess = (linkInfo: any) => {
    DeviceEventEmitter.emit('playlist-updated');
    DeviceEventEmitter.emit('favorites-updated');

    const navigation = navigationRef.current;
    const screen = linkInfo?.type ? SHARE_DESTINATIONS[linkInfo.type] : null;
    if (!navigation || !navigation.isReady() || !screen) {
      return;
    }
    // Don't jump past onboarding / the initial screen
    const hasMainRoute = navigation
      .getRootState()
      ?.routes?.some((route) => route.name === 'MainRoute');
    if (!hasMainRoute) {
      return;
    }
    navigation.navigate('MainRoute', {
      screen: 'Library',
      params: { screen },
    });
  };

  useEffect(() => {
    // Initialize playlists structure if needed
    const initializeUserPlaylists = async () => {
      try {
        const userPlaylistsJson = await AsyncStorage.getItem('userPlaylists');
        if (!userPlaylistsJson) {
          await AsyncStorage.setItem('userPlaylists', JSON.stringify([]));
        }
      } catch (error) {
        // Silent error handling for playlist initialization
      }
    };

    initializeUserPlaylists();
  }, []);

  // Initialize Firebase Analytics
  useEffect(() => {
    // Set analytics collection enabled (can be toggled for GDPR compliance)
    analyticsService.setAnalyticsCollectionEnabled(true);

    // Log app open event
    analyticsService.logEvent(AnalyticsEvents.APP_OPEN);

    // Initialize Last.fm service with credentials from secrets
    // Users will authenticate via Settings > DAB > Last.fm Login
    lastFMService.initialize(LASTFM_API_KEY, LASTFM_API_SECRET);

    // Load any saved Last.fm session
    lastFMService.loadSession();

    // Initialize DAB Recommendation Service
    dabRecommendationService.initialize();
  }, []);

  useEffect(() => {
    // Ensure storage directories exist early to avoid ENOENT when accessing files
    StorageManager.ensureDirectoriesExist().catch((err) => {
      console.warn(
        'Failed to ensure storage directories at startup:',
        err && err.message ? err.message : err
      );
    });

    // NOTE: no BackHandler subscription is needed. A handler that always
    // returns `false` is identical to not subscribing at all - the default
    // (pop navigation / exit at root) already does the right thing.
  }, []);

  // Handle audio file intents - allows Orbit to be a default music player
  // Also handles links shared to Orbit from Spotify / YouTube Music / YouTube
  useEffect(() => {
    const handleSharedLink = (url: string): boolean => {
      const sharedText = getSharedText(url);
      if (sharedText === null) {
        return false;
      }

      const cleanUrl = extractUrlFromText(sharedText);
      const linkInfo = cleanUrl ? detectLink(cleanUrl) : null;
      if (!linkInfo) {
        ToastAndroid.show(
          'Unsupported link. Share a Spotify, YouTube or YouTube Music playlist, album or song.',
          ToastAndroid.LONG
        );
        return true;
      }

      const now = Date.now();
      const last = lastSharedRef.current;
      if (last.url === linkInfo.url && now - last.time < SHARE_DEDUPE_MS) {
        return true;
      }
      lastSharedRef.current = { url: linkInfo.url, time: now };

      setSharedUrl(linkInfo.url);
      setSharedModalVisible(true);
      return true;
    };

    const handleAudioFileUrl = async (url: string | null) => {
      if (!url) {
        return;
      }

      if (handleSharedLink(url)) {
        return;
      }

      // Check if the URL is for an audio file (file:// or content:// scheme)
      const isContentUri = url.startsWith('content://');
      const isFileUri = url.startsWith('file://');
      const isAudioIntent = isContentUri || isFileUri;

      if (isAudioIntent) {
        try {
          // Ensure player is ready
          await setupPlayer();

          let song: any;

          if (isContentUri) {
            // For content:// URIs, use native module to resolve and read metadata
            const metadata: any =
              await NativeMetadataReader.readMetadataFromUri(url);

            if (metadata && metadata.filePath) {
              song = {
                id: `local-${Date.now()}`,
                title: metadata.title || 'Unknown',
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || '',
                url: `file://${metadata.filePath}`,
                path: metadata.filePath,
                isLocalMusic: true,
                artwork: metadata.artworkDataUri || '',
                image: metadata.artworkDataUri || '',
              };
            } else {
              // Fallback if native module fails
              console.warn('⚠️ Failed to resolve content URI, using fallback');
              const pathParts = url.split('/');
              const fileName = decodeURIComponent(
                pathParts[pathParts.length - 1] || 'Unknown'
              );
              const titleWithoutExt = fileName.replace(/\.[^/.]+$/, '');

              song = {
                id: `local-${Date.now()}`,
                title: titleWithoutExt,
                artist: 'Local File',
                url: url,
                isLocalMusic: true,
                artwork: '',
              };
            }
          } else {
            // For file:// URIs, extract filename and try to read metadata
            const filePath = url.replace('file://', '');
            const pathParts = url.split('/');
            const fileName = decodeURIComponent(
              pathParts[pathParts.length - 1] || 'Unknown'
            );
            const titleWithoutExt = fileName.replace(/\.[^/.]+$/, '');

            // Try to read metadata from local file
            let metadata: any = null;
            try {
              metadata = await NativeMetadataReader.readMetadata(filePath);
            } catch (e) {}

            song = {
              id: `local-${Date.now()}`,
              title: metadata?.title || titleWithoutExt,
              artist: metadata?.artist || 'Local File',
              album: metadata?.album || '',
              url: url,
              path: filePath,
              isLocalMusic: true,
              artwork: metadata?.artworkDataUri || '',
              image: metadata?.artworkDataUri || '',
            };
          }
          showToast(`Playing: ${song.title}`);

          await PlayOneSong(song);
        } catch (error) {
          console.error('Error playing audio file from intent:', error);
          showToast('Failed to play audio file');
        }
      }
    };

    // Handle app opened from audio file (cold start)
    Linking.getInitialURL().then(handleAudioFileUrl);

    // Handle new intents while app is running (warm start, since MainActivity is singleTask)
    const subscription = Linking.addEventListener('url', (event) => {
      handleAudioFileUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ContextState>
        <BottomSheetModalProvider>
          <ThemeProvider>
            {({ theme, paperTheme, isThemeLoaded }: ThemeContextType) => {
              // Only render when theme is loaded to prevent flash of wrong theme
              if (!isThemeLoaded) {
                return null; // Or a loading indicator if preferred
              }

              return (
                <PaperProvider theme={paperTheme}>
                  <NavigationContainer
                    ref={navigationRef}
                    theme={theme}
                    onStateChange={(_state) => {
                      const currentRouteName =
                        navigationRef.current?.getCurrentRoute()?.name;
                      if (currentRouteName) {
                        analyticsService.logScreenView(currentRouteName);
                      }
                    }}
                  >
                    <Suspense fallback={<SuspenseFallback />}>
                      <Stack.Navigator
                        screenOptions={{
                          headerShown: false,
                          cardStyle: { backgroundColor: theme.colors.background },
                        }}
                      >
                        <Stack.Screen name="Initial" component={InitialScreen} />
                        <Stack.Screen
                          name="Onboarding"
                          component={RouteOnboarding}
                        />
                        <Stack.Screen name="MainRoute" component={RootRoute} />
                        <Stack.Screen name="Album" component={Album} />
                        <Stack.Screen name="ArtistPage" component={ArtistPage} />
                        <Stack.Screen
                          name="ArtistSongs"
                          component={ArtistSongs}
                        />
                        <Stack.Screen
                          name="ArtistItems"
                          component={ArtistItems}
                        />
                        <Stack.Screen
                          name="SectionListPage"
                          component={SectionListPage}
                        />
                        <Stack.Screen
                          name="LoginScreen"
                          component={LoginScreen}
                        />
                        <Stack.Screen name="ChangeName" component={ChangeName} />
                        <Stack.Screen
                          name="SelectLanguages"
                          component={SelectLanguages}
                        />
                      </Stack.Navigator>
                    </Suspense>

                    {/* Global Shared-Link Import Modal (Share Sheet -> Orbit).
                        Inside NavigationContainer so useTheme() gets the app theme. */}
                    <ImportPlaylistModal
                      visible={sharedModalVisible}
                      onClose={handleSharedImportClose}
                      onImportSuccess={handleSharedImportSuccess}
                      initialLink={sharedUrl}
                      autoStart={true}
                      title="Import to Orbit"
                      customImportHandler={importFromLink}
                    />
                  </NavigationContainer>

                  {/* Global Update Modal */}
                  <UpdateModal
                    visible={updateModalVisible}
                    onDismiss={handleUpdateDismiss}
                    updateInfo={updateInfo}
                    onUpdate={handleUpdateNow}
                  />
                </PaperProvider>
              );
            }}
          </ThemeProvider>
        </BottomSheetModalProvider>
      </ContextState>
    </GestureHandlerRootView>
  );
}
export default App;
