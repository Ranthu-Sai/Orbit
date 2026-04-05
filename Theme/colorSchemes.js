// Color scheme presets for the app
// Each scheme defines colors for icons, text, tabs, and accent (used for playing songs)

export const colorSchemes = {
  // Default scheme (now steel blue)
  green: {
    name: 'Steel Blue',
    primary: '#4a6e8d',
    iconActive: '#4a6e8d',
    textActive: '#4a6e8d',
    tabActive: '#4a6e8d',
    accent: '#4a6e8d',
  },
  // Blue scheme
  blue: {
    name: 'Blue',
    primary: '#4A90E2',
    iconActive: '#4A90E2',
    textActive: '#4A90E2',
    tabActive: '#4A90E2',
    accent: '#4A90E2',
  },
  // Purple scheme
  purple: {
    name: 'Purple',
    primary: '#9C27B0',
    iconActive: '#9C27B0',
    textActive: '#9C27B0',
    tabActive: '#9C27B0',
    accent: '#9C27B0',
  },
  // Teal scheme
  teal: {
    name: 'Teal',
    primary: '#009688',
    iconActive: '#009688',
    textActive: '#009688',
    tabActive: '#009688',
    accent: '#009688',
  },
  // Orange scheme
  orange: {
    name: 'Orange',
    primary: '#FF9800',
    iconActive: '#FF9800',
    textActive: '#FF9800',
    tabActive: '#FF9800',
    accent: '#FF9800',
  },
  // Pink scheme
  pink: {
    name: 'Pink',
    primary: '#E91E63',
    iconActive: '#E91E63',
    textActive: '#E91E63',
    tabActive: '#E91E63',
    accent: '#E91E63',
  },
  // Red scheme
  red: {
    name: 'Red',
    primary: '#F44336',
    iconActive: '#F44336',
    textActive: '#F44336',
    tabActive: '#F44336',
    accent: '#F44336',
  },
  // Amber scheme
  amber: {
    name: 'Amber',
    primary: '#FFC107',
    iconActive: '#FFC107',
    textActive: '#FFC107',
    tabActive: '#FFC107',
    accent: '#FFC107',
  },
};

// Available colors for custom color picker
export const availableColors = [
  // Blues
  { name: 'Steel Blue', value: '#4a6e8d' },
  { name: 'Light Blue', value: '#a4c8e1' },
  { name: 'Blue', value: '#4A90E2' },
  { name: 'Sky Blue', value: '#00BCD4' },
  { name: 'Navy', value: '#3498DB' },

  // Greens
  { name: 'Green', value: '#6CC04A' },
  { name: 'Emerald', value: '#2ECC71' },
  { name: 'Mint', value: '#00B894' },

  // Purples
  { name: 'Purple', value: '#9C27B0' },
  { name: 'Lavender', value: '#9B59B6' },
  { name: 'Violet', value: '#8E44AD' },

  // Reds
  { name: 'Red', value: '#F44336' },
  { name: 'Crimson', value: '#E74C3C' },
  { name: 'Maroon', value: '#C0392B' },

  // Oranges
  { name: 'Orange', value: '#FF9800' },
  { name: 'Coral', value: '#FF7F50' },
  { name: 'Amber', value: '#FFC107' },

  // Pinks
  { name: 'Pink', value: '#E91E63' },
  { name: 'Rose', value: '#FF4081' },
  { name: 'Magenta', value: '#D81B60' },

  // Others
  { name: 'Teal', value: '#009688' },
  { name: 'Cyan', value: '#00BCD4' },
  { name: 'Indigo', value: '#3F51B5' },
  { name: 'Grey', value: '#607D8B' },
  { name: 'Black', value: '#000000' },
];

// Default color scheme key
export const DEFAULT_COLOR_SCHEME = 'green';

// Get a specific color scheme
export const getColorScheme = (schemeName) => {
  return colorSchemes[schemeName] || colorSchemes[DEFAULT_COLOR_SCHEME];
};

// Get color scheme options for dropdown
export const getColorSchemeOptions = () => {
  return Object.keys(colorSchemes).map((key) => ({
    value: key,
    label: colorSchemes[key].name,
  }));
};
