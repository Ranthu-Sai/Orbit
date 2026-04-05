# Theme Manager Components

This folder contains modular, reusable components for handling theme management in the Orbit music app. The components follow a monolithic approach with code split into manageable, readable, modular, and optimized files.

## Components Overview

### 1. **ThemeManager** (`ThemeManager.jsx`)
Context provider that manages theme-related functionality for music player components.

**Features:**
- Theme mode detection (light/dark)
- Dynamic styling based on theme
- Theme-aware color management
- Gradient and overlay calculations

**Usage:**
```javascript
import { ThemeManager } from '../ThemeManager';

<ThemeManager>
  <YourComponent />
</ThemeManager>
```

### 2. **useThemeManager** (`useThemeManager.js`)
Custom hook for accessing theme management functionality.

**Features:**
- Current theme and theme mode access
- Theme-aware styling functions
- Dynamic color calculations
- Responsive theme utilities

**Usage:**
```javascript
import { useThemeManager } from '../ThemeManager';

const MyComponent = () => {
  const { 
    themeMode, 
    getTextColor, 
    getBackgroundOverlay,
    getThemeStyles 
  } = useThemeManager();
  
  return (
    <View style={{ backgroundColor: getBackgroundOverlay() }}>
      <Text style={{ color: getTextColor('primary') }}>
        Current theme: {themeMode}
      </Text>
    </View>
  );
};
```

### 3. **ThemeProvider** (`ThemeProvider.jsx`)
Wrapper component that provides theme management to child components.

**Usage:**
```javascript
import { ThemeProvider } from '../ThemeManager';

<ThemeProvider>
  <MusicPlayerComponents />
</ThemeProvider>
```

### 4. **ThemeSelector** (`ThemeSelector.jsx`)
UI component for switching between light and dark themes.

**Features:**
- Multiple variants (button, toggle, icon)
- Customizable size and styling
- Optional labels
- Theme-aware styling

**Usage:**
```javascript
import { ThemeSelector } from '../ThemeManager';

// Icon variant
<ThemeSelector variant="icon" size={24} />

// Button with label
<ThemeSelector variant="button" showLabel={true} />

// Toggle variant
<ThemeSelector variant="toggle" showLabel={true} />
```

## API Reference

### useThemeManager Hook

#### Properties
- `theme` - Current theme object
- `themeMode` - Current theme mode ('light' or 'dark')
- `isLight` - Boolean indicating if current theme is light
- `isDark` - Boolean indicating if current theme is dark

#### Methods
- `getBackgroundOverlay()` - Returns theme-appropriate background overlay color
- `getGradientColors()` - Returns array of gradient colors for current theme
- `getTextColor(type)` - Returns text color for specified type ('primary', 'secondary', 'icon')
- `getPressedBackgroundColor()` - Returns pressed state background color
- `getButtonBackgroundColor(opacity)` - Returns button background color with opacity
- `getBorderColor(opacity)` - Returns border color with opacity
- `getThemeStyles()` - Returns complete theme styles object
- `getConditionalStyle(lightStyle, darkStyle)` - Returns style based on current theme
- `getOpacityColor(baseColor, opacity)` - Adds opacity to any color

### ThemeSelector Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `style` | Object | - | Custom styles for the component |
| `size` | Number | 24 | Size of the theme icon |
| `showLabel` | Boolean | false | Whether to show theme label text |
| `variant` | String | 'button' | Component variant ('button', 'toggle', 'icon') |

## Integration with FullScreenMusic

The ThemeManager components are designed to replace theme-related logic in FullScreenMusic:

**Before:**
```javascript
const { theme, themeMode } = useThemeContext();
const backgroundOverlay = themeMode === 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.44)';
```

**After:**
```javascript
const { getBackgroundOverlay } = useThemeManager();
const backgroundOverlay = getBackgroundOverlay();
```

## File Structure

```
Component/MusicPlayer/ThemeManager/
├── index.js                    # Main exports
├── ThemeManager.jsx            # Context provider component
├── useThemeManager.js          # Custom hook
├── ThemeProvider.jsx           # Wrapper component
├── ThemeSelector.jsx           # Theme switching UI component
└── README.md                   # This documentation
```

## Benefits

1. **Modularity**: Theme logic is separated from UI components
2. **Reusability**: Can be used across different music player components
3. **Maintainability**: Centralized theme management
4. **Consistency**: Ensures consistent theme application
5. **Performance**: Optimized theme calculations and caching
