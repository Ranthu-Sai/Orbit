import { MainWrapper } from "../../Layout/MainWrapper";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { ScrollView, ToastAndroid, View, TouchableOpacity, Alert, Image, TextInput } from "react-native";
import { List, Card, Text, Switch, TouchableRipple, Portal, Modal, Avatar, Button } from "react-native-paper";
import { useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  GetDownloadPath,
  GetFontSizeValue,
  GetPlaybackQuality,
  GetThemePreference,
  GetColorScheme,
  GetMusicSource,
  SetDownloadPath,
  SetFontSizeValue,
  SetPlaybackQuality,
  SetThemePreference,
  SetColorScheme,
  SetMusicSource,
  GetLyricsProvider,
  SetLyricsProvider,
  GetLyricsAnimationStyle,
  SetLyricsAnimationStyle,
  GetHomeFeedSource,
  SetHomeFeedSource,
} from "../../LocalStorage/AppSettings";
import { useEffect, useState } from "react";
import { useTheme } from "@react-navigation/native";
import { getColorSchemeOptions } from "../../Theme/colorSchemes";
import { settingsConfig } from "../../config/settingsConfig";
import { useThemeContext } from "../../Context/ThemeContext";
import { StorageManager } from "../../Utils/StorageManager";
import dabAuthService from "../../Utils/DabAuthService";
import { dabLogout, dabGetCurrentUser } from "../../Api/DabAPI";
import ytAuthService from "../../Utils/YouTubeAuthService";
import YouTubeAccountModal from "../../Component/Modals/YouTubeAccountModal";
import lastFMService from "../../Utils/LastFMService";
import metadataResolver from "../../Utils/MetadataResolver";

