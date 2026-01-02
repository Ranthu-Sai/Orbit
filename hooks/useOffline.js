import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';
import { isOfflineMode, setOfflineMode } from '../Api/CacheManager';

/**
 * Custom hook for managing offline state and network detection
 * Provides centralized offline state management across the app
 */
const useOffline = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState(null);

  // Check initial network state
  const checkInitialConnection = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      const connected = networkState.isConnected && networkState.isInternetReachable;
      
      // Update both local and global offline state
      setOfflineMode(!connected);
      setIsOffline(!connected);
      setIsConnected(connected);
      setNetworkType(networkState.type);
      return connected;
    } catch (error) {
      console.error('Error checking initial network status:', error);
      // Assume offline if there's an error
      setOfflineMode(true);
      setIsOffline(true);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Handle network state changes
  const handleNetworkChange = useCallback((state) => {
    try {
      const connected = state.isConnected && state.isInternetReachable;
      const previousOfflineState = isOffline;
      
      // Update both local and global offline state
      setOfflineMode(!connected);
      setIsOffline(!connected);
      setIsConnected(connected);
      setNetworkType(state.type);
      // Emit events for other components to listen to
      DeviceEventEmitter.emit('networkStateChanged', {
        isOffline: !connected,
        isConnected: connected,
        networkType: state.type,
        previousOfflineState,
        transitionType: !connected && !previousOfflineState ? 'online-to-offline' : 
                       connected && previousOfflineState ? 'offline-to-online' : 'no-change'
      });
      
      return connected;
    } catch (error) {
      console.error('Error handling network change:', error);
      return false;
    }
  }, [isOffline]);

  // Force refresh network state
  const refreshNetworkState = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      return handleNetworkChange(networkState);
    } catch (error) {
      console.error('Error refreshing network state:', error);
      return false;
    }
  }, [handleNetworkChange]);

  // Get current offline mode from cache manager
  const getCurrentOfflineMode = useCallback(() => {
    return isOfflineMode();
  }, []);

  // Manually set offline mode (useful for testing or forced offline mode)
  const setManualOfflineMode = useCallback((offline) => {
    setOfflineMode(offline);
    setIsOffline(offline);
    setIsConnected(!offline);
    
    // Emit event for other components
    DeviceEventEmitter.emit('networkStateChanged', {
      isOffline: offline,
      isConnected: !offline,
      networkType: offline ? null : networkType,
      previousOfflineState: !offline,
      transitionType: 'manual'
    });
  }, [networkType]);

  useEffect(() => {
    let mounted = true;

    // Check initial connection only once
    const initializeOnce = async () => {
      if (mounted) {
        await checkInitialConnection();
      }
    };

    initializeOnce();

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (mounted) {
        handleNetworkChange(state);
      }
    });

    // Listen for offline state changes from other components
    const offlineStateListener = DeviceEventEmitter.addListener(
      'offlineStateChanged',
      ({ isOffline: newOfflineState }) => {
        if (mounted) {
          setIsOffline(newOfflineState);
          setIsConnected(!newOfflineState);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
      offlineStateListener.remove();
    };
  }, []); // Remove dependencies to prevent re-initialization

  return {
    isOffline,
    isConnected,
    networkType,
    refreshNetworkState,
    getCurrentOfflineMode,
    setManualOfflineMode,
    checkInitialConnection
  };
};

export default useOffline;
