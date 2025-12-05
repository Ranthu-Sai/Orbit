import { MainWrapper } from "../../Layout/MainWrapper";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { ScrollView, ToastAndroid, View, TouchableOpacity } from "react-native";
import { List, Card, Text, Switch, TouchableRipple, Portal, Modal } from "react-native-paper";
import { useRef } from "react";

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
} from "../../LocalStorage/AppSettings";
import { useEffect, useState } from "react";
import { useTheme } from "@react-navigation/native";
import { getColorSchemeOptions } from "../../Theme/colorSchemes";
import { settingsConfig } from "../../config/settingsConfig";
import { useThemeContext } from "../../Context/ThemeContext";
import { StorageManager } from "../../Utils/StorageManager";

export const SettingsPage = ({ navigation }) => {
  const { colors } = useTheme();
  const { changeFontSize, changeColorScheme, toggleTheme } = useThemeContext();
  const [font, setFont] = useState(settingsConfig.defaults.fontSize);
  const [playback, setPlayback] = useState(settingsConfig.defaults.playbackQuality);
  const [download, setDownload] = useState(settingsConfig.defaults.downloadPath);
  const [themePreference, setThemePreference] = useState(settingsConfig.defaults.themePreference);
  const [colorScheme, setColorScheme] = useState(settingsConfig.defaults.colorScheme);
  const [musicSource, setMusicSource] = useState(settingsConfig.defaults.musicSource);
  const [downloadPathInfo, setDownloadPathInfo] = useState(null);

  async function loadSettings() {
    try {
      const [fontSize, playbackQuality, downloadPath, themePref, colorSchemePref, musicSourcePref] = await Promise.all([
        GetFontSizeValue(),
        GetPlaybackQuality(),
        GetDownloadPath(),
        GetThemePreference(),
        GetColorScheme(),
        GetMusicSource()
      ]);

      setFont(fontSize || settingsConfig.defaults.fontSize);
      setPlayback(playbackQuality || settingsConfig.defaults.playbackQuality);
      setDownload(downloadPath || settingsConfig.defaults.downloadPath);
      setThemePreference(themePref || settingsConfig.defaults.themePreference);
      setColorScheme(colorSchemePref || settingsConfig.defaults.colorScheme);
      setMusicSource(musicSourcePref || settingsConfig.defaults.musicSource);

      // Load download path information
      const pathInfo = await StorageManager.getDownloadPathInfo();
      setDownloadPathInfo(pathInfo);
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


  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <MainWrapper>
      <PaddingConatiner>
        <Text variant="headlineMedium" style={{ textAlign: 'left', marginBottom: 20, marginLeft: 16, color: colors.text, fontWeight: 'bold' }}>
          Settings
        </Text>
        <ScrollView style={{ marginBottom: 52 }}>
          <View style={{ padding: 16 }}>
            <List.Item
              title="Change Name"
              titleStyle={{ color: colors.text, fontWeight: 'bold' }}
              left={() => <List.Icon icon="account-edit" color={colors.primary} />}
              right={() => <List.Icon icon="chevron-right" color={colors.text} />}
              onPress={() => navigation.navigate("ChangeName")}
              style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            />
          </View>
          <View style={{ padding: 16 }}>
            <List.Item
              title="Select Languages"
              titleStyle={{ color: colors.text, fontWeight: 'bold' }}
              left={() => <List.Icon icon="translate" color={colors.primary} />}
              right={() => <List.Icon icon="chevron-right" color={colors.text} />}
              onPress={() => navigation.navigate("SelectLanguages")}
              style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            />
          </View>

          {/* YouTube Music Authentication */}
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <Text variant="titleMedium" style={{ paddingHorizontal: 16, paddingBottom: 8, color: colors.text, opacity: 0.7 }}>
              YouTube Music
            </Text>
          </View>
          <View style={{ padding: 16 }}>
            <List.Item
              title="Login to YouTube Music"
              description="Login to access personalized content and bypass restrictions"
              titleStyle={{ color: colors.text, fontWeight: 'bold' }}
              descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
              left={() => <List.Icon icon="youtube" color="#FF0000" />}
              right={() => <List.Icon icon="chevron-right" color={colors.text} />}
              onPress={() => navigation.navigate("LoginScreen")}
              style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            />
          </View>

          {/* DAB Music Authentication */}
          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <Text variant="titleMedium" style={{ paddingHorizontal: 16, paddingBottom: 8, color: colors.text, opacity: 0.7 }}>
              DAB Music (FLAC)
            </Text>
          </View>
          <View style={{ padding: 16 }}>
            <List.Item
              title="DAB Login"
              description="Login to access DAB Music features"
              titleStyle={{ color: colors.text, fontWeight: 'bold' }}
              descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
              left={() => <List.Icon icon="login" color={colors.primary} />}
              right={() => <List.Icon icon="chevron-right" color={colors.text} />}
              onPress={() => navigation.navigate("Login")}
              style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            />
          </View>
          <View style={{ padding: 16 }}>
            <List.Item
              title="DAB Register"
              description="Create a new DAB Music account"
              titleStyle={{ color: colors.text, fontWeight: 'bold' }}
              descriptionStyle={{ color: colors.text, opacity: 0.7, fontSize: 12 }}
              left={() => <List.Icon icon="account-plus" color={colors.primary} />}
              right={() => <List.Icon icon="chevron-right" color={colors.text} />}
              onPress={() => navigation.navigate("Register")}
              style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            />
          </View>

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
            title="Playback Quality"
            icon="volume-high"
            data={settingsConfig.playbackQualities}
            selectedValue={playback}
            onSelect={handlePlaybackQualityChange}
          />
          <DropDownMenu
            title="Download Path"
            icon="folder-download"
            data={settingsConfig.downloadPaths}
            selectedValue={download}
            onSelect={handleDownloadPathChange}
          />
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
          <DropDownMenu
            title="Color Scheme"
            icon="palette"
            data={getColorSchemeOptions()}
            selectedValue={colorScheme}
            onSelect={handleColorSchemeChange}
          />
          <DropDownMenu
            title="Music Source"
            icon="music"
            data={settingsConfig.musicSources}
            selectedValue={musicSource}
            onSelect={handleMusicSourceChange}
          />

          <View style={{ padding: 16 }}>
            <List.Item
              title="Dark Mode"
              titleStyle={{ color: colors.text, fontWeight: 'bold' }}
              left={() => <List.Icon icon={themePreference === 'dark' ? 'moon-waning-crescent' : 'white-balance-sunny'} color={colors.primary} />}
              right={() => (
                <Switch
                  value={themePreference === 'dark'}
                  onValueChange={handleThemeToggle}
                  color={colors.primary}
                />
              )}
              style={{ paddingHorizontal: 0, paddingVertical: 0 }}
            />
          </View>

          <View style={{ marginTop: 16, paddingHorizontal: 16, marginBottom: 16 }}>
            <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7 }}>
              *Note: If you change name or select languages, please restart the app to see all changes. All other settings take effect immediately.
            </Text>
          </View>
        </ScrollView>
      </PaddingConatiner>
    </MainWrapper>
  );
}


function DropDownMenu({ title, icon, data, selectedValue, onSelect }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { colors } = useTheme();
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
      <View style={{
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableRipple
          onPress={() => setShowDropdown(!showDropdown)}
          rippleColor="rgba(0, 0, 0, 0.1)"
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <>
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
          </>
        </TouchableRipple>
      </View>

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
          }}
        >
          <View>
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
          </View>
        </Modal>
      </Portal>
    </View>
  );
}
