import {
  PermissionsAndroid,
  Platform,
  Linking,
  NativeModules,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

const { StoragePermissionModule } = NativeModules;

/**
 * Requests storage permission on Android when necessary.
 *
 * - Android 13+ (API 33): READ_MEDIA_AUDIO is the granular audio permission
 *   and must be requested at runtime - WRITE/READ_EXTERNAL_STORAGE no longer
 *   apply.
 * - Android 10-12 (API 29-32): no runtime permission needed to write media via
 *   MediaStore, but reading other apps' files uses READ_EXTERNAL_STORAGE.
 * - Android 9 and below (API <= 28): WRITE_EXTERNAL_STORAGE is required.
 *
 * @returns {Promise<boolean>} A promise that resolves to true if permission is granted or not needed, and false otherwise.
 */
export const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') {
    return true; // Not needed for other platforms
  }

  try {
    const apiLevel = await DeviceInfo.getApiLevel();

    if (apiLevel >= 33) {
      // READ_MEDIA_AUDIO is declared in the manifest; request it at runtime.
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        {
          title: 'Music Access Required',
          message:
            'This app needs access to your music library to play and download audio files.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (apiLevel >= 29) {
      return true; // Scoped storage - MediaStore writes need no permission
    }

    // For Android 9 and below, request permission
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message:
          'This app needs access to your storage to download songs for offline playback.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    return false;
  }
};

// Permission needed to read music files: granular audio permission on
// Android 13+, legacy storage read permission below that.
const getAudioReadPermission = () =>
  Platform.Version >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

/**
 * Check (without prompting) whether the app may read music files.
 * @returns {Promise<boolean>}
 */
export const checkAudioReadPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    return await PermissionsAndroid.check(getAudioReadPermission());
  } catch (error) {
    return false;
  }
};

/**
 * Prompt for permission to read music files.
 * @returns {Promise<'granted'|'denied'|'blocked'>} 'blocked' means the user
 *   chose "Don't ask again" and only system settings can grant it now.
 */
export const requestAudioReadPermission = async () => {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  try {
    const result = await PermissionsAndroid.request(getAudioReadPermission(), {
      title: 'Allow access to your music',
      message: 'Orbit needs access to audio files to show and play your music.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }
    return 'denied';
  } catch (error) {
    return 'denied';
  }
};

/**
 * Check if the app has All Files Access permission (MANAGE_EXTERNAL_STORAGE)
 * Required for Android 11+ to delete files in external storage
 * @returns {Promise<boolean>} True if permission is granted
 */
export const checkAllFilesAccessPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const apiLevel = await DeviceInfo.getApiLevel();

    // Only needed for Android 11+ (API 30+)
    if (apiLevel < 30) {
      return true;
    }

    // Use native module to check permission
    if (
      StoragePermissionModule &&
      StoragePermissionModule.isAllFilesAccessGranted
    ) {
      const isGranted = await StoragePermissionModule.isAllFilesAccessGranted();
      return isGranted;
    }

    // Fallback: assume not granted
    return false;
  } catch (error) {
    console.error('Error checking all files access:', error);
    return false;
  }
};

/**
 * Request All Files Access permission (MANAGE_EXTERNAL_STORAGE)
 * Opens the specific system settings page for All Files Access on Android 11+
 * @returns {Promise<boolean>} True if intent was sent
 */
export const requestAllFilesAccessPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const apiLevel = await DeviceInfo.getApiLevel();

    // Only needed for Android 11+ (API 30+)
    if (apiLevel < 30) {
      return true;
    }

    // Use native module to open the specific permission page
    if (
      StoragePermissionModule &&
      StoragePermissionModule.openAllFilesAccessSettings
    ) {
      await StoragePermissionModule.openAllFilesAccessSettings();
      return true;
    }

    // Fallback: Use Linking to open general app settings
    await Linking.openSettings();
    return true;
  } catch (error) {
    console.error('Error requesting all files access:', error);
    return false;
  }
};
