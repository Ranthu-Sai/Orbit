/* eslint-env node */
jest.mock('react-native-fs', () => ({}), { virtual: true });
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }), {
  virtual: true,
});
jest.mock('@react-native-async-storage/async-storage', () => ({}), {
  virtual: true,
});
jest.mock('../LocalStorage/AppSettings', () => ({}));
jest.mock('../Utils/FileUtils', () => ({}));

import { hashString, pathToKey, isAudioFile } from '../Utils/LocalMusicUtils';
import AudioMetadataParser from '../Utils/ID3Parser';
import FastOrbitScanner from '../Utils/FastOrbitScanner';

// Build an ID3 text frame payload: [encoding byte, ...text bytes]
const frame = (encoding, bytes) => Uint8Array.from([encoding, ...bytes]);
const latin = (s) => [...s].map((c) => c.charCodeAt(0));
const utf16le = (s) => [0xff, 0xfe, ...[...s].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8])];
const utf8 = (s) => [...Buffer.from(s, 'utf8')];

const read = (bytes) =>
  AudioMetadataParser.extractTextFrame(bytes, 0, bytes.length);

describe('LocalMusicUtils', () => {
  test('non-Latin file names get distinct keys', () => {
    const a = pathToKey('/Music/आज फिर.mp3');
    const b = pathToKey('/Music/तुम ही हो.mp3');
    expect(a).not.toEqual(b);
  });

  test('names that differ only in punctuation get distinct keys', () => {
    expect(pathToKey('/Music/My Song.mp3')).not.toEqual(
      pathToKey('/Music/My_Song.mp3')
    );
  });

  test('keys are stable and filesystem safe', () => {
    const key = pathToKey('/storage/emulated/0/Music/a b (1).mp3');
    expect(key).toEqual(pathToKey('/storage/emulated/0/Music/a b (1).mp3'));
    expect(key).toMatch(/^[A-Za-z0-9_]+$/);
    expect(hashString('x')).not.toEqual(hashString('y'));
  });

  test('audio file detection', () => {
    expect(isAudioFile('song.MP3')).toBe(true);
    expect(isAudioFile('voice.opus')).toBe(true);
    expect(isAudioFile('cover.jpg')).toBe(false);
    expect(isAudioFile(null)).toBe(false);
  });
});

describe('ID3 text frames', () => {
  test('Latin-1 single value is read in full', () => {
    expect(read(frame(0x00, latin('Alka Yagnik')))).toBe('Alka Yagnik');
  });

  test('UTF-16 single value is read in full', () => {
    expect(read(frame(0x01, utf16le('Udit Narayan')))).toBe('Udit Narayan');
  });

  test('UTF-16 multi-value (v2.4 null-separated) keeps every artist', () => {
    const bytes = frame(0x01, [
      ...utf16le('Kumar Sanu'),
      0,
      0,
      ...utf16le('Alka Yagnik'),
    ]);
    expect(read(bytes)).toBe('Kumar Sanu, Alka Yagnik');
  });

  test('Latin-1 multi-value keeps every value', () => {
    const bytes = frame(0x00, [...latin('A'), 0, ...latin('B')]);
    expect(read(bytes)).toBe('A, B');
  });

  test('UTF-8 is decoded, not read as Latin-1', () => {
    expect(read(frame(0x03, utf8('Ñoño – आज')))).toBe('Ñoño – आज');
  });

  test('trailing terminator does not add an empty value', () => {
    expect(read(frame(0x00, [...latin('Title'), 0]))).toBe('Title');
  });
});

describe('FastOrbitScanner.generateSongId', () => {
  test('uses the source id from Orbit download names', () => {
    expect(
      FastOrbitScanner.generateSongId('/x/Aksar Is Duniya Mein - 4hJ3k9AbC12.mp3')
    ).toBe('4hJ3k9AbC12');
    expect(FastOrbitScanner.generateSongId('/x/Song - 123456.flac')).toBe(
      '123456'
    );
  });

  test('a word suffix is not mistaken for an id', () => {
    const a = FastOrbitScanner.generateSongId('/x/Song One - Remix.mp3');
    const b = FastOrbitScanner.generateSongId('/x/Song Two - Remix.mp3');
    expect(a).not.toBe('Remix');
    expect(a).not.toEqual(b);
  });

  test('duplicate ids are made unique', () => {
    const songs = [
      { id: 'abc123', localSongPath: '/x/a - abc123.mp3' },
      { id: 'abc123', localSongPath: '/y/a - abc123.mp3' },
    ];
    FastOrbitScanner._ensureUniqueIds(songs);
    expect(songs[0].id).not.toEqual(songs[1].id);
  });
});
