import React, { useEffect } from 'react';
import { useQueueManager } from './useQueueManager';

/**
 * QueueStateManager - Manages queue state and provides queue status information
 * 
 * This component provides queue state management including:
 * - Queue status monitoring
 * - State change callbacks
 * - Queue persistence
 * - Error state handling
 */

export const QueueStateManager = ({
  children,
  onQueueChange = null,
  onQueueEmpty = null,
  onQueueError = null,
  persistQueue = false,
  autoRestore = false
}) => {
  const {
    upcomingQueue,
    currentIndex,
    isLocalSource,
    isDragging,
    isOffline,
    isPendingAction,
    getQueueStatus,
    initializeQueue
  } = useQueueManager({
    autoInitialize: true,
    onQueueChange: onQueueChange
  });

  // Monitor queue changes
  useEffect(() => {
    if (onQueueChange) {
      onQueueChange({
        queue: upcomingQueue,
        currentIndex,
        isLocalSource,
        isDragging,
        isOffline,
        isPendingAction,
        status: getQueueStatus()
      });
    }
  }, [upcomingQueue, currentIndex, isLocalSource, isDragging, isOffline, isPendingAction]);

  // Monitor empty queue
  useEffect(() => {
    if (onQueueEmpty && upcomingQueue.length === 0 && !isDragging) {
      onQueueEmpty({
        isOffline,
        isLocalSource,
        currentIndex
      });
    }
  }, [upcomingQueue.length, isDragging, onQueueEmpty, isOffline, isLocalSource, currentIndex]);

  // Queue persistence (if enabled)
  useEffect(() => {
    if (persistQueue && upcomingQueue.length > 0) {
      try {
        const queueData = {
          queue: upcomingQueue,
          currentIndex,
          isLocalSource,
          timestamp: Date.now()
        };

        // Store in AsyncStorage or similar
        // This would need to be implemented based on storage preference
        // console.log('QueueStateManager: Persisting queue data', queueData);
      } catch (error) {
        console.error('Error persisting queue:', error);
        if (onQueueError) {
          onQueueError(error, 'persistence');
        }
      }
    }
  }, [upcomingQueue, currentIndex, isLocalSource, persistQueue, onQueueError]);

  // Auto-restore queue (if enabled)
  useEffect(() => {
    if (autoRestore && upcomingQueue.length === 0) {
      const restoreQueue = async () => {
        try {
          // This would restore from AsyncStorage or similar
          // Implementation depends on storage preference
          console.log('QueueStateManager: Attempting to restore queue');

          // For now, just reinitialize
          await initializeQueue();
        } catch (error) {
          console.error('Error restoring queue:', error);
          if (onQueueError) {
            onQueueError(error, 'restoration');
          }
        }
      };

      restoreQueue();
    }
  }, [autoRestore, upcomingQueue.length, initializeQueue, onQueueError]);

  return <>{children}</>;
};
