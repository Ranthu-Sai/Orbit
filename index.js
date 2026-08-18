/**
 * @format
 */

// Import crypto polyfill before any other imports that might use crypto
import 'react-native-get-random-values';
import 'react-native-base64';
import { decode, encode } from 'base-64';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'EdgeInsetsPropType will be removed',
  'PointPropType will be removed',
]);

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
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './service';
TrackPlayer.registerPlaybackService(() => PlaybackService);
AppRegistry.registerComponent(appName, () => App);
