// Fake player queue shared with the TrackPlayer mock
const mockPlayer = { queue: [], activeIndex: 0, listeners: [] };

jest.mock(
  'react-native-track-player',
  () => ({
    __esModule: true,
    default: {
      add: jest.fn(async (tracks) => {
        mockPlayer.queue.push(...(Array.isArray(tracks) ? tracks : [tracks]));
      }),
      getActiveTrackIndex: jest.fn(async () => mockPlayer.activeIndex),
      addEventListener: jest.fn((event, cb) => {
        mockPlayer.listeners.push(cb);
        return {
          remove: () => {
            mockPlayer.listeners = mockPlayer.listeners.filter((l) => l !== cb);
          },
        };
      }),
    },
    Event: { PlaybackActiveTrackChanged: 'active-track-changed' },
  }),
  { virtual: true }
);
jest.mock(
  'react-native',
  () => ({
    InteractionManager: { runAfterInteractions: (cb) => cb() },
    DeviceEventEmitter: { emit: jest.fn() },
  }),
  { virtual: true }
);
jest.mock('../MusicPlayerFunctions', () => ({
  getIndexQuality: async () => 4,
}));
jest.mock('../Utils/QueueSnapshot', () => ({
  getQueueLength: async () => mockPlayer.queue.length,
  invalidateQueueSnapshot: () => {},
}));

import EventRegister from '../Utils/EventRegister';
import loader from '../Utils/ProgressiveQueueLoader';

const settle = async () => {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

const songs = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i + 21}` }));

// Simulate the player moving to a track and firing the change event
const playIndex = async (index) => {
  mockPlayer.activeIndex = index;
  await Promise.all(mockPlayer.listeners.map((cb) => cb({ index })));
  // Let any batch load (50ms delay + setImmediate follow-up) finish
  while (loader.isLoading) {
    await new Promise((r) => setTimeout(r, 10));
  }
};

beforeEach(() => {
  mockPlayer.queue = [];
  mockPlayer.activeIndex = 0;
  mockPlayer.listeners = [];
  loader.cleanup();
});

describe('EventRegister', () => {
  test('removing by id detaches the listener', () => {
    const cb = jest.fn();
    const id = EventRegister.addEventListener('t1', cb);
    EventRegister.removeEventListener(id);
    EventRegister.emit('t1');
    expect(cb).not.toHaveBeenCalled();
  });

  test('removing by (eventName, callback) also detaches it', () => {
    const cb = jest.fn();
    const other = jest.fn();
    EventRegister.addEventListener('t2', cb);
    EventRegister.addEventListener('t2', other);
    expect(EventRegister.removeEventListener('t2', cb)).toBe(true);
    EventRegister.emit('t2');
    expect(cb).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressiveQueueLoader', () => {
  test('uses true playlist indexes and never treats song #21 as first', async () => {
    const process = jest.fn(async (song) => song);
    await loader.initialize(songs(30), process, 0, {
      indexOffset: 20,
      firstSongIsCurrent: false,
    });
    expect(process).toHaveBeenNthCalledWith(1, songs(1)[0], 20, false);
    expect(process.mock.calls.some(([, , isFirst]) => isFirst)).toBe(false);
  });

  test('skipped (null) songs do not cause re-added duplicates', async () => {
    // Every 3rd song is unplayable
    const process = jest.fn(async (song, index) =>
      index % 3 === 0 ? null : song
    );
    const res = await loader.initialize(songs(60), process, 0, {
      indexOffset: 20,
    });
    mockPlayer.queue.push(...res.initialBatch);
    await loader.loadAllRemaining();

    const ids = mockPlayer.queue.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Each source song processed exactly once
    expect(process).toHaveBeenCalledTimes(60);
  });

  test('keeps loading past 40 songs when the queue front is trimmed', async () => {
    const process = async (song) => song;
    const res = await loader.initialize(songs(80), process, 0, {
      indexOffset: 20,
    });
    mockPlayer.queue.push(...res.initialBatch); // 20 queued

    // Play through, with SmartPrefetchManager-style trimming keeping the
    // active track near index 5
    for (let step = 0; step < 80; step++) {
      if (mockPlayer.activeIndex > 5) {
        mockPlayer.queue.splice(0, mockPlayer.activeIndex - 5);
        mockPlayer.activeIndex = 5;
      }
      if (mockPlayer.activeIndex + 1 >= mockPlayer.queue.length) {
        break;
      }
      await playIndex(mockPlayer.activeIndex + 1);
    }
    expect(loader.getStatus().loadedCount).toBe(80);
  }, 30000);

  test('a superseded session is reported as stale', async () => {
    const res = await loader.initialize(songs(30), async (s) => s, 0, {
      indexOffset: 20,
    });
    expect(loader.isCurrentSession(res.session)).toBe(true);
    loader.cleanup(); // another playlist starts
    expect(loader.isCurrentSession(res.session)).toBe(false);
  });
});
