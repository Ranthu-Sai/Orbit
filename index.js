/**
 * @format
 */

// Import crypto polyfill before any other imports that might use crypto
import 'react-native-get-random-values';
import 'react-native-base64';
import { decode, encode } from 'base-64';

// Polyfill btoa and atob
if (!global.btoa) {
  global.btoa = encode;
}
if (!global.atob) {
  global.atob = decode;
}

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import * as TrackPlayer from 'react-native-track-player/lib/trackPlayer';
import { PlaybackService } from './service';
TrackPlayer.registerPlaybackService(() => PlaybackService);
AppRegistry.registerComponent(appName, () => App);
