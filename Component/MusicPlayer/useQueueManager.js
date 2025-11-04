import { useState, useCallback } from 'react';

/**
 * Custom hook for managing queue state and operations
 * Provides a clean, reusable interface for queue management
 */
export const useQueueManager = () => {
  const [isQueueVisible, setIsQueueVisible] = useState(false);

  const showQueue = useCallback(() => {
    setIsQueueVisible(true);
  }, []);

  const hideQueue = useCallback(() => {
    setIsQueueVisible(false);
  }, []);

  const toggleQueue = useCallback(() => {
    setIsQueueVisible(prev => !prev);
  }, []);

  return {
    isQueueVisible,
    showQueue,
    hideQueue,
    toggleQueue,
  };
};

export default useQueueManager;