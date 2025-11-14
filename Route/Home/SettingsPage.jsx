import { Heading } from "../../Component/Global/Heading";
import { MainWrapper } from "../../Layout/MainWrapper";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { ScrollView, ToastAndroid, View } from "react-native";
import { List, Switch, Card, Text, Divider } from "react-native-paper";
import { Dropdown } from "react-native-paper-dropdown";


import {
  GetDownloadPath,
  GetFontSizeValue,
  GetPlaybackQuality,
  GetThemePreference,
  GetColorScheme,
  // GetTidalEnabled,
  SetDownloadPath,
  SetFontSizeValue,
  SetPlaybackQuality,
  SetThemePreference,
  SetColorScheme,
  // SetTidalEnabled

} from "../../LocalStorage/AppSettings";
import { useEffect, useState } from "react";
import { SmallText } from "../../Component/Global/SmallText";
import { useTheme } from "@react-navigation/native";
import { getColorSchemeOptions, availableColors } from "../../Theme/colorSchemes";

export const SettingsPage = ({navigation}) => {
  const { colors } = useTheme();
  const [Font, setFont] = useState("");
  const [Playback, setPlayback] = useState("");
  const [Download, setDownload] = useState("");
  const [themePreference, setThemePreference] = useState("");
  const [colorScheme, setColorScheme] = useState("");
  
  const FontSize = [
    { value: 'Small' },
    { value: 'Medium' },
    { value: 'Large' },
  ];
  
  const PlaybackQuality = [
    { value: '12kbps' },
    { value: '48kbps' },
    { value: '96kbps' },
    { value: '160kbps' },
    { value: '320kbps' },
  ];
  
  const DownloadPath = [
    { value: 'Music' },
    { value: 'Downloads' },
  ];
  
  async function GetFontSize(){
    const data = await GetFontSizeValue();
    setFont(data);
  }
  
  async function GetPlayBack(){
    const data = await GetPlaybackQuality();
    setPlayback(data);
  }
  
  async function GetDownLoad(){
    const data = await GetDownloadPath();
    setDownload(data);
  }
  
  async function GetTheme(){
    const data = await GetThemePreference();
    setThemePreference(data);
  }
  
  async function GetColorSchemePreference(){
    const data = await GetColorScheme();
    setColorScheme(data);
  }


  async function SetDownLoad({ value }){
    await SetDownloadPath(value);
    ToastAndroid.showWithGravity(
      `Download path changed to ${value}`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  }
  
  async function SetPlayBack({ value }){
    await SetPlaybackQuality(value);
    ToastAndroid.showWithGravity(
      `Playback quality changed to ${value}`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  }
  
  async function SetFont({ value }){
    await SetFontSizeValue(value);
    ToastAndroid.showWithGravity(
      `Font size changed to ${value}`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  }
  
  async function handleThemeToggle() {
    const newTheme = themePreference === 'dark' ? 'light' : 'dark';
    setThemePreference(newTheme);
    await SetThemePreference(newTheme);
    // Theme will be updated on app restart
    ToastAndroid.showWithGravity(
      `Theme changed to ${newTheme} mode. Please restart the app to see changes.`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  }
  
  async function handleColorSchemeChange({ value }) {
    setColorScheme(value);
    // Save the color scheme preference to AsyncStorage
    await SetColorScheme(value);
    ToastAndroid.showWithGravity(
      `Color scheme changed to ${value}. Please restart the app to see changes.`,
      ToastAndroid.SHORT,
      ToastAndroid.CENTER,
    );
  }

  
  useEffect(() => {
    GetFontSize();
    GetPlayBack();
    GetDownLoad();
    GetTheme();
    GetColorSchemePreference();
    // GetTidalEnabledPreference();

  }, []);
  
  return (
    <MainWrapper>
      <PaddingConatiner>
        <Text variant="headlineMedium" style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          SETTINGS
        </Text>
        <ScrollView style={{ marginBottom: 52 }}>
          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <List.Section>
                <List.Subheader style={{ color: colors.text }}>Account</List.Subheader>
                <List.Item
                  title="Change Name"
                  titleStyle={{ color: colors.text }}
                  left={() => <List.Icon icon="account-edit" color={colors.primary} />}
                  right={() => <List.Icon icon="chevron-right" color={colors.text} />}
                  onPress={() => navigation.navigate("ChangeName")}
                />
                <List.Item
                  title="Select Languages"
                  titleStyle={{ color: colors.text }}
                  left={() => <List.Icon icon="translate" color={colors.primary} />}
                  right={() => <List.Icon icon="chevron-right" color={colors.text} />}
                  onPress={() => navigation.navigate("SelectLanguages")}
                />
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <List.Section>
                <List.Subheader style={{ color: colors.text }}>Preferences</List.Subheader>
                <DropDownMenu
                  title="Font Size"
                  icon="format-size"
                  data={FontSize}
                  selectedValue={Font}
                  onSelect={SetFont}
                />
                <DropDownMenu
                  title="Playback Quality"
                  icon="volume-high"
                  data={PlaybackQuality}
                  selectedValue={Playback}
                  onSelect={SetPlayBack}
                />
                <DropDownMenu
                  title="Download Path"
                  icon="folder-download"
                  data={DownloadPath}
                  selectedValue={Download}
                  onSelect={SetDownLoad}
                />
                <DropDownMenu
                  title="Color Scheme"
                  icon="palette"
                  data={getColorSchemeOptions()}
                  selectedValue={colorScheme}
                  onSelect={handleColorSchemeChange}
                />
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <List.Section>
                <List.Subheader style={{ color: colors.text }}>Appearance</List.Subheader>
                <List.Item
                  title="Dark Mode"
                  titleStyle={{ color: colors.text }}
                  left={() => <List.Icon icon={themePreference === 'dark' ? 'moon-waning-crescent' : 'white-balance-sunny'} color={colors.primary} />}
                  right={() => (
                    <Switch
                      value={themePreference === 'dark'}
                      onValueChange={handleThemeToggle}
                      color={colors.primary}
                    />
                  )}
                />
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Card.Content>
              <Text variant="bodySmall" style={{ color: colors.text, opacity: 0.7 }}>
                *Note: If you change font size, change name, select languages, theme, or colors, please restart the app to see all changes.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </PaddingConatiner>
    </MainWrapper>
  );
}


function DropDownMenu({ title, icon, data, selectedValue, onSelect }) {
  const { colors } = useTheme();

  const options = data.map((item, index) => ({
    label: item.value,
    value: item.value,
  }));

  const handleSelect = (value) => {
    const selectedItem = data.find(item => item.value === value);
    if (selectedItem) {
      onSelect(selectedItem);
    }
  };

  return (
    <List.Item
      title={title}
      titleStyle={{ color: colors.text }}
      left={() => <List.Icon icon={icon} color={colors.primary} />}
      right={() => (
        <View style={{ marginLeft: 20 }}>
          <Dropdown
            options={options}
            value={selectedValue}
            onSelect={handleSelect}
            placeholder="Select option"
            mode="outlined"
            style={{
              width: 120,
              backgroundColor: 'transparent',
            }}
            menuContentStyle={{
              backgroundColor: colors.card || colors.background,
            }}
            textColor={colors.text}
            activeColor={colors.primary}
          />
        </View>
      )}
    />
  );
}
