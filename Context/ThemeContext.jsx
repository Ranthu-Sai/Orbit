import React, { createContext, useState, useContext, useEffect } from 'react';
import { darkTheme } from '../Theme/darkTheme';
import { lightTheme } from '../Theme/lightTheme';
import { PaperDarkTheme } from '../Theme/paperDarkTheme';
import { PaperLightTheme } from '../Theme/paperLightTheme';
import {
  GetThemePreference,
  SetThemePreference,
  GetColorScheme,
  SetColorScheme,
  GetFontSizeValue,
  SetFontSizeValue
} from '../LocalStorage/AppSettings';
import { getColorScheme, DEFAULT_COLOR_SCHEME } from '../Theme/colorSchemes';

// Create the theme context
export const ThemeContext = createContext();

// Create the ThemeProvider component
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(darkTheme);
  const [paperTheme, setPaperTheme] = useState(PaperDarkTheme);
  const [themeMode, setThemeMode] = useState('dark');
  const [colorSchemeName, setColorSchemeName] = useState(DEFAULT_COLOR_SCHEME);
  const [colorScheme, setColorScheme] = useState(getColorScheme(DEFAULT_COLOR_SCHEME));
  const [fontSize, setFontSize] = useState('Medium');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Apply color scheme and font size to theme
  const applySettingsToTheme = (baseTheme, paperBaseTheme, scheme, fontSizeValue) => {
    // Calculate font size multiplier based on setting
    const fontSizeMultiplier = fontSizeValue === 'Small' ? 0.8 : fontSizeValue === 'Large' ? 1.2 : 1.0;

    // Apply to navigation theme
    const navigationTheme = {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: scheme.primary,
        tabBarActive: scheme.tabActive,
        notification: scheme.accent,
        textActive: scheme.textActive,
        playingColor: scheme.accent,
        fontSize: baseTheme.colors.fontSize * fontSizeMultiplier,
        headingSize: baseTheme.colors.headingSize * fontSizeMultiplier
      }
    };

    // Apply to paper theme
    const paperTheme = {
      ...paperBaseTheme,
      colors: {
        ...paperBaseTheme.colors,
        primary: scheme.primary,
        secondary: scheme.primary,
        tertiary: scheme.primary,
        tabBarActive: scheme.tabActive,
        notification: scheme.accent,
        textActive: scheme.textActive,
        playingColor: scheme.accent
      }
    };

    return { navigationTheme, paperTheme };
  };

  // Load the saved theme preference, color scheme, and font size on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Load theme preference
        const savedTheme = await GetThemePreference();
        setThemeMode(savedTheme);

        // Load color scheme
        const savedColorScheme = await GetColorScheme();
        setColorSchemeName(savedColorScheme);
        const scheme = getColorScheme(savedColorScheme);
        setColorScheme(scheme);

        // Load font size
        const savedFontSize = await GetFontSizeValue();
        setFontSize(savedFontSize);

        // Apply theme with appropriate colors and font size
        const baseTheme = savedTheme === 'light' ? lightTheme : darkTheme;
        const paperBaseTheme = savedTheme === 'light' ? PaperLightTheme : PaperDarkTheme;
        const { navigationTheme, paperTheme } = applySettingsToTheme(baseTheme, paperBaseTheme, scheme, savedFontSize);

        setTheme(navigationTheme);
        setPaperTheme(paperTheme);

        setIsThemeLoaded(true);
      } catch (error) {
        console.error('Error loading preferences:', error);
        // Default to dark theme with default color scheme and medium font if there's an error
        const defaultScheme = getColorScheme(DEFAULT_COLOR_SCHEME);
        const { navigationTheme, paperTheme } = applySettingsToTheme(darkTheme, PaperDarkTheme, defaultScheme, 'Medium');
        setTheme(navigationTheme);
        setPaperTheme(paperTheme);
        setThemeMode('dark');
        setColorSchemeName(DEFAULT_COLOR_SCHEME);
        setColorScheme(defaultScheme);
        setFontSize('Medium');
        setIsThemeLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Toggle between light and dark themes
  const toggleTheme = async () => {
    const newThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    const baseTheme = newThemeMode === 'dark' ? darkTheme : lightTheme;
    const paperBaseTheme = newThemeMode === 'dark' ? PaperDarkTheme : PaperLightTheme;
    const { navigationTheme, paperTheme } = applySettingsToTheme(baseTheme, paperBaseTheme, colorScheme, fontSize);

    setThemeMode(newThemeMode);
    setTheme(navigationTheme);
    setPaperTheme(paperTheme);

    // Save the theme preference
    await SetThemePreference(newThemeMode);
  };

  // Change color scheme
  const changeColorScheme = async (newSchemeName) => {
    const scheme = getColorScheme(newSchemeName);
    const baseTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    const paperBaseTheme = themeMode === 'dark' ? PaperDarkTheme : PaperLightTheme;
    const { navigationTheme, paperTheme } = applySettingsToTheme(baseTheme, paperBaseTheme, scheme, fontSize);

    setColorSchemeName(newSchemeName);
    setColorScheme(scheme);
    setTheme(navigationTheme);
    setPaperTheme(paperTheme);

    // Save the color scheme preference
    await SetColorScheme(newSchemeName);
  };

  // Change font size
  const changeFontSize = async (newFontSize) => {
    const baseTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    const paperBaseTheme = themeMode === 'dark' ? PaperDarkTheme : PaperLightTheme;
    const { navigationTheme, paperTheme } = applySettingsToTheme(baseTheme, paperBaseTheme, colorScheme, newFontSize);

    setFontSize(newFontSize);
    setTheme(navigationTheme);
    setPaperTheme(paperTheme);

    // Save the font size preference
    await SetFontSizeValue(newFontSize);
  };
  


  // Context value
  const contextValue = {
    theme,
    paperTheme,
    themeMode,
    colorSchemeName,
    colorScheme,
    fontSize,
    toggleTheme,
    changeColorScheme,
    changeFontSize,
    isThemeLoaded
  };

  // Support both function as children (render props) and regular children
  return (
    <ThemeContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
