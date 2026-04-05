// Default settings configuration
export const settingsConfig = {
  // Font size options
  fontSizes: [
    { label: 'Small', value: 'Small' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Large', value: 'Large' },
  ],

  // Playback quality options (in kbps)
  playbackQualities: [
    { label: '(160 kbps)', value: '160kbps' },
    { label: '(320 kbps)', value: '320kbps' },
  ],

  // YTMusic Quality options
  ytMusicQualities: [
    { label: 'Auto', value: 'Auto' },
    { label: 'High Quality', value: 'High' },
  ],

  // Download path options
  downloadPaths: [
    { label: 'Music', value: 'Music' },
    { label: 'Downloads', value: 'Downloads' },
  ],

  // Home Feed Source options
  homeFeedSources: [
    { label: 'Hybrid (Both)', value: 'Hybrid' },
    { label: 'Saavn Only', value: 'Saavn' },
    { label: 'YTMusic Only', value: 'YTMusic' },
  ],

  // Lyrics provider options
  lyricsProviders: [
    { label: 'LrcLib (Default)', value: 'LrcLib' },
    { label: 'BetterLyrics', value: 'BetterLyrics' },
    { label: 'Official YTMusic', value: 'YTMusic' },
  ],

  // Lyrics animation styles
  lyricsAnimationStyles: [
    { label: 'Smooth (Default)', value: 'Smooth' },
    { label: 'Fade', value: 'Fade' },
    { label: 'None', value: 'None' },
  ],

  // Default values
  defaults: {
    fontSize: 'Medium',
    playbackQuality: '320kbps',
    downloadPath: 'Downloads',
    themePreference: 'dark',
    colorScheme: 'default',
    musicSource: 'Ytmusic',
    homeFeedSource: 'Hybrid',
    ytmQuality: 'Auto',
    lyricsProvider: 'LrcLib',
    lyricsAnimationStyle: 'Smooth',
  },
};

export default settingsConfig;
