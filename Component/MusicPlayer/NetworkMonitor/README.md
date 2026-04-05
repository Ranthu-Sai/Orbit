# Network Monitor Components

This folder contains modular, reusable components for handling network state monitoring in the Orbit music app. The components follow a monolithic approach with code split into manageable, readable, modular, and optimized files.

## Components Overview

### 1. **NetworkStateMonitor** (`NetworkStateMonitor.jsx`)
Context provider that manages network state monitoring for music player components.

**Features:**
- Real-time network status detection
- Offline/online transition handling
- Network type detection (WiFi, Cellular, etc.)
- Connection quality monitoring
- Error suppression in offline mode

**Usage:**
```javascript
import { NetworkStateMonitor } from '../NetworkMonitor';

<NetworkStateMonitor showToasts={true}>
  <YourComponent />
</NetworkStateMonitor>
```

### 2. **useNetworkMonitor** (`useNetworkMonitor.js`)
Custom hook for accessing network monitoring functionality.

**Features:**
- Real-time network status detection
- Connection utilities and quality detection
- Custom connection change handlers
- Network state refresh capability

**Usage:**
```javascript
import { useNetworkMonitor } from '../NetworkMonitor';

const MyComponent = () => {
  const { 
    isConnected, 
    isOffline, 
    connectionType,
    canStreamMusic,
    getConnectionDescription 
  } = useNetworkMonitor({
    showToasts: true,
    onConnectionChange: (state) => {
      console.log('Connection changed:', state);
    }
  });
  
  return (
    <View>
      <Text>Status: {getConnectionDescription()}</Text>
      <Text>Can stream: {canStreamMusic() ? 'Yes' : 'No'}</Text>
    </View>
  );
};
```

### 3. **NetworkStatusIndicator** (`NetworkStatusIndicator.jsx`)
Visual component showing current network status.

**Features:**
- Multiple display variants (full, compact, icon-only)
- Theme-aware styling
- Interactive refresh capability
- Connection quality visualization

**Usage:**
```javascript
import { NetworkStatusIndicator } from '../NetworkMonitor';

// Full variant with text and icon
<NetworkStatusIndicator variant="full" size="medium" />

// Compact variant
<NetworkStatusIndicator variant="compact" showText={true} />

// Icon only
<NetworkStatusIndicator variant="icon-only" size="small" />
```

### 4. **ConnectionHandler** (`ConnectionHandler.jsx`)
Handles network connection events and side effects.

**Features:**
- Connection change callbacks
- Error suppression in offline mode
- Automatic retry mechanisms
- Network-dependent feature toggling

**Usage:**
```javascript
import { ConnectionHandler } from '../NetworkMonitor';

<ConnectionHandler
  onOnline={(state) => console.log('Back online:', state)}
  onOffline={(state) => console.log('Gone offline:', state)}
  suppressOfflineErrors={true}
  enableAutoRetry={true}
  retryInterval={30000}
>
  <YourComponent />
</ConnectionHandler>
```

## API Reference

### useNetworkMonitor Hook

#### Options
```javascript
const options = {
  showToasts: true,              // Show connection change toasts
  enableQualityDetection: true,  // Enable connection quality detection
  onConnectionChange: (state) => {} // Custom connection change handler
};
```

#### Properties
- `isConnected` - Boolean indicating if device is connected to internet
- `isOffline` - Boolean indicating if device is offline
- `connectionType` - String indicating connection type ('wifi', 'cellular', etc.)
- `connectionQuality` - String indicating quality ('high', 'medium', 'low', 'none')
- `isInternetReachable` - Boolean indicating if internet is reachable

#### Methods
- `getNetworkStatus()` - Returns complete network status object
- `isHighQualityConnection()` - Returns true if connection is high quality
- `canStreamMusic()` - Returns true if music streaming is possible
- `shouldUseOfflineMode()` - Returns true if offline mode should be used
- `getConnectionDescription()` - Returns human-readable connection description
- `refreshNetworkState()` - Manually refresh network state

### NetworkStatusIndicator Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `style` | Object | - | Custom styles for the component |
| `showText` | Boolean | true | Whether to show connection text |
| `showIcon` | Boolean | true | Whether to show connection icon |
| `variant` | String | 'full' | Display variant ('full', 'compact', 'icon-only') |
| `onPress` | Function | null | Custom press handler (defaults to refresh) |
| `size` | String | 'medium' | Component size ('small', 'medium', 'large') |

### ConnectionHandler Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onOnline` | Function | null | Callback when connection comes online |
| `onOffline` | Function | null | Callback when connection goes offline |
| `onConnectionChange` | Function | null | Callback for any connection change |
| `suppressOfflineErrors` | Boolean | true | Suppress network errors when offline |
| `enableAutoRetry` | Boolean | false | Enable automatic connection retry |
| `retryInterval` | Number | 30000 | Retry interval in milliseconds |

## Integration with FullScreenMusic

The NetworkMonitor components are designed to replace network-related logic in FullScreenMusic:

**Before:**
```javascript
const [isOffline, setIsOffline] = useState(false);

useEffect(() => {
  const checkConnection = async () => {
    const state = await NetInfo.fetch();
    setIsOffline(!state.isConnected);
  };
  // ... more network logic
}, []);
```

**After:**
```javascript
const { isOffline, canStreamMusic } = useNetworkMonitor();
```

## File Structure

```
Component/MusicPlayer/NetworkMonitor/
├── index.js                      # Main exports
├── NetworkStateMonitor.jsx       # Context provider component
├── useNetworkMonitor.js          # Custom hook
├── NetworkStatusIndicator.jsx    # Status display component
├── ConnectionHandler.jsx         # Connection event handler
└── README.md                     # This documentation
```

## Benefits

1. **Real-time Monitoring**: Continuous network state tracking
2. **Error Handling**: Automatic error suppression in offline mode
3. **User Feedback**: Visual indicators and toast notifications
4. **Modularity**: Separate concerns for different network aspects
5. **Flexibility**: Multiple usage patterns and customization options
