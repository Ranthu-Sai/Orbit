import { PermissionsAndroid, Platform, Alert } from 'react-native';
import DeviceInfo from 'react-native-device-info';

/**
 * PermissionHandler - Manages storage permissions for different Android versions
 * Handles the complexity of Android permission requirements across different API levels
 */
export class PermissionHandler {
  
  /**
   * Requests storage permission based on Android version
   * @returns {Promise<boolean>} - True if permission granted or not needed, false otherwise
   */
  static async requestStoragePermission() {
    try {
      // iOS doesn't need explicit permissions for app-specific storage
      if (Platform.OS === 'ios') {
        return true;
      }

      // For Android, check version
      const deviceVersion = DeviceInfo.getSystemVersion();
      if (parseInt(deviceVersion) >= 13) {
        // Android 13+ uses scoped storage, no need for permissions
        return true;
      } else {
        // For older Android, request storage permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission",
            message: "Orbit needs storage access to save music for offline playback",
            buttonPositive: "Allow",
            buttonNegative: "Cancel"
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert(
            "Permission Denied",
            "Storage permission is required to download songs. Please enable it in app settings."
          );
          return false;
        }
      }
    } catch (versionError) {
      console.error("Error detecting device version:", versionError);
      // Fallback - try anyway, it might work with app-specific storage
      return true;
    }
  }

  /**
   * Checks if storage permission is available without requesting
   * @returns {Promise<boolean>} - True if permission is available
   */
  static async hasStoragePermission() {
    try {
      if (Platform.OS === 'ios') {
        return true;
      }

      const deviceVersion = DeviceInfo.getSystemVersion();
      
      if (parseInt(deviceVersion) >= 13) {
        return true; // No permission needed for Android 13+
      } else {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        return hasPermission;
      }
    } catch (error) {
      console.error("Error checking storage permission:", error);
      return false;
    }
  }

  /**
   * Gets the appropriate storage directory path based on platform and Android version
   * @returns {string} - Storage directory path
   */
  static getStorageDirectory() {
    // For now, we'll use the app-specific directory which works across all versions
    // This can be extended later to use different paths based on requirements
    return 'app-specific'; // Placeholder - actual path will be handled by StorageManager
  }
}
