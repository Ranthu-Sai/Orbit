import { PermissionsAndroid, Platform, Linking, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const { StoragePermissionModule } = NativeModules;

/**
 * Requests storage permission on Android when necessary.
 * For Android 10 (API 29) and above, no permission is needed for saving to public media directories.
 * For Android 9 (API 28) and below, WRITE_EXTERNAL_STORAGE is required.
 * @returns {Promise<boolean>} A promise that resolves to true if permission is granted or not needed, and false otherwise.
 */
export const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') {
    return true; // Not needed for other platforms
  }

  try {
    const apiLevel = await DeviceInfo.getApiLevel();

    if (apiLevel >= 29) {
      return true; // No permission needed for Android 10+
    }

    // For Android 9 and below, request permission
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Storage Permission Required',
        message: 'This app needs access to your storage to download songs for offline playback.',
        buttonPositive: 'Allow',
        buttonNegative: 'Cancel',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    return false;
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
    if (StoragePermissionModule && StoragePermissionModule.isAllFilesAccessGranted) {
      const isGranted = await StoragePermissionModule.isAllFilesAccessGranted();
      console.log('[PermissionManager] All Files Access granted:', isGranted);
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
    if (StoragePermissionModule && StoragePermissionModule.openAllFilesAccessSettings) {
      await StoragePermissionModule.openAllFilesAccessSettings();
      console.log('[PermissionManager] Opened All Files Access settings via native module');
      return true;
    }

    // Fallback: Use Linking to open general app settings
    await Linking.openSettings();
    console.log('[PermissionManager] Opened general app settings (fallback)');
    return true;
  } catch (error) {
    console.error('Error requesting all files access:', error);
    return false;
  }
};
