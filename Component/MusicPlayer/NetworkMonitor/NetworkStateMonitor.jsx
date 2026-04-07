import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { ToastAndroid } from 'react-native';

/**
 * NetworkStateMonitor - Manages network state monitoring for music player components
 *
 * This component provides network monitoring capabilities including:
 * - Real-time network status detection
 * - Offline/online transition handling
 * - Network type detection (WiFi, Cellular, etc.)
 * - Connection quality monitoring
 * - Error suppression in offline mode
 */

const NetworkMonitorContext = createContext();

export const NetworkStateMonitor = ({ children, showToasts = true }) => {
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
    if (state.type === 'wifi') {
      setConnectionQuality('high');
    } else if (state.type === 'cellular') {
      setConnectionQuality('medium');
    } else if (newIsConnected) {
      setConnectionQuality('low');
    } else {
      setConnectionQuality('none');
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

  // Network error suppression for offline mode
  useEffect(() => {
    if (isOffline) {
      // Add any offline-specific error handling here
    }
  }, [isOffline]);

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

  const contextValue = {
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
  };

  return (
    <NetworkMonitorContext.Provider value={contextValue}>
      {children}
    </NetworkMonitorContext.Provider>
  );
};

// Hook to use network monitor
export const useNetworkMonitor = () => {
  const context = useContext(NetworkMonitorContext);
  if (!context) {
    throw new Error(
      'useNetworkMonitor must be used within a NetworkStateMonitor'
    );
  }
  return context;
};
