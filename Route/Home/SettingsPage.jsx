import React, { useEffect, useState } from 'react';
import { ScrollView, ToastAndroid, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { getColorSchemeOptions } from '../../Theme/colorSchemes';

// React Native Paper imports
import {
  List,
  Switch,
  Menu,
  Portal,
  Text,
  TouchableRipple,
  Divider,
  useTheme as usePaperTheme
} from 'react-native-paper';

// Layout components
import { MainWrapper } from '../../Layout/MainWrapper';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import { Heading } from '../../Component/Global/Heading';

// Import settings functions
import {
  GetDownloadPath,
  GetFontSizeValue,
  GetPlaybackQuality,
  GetThemePreference,
  GetColorScheme,
  SetDownloadPath,
  SetFontSizeValue,
  SetPlaybackQuality,
  SetThemePreference,
  SetColorScheme,
} from '../../LocalStorage/AppSettings';

export const SettingsPage = ({ navigation }) => {
  const { colors } = useTheme();
  const paperTheme = usePaperTheme();
  
  const [Font, setFont] = useState('Medium');
  const [Playback, setPlayback] = useState('320kbps');
  const [Download, setDownload] = useState('Downloads');
  const [themePreference, setThemePreference] = useState('dark');
  const [colorScheme, setColorScheme] = useState('');
  
  // Menu states
  const [fontMenuVisible, setFontMenuVisible] = useState(false);
  const [playbackMenuVisible, setPlaybackMenuVisible] = useState(false);
  const [downloadMenuVisible, setDownloadMenuVisible] = useState(false);
  const [colorSchemeMenuVisible, setColorSchemeMenuVisible] = useState(false);

  const FontSizeOptions = [
    { label: 'Small', value: 'Small' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Large', value: 'Large' },
  ];
  
  const PlaybackQualityOptions = [
    { label: '12kbps', value: '12kbps' },
    { label: '48kbps', value: '48kbps' },
    { label: '96kbps', value: '96kbps' },
    { label: '160kbps', value: '160kbps' },
    { label: '320kbps', value: '320kbps' },
  ];
  
  const DownloadPathOptions = [
    { label: 'Music', value: 'Music' },
    { label: 'Downloads', value: 'Downloads' },
  ];
  
  const ColorSchemeOptions = getColorSchemeOptions().map(scheme => ({
    label: scheme,
    value: scheme
  }));
  
  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [font, playback, download, theme, scheme] = await Promise.all([
          GetFontSizeValue(),
          GetPlaybackQuality(),
          GetDownloadPath(),
          GetThemePreference(),
          GetColorScheme()
        ]);
        
        setFont(font);
        setPlayback(playback);
        setDownload(download);
        setThemePreference(theme);
        setColorScheme(scheme);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Settings handlers
  const handleFontChange = async (value) => {
    setFont(value);
    setFontMenuVisible(false);
    await SetFontSizeValue(value);
    ToastAndroid.showWithGravity(
      `Font size changed to ${value}`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  };
  
  const handlePlaybackChange = async (value) => {
    setPlayback(value);
    setPlaybackMenuVisible(false);
    await SetPlaybackQuality(value);
    ToastAndroid.showWithGravity(
      `Playback quality changed to ${value}`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  };
  
  const handleDownloadChange = async (value) => {
    setDownload(value);
    setDownloadMenuVisible(false);
    await SetDownloadPath(value);
    ToastAndroid.showWithGravity(
      `Download path changed to ${value}`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  };
  
  const handleThemeToggle = async () => {
    const newTheme = themePreference === 'dark' ? 'light' : 'dark';
    setThemePreference(newTheme);
    await SetThemePreference(newTheme);
    ToastAndroid.showWithGravity(
      `Theme changed to ${newTheme} mode. Please restart the app to see changes.`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  };
  
  const handleColorSchemeChange = async (value) => {
    setColorScheme(value);
    setColorSchemeMenuVisible(false);
    await SetColorScheme(value);
    ToastAndroid.showWithGravity(
      `Color scheme changed to ${value}. Please restart the app to see changes.`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  };

  return (
    <MainWrapper>
      <PaddingConatiner>
        <Heading text="SETTINGS" />
        <ScrollView style={{ flex: 1, backgroundColor: paperTheme.colors.background }}>
          <List.Section>
            <List.Subheader style={{ color: paperTheme.colors.text }}>
              Personal Settings
            </List.Subheader>
            
            <List.Item
              title="Change Name"
              description="Update your display name"
              left={props => <List.Icon {...props} icon="account-edit" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ChangeName')}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />
            
            <List.Item
              title="Select Languages"
              description="Choose your preferred languages"
              left={props => <List.Icon {...props} icon="translate" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('SelectLanguages')}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />
          </List.Section>

          <Divider />
          
          <List.Section>
            <List.Subheader style={{ color: paperTheme.colors.text }}>
              Appearance
            </List.Subheader>
            
            <List.Item
              title="Font Size"
              description={Font}
              left={props => <List.Icon {...props} icon="format-size" />}
              right={() => (
                <Menu
                  visible={fontMenuVisible}
                  onDismiss={() => setFontMenuVisible(false)}
                  anchor={
                    <TouchableRipple onPress={() => setFontMenuVisible(true)}>
                      <Text style={{ color: paperTheme.colors.primary, marginRight: 8 }}>
                        {Font}
                      </Text>
                    </TouchableRipple>
                  }
                >
                  {FontSizeOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => handleFontChange(option.value)}
                      title={option.label}
                    />
                  ))}
                </Menu>
              )}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />

            <List.Item
              title="App Theme"
              description={themePreference === 'light' ? 'Light Mode' : 'Dark Mode'}
              left={props => <List.Icon {...props} icon={themePreference === 'light' ? 'white-balance-sunny' : 'moon-waning-crescent'} />}
              right={() => (
                <Switch
                  value={themePreference === 'light'}
                  onValueChange={handleThemeToggle}
                  color={paperTheme.colors.primary}
                />
              )}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />

            <List.Item
              title="Color Scheme"
              description={colorScheme}
              left={props => <List.Icon {...props} icon="palette" />}
              right={() => (
                <Menu
                  visible={colorSchemeMenuVisible}
                  onDismiss={() => setColorSchemeMenuVisible(false)}
                  anchor={
                    <TouchableRipple onPress={() => setColorSchemeMenuVisible(true)}>
                      <Text style={{ color: paperTheme.colors.primary, marginRight: 8 }}>
                        {colorScheme}
                      </Text>
                    </TouchableRipple>
                  }
                >
                  {ColorSchemeOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => handleColorSchemeChange(option.value)}
                      title={option.label}
                    />
                  ))}
                </Menu>
              )}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />
          </List.Section>

          <Divider />
          
          <List.Section>
            <List.Subheader style={{ color: paperTheme.colors.text }}>
              Playback & Storage
            </List.Subheader>
            
            <List.Item
              title="Playback Quality"
              description={Playback}
              left={props => <List.Icon {...props} icon="music-note" />}
              right={() => (
                <Menu
                  visible={playbackMenuVisible}
                  onDismiss={() => setPlaybackMenuVisible(false)}
                  anchor={
                    <TouchableRipple onPress={() => setPlaybackMenuVisible(true)}>
                      <Text style={{ color: paperTheme.colors.primary, marginRight: 8 }}>
                        {Playback}
                      </Text>
                    </TouchableRipple>
                  }
                >
                  {PlaybackQualityOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => handlePlaybackChange(option.value)}
                      title={option.label}
                    />
                  ))}
                </Menu>
              )}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />

            <List.Item
              title="Download Path"
              description={Download}
              left={props => <List.Icon {...props} icon="folder-download" />}
              right={() => (
                <Menu
                  visible={downloadMenuVisible}
                  onDismiss={() => setDownloadMenuVisible(false)}
                  anchor={
                    <TouchableRipple onPress={() => setDownloadMenuVisible(true)}>
                      <Text style={{ color: paperTheme.colors.primary, marginRight: 8 }}>
                        {Download}
                      </Text>
                    </TouchableRipple>
                  }
                >
                  {DownloadPathOptions.map((option) => (
                    <Menu.Item
                      key={option.value}
                      onPress={() => handleDownloadChange(option.value)}
                      title={option.label}
                    />
                  ))}
                </Menu>
              )}
              titleStyle={{ color: paperTheme.colors.text }}
              descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            />
          </List.Section>

          <Divider />
          
          <View style={{ padding: 16 }}>
            <Text
              variant="bodySmall"
              style={{
                color: paperTheme.colors.onSurfaceVariant,
                textAlign: 'center',
                fontStyle: 'italic'
              }}
            >
              *Note: If you change font size, name, languages, theme, or colors, please restart the app to see all changes.
            </Text>
          </View>
        </ScrollView>
      </PaddingConatiner>
    </MainWrapper>
  );
};
