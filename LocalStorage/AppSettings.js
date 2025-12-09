import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_COLOR_SCHEME, colorSchemes } from "../Theme/colorSchemes";

async function GetFontSizeValue(){
  try {
    const value = await AsyncStorage.getItem('FontSize');
    if (value !== null) {
      return value
    } else {
      return 'Medium'
    }
  } catch (e) {
    // error reading value
  }
}

async function SetFontSizeValue(FontSize){
  try {
    await AsyncStorage.setItem('FontSize', FontSize);
  } catch (e) {
    console.log("Font size Save Error");
  }
}

async function GetPlaybackQuality(){
  try {
    const value = await AsyncStorage.getItem('PlaybackQuality');
    if (value !== null) {
      return value
    } else {
      return '320kbps'
    }
  } catch (e) {
    // error reading value
  }
}

async function SetPlaybackQuality(PlaybackQuality){
  try {
    await AsyncStorage.setItem('PlaybackQuality', PlaybackQuality);
  } catch (e) {
    console.log("PlaybackQuality Save Error");
  }
}

async function GetDownloadPath(){
  try {
    const value = await AsyncStorage.getItem('DownloadPath');
    if (value !== null) {
      return value
    } else {
      return 'Download'
    }
  } catch (e) {
    // error reading value
  }
}

async function SetDownloadPath(DownloadPath){
  try {
    await AsyncStorage.setItem('DownloadPath', DownloadPath);
  } catch (e) {
    console.log("SetDownloadPath Save Error");
  }
}

async function GetThemePreference(){
  try {
    const value = await AsyncStorage.getItem('ThemePreference');
    if (value !== null) {
      return value
    } else {
      return 'dark' // Default theme is dark
    }
  } catch (e) {
    console.log("Theme preference read error");
    return 'dark' // Fallback to dark theme
  }
}

async function SetThemePreference(theme){
  try {
    await AsyncStorage.setItem('ThemePreference', theme);
  } catch (e) {
    console.log("Theme preference save error");
  }
}

async function GetColorScheme(){
  try {
    const value = await AsyncStorage.getItem('ColorScheme');
    if (value !== null) {
      return value
    } else {
      return DEFAULT_COLOR_SCHEME // Default color scheme
    }
  } catch (e) {
    console.log("Color scheme read error");
    return DEFAULT_COLOR_SCHEME // Fallback to default
  }
}

async function SetColorScheme(colorScheme){
  try {
    await AsyncStorage.setItem('ColorScheme', colorScheme);
  } catch (e) {
    console.log("Color scheme save error");
  }
}

// Get icon color preference
async function GetIconColor(){
  try {
    const value = await AsyncStorage.getItem('IconColor');
    if (value !== null) {
      return value
    } else {
      // Default to the color scheme's icon color
      const scheme = await GetColorScheme();
      return colorSchemes[scheme].iconActive;
    }
  } catch (e) {
    console.log("Icon color read error");
    return colorSchemes[DEFAULT_COLOR_SCHEME].iconActive; // Fallback to default
  }
}

// Set icon color preference
async function SetIconColor(iconColor){
  try {
    await AsyncStorage.setItem('IconColor', iconColor);
  } catch (e) {
    console.log("Icon color save error");
  }
}

// Get text highlight color preference
async function GetTextColor(){
  try {
    const value = await AsyncStorage.getItem('TextColor');
    if (value !== null) {
      return value
    } else {
      // Default to the color scheme's text color
      const scheme = await GetColorScheme();
      return colorSchemes[scheme].textActive;
    }
  } catch (e) {
    console.log("Text color read error");
    return colorSchemes[DEFAULT_COLOR_SCHEME].textActive; // Fallback to default
  }
}

// Set text highlight color preference
async function SetTextColor(textColor){
  try {
    await AsyncStorage.setItem('TextColor', textColor);
  } catch (e) {
    console.log("Text color save error");
  }
}

// Get accent color preference (used when song is playing)
async function GetAccentColor(){
  try {
    const value = await AsyncStorage.getItem('AccentColor');
    if (value !== null) {
      return value
    } else {
      // Default to the color scheme's accent color
      const scheme = await GetColorScheme();
      return colorSchemes[scheme].accent;
    }
  } catch (e) {
    console.log("Accent color read error");
    return colorSchemes[DEFAULT_COLOR_SCHEME].accent; // Fallback to default
  }
}

// Set accent color preference
async function SetAccentColor(accentColor){
  try {
    await AsyncStorage.setItem('AccentColor', accentColor);
  } catch (e) {
    console.log("Accent color save error");
  }
}

// Get whether custom colors are enabled
async function GetCustomColorsEnabled(){
  try {
    const value = await AsyncStorage.getItem('CustomColorsEnabled');
    if (value !== null) {
      return value === 'true'
    } else {
      return false // Default to not using custom colors
    }
  } catch (e) {
    console.log("Custom colors enabled read error");
    return false // Fallback to not using custom colors
  }
}

// Set whether custom colors are enabled
async function SetCustomColorsEnabled(enabled){
  try {
    await AsyncStorage.setItem('CustomColorsEnabled', enabled ? 'true' : 'false');
  } catch (e) {
    console.log("Custom colors enabled save error");
  }
}

// Get music source preference
async function GetMusicSource(){
  try {
    const value = await AsyncStorage.getItem('MusicSource');
    if (value !== null) {
      return value
    } else {
      return 'Ytmusic' // Default music source
    }
  } catch (e) {
    console.log("Music source read error");
    return 'Ytmusic' // Fallback to Ytmusic
  }
}

// Set music source preference
async function SetMusicSource(musicSource){
  try {
    await AsyncStorage.setItem('MusicSource', musicSource);
  } catch (e) {
    console.log("Music source save error");
  }
}

export {
  GetFontSizeValue,
  SetFontSizeValue,
  GetPlaybackQuality,
  SetPlaybackQuality,
  GetDownloadPath,
  SetDownloadPath,
  GetThemePreference,
  SetThemePreference,
  GetColorScheme,
  SetColorScheme,
  GetIconColor,
  SetIconColor,
  GetTextColor,
  SetTextColor,
  GetAccentColor,
  SetAccentColor,
  GetCustomColorsEnabled,
  SetCustomColorsEnabled,
  GetMusicSource,
  SetMusicSource
}
