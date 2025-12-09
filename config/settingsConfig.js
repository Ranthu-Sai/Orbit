// Default settings configuration
export const settingsConfig = {
  // Font size options
  fontSizes: [
    { label: 'Small', value: 'Small' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Large', value: 'Large' }
  ],
  
  // Playback quality options (in kbps)
  playbackQualities: [
    { label: '(48 kbps)', value: '48kbps' },
    { label: '(96 kbps)', value: '96kbps' },
    { label: '(160 kbps)', value: '160kbps' },
    { label: '(320 kbps)', value: '320kbps' }
  ],
  
  // Download path options
  downloadPaths: [
    { label: 'Music', value: 'Music' },
    { label: 'Downloads', value: 'Downloads' }
  ],

  // Music source options
  musicSources: [
    { label: 'Ytmusic', value: 'Ytmusic' },
    { label: 'Savaan', value: 'Savaan' }
  ],

  // Default values
  defaults: {
    fontSize: 'Medium',
    playbackQuality: '320kbps',
    downloadPath: 'Downloads',
    themePreference: 'dark',
    colorScheme: 'default',
    musicSource: 'Ytmusic'
  }
};

export default settingsConfig;