export const SettingsPage = ({ navigation }) => {
  const theme = useTheme();
  const { colors } = theme;
  const { changeFontSize, changeColorScheme, toggleTheme } = useThemeContext();
  const [font, setFont] = useState(settingsConfig.defaults.fontSize);
  const [playback, setPlayback] = useState(settingsConfig.defaults.playbackQuality);
  const [download, setDownload] = useState(settingsConfig.defaults.downloadPath);
  const [themePreference, setThemePreference] = useState(settingsConfig.defaults.themePreference);
  const [colorScheme, setColorScheme] = useState(settingsConfig.defaults.colorScheme);
  const [musicSource, setMusicSource] = useState(settingsConfig.defaults.musicSource);
  const [homeFeedSource, setHomeFeedSource] = useState(settingsConfig.defaults.homeFeedSource);
  const [lyricsProvider, setLyricsProvider] = useState(settingsConfig.defaults.lyricsProvider);
  const [lyricsAnimationStyle, setLyricsAnimationStyle] = useState(settingsConfig.defaults.lyricsAnimationStyle);
  const [ytMusicLanguage, setYtMusicLanguage] = useState('en');
  const [ytMusicCountry, setYtMusicCountry] = useState('IN');
  const [downloadPathInfo, setDownloadPathInfo] = useState(null);
  const [dabUser, setDabUser] = useState(dabAuthService.getUser());
  const [isDabAuth, setIsDabAuth] = useState(dabAuthService.isAuth());

  // YouTube auth state - use null/false as initial values, will be updated via listener
  const [ytUser, setYtUser] = useState(null);
  const [isYtAuth, setIsYtAuth] = useState(false);
  const [showYtAccountModal, setShowYtAccountModal] = useState(false);
  const [showNameEditDialog, setShowNameEditDialog] = useState(false);
  const [editingName, setEditingName] = useState('');

  // Last.fm auth state
  const [lastFmUser, setLastFmUser] = useState(null);
  const [isLastFmAuth, setIsLastFmAuth] = useState(false);
  const [showLastFmLoginDialog, setShowLastFmLoginDialog] = useState(false);
  const [lastFmUsername, setLastFmUsername] = useState('');
  const [lastFmPassword, setLastFmPassword] = useState('');
  const [lastFmLoggingIn, setLastFmLoggingIn] = useState(false);
  const [lastFmError, setLastFmError] = useState('');

  // DAB Recommendation settings
  const [strictFlacMode, setStrictFlacMode] = useState(false);

  async function loadSettings() {
    try {
      const [fontSize, playbackQuality, downloadPath, themePref, colorSchemePref, musicSourcePref, lyricsProviderPref] = await Promise.all([
        GetFontSizeValue(),
        GetPlaybackQuality(),
        GetDownloadPath(),
        GetThemePreference(),
        GetColorScheme(),
        GetMusicSource(),
        GetLyricsProvider()
      ]);

      setFont(fontSize || settingsConfig.defaults.fontSize);
      setPlayback(playbackQuality || settingsConfig.defaults.playbackQuality);
      setDownload(downloadPath || settingsConfig.defaults.downloadPath);
      setThemePreference(themePref || settingsConfig.defaults.themePreference);
      setColorScheme(colorSchemePref || settingsConfig.defaults.colorScheme);
      setMusicSource(musicSourcePref || settingsConfig.defaults.musicSource);
      setLyricsProvider(lyricsProviderPref || settingsConfig.defaults.lyricsProvider);

      const loadedHomeFeedSource = await GetHomeFeedSource();
      setHomeFeedSource(loadedHomeFeedSource || settingsConfig.defaults.homeFeedSource);

      const loadedLyricsAnimationStyle = await GetLyricsAnimationStyle();
      setLyricsAnimationStyle(loadedLyricsAnimationStyle || settingsConfig.defaults.lyricsAnimationStyle);

      if (fontSize && fontSize !== undefined) setFont(fontSize);
      if (playbackQuality && playbackQuality !== undefined) setPlayback(playbackQuality);
      // Simplified loaded logic for new params:
      // The array destructuring above maps the resolved promises. 
      // The last element (added) corresponds to GetLyricsProvider().
      // Let's correct the index access or just use the destructured variables properly.
      // Wait, let's fix the destructuring in line 41 first.

      // Let's rewrite the loadSettings simpler to match the structure.


      // Load download path information
      const pathInfo = await StorageManager.getDownloadPathInfo();
      setDownloadPathInfo(pathInfo);

      // Load YTMusic language and country preference
      const savedYtLang = await AsyncStorage.getItem('ytmusic_language');
      const savedYtCountry = await AsyncStorage.getItem('ytmusic_country');
      if (savedYtLang) setYtMusicLanguage(savedYtLang);
      if (savedYtCountry) setYtMusicCountry(savedYtCountry);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Set default values if there's an error
      setFont(settingsConfig.defaults.fontSize);
      setPlayback(settingsConfig.defaults.playbackQuality);
      setDownload(settingsConfig.defaults.downloadPath);
      setThemePreference(settingsConfig.defaults.themePreference);
      setColorScheme(settingsConfig.defaults.colorScheme);
      setMusicSource(settingsConfig.defaults.musicSource);
    }
  }


  async function handleDownloadPathChange(value) {
    try {
      await SetDownloadPath(value);
      setDownload(value);
      // Update directories for the new download path
      await StorageManager.updateDownloadPathDirectories();
      // Reload path information to show the actual path being used
      const pathInfo = await StorageManager.getDownloadPathInfo();
      setDownloadPathInfo(pathInfo);
      ToastAndroid.showWithGravity(
        `Download path changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating download path:', error);
      ToastAndroid.showWithGravity(
        'Failed to update download path',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handlePlaybackQualityChange(value) {
    try {
      await SetPlaybackQuality(value);
      setPlayback(value);
      ToastAndroid.showWithGravity(
        `Playback quality changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating playback quality:', error);
      ToastAndroid.showWithGravity(
        'Failed to update playback quality',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleFontSizeChange(value) {
    try {
      await changeFontSize(value);
      setFont(value);
      ToastAndroid.showWithGravity(
        `Font size changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating font size:', error);
      ToastAndroid.showWithGravity(
        'Failed to update font size',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleThemeToggle() {
    try {
      await toggleTheme();
      const newTheme = themePreference === 'dark' ? 'light' : 'dark';
      setThemePreference(newTheme);
      ToastAndroid.showWithGravity(
        `Theme changed to ${newTheme} mode`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating theme preference:', error);
      ToastAndroid.showWithGravity(
        'Failed to update theme preference',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleColorSchemeChange(value) {
    try {
      await changeColorScheme(value);
      setColorScheme(value);
      ToastAndroid.showWithGravity(
        `Color scheme changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating color scheme:', error);
      ToastAndroid.showWithGravity(
        'Failed to update color scheme',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleMusicSourceChange(value) {
    try {
      await SetMusicSource(value);
      setMusicSource(value);
      ToastAndroid.showWithGravity(
        `Music source changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating music source:', error);
      ToastAndroid.showWithGravity(
        'Failed to update music source',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleHomeFeedSourceChange(value) {
    try {
      await SetHomeFeedSource(value);
      setHomeFeedSource(value);
      ToastAndroid.showWithGravity(
        `Home feed source changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating home feed source:', error);
      ToastAndroid.showWithGravity(
        'Failed to update home feed source',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleYtMusicLanguageChange(value) {
    try {
      await AsyncStorage.setItem('ytmusic_language', value);
      setYtMusicLanguage(value);
      ToastAndroid.showWithGravity(
        `YTMusic UI language changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating YTMusic language:', error);
    }
  }

  async function handleYtMusicCountryChange(value) {
    try {
      await AsyncStorage.setItem('ytmusic_country', value);
      setYtMusicCountry(value);
      ToastAndroid.showWithGravity(
        `YTMusic region changed to ${value}. Pull to refresh home feed.`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating YTMusic country:', error);
    }
  }

  async function handleLyricsProviderChange(value) {
    try {
      await SetLyricsProvider(value);
      setLyricsProvider(value);
      ToastAndroid.showWithGravity(
        `Lyrics provider changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating lyrics provider:', error);
      ToastAndroid.showWithGravity(
        'Failed to update lyrics provider',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }

  async function handleLyricsAnimationStyleChange(value) {
    try {
      await SetLyricsAnimationStyle(value);
      setLyricsAnimationStyle(value);
      ToastAndroid.showWithGravity(
        `Lyrics animation style changed to ${value}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    } catch (error) {
      console.error('Error updating lyrics animation style:', error);
      ToastAndroid.showWithGravity(
        'Failed to update lyrics animation style',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER,
      );
    }
  }


  useEffect(() => {
    loadSettings();
    // Verify DAB session on load
    dabGetCurrentUser().catch(err => console.error("Error verifying DAB session:", err));

    // Initialize YouTube auth service and set initial state
    ytAuthService.init().then(() => {
      setYtUser(ytAuthService.getUser());
      setIsYtAuth(ytAuthService.isAuth());
    });

    // Initialize Last.fm auth service
    lastFMService.loadSession().then(async () => {
      const user = lastFMService.getUser();
      if (user) {
        const fullInfo = await lastFMService.getUserInfo();
        setLastFmUser(fullInfo || user);
      }
      setIsLastFmAuth(lastFMService.isAuthenticated());
    });

    // Load MetadataResolver settings (strict FLAC mode)
    metadataResolver.loadSettings().then(() => {
      setStrictFlacMode(metadataResolver.isStrictFlacMode());
    });

    // Listen for DAB Auth changes
    const authListener = (state) => {
      setDabUser(state.user);
      setIsDabAuth(state.isAuthenticated);
    };

    // Listen for YouTube Auth changes
    const ytAuthListener = (state) => {
      setYtUser(state.user);
      setIsYtAuth(state.isAuthenticated);
    };

    // Listen for Last.fm Auth changes
    const lastFmAuthListener = async (state) => {
      if (state.isAuthenticated && state.user) {
        // Fetch full info if not already present
        if (!state.user.avatarUrl) {
          const fullInfo = await lastFMService.getUserInfo();
          setLastFmUser(fullInfo || state.user);
        } else {
          setLastFmUser(state.user);
        }
      } else {
        setLastFmUser(state.user);
      }
      setIsLastFmAuth(state.isAuthenticated);
    };

    dabAuthService.addListener(authListener);
    ytAuthService.addListener(ytAuthListener);
    lastFMService.addListener(lastFmAuthListener);

    return () => {
      dabAuthService.removeListener(authListener);
      ytAuthService.removeListener(ytAuthListener);
      lastFMService.removeListener(lastFmAuthListener);
    };
  }, []);

  async function handleDabLogout() {
    try {
      const result = await dabLogout();
      if (result.success) {
        ToastAndroid.show("Logged out from DAB Music", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("DAB Logout error:", error);
    }
  }

  async function handleYtLogout() {
    try {
      const result = await ytAuthService.logout();
      if (result.success) {
        ToastAndroid.show("Logged out from YouTube Music", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("YouTube Logout error:", error);
    }
  }

  // Last.fm handlers
  async function handleLastFmLogin() {
    if (!lastFmUsername.trim() || !lastFmPassword.trim()) {
      setLastFmError("Please enter username and password");
      return;
    }

    setLastFmLoggingIn(true);
    setLastFmError('');

    try {
      const result = await lastFMService.login(lastFmUsername, lastFmPassword);
      if (result.success) {
        setShowLastFmLoginDialog(false);
        setLastFmUsername('');
        setLastFmPassword('');
        ToastAndroid.show(`Logged in as ${result.username}`, ToastAndroid.SHORT);
      } else {
        setLastFmError(result.error || "Login failed");
      }
    } catch (error) {
      setLastFmError(error.message || "Login failed");
    } finally {
      setLastFmLoggingIn(false);
    }
  }

  async function handleLastFmLogout() {
    try {
      const result = await lastFMService.logout();
      if (result.success) {
        ToastAndroid.show("Logged out from Last.fm", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("Last.fm Logout error:", error);
    }
  }

  async function handleStrictFlacModeChange(enabled) {
    setStrictFlacMode(enabled);
    await metadataResolver.setStrictFlacMode(enabled);
    ToastAndroid.show(
      enabled ? "Strict FLAC mode enabled" : "Quality fallback enabled",
      ToastAndroid.SHORT
    );
  }

  function handleYtEditName() {
    // Show name edit dialog
    setEditingName(ytUser?.name !== 'YouTube User' ? ytUser?.name || '' : '');
    setShowNameEditDialog(true);
  }

  async function saveYtName() {
    if (editingName && editingName.trim()) {
      const currentUser = ytAuthService.getUser() || {};
      await ytAuthService.setUser({
        ...currentUser,
        name: editingName.trim()
      });
      ToastAndroid.show("Display name updated", ToastAndroid.SHORT);
    }
    setShowNameEditDialog(false);
  }


  return (
    <MainWrapper>
      <Text variant="headlineMedium" style={{ textAlign: 'left', marginTop: 20, marginBottom: 20, marginLeft: 16, color: colors.text, fontWeight: 'bold' }}>
        Settings
      </Text>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 170 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <TouchableRipple
          onPress={() => navigation.navigate("ChangeName")}
          rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
          style={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          <List.Item
            title="Change Name"
            titleStyle={{ color: colors.text, fontWeight: 'bold' }}
            left={() => <List.Icon icon="account-edit" color={colors.primary} />}
            right={() => <List.Icon icon="chevron-right" color={colors.text} />}
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
        </TouchableRipple>

        <TouchableRipple
          onPress={() => navigation.navigate("SelectLanguages")}
          rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
          style={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          <List.Item
            title="Select Languages"
            titleStyle={{ color: colors.text, fontWeight: 'bold' }}
            left={() => <List.Icon icon="translate" color={colors.primary} />}
            right={() => <List.Icon icon="chevron-right" color={colors.text} />}
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
        </TouchableRipple>

        {/* YouTube Music Authentication */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <Text variant="titleMedium" style={{ paddingHorizontal: 16, paddingBottom: 8, color: colors.text, opacity: 0.7 }}>
            YouTube Music
          </Text>
        </View>

        <TouchableRipple
          onPress={() => setShowYtAccountModal(true)}
          rippleColor={theme.dark ? 'rgba(255, 0, 0, 0.15)' : 'rgba(255, 0, 0, 0.05)'}
          style={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          <List.Item
            title={isYtAuth ? (ytUser?.name || 'YouTube User') : "Login to YouTube Music"}
            description={isYtAuth
              ? (ytUser?.handle ? ytUser.handle + ' • Signed in' : 'Signed in • Tap to manage account')
              : "Login to access personalized content and bypass restrictions"
            }
            titleStyle={{ color: colors.text, fontWeight: 'bold' }}
            descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
            left={() => (
              isYtAuth && ytUser?.avatarUrl
                ? <Avatar.Image size={40} source={{ uri: ytUser.avatarUrl }} style={{ marginLeft: 0 }} />
                : <List.Icon icon={isYtAuth ? "account-circle" : "youtube"} color={isYtAuth ? colors.primary : "#FF0000"} />
            )}
            right={() => <List.Icon icon="chevron-right" color={colors.text} />}
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
        </TouchableRipple>

        {/* YouTube Account Modal */}
        <YouTubeAccountModal
          visible={showYtAccountModal}
          onDismiss={() => setShowYtAccountModal(false)}
          user={ytUser}
          onLogout={handleYtLogout}
          onLogin={() => navigation.navigate("LoginScreen")}
          onRefresh={() => navigation.navigate("LoginScreen")}
          onEditName={handleYtEditName}
        />

        {/* Name Edit Dialog */}
        <Portal>
          <Modal
            visible={showNameEditDialog}
            onDismiss={() => setShowNameEditDialog(false)}
            contentContainerStyle={{
              backgroundColor: colors.card,
              padding: 20,
              margin: 20,
              borderRadius: 12
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
              Edit Display Name
            </Text>
            <TextInput
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Enter your name..."
              placeholderTextColor={colors.text + '80'}
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 16
              }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Button
                mode="text"
                onPress={() => setShowNameEditDialog(false)}
                textColor={colors.text}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={saveYtName}
                buttonColor={colors.primary}
              >
                Save
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* DAB Music Authentication */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <Text variant="titleMedium" style={{ paddingHorizontal: 16, paddingBottom: 8, color: colors.text, opacity: 0.7 }}>
            Qobuz
          </Text>
        </View>

        <TouchableRipple
          onPress={() => {
            if (isDabAuth) {
              Alert.alert(
                "DAB Music Account",
                `Logged in as ${dabUser?.username || dabUser?.email}\n\nDo you want to logout?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Logout", onPress: handleDabLogout, style: "destructive" }
                ]
              );
            } else {
              navigation.navigate("Login");
            }
          }}
          rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
          style={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          <List.Item
            title={isDabAuth ? (dabUser?.username || dabUser?.email) : "DAB Login"}
            description={isDabAuth ? "Tap to manage account" : "Login to access DAB Music features"}
            titleStyle={{ color: colors.text, fontWeight: 'bold' }}
            descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
            left={() => <List.Icon icon={isDabAuth ? "account" : "login"} color={colors.primary} />}
            right={() => <List.Icon icon="chevron-right" color={colors.text} />}
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
        </TouchableRipple>

        {/* DAB Recommendation Settings (only visible when DAB is authenticated) */}
        {isDabAuth && (
          <>
            {/* Last.fm Integration */}
            <TouchableRipple
              onPress={() => {
                if (isLastFmAuth) {
                  Alert.alert(
                    "Last.fm Account",
                    `Logged in as ${lastFmUser?.username}\n\nLast.fm powers smart recommendations for DAB songs.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Logout", onPress: handleLastFmLogout, style: "destructive" }
                    ]
                  );
                } else {
                  setShowLastFmLoginDialog(true);
                }
              }}
              rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
              style={{ paddingHorizontal: 16, paddingVertical: 4 }}
            >
              <List.Item
                title={isLastFmAuth ? (lastFmUser?.realname || lastFmUser?.username) : "Last.fm Login"}
                description={isLastFmAuth ? `Scrobbling as ${lastFmUser?.username}` : "Login for personalized Qobuz recommendations"}
                titleStyle={{ color: colors.text, fontWeight: 'bold' }}
                descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
                left={() => {
                  if (isLastFmAuth) {
                    return lastFmUser?.avatarUrl ? (
                      <Avatar.Image size={40} source={{ uri: lastFmUser.avatarUrl }} style={{ backgroundColor: 'transparent', marginLeft: -4 }} />
                    ) : (
                      <List.Icon icon="account" color={colors.primary} />
                    );
                  }
                  return <List.Icon icon="login" color={colors.primary} />;
                }}
                right={() => <List.Icon icon="chevron-right" color={colors.text} />}
                style={{ paddingHorizontal: 0, paddingVertical: 0 }}
              />
            </TouchableRipple>

            {/* Strict FLAC Mode Toggle */}
            <TouchableRipple
              onPress={() => handleStrictFlacModeChange(!strictFlacMode)}
              rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
              style={{ paddingHorizontal: 16, paddingVertical: 4 }}
            >
              <List.Item
                title="Skip non-FLAC Recommendations"
                description={strictFlacMode ? "Only plays songs available on DAB (FLAC)" : "Falls back to Saavn/YTMusic if DAB unavailable"}
                titleStyle={{ color: colors.text, fontWeight: 'bold' }}
                descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
                left={() => <List.Icon icon="quality-high" color={colors.primary} />}
                right={() => <Switch value={strictFlacMode} onValueChange={handleStrictFlacModeChange} />}
                style={{ paddingHorizontal: 0, paddingVertical: 0 }}
              />
            </TouchableRipple>
          </>
        )}

        {/* Last.fm Login Dialog */}
        <Portal>
          <Modal
            visible={showLastFmLoginDialog}
            onDismiss={() => {
              if (!lastFmLoggingIn) {
                setShowLastFmLoginDialog(false);
                setLastFmError('');
                setLastFmPassword('');
              }
            }}
            contentContainerStyle={{
              backgroundColor: colors.card,
              padding: 20,
              margin: 20,
              borderRadius: 12
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              Last.fm Login
            </Text>
            <Text style={{ color: colors.text, opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
              Connect Last.fm to enable personalized recommendations for your DAB songs.
            </Text>
            <TextInput
              value={lastFmUsername}
              onChangeText={(text) => {
                setLastFmUsername(text);
                setLastFmError('');
              }}
              placeholder="Username"
              placeholderTextColor={colors.text + '80'}
              editable={!lastFmLoggingIn}
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 12
              }}
              autoCapitalize="none"
            />
            <TextInput
              value={lastFmPassword}
              onChangeText={(text) => {
                setLastFmPassword(text);
                setLastFmError('');
              }}
              placeholder="Password"
              placeholderTextColor={colors.text + '80'}
              secureTextEntry
              editable={!lastFmLoggingIn}
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                padding: 12,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 12
              }}
            />
            {lastFmError ? (
              <Text style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12 }}>
                {lastFmError}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Button
                mode="text"
                onPress={() => {
                  setShowLastFmLoginDialog(false);
                  setLastFmError('');
                  setLastFmPassword('');
                }}
                textColor={colors.text}
                disabled={lastFmLoggingIn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleLastFmLogin}
                buttonColor={colors.primary}
                loading={lastFmLoggingIn}
                disabled={lastFmLoggingIn || !lastFmUsername.trim() || !lastFmPassword.trim()}
              >
                Login
              </Button>
            </View>
          </Modal>
        </Portal>

        {/* App Settings */}
        <View style={{ marginTop: 8, marginBottom: 8 }}>
          <Text variant="titleMedium" style={{ paddingHorizontal: 16, paddingBottom: 8, color: colors.text, opacity: 0.7 }}>
            App Settings
          </Text>
        </View>

        <DropDownMenu
          title="Font Size"
          icon="format-size"
          data={settingsConfig.fontSizes}
          selectedValue={font}
          onSelect={handleFontSizeChange}
        />
        <DropDownMenu
          title="Saavn Quality"
          icon="volume-high"
          data={settingsConfig.playbackQualities}
          selectedValue={playback}
          onSelect={handlePlaybackQualityChange}
        />
        <DropDownMenu
          title="Color Scheme"
          icon="palette"
          data={getColorSchemeOptions()}
          selectedValue={colorScheme}
          onSelect={handleColorSchemeChange}
        />
        <DropDownMenu
          title="Home Feed Source"
          icon="home-variant"
          data={settingsConfig.homeFeedSources}
          selectedValue={homeFeedSource}
          onSelect={handleHomeFeedSourceChange}
        />
        <DropDownMenu
          title="YTM Content Language"
          icon="translate"
          data={[
            { label: 'English', value: 'en' },
            { label: 'Hindi', value: 'hi' },
            { label: 'English (India)', value: 'en-IN' },
            { label: 'Tamil', value: 'ta' },
            { label: 'Telugu', value: 'te' },
            { label: 'Kannada', value: 'kn' },
            { label: 'Malayalam', value: 'ml' },
            { label: 'Bengali', value: 'bn' },
          ]}
          selectedValue={ytMusicLanguage}
          onSelect={handleYtMusicLanguageChange}
        />
        <DropDownMenu
          title="YTMusic Region"
          icon="earth"
          data={[
            { label: 'India', value: 'IN' },
            { label: 'United States', value: 'US' },
            { label: 'United Kingdom', value: 'GB' },
            { label: 'Canada', value: 'CA' },
            { label: 'Australia', value: 'AU' },
            { label: 'Germany', value: 'DE' },
            { label: 'France', value: 'FR' },
            { label: 'Japan', value: 'JP' },
            { label: 'South Korea', value: 'KR' },
            { label: 'Brazil', value: 'BR' },
            { label: 'Mexico', value: 'MX' },
            { label: 'Italy', value: 'IT' },
            { label: 'Spain', value: 'ES' },
            { label: 'Russia', value: 'RU' },
            { label: 'Netherlands', value: 'NL' },
            { label: 'Poland', value: 'PL' },
            { label: 'Sweden', value: 'SE' },
            { label: 'Indonesia', value: 'ID' },
            { label: 'Philippines', value: 'PH' },
            { label: 'Pakistan', value: 'PK' },
            { label: 'Bangladesh', value: 'BD' },
            { label: 'Nigeria', value: 'NG' },
            { label: 'South Africa', value: 'ZA' },
            { label: 'Saudi Arabia', value: 'SA' },
            { label: 'United Arab Emirates', value: 'AE' },
            { label: 'Turkey', value: 'TR' },
            { label: 'Thailand', value: 'TH' },
            { label: 'Vietnam', value: 'VN' },
            { label: 'Argentina', value: 'AR' },
            { label: 'Chile', value: 'CL' },
            { label: 'Colombia', value: 'CO' },
          ]}
          selectedValue={ytMusicCountry}
          onSelect={handleYtMusicCountryChange}
        />
        <DropDownMenu
          title="Lyrics Provider"
          icon="text-box-search"
          data={settingsConfig.lyricsProviders}
          selectedValue={lyricsProvider}
          onSelect={handleLyricsProviderChange}
        />
        <DropDownMenu
          title="Lyrics Animation"
          icon="animation-play"
          data={settingsConfig.lyricsAnimationStyles}
          selectedValue={lyricsAnimationStyle}
          onSelect={handleLyricsAnimationStyleChange}
        />

        <TouchableRipple
          onPress={handleThemeToggle}
          rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
          style={{ paddingHorizontal: 16, paddingVertical: 4 }}
        >
          <List.Item
            title="Dark Mode"
            titleStyle={{ color: colors.text, fontWeight: 'bold' }}
            left={() => <List.Icon icon={themePreference === 'dark' ? 'moon-waning-crescent' : 'white-balance-sunny'} color={colors.primary} />}
            right={() => (
              <View pointerEvents="none">
                <Switch
                  value={themePreference === 'dark'}
                  onValueChange={handleThemeToggle}
                  color={colors.primary}
                />
              </View>
            )}
            style={{ paddingHorizontal: 0, paddingVertical: 0 }}
          />
        </TouchableRipple>

        {downloadPathInfo && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7, fontSize: 12 }}>
              Files saved to: {downloadPathInfo.songsPath}
            </Text>
            {downloadPathInfo.requestedPath !== download && (
              <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.5, fontSize: 11 }}>
                Note: Using fallback path due to device restrictions
              </Text>
            )}
          </View>
        )}

        <View style={{ marginTop: 16, paddingHorizontal: 16, marginBottom: 16 }}>
          <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7 }}>
            *Note: If you change name or select languages, please restart the app to see all changes. All other settings take effect immediately.
          </Text>
        </View>
      </ScrollView>
    </MainWrapper>
  );
}


function DropDownMenu({ title, icon, data, selectedValue, onSelect }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const theme = useTheme();
  const { colors } = theme;
  const dropdownRef = useRef(null);

  // Find the selected option to display its label
  const selectedOption = data.find(item => item.value === selectedValue) || {};
  const displayValue = selectedOption.label || selectedValue;

  // Handle item selection
  const handleSelect = (value) => {
    onSelect(value);
    setShowDropdown(false);
  };

  return (
    <View>
      <TouchableRipple
        onPress={() => setShowDropdown(!showDropdown)}
        rippleColor={theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)'}
        style={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <List.Icon icon={icon} color={colors.primary} style={{ margin: 0, marginRight: 16 }} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>{title}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, marginRight: 8, opacity: 0.7 }}>
              {displayValue}
            </Text>
            <List.Icon
              icon={showDropdown ? 'menu-up' : 'menu-down'}
              color={colors.text}
              style={{ opacity: 0.7 }}
            />
          </View>
        </View>
      </TouchableRipple>

      <Portal>
        <Modal
          visible={showDropdown}
          onDismiss={() => setShowDropdown(false)}
          contentContainerStyle={{
            backgroundColor: colors.card,
            margin: 20,
            padding: 20,
            borderRadius: 8,
            elevation: 4,
            maxHeight: '80%', // Ensure it fits on screen
          }}
        >
          <ScrollView showsVerticalScrollIndicator={true}>
            {data.map((item) => (
              <View
                key={item.value}
                style={{
                  padding: 12,
                  backgroundColor: item.value === selectedValue ?
                    colors.primary + '20' : 'transparent',
                  borderRadius: 4,
                  marginVertical: 2,
                }}
              >
                <TouchableRipple
                  onPress={() => handleSelect(item.value)}
                  rippleColor="rgba(0, 0, 0, 0.1)"
                  style={{
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      color: item.value === selectedValue ?
                        colors.primary : colors.text,
                      fontSize: 16,
                      fontWeight: item.value === selectedValue ? '600' : '400',
                    }}
                  >
                    {item.label || item.value}
                  </Text>
                </TouchableRipple>
              </View>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}
