import 'react-native-get-random-values'; // Must be imported before any crypto operations
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ToastAndroid, BackHandler, Linking } from 'react-native';
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

// Update modal state (managed at top level for force updates)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _globalSetUpdateModalVisible: ((visible: boolean) => void) | null = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _globalSetUpdateInfo: ((info: any) => void) | null = null;

function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Update modal state
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // Register global setters for force updates
  useEffect(() => {
    _globalSetUpdateModalVisible = setUpdateModalVisible;
    _globalSetUpdateInfo = setUpdateInfo;
    return () => {
      _globalSetUpdateModalVisible = null;
      _globalSetUpdateInfo = null;
    };
  }, []);

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

  const handleUpdateNow = async () => {
    if (updateInfo?.url) {
      await updateService.openUpdateLink(updateInfo.url);
    }
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

    const handleBackPress = () => {
      if (navigationRef.current) {
        try {
          // If we can't go back (we're at the root), allow the app to exit
          if (!navigationRef.current.canGoBack()) {
            return false; // Return false to allow system to handle (exit app)
          }

          return false; // Allow default back navigation
        } catch (error) {
          return false;
        }
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    return () => backHandler.remove();
  }, []);

  // Handle audio file intents - allows Orbit to be a default music player
  useEffect(() => {
    const handleAudioFileUrl = async (url: string | null) => {
      if (!url) {
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
          ToastAndroid.show(`Playing: ${song.title}`, ToastAndroid.SHORT);

          await PlayOneSong(song);
        } catch (error) {
          console.error('Error playing audio file from intent:', error);
          ToastAndroid.show('Failed to play audio file', ToastAndroid.SHORT);
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
