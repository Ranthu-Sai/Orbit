# Queue Manager Components

This folder contains modular, reusable components for handling music queue management in the Orbit music app. The components follow a monolithic approach with code split into manageable, readable, modular, and optimized files.

## Components Overview

### 1. **QueueManager** (`QueueManager.jsx`)
Context provider that manages music queue operations and state.

**Features:**
- Queue filtering by source type
- Track reordering and manipulation
- Queue state management
- Offline queue handling

**Usage:**
```javascript
import { QueueManager } from '../QueueManager';

<QueueManager>
  <YourComponent />
</QueueManager>
```

### 2. **useQueueManager** (`useQueueManager.js`)
Custom hook for accessing queue management functionality.

**Features:**
- Queue state management
- Track filtering and reordering
- Offline queue handling
- Queue operations

**Usage:**
```javascript
import { useQueueManager } from '../QueueManager';

const MyComponent = () => {
  const { 
    upcomingQueue, 
    currentIndex,
    addToQueue,
    removeFromQueue,
    clearQueue 
  } = useQueueManager({
    onQueueChange: (queue) => {
      console.log('Queue changed:', queue);
    }
  });
  
  return (
    <View>
      <Text>Queue length: {upcomingQueue.length}</Text>
      <Text>Current index: {currentIndex}</Text>
    </View>
  );
};
```

### 3. **QueueOperations** (`QueueOperations.jsx`)
Handles queue operations like track selection, reordering, etc.

**Features:**
- Track selection and playback
- Queue reordering via drag and drop
- Playback state management
- Error handling for queue operations

**Usage:**
```javascript
import { QueueOperations } from '../QueueManager';
import { useQueueManager } from '../QueueManager';

const MyComponent = () => {
  const queueManager = useQueueManager();
  const queueOps = new QueueOperations(queueManager);
  
  const handleTrackSelect = (track, index) => {
    queueOps.handleTrackSelect(track, index);
  };
  
  const handleDragEnd = (params) => {
    queueOps.handleDragEnd(params);
  };
  
  return (
    // Your queue UI component
    <QueueList 
      onTrackSelect={handleTrackSelect}
      onDragEnd={handleDragEnd}
    />
  );
};
```

### 4. **QueueStateManager** (`QueueStateManager.jsx`)
Manages queue state and provides queue status information.

**Features:**
- Queue status monitoring
- State change callbacks
- Queue persistence (optional)
- Error state handling

**Usage:**
```javascript
import { QueueStateManager } from '../QueueManager';

<QueueStateManager
  onQueueChange={(queueInfo) => console.log('Queue changed:', queueInfo)}
  onQueueEmpty={(info) => console.log('Queue is empty:', info)}
  onQueueError={(error, context) => console.error('Queue error:', error)}
  persistQueue={true}
  autoRestore={true}
>
  <YourQueueComponent />
</QueueStateManager>
```

## API Reference

### useQueueManager Hook

#### Options
```javascript
const options = {
  autoInitialize: true,              // Auto-initialize queue on mount
  onQueueChange: (queue) => {},      // Callback when queue changes
  onTrackSelect: (track) => {}       // Callback when track is selected
};
```

#### Properties
- `upcomingQueue` - Array of tracks in the queue
- `currentIndex` - Index of currently playing track
- `isLocalSource` - Boolean indicating if current source is local
- `isDragging` - Boolean indicating if queue is being reordered
- `isOffline` - Boolean indicating offline status
- `isPendingAction` - Boolean indicating pending queue operation

#### Methods
- `initializeQueue()` - Initialize/refresh the queue
- `filterQueueBySource(track)` - Filter queue by source type
- `getQueueStatus()` - Get complete queue status
- `clearQueue()` - Clear the entire queue
- `addToQueue(track, position)` - Add track to queue
- `removeFromQueue(index)` - Remove track from queue
- `isLocalTrack(track)` - Check if track is local
- `getDownloadedTracks()` - Get all downloaded tracks

### QueueOperations Class

#### Constructor
```javascript
const queueOps = new QueueOperations(queueManager);
```

#### Methods
- `handleTrackSelect(item, displayIndex)` - Handle track selection
- `handleDragStart(params)` - Handle drag start event
- `handleDragEnd(params)` - Handle drag end with reordering
- `getHighQualityArtwork(artworkUrl)` - Get high quality artwork URL
- `enhanceTrackWithHighQualityArtwork(track)` - Enhance track with HQ artwork

### QueueStateManager Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onQueueChange` | Function | null | Callback when queue changes |
| `onQueueEmpty` | Function | null | Callback when queue becomes empty |
| `onQueueError` | Function | null | Callback when queue error occurs |
| `persistQueue` | Boolean | false | Whether to persist queue state |
| `autoRestore` | Boolean | false | Whether to auto-restore queue |

## Integration with FullScreenMusic

The QueueManager components are designed to replace queue-related logic in FullScreenMusic:

**Before:**
```javascript
const [upcomingQueue, setUpcomingQueue] = useState([]);
const [isDragging, setIsDragging] = useState(false);

const filterQueueBySource = async (currentTrack) => {
  // Complex filtering logic...
};

const handleTrackSelect = async (item, index) => {
  // Complex track selection logic...
};
```

**After:**
```javascript
const { upcomingQueue, isDragging } = useQueueManager();
const queueOps = new QueueOperations(useQueueManager());

const handleTrackSelect = (item, index) => {
  queueOps.handleTrackSelect(item, index);
};
```

## File Structure

```
Component/MusicPlayer/QueueManager/
├── index.js                    # Main exports
├── QueueManager.jsx            # Context provider component
├── useQueueManager.js          # Custom hook
├── QueueOperations.jsx         # Queue operations handler
├── QueueStateManager.jsx       # State management component
└── README.md                   # This documentation
```

## Benefits

1. **Separation of Concerns**: Queue logic separated from UI components
2. **Reusability**: Can be used across different queue UI implementations
3. **State Management**: Centralized queue state handling
4. **Error Handling**: Comprehensive error management for queue operations
5. **Offline Support**: Built-in offline queue handling
