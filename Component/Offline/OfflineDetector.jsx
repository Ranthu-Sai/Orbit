import React, { useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { isNetworkAvailable, setOfflineMode } from '../../Api/CacheManager';

/**
 * OfflineDetector - A component that handles network detection and offline state management
 * This component runs in the background and manages global offline state
 */
const OfflineDetector = ({ 
  onNetworkChange, 
  onOfflineTransition, 
  onOnlineTransition,
  suppressNetworkErrors = false 
}) => {
  
  // Handle network state changes with comprehensive error handling
  const handleNetworkStateChange = useCallback(async (state) => {
    try {
      const isConnected = state.isConnected && state.isInternetReachable;
      const previousOfflineState = !await isNetworkAvailable();
      
      // Update global offline mode
      setOfflineMode(!isConnected);
      // Determine transition type
      let transitionType = 'no-change';
      if (!isConnected && !previousOfflineState) {
        transitionType = 'online-to-offline';
      } else if (isConnected && previousOfflineState) {
        transitionType = 'offline-to-online';
      }
      
      // Create network change event data
      const networkChangeData = {
        isOffline: !isConnected,
        isConnected,
        networkType: state.type,
        previousOfflineState,
        transitionType,
        timestamp: Date.now()
      };
      
      // Emit global network state change event
      DeviceEventEmitter.emit('networkStateChanged', networkChangeData);
      
      // Call specific transition callbacks
      if (transitionType === 'online-to-offline' && onOfflineTransition) {
        onOfflineTransition(networkChangeData);
      } else if (transitionType === 'offline-to-online' && onOnlineTransition) {
        onOnlineTransition(networkChangeData);
      }
      
      // Call general network change callback
      if (onNetworkChange) {
        onNetworkChange(networkChangeData);
      }
      
    } catch (error) {
      console.error('OfflineDetector: Error handling network state change:', error);
      
      // Fallback to offline mode on error
      setOfflineMode(true);
      DeviceEventEmitter.emit('networkStateChanged', {
        isOffline: true,
        isConnected: false,
        networkType: null,
        previousOfflineState: false,
        transitionType: 'error-fallback',
        timestamp: Date.now(),
        error: error.message
      });
    }
  }, [onNetworkChange, onOfflineTransition, onOnlineTransition]);

  // Check initial network state
  const checkInitialNetworkState = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      const isConnected = networkState.isConnected && networkState.isInternetReachable;
      
      // Set initial offline mode
      setOfflineMode(!isConnected);
      // Emit initial state
      const initialStateData = {
        isOffline: !isConnected,
        isConnected,
        networkType: networkState.type,
        previousOfflineState: null,
        transitionType: 'initial',
        timestamp: Date.now()
      };
      
      DeviceEventEmitter.emit('networkStateChanged', initialStateData);
      
      if (onNetworkChange) {
        onNetworkChange(initialStateData);
      }
      
      return isConnected;
    } catch (error) {
      console.error('OfflineDetector: Error checking initial network state:', error);
      
      // Assume offline on error
      setOfflineMode(true);
      DeviceEventEmitter.emit('networkStateChanged', {
        isOffline: true,
        isConnected: false,
        networkType: null,
        previousOfflineState: null,
        transitionType: 'initial-error',
        timestamp: Date.now(),
        error: error.message
      });
      
      return false;
    }
  }, [onNetworkChange]);

  // Setup network error suppression if requested
  const setupErrorSuppression = useCallback(() => {
    if (suppressNetworkErrors) {
      const originalConsoleError = console.error;
      
      console.error = (...args) => {
        const message = args.join(' ');
        
        // Suppress specific network-related errors in offline mode
        if (message.includes('Network request failed') || 
            message.includes('Unable to resolve host') ||
            message.includes('Connection refused') ||
            message.includes('timeout')) {
          return;
        }
        
        // Allow other errors through
        originalConsoleError.apply(console, args);
      };
      
      return originalConsoleError;
    }
    return null;
  }, [suppressNetworkErrors]);

  useEffect(() => {
    let mounted = true;

    // Check initial network state only once
    const initializeOnce = async () => {
      if (mounted) {
        await checkInitialNetworkState();
      }
    };

    initializeOnce();

    // Setup error suppression if needed
    const originalConsoleError = setupErrorSuppression();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (mounted) {
        handleNetworkStateChange(state);
      }
    });

    // Cleanup function
    return () => {
      mounted = false;
      unsubscribe();

      // Restore original console.error if it was modified
      if (originalConsoleError) {
        console.error = originalConsoleError;
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

  // This component doesn't render anything - it's a background service
  return null;
};

export default OfflineDetector;
