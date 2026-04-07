import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { ToastAndroid } from 'react-native';

/**
 * useNetworkMonitor - Custom hook for network state monitoring
 *
 * This hook provides network monitoring capabilities including:
 * - Real-time network status detection
 * - Offline/online transition handling
 * - Network type and quality detection
 * - Connection utilities
 */

export const useNetworkMonitor = (options = {}) => {
  const {
    showToasts = true,
    enableQualityDetection = true,
    onConnectionChange = null,
  } = options;

  const [isConnected, setIsConnected] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [previousConnectionState, setPreviousConnectionState] = useState(null);

  // Network state change handler
  const handleNetworkStateChange = (state) => {
    const wasOffline = isOffline;
    const newIsConnected = state.isConnected && state.isInternetReachable;
    const newIsOffline = !newIsConnected;

    // Update all network states
    setIsConnected(newIsConnected);
    setIsOffline(newIsOffline);
    setConnectionType(state.type || 'unknown');
    setIsInternetReachable(state.isInternetReachable);

    // Set connection quality based on connection type
    if (enableQualityDetection) {
      if (state.type === 'wifi') {
        setConnectionQuality('high');
      } else if (state.type === 'cellular') {
        setConnectionQuality('medium');
      } else if (newIsConnected) {
        setConnectionQuality('low');
      } else {
        setConnectionQuality('none');
      }
    }

    // Show toast notifications for connection changes
    if (showToasts && previousConnectionState !== null) {
      if (wasOffline && newIsConnected) {
        ToastAndroid.show(
          'Back online! Music streaming available.',
          ToastAndroid.SHORT
        );
      } else if (!wasOffline && newIsOffline) {
        ToastAndroid.show(
          'You are offline. Playing downloaded music only.',
          ToastAndroid.SHORT
        );
      }
    }

    // Call custom connection change handler
    if (onConnectionChange) {
      onConnectionChange({
        isConnected: newIsConnected,
        isOffline: newIsOffline,
        connectionType: state.type,
        wasOffline,
        connectionQuality: enableQualityDetection
          ? connectionQuality
          : 'unknown',
      });
    }

    setPreviousConnectionState(newIsConnected);
  };

  // Initialize network monitoring
  useEffect(() => {
    let unsubscribe;

    const initializeNetworkMonitoring = async () => {
      try {
        // Get initial network state
        const initialState = await NetInfo.fetch();
        handleNetworkStateChange(initialState);

        // Subscribe to network state changes
        unsubscribe = NetInfo.addEventListener(handleNetworkStateChange);
      } catch (error) {
        console.error('Error initializing network monitoring:', error);
        // Fallback to offline mode if network detection fails
        setIsConnected(false);
        setIsOffline(true);
        setConnectionType('unknown');
        setConnectionQuality('none');
      }
    };

    initializeNetworkMonitoring();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Utility functions
  const getNetworkStatus = () => ({
    isConnected,
    isOffline,
    connectionType,
    connectionQuality,
    isInternetReachable,
  });

  const isHighQualityConnection = () => {
    return connectionQuality === 'high' && isConnected;
  };

  const canStreamMusic = () => {
    return isConnected && isInternetReachable;
  };

  const shouldUseOfflineMode = () => {
    return isOffline || !isInternetReachable;
  };

  const getConnectionDescription = () => {
    if (isOffline) {
      return 'Offline';
    }
    if (!isInternetReachable) {
      return 'No Internet';
    }

    switch (connectionType) {
      case 'wifi':
        return 'WiFi';
      case 'cellular':
        return 'Mobile Data';
      case 'ethernet':
        return 'Ethernet';
      default:
        return isConnected ? 'Connected' : 'Disconnected';
    }
  };

  const refreshNetworkState = async () => {
    try {
      const state = await NetInfo.fetch();
      handleNetworkStateChange(state);
    } catch (error) {
      console.error('Error refreshing network state:', error);
    }
  };

  return {
    // State
    isConnected,
    isOffline,
    connectionType,
    connectionQuality,
    isInternetReachable,

    // Utility functions
    getNetworkStatus,
    isHighQualityConnection,
    canStreamMusic,
    shouldUseOfflineMode,
    getConnectionDescription,
    refreshNetworkState,
  };
};
