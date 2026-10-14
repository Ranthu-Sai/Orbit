// In-memory filesystem shared by the RNFS mock
const mockFiles = new Map();

jest.mock(
  'react-native-fs',
  () => ({
    DocumentDirectoryPath: '/doc',
    exists: jest.fn(async (p) => mockFiles.has(p) || p === '/doc/covers'),
    mkdir: jest.fn(async () => {}),
    readFile: jest.fn(async (p) => {
      if (!mockFiles.has(p)) {
        throw new Error('ENOENT');
      }
      return mockFiles.get(p);
    }),
    writeFile: jest.fn(async (p, c) => {
      mockFiles.set(p, c);
    }),
    copyFile: jest.fn(async (a, b) => {
      mockFiles.set(b, mockFiles.get(a));
    }),
    moveFile: jest.fn(async (a, b) => {
      mockFiles.set(b, mockFiles.get(a));
      mockFiles.delete(a);
    }),
    unlink: jest.fn(async (p) => {
      mockFiles.delete(p);
    }),
  }),
  { virtual: true }
);

jest.mock(
  'react-native',
  () => ({
    InteractionManager: { runAfterInteractions: (cb) => cb() },
    NativeModules: {},
    Platform: { OS: 'android' },
  }),
  { virtual: true }
);

const mockReadToFile = jest.fn();
jest.mock('../Utils/NativeMetadataReader', () => ({
  __esModule: true,
  default: {
    readMetadataToFile: (...args) => mockReadToFile(...args),
  },
}));
jest.mock('../Utils/ID3Parser', () => ({
  __esModule: true,
  default: { extractMetadata: jest.fn(async () => null) },
}));

const MANIFEST = '/doc/local_music_manifest.json';

const loadManager = () => {
  let manager;
  jest.isolateModules(() => {
    manager =
      require('../Component/MusicPlayer/LocalTracks/LocalTracksMetadataManager').default;
  });
  return manager;
};

// Let queued background processing finish
const settle = async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
};

const track = (path, extra = {}) => ({
  path,
  title: path.split('/').pop(),
  artist: 'Unknown Artist',
  size: 100,
  mtime: 1,
  ...extra,
});

beforeEach(() => {
  mockFiles.clear();
  mockReadToFile.mockReset();
  mockReadToFile.mockImplementation(async (path) => ({
    title: `T:${path}`,
    artist: 'Alka Yagnik, Udit Narayan',
    album: 'A',
    duration: 200,
  }));
});

test('reads tags for scanned tracks via the native reader', async () => {
  const m = loadManager();
  await m.sync([track('/m/a.mp3'), track('/m/b.mp3')]);
  await settle();

  const meta = m.getMetadata(m.generateId('/m/a.mp3'));
  expect(meta.title).toBe('T:/m/a.mp3');
  expect(meta.artist).toBe('Alka Yagnik, Udit Narayan');
  expect(meta.duration).toBe(200);
  expect(JSON.parse(mockFiles.get(MANIFEST)).version).toBe(2);
});

test('a partial scan (prune: false) keeps existing metadata', async () => {
  const m = loadManager();
  await m.sync([track('/m/a.mp3'), track('/m/b.mp3')]);
  await settle();

  await m.sync([track('/m/a.mp3')], { prune: false });
  await settle();
  expect(m.getMetadata(m.generateId('/m/b.mp3'))).toBeTruthy();

  // A complete scan does remove files that are gone
  await m.sync([track('/m/a.mp3')], { prune: true });
  expect(m.getMetadata(m.generateId('/m/b.mp3'))).toBeUndefined();
});

test('failed reads are retried on later syncs, up to the limit', async () => {
  mockReadToFile.mockImplementation(async () => {
    throw new Error('io');
  });
  const m = loadManager();
  const t = track('/m/bad.mp3');
  const id = m.generateId(t.path);

  for (let i = 0; i < 5; i++) {
    await m.sync([t]);
    await settle();
  }
  // 3 attempts total, then it stops retrying
  expect(m.getMetadata(id).attempts).toBe(3);
  expect(mockReadToFile).toHaveBeenCalledTimes(3);
});

test('a changed file (size/mtime) is read again', async () => {
  const m = loadManager();
  await m.sync([track('/m/a.mp3')]);
  await settle();
  expect(mockReadToFile).toHaveBeenCalledTimes(1);

  await m.sync([track('/m/a.mp3')]);
  await settle();
  expect(mockReadToFile).toHaveBeenCalledTimes(1);

  await m.sync([track('/m/a.mp3', { size: 999 })]);
  await settle();
  expect(mockReadToFile).toHaveBeenCalledTimes(2);
});

test('reprocessAll re-reads every track (not just one)', async () => {
  const m = loadManager();
  const tracks = [track('/m/a.mp3'), track('/m/b.mp3'), track('/m/c.mp3')];
  await m.sync(tracks);
  await settle();
  mockReadToFile.mockClear();

  await m.reprocessAll();
  await settle();
  expect(mockReadToFile).toHaveBeenCalledTimes(3);
});

test('old unversioned manifests are re-keyed and re-read once', async () => {
  mockFiles.set(
    MANIFEST,
    JSON.stringify({
      _m_a_mp3: {
        path: '/m/a.mp3',
        title: 'Old cut titl',
        artist: 'Alka Ya',
        isProcessed: true,
      },
    })
  );
  const m = loadManager();
  await m.sync([track('/m/a.mp3')]);
  await settle();

  const meta = m.getMetadata(m.generateId('/m/a.mp3'));
  expect(meta.artist).toBe('Alka Yagnik, Udit Narayan');
});

test('a corrupt manifest is recovered from the backup, not wiped', async () => {
  mockFiles.set(MANIFEST, '{ not json');
  mockFiles.set(
    '/doc/local_music_manifest.backup.json',
    JSON.stringify({
      version: 2,
      entries: {
        x: { path: '/m/a.mp3', title: 'Kept', isProcessed: true, size: 100, mtime: 1 },
      },
    })
  );
  const m = loadManager();
  await m.initialize();
  expect(m.getMetadata(m.generateId('/m/a.mp3')).title).toBe('Kept');
  expect(mockFiles.has(`${MANIFEST}.corrupt`)).toBe(true);
});
