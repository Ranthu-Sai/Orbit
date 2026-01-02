import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_COLOR_SCHEME, colorSchemes } from "../Theme/colorSchemes";

async function GetFontSizeValue() {
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

async function SetFontSizeValue(FontSize) {
  try {
    await AsyncStorage.setItem('FontSize', FontSize);
  } catch (e) {
  }
}

async function GetPlaybackQuality() {
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

async function SetPlaybackQuality(PlaybackQuality) {
  try {
    await AsyncStorage.setItem('PlaybackQuality', PlaybackQuality);
  } catch (e) {
  }
}

async function GetDownloadPath() {
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

async function SetDownloadPath(DownloadPath) {
  try {
    await AsyncStorage.setItem('DownloadPath', DownloadPath);
  } catch (e) {
  }
}

async function GetThemePreference() {
  try {
    const value = await AsyncStorage.getItem('ThemePreference');
    if (value !== null) {
      return value
    } else {
      return 'dark' // Default theme is dark
    }
  } catch (e) {
    return 'dark' // Fallback to dark theme
  }
}

async function SetThemePreference(theme) {
  try {
    await AsyncStorage.setItem('ThemePreference', theme);
  } catch (e) {
  }
}

async function GetColorScheme() {
  try {
    const value = await AsyncStorage.getItem('ColorScheme');
    if (value !== null) {
      return value
    } else {
      return DEFAULT_COLOR_SCHEME // Default color scheme
    }
  } catch (e) {
    return DEFAULT_COLOR_SCHEME // Fallback to default
  }
}

async function SetColorScheme(colorScheme) {
  try {
    await AsyncStorage.setItem('ColorScheme', colorScheme);
  } catch (e) {
  }
}

// Get icon color preference
async function GetIconColor() {
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
    return colorSchemes[DEFAULT_COLOR_SCHEME].iconActive; // Fallback to default
  }
}

// Set icon color preference
async function SetIconColor(iconColor) {
  try {
    await AsyncStorage.setItem('IconColor', iconColor);
  } catch (e) {
  }
}

// Get text highlight color preference
async function GetTextColor() {
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
    return colorSchemes[DEFAULT_COLOR_SCHEME].textActive; // Fallback to default
  }
}

// Set text highlight color preference
async function SetTextColor(textColor) {
  try {
    await AsyncStorage.setItem('TextColor', textColor);
  } catch (e) {
  }
}

// Get accent color preference (used when song is playing)
async function GetAccentColor() {
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
    return colorSchemes[DEFAULT_COLOR_SCHEME].accent; // Fallback to default
  }
}

// Set accent color preference
async function SetAccentColor(accentColor) {
  try {
    await AsyncStorage.setItem('AccentColor', accentColor);
  } catch (e) {
  }
}

// Get whether custom colors are enabled
async function GetCustomColorsEnabled() {
  try {
    const value = await AsyncStorage.getItem('CustomColorsEnabled');
    if (value !== null) {
      return value === 'true'
    } else {
      return false // Default to not using custom colors
    }
  } catch (e) {
    return false // Fallback to not using custom colors
  }
}

// Set whether custom colors are enabled
async function SetCustomColorsEnabled(enabled) {
  try {
    await AsyncStorage.setItem('CustomColorsEnabled', enabled ? 'true' : 'false');
  } catch (e) {
  }
}

// Get music source preference
async function GetMusicSource() {
  try {
    const value = await AsyncStorage.getItem('MusicSource');
    if (value !== null) {
      return value
    } else {
      return 'Ytmusic' // Default music source
    }
  } catch (e) {
    return 'Ytmusic' // Fallback to Ytmusic
  }
}

// Set music source preference
async function SetMusicSource(musicSource) {
  try {
    await AsyncStorage.setItem('MusicSource', musicSource);
  } catch (e) {
  }
}

