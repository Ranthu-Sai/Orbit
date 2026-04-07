import NetInfo from '@react-native-community/netinfo';
import React from 'react';
import { ToastAndroid } from 'react-native';

/**
 * Shared network utilities to eliminate duplication across components
 */

// Network connection types
export const ConnectionTypes = {
  NONE: 'none',
  UNKNOWN: 'unknown',
  CELLULAR: 'cellular',
  WIFI: 'wifi',
  ETHERNET: 'ethernet',
  BLUETOOTH: 'bluetooth',
  WIMAX: 'wimax',
};

// Connection quality levels
export const ConnectionQuality = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXCELLENT: 'excellent',
};

// Network state interface
class NetworkState {
  constructor() {
    this.isConnected = true;
    this.isOffline = false;
    this.connectionType = ConnectionTypes.UNKNOWN;
    this.connectionQuality = ConnectionQuality.UNKNOWN;
    this.isInternetReachable = true;
    this.details = {};
    this.lastUpdate = Date.now();
  }

  /**
   * Update network state
   * @param {Object} state - New network state
   */
  update(state) {
    this.isConnected = state.isConnected && state.isInternetReachable;
    this.isOffline = !this.isConnected;
    this.connectionType = state.type || ConnectionTypes.UNKNOWN;
    this.isInternetReachable = state.isInternetReachable;
    this.details = state.details || {};
    this.lastUpdate = Date.now();

    // Determine connection quality based on type
    this.connectionQuality = this.determineConnectionQuality();
  }

  /**
   * Determine connection quality based on type and other factors
   * @returns {string} Connection quality
   */
  determineConnectionQuality() {
    if (!this.isConnected) {
      return ConnectionQuality.NONE;
    }

    switch (this.connectionType) {
      case ConnectionTypes.WIFI:
        return ConnectionQuality.EXCELLENT;
      case ConnectionTypes.ETHERNET:
        return ConnectionQuality.EXCELLENT;
      case ConnectionTypes.CELLULAR:
        // Could be enhanced to check cellular generation (3G, 4G, 5G)
        return ConnectionQuality.HIGH;
      case ConnectionTypes.BLUETOOTH:
        return ConnectionQuality.MEDIUM;
      case ConnectionTypes.WIMAX:
        return ConnectionQuality.HIGH;
      default:
        return ConnectionQuality.MEDIUM;
    }
  }

  /**
   * Check if connection is suitable for streaming
   * @returns {boolean} True if suitable for streaming
   */
  canStreamMusic() {
    return (
      this.isConnected &&
      this.isInternetReachable &&
      this.connectionQuality !== ConnectionQuality.NONE
    );
  }

  /**
   * Check if connection is high quality
   * @returns {boolean} True if high quality connection
   */
  isHighQualityConnection() {
    return (
      this.connectionQuality === ConnectionQuality.EXCELLENT ||
      this.connectionQuality === ConnectionQuality.HIGH
    );
  }

  /**
   * Get connection description for display
   * @returns {string} Human-readable connection description
   */
  getConnectionDescription() {
    if (this.isOffline) {
      return 'Offline';
    }
    if (!this.isInternetReachable) {
      return 'No Internet';
    }

    switch (this.connectionType) {
      case ConnectionTypes.WIFI:
        return 'WiFi';
      case ConnectionTypes.CELLULAR:
        return 'Mobile Data';
      case ConnectionTypes.ETHERNET:
        return 'Ethernet';
      case ConnectionTypes.BLUETOOTH:
        return 'Bluetooth';
      case ConnectionTypes.WIMAX:
        return 'WiMax';
      default:
        return this.isConnected ? 'Connected' : 'Disconnected';
    }
  }

  /**
   * Get network status object
   * @returns {Object} Current network status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isOffline: this.isOffline,
      connectionType: this.connectionType,
      connectionQuality: this.connectionQuality,
      isInternetReachable: this.isInternetReachable,
      canStreamMusic: this.canStreamMusic(),
      isHighQualityConnection: this.isHighQualityConnection(),
      description: this.getConnectionDescription(),
      lastUpdate: this.lastUpdate,
      details: this.details,
    };
  }
}

// Create singleton network state instance
const networkState = new NetworkState();

/**
 * Network monitor class for centralized monitoring
 */
class NetworkMonitor {
  constructor() {
    this.listeners = new Set();
    this.isInitialized = false;
    this.unsubscribe = null;
  }

