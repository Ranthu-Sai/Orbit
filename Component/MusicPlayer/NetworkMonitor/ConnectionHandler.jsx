import React, { useEffect } from 'react';
import { useNetworkMonitor } from './useNetworkMonitor';

/**
 * ConnectionHandler - Handles network connection events and side effects
 * 
 * This component manages network-related side effects including:
 * - Connection change callbacks
 * - Error suppression in offline mode
 * - Network-dependent feature toggling
 * - Automatic retry mechanisms
 */

export const ConnectionHandler = ({ 
  children,
  onOnline = null,
  onOffline = null,
  onConnectionChange = null,
  suppressOfflineErrors = true,
  enableAutoRetry = false,
  retryInterval = 30000 // 30 seconds
}) => {
  const { 
    isConnected, 
    isOffline, 
    connectionType, 
    connectionQuality,
    canStreamMusic,
    refreshNetworkState 
  } = useNetworkMonitor();

  // Handle connection state changes
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange({
        isConnected,
        isOffline,
        connectionType,
        connectionQuality,
        canStreamMusic
      });
    }
  }, [isConnected, isOffline, connectionType, connectionQuality]);

  // Handle online event
  useEffect(() => {
    if (isConnected && !isOffline && onOnline) {
      onOnline({
        connectionType,
        connectionQuality,
        canStreamMusic
      });
    }
  }, [isConnected, isOffline]);

  // Handle offline event
  useEffect(() => {
    if (isOffline && onOffline) {
      onOffline({
        previousConnectionType: connectionType
      });
    }
  }, [isOffline]);

  // Error suppression for offline mode
  useEffect(() => {
    if (suppressOfflineErrors && isOffline) {
      // Add global error handler for network-related errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ').toLowerCase();
        
        // Suppress common network error messages when offline
        const networkErrorKeywords = [
          'network request failed',
          'network error',
          'fetch failed',
          'connection refused',
          'timeout',
          'no internet',
          'offline'
        ];
        
        const shouldSuppress = networkErrorKeywords.some(keyword => 
          errorMessage.includes(keyword)
        );
        
        if (!shouldSuppress) {
          originalConsoleError.apply(console, args);
        }
      };

      return () => {
        console.error = originalConsoleError;
      };
    }
  }, [isOffline, suppressOfflineErrors]);

  // Auto-retry mechanism
  useEffect(() => {
    let retryTimer;

    if (enableAutoRetry && isOffline) {
      retryTimer = setInterval(() => {
        refreshNetworkState();
      }, retryInterval);
    }

    return () => {
      if (retryTimer) {
        clearInterval(retryTimer);
      }
    };
  }, [isOffline, enableAutoRetry, retryInterval]);

  return <>{children}</>;
};