// Get home feed source preference
async function GetHomeFeedSource() {
  try {
    const value = await AsyncStorage.getItem('HomeFeedSource');
    if (value !== null) {
      return value
    } else {
      return 'Hybrid' // Default home feed source
    }
  } catch (e) {
    return 'Hybrid' // Fallback to Hybrid
  }
}

// Set home feed source preference
async function SetHomeFeedSource(homeFeedSource) {
  try {
    await AsyncStorage.setItem('HomeFeedSource', homeFeedSource);
  } catch (e) {
  }
}

// Get lyrics provider preference
async function GetLyricsProvider() {
  try {
    const value = await AsyncStorage.getItem('LyricsProvider');
    if (value !== null) {
      return value
    } else {
      return 'LrcLib' // Default lyrics provider
    }
  } catch (e) {
    return 'LrcLib' // Fallback
  }
}

// Set lyrics provider preference
async function SetLyricsProvider(provider) {
  try {
    await AsyncStorage.setItem('LyricsProvider', provider);
  } catch (e) {
  }
}

// Get lyrics animation style preference
async function GetLyricsAnimationStyle() {
  try {
    const value = await AsyncStorage.getItem('LyricsAnimationStyle');
    if (value !== null) {
      return value
    } else {
      return 'Apple' // Default lyrics animation style (ArchiveTune-style)
    }
  } catch (e) {
    return 'Smooth' // Fallback
  }
}

// Set lyrics animation style preference
async function SetLyricsAnimationStyle(style) {
  try {
    await AsyncStorage.setItem('LyricsAnimationStyle', style);
  } catch (e) {
  }
}

// Get lyrics font size preference
async function GetLyricsFontSize() {
  try {
    const value = await AsyncStorage.getItem('LyricsFontSize');
    if (value !== null) {
      return parseInt(value, 10)
    } else {
      return 26 // Default font size
    }
  } catch (e) {
    return 26
  }
}

// Set lyrics font size preference
async function SetLyricsFontSize(size) {
  try {
    await AsyncStorage.setItem('LyricsFontSize', size.toString());
  } catch (e) {
  }
}

// Get lyrics theme preference
async function GetLyricsTheme() {
  try {
    const value = await AsyncStorage.getItem('LyricsTheme');
    if (value !== null) {
      return value
    } else {
      return 'Blur' // Default theme
    }
  } catch (e) {
    return 'Blur'
  }
}

// Set lyrics theme preference
async function SetLyricsTheme(theme) {
  try {
    await AsyncStorage.setItem('LyricsTheme', theme);
  } catch (e) {
  }
}

// Get lyrics text color preference
async function GetLyricsTextColor() {
  try {
    const value = await AsyncStorage.getItem('LyricsTextColor');
    if (value !== null) {
      return value
    } else {
      return 'Auto' // Default to auto
    }
  } catch (e) {
    return 'Auto'
  }
}

// Set lyrics text color preference
async function SetLyricsTextColor(color) {
  try {
    await AsyncStorage.setItem('LyricsTextColor', color);
  } catch (e) {
  }
}

async function GetYtMusicQuality() {
  try {
    const value = await AsyncStorage.getItem('YtMusicQuality');
    if (value !== null) {
      return value
    } else {
      return 'Auto'
    }
  } catch (e) {
    return 'Auto'
  }
}

async function SetYtMusicQuality(quality) {
  try {
    await AsyncStorage.setItem('YtMusicQuality', quality);
  } catch (e) {
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
  SetMusicSource,
  GetHomeFeedSource,
  SetHomeFeedSource,
  GetLyricsProvider,
  SetLyricsProvider,
  GetLyricsAnimationStyle,
  SetLyricsAnimationStyle,
  GetLyricsFontSize,
  SetLyricsFontSize,
  GetLyricsTheme,
  SetLyricsTheme,
  GetLyricsTextColor,
  SetLyricsTextColor,
  GetYtMusicQuality,
  SetYtMusicQuality,
}