  /**
   * Initialize network monitoring
   * @param {Object} options - Monitoring options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return true;
    }

    try {
      const { showToasts = true, onConnectionChange = null } = options;

      // Get initial network state
      const initialState = await NetInfo.fetch();
      networkState.update(initialState);

      // Set up event listener
      this.unsubscribe = NetInfo.addEventListener((state) => {
        const previousStatus = networkState.getStatus();
        networkState.update(state);

        const currentStatus = networkState.getStatus();

        // Notify listeners
        this.notifyListeners({
          previousStatus,
          currentStatus,
          stateChange: {
            wasOffline: previousStatus.isOffline,
            isOffline: currentStatus.isOffline,
            wasConnected: previousStatus.isConnected,
            isConnected: currentStatus.isConnected,
          },
        });

        // Show toast notifications if enabled
        if (showToasts) {
          this.handleConnectionChangeToast(previousStatus, currentStatus);
        }

        // Call custom handler if provided
        if (onConnectionChange) {
          onConnectionChange(currentStatus, previousStatus);
        }
      });

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('NetworkMonitor: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Handle connection change toast notifications
   * @param {Object} previousStatus - Previous network status
   * @param {Object} currentStatus - Current network status
   */
  handleConnectionChangeToast(previousStatus, currentStatus) {
    try {
      if (previousStatus.isOffline && currentStatus.isConnected) {
        ToastAndroid.show(
          'Back online! Music streaming available.',
          ToastAndroid.SHORT
        );
      } else if (!previousStatus.isOffline && currentStatus.isOffline) {
        ToastAndroid.show(
          'You are offline. Playing downloaded music only.',
          ToastAndroid.SHORT
        );
      }
    } catch (error) {
      console.error('Error showing connection toast:', error);
    }
  }

  /**
   * Add network state change listener
   * @param {Function} listener - Listener function
   * @returns {Function} Unsubscribe function
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove network state change listener
   * @param {Function} listener - Listener function to remove
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @param {Object} data - State change data
   */
  notifyListeners(data) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Get current network status
   * @returns {Object} Current network status
   */
  getCurrentStatus() {
    return networkState.getStatus();
  }

  /**
   * Refresh network state
   * @returns {Promise<Object>} Updated network status
   */
  async refresh() {
    try {
      const state = await NetInfo.refresh();
      networkState.update(state);
      return networkState.getStatus();
    } catch (error) {
      console.error('Error refreshing network state:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Create singleton network monitor instance
export const networkMonitor = new NetworkMonitor();

/**
 * React hook for using network monitor
 * @param {Object} options - Hook options
 * @returns {Object} Network state and utilities
 */
export const useNetworkMonitor = (options = {}) => {
  const { autoInitialize = true } = options;

  // Initialize network monitor if not already done
  React.useEffect(() => {
    if (autoInitialize && !networkMonitor.isInitialized) {
      networkMonitor.initialize(options).catch((error) => {
        console.error('Failed to auto-initialize network monitor:', error);
      });
    }
  }, [autoInitialize]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Don't cleanup here as network monitor is singleton
      // Components should not cleanup shared resources
    };
  }, []);

  return {
    ...networkState.getStatus(),
    refresh: networkMonitor.refresh.bind(networkMonitor),
    addListener: networkMonitor.addListener.bind(networkMonitor),
    removeListener: networkMonitor.removeListener.bind(networkMonitor),
  };
};

/**
 * Check if device can reach internet
 * @returns {Promise<boolean>} True if internet is reachable
 */
export const isInternetReachable = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable;
  } catch (error) {
    console.error('Error checking internet reachability:', error);
    return false;
  }
};

/**
 * Get detailed network information
 * @returns {Promise<Object>} Detailed network info
 */
export const getNetworkInfo = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      ...state,
      quality: networkState.determineConnectionQuality(),
      canStream: state.isConnected && state.isInternetReachable,
      description: networkState.getConnectionDescription(),
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: ConnectionTypes.UNKNOWN,
      quality: ConnectionQuality.NONE,
      canStream: false,
      description: 'Unknown',
    };
  }
};

/**
 * Wait for network connection
 * @param {Object} options - Wait options
 * @returns {Promise<boolean>} True if connection established
 */
export const waitForConnection = async (options = {}) => {
  const {
    timeout = 30000,
    checkInterval = 1000,
    requireHighQuality = false,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = networkState.getStatus();

    if (status.isConnected && status.isInternetReachable) {
      if (requireHighQuality && !status.isHighQualityConnection()) {
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        continue;
      }

      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false;
};

/**
 * Network-dependent operation wrapper
 * @param {Function} operation - Operation to execute when online
 * @param {Object} options - Wrapper options
 * @returns {Promise<any>} Operation result or error
 */
export const withNetworkCheck = async (operation, options = {}) => {
  const {
    requireConnection = true,
    requireHighQuality = false,
    fallbackOperation = null,
    errorMessage = 'Network connection required',
  } = options;

  const status = networkState.getStatus();

  if (requireConnection && !status.canStreamMusic()) {
    if (fallbackOperation) {
      return await fallbackOperation();
    }
    throw new Error(errorMessage);
  }

  if (requireHighQuality && !status.isHighQualityConnection()) {
    if (fallbackOperation) {
      return await fallbackOperation();
    }
    throw new Error('High quality connection required');
  }

  return await operation();
};
