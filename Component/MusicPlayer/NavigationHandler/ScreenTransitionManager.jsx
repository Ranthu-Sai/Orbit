import React, { useState, useEffect } from 'react';
import { useNavigationHandler } from './useNavigationHandler';

/**
 * ScreenTransitionManager - Manages screen transitions and navigation state
 *
 * This component provides screen transition management including:
 * - Transition state tracking
 * - Navigation history management
 * - Screen parameter preservation
 * - Transition callbacks
 */

export const ScreenTransitionManager = ({
  children,
  musicPreviousScreen,
  onTransitionStart = null,
  onTransitionEnd = null,
  onNavigationChange = null,
  preserveHistory = true,
  maxHistoryLength = 10,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [currentScreen, setCurrentScreen] = useState(null);

  const {
    handlePlayerClose,
    handleBackNavigation,
    navigateToScreen,
    getCurrentPath,
  } = useNavigationHandler({
    musicPreviousScreen,
    onNavigationChange: (path, params) => {
      handleNavigationChange(path, params);
    },
  });

  // Handle navigation changes
  const handleNavigationChange = (path, params) => {
    setCurrentScreen({ path, params, timestamp: Date.now() });

    if (preserveHistory) {
      setNavigationHistory((prev) => {
        const newHistory = [
          { path, params, timestamp: Date.now() },
          ...prev.slice(0, maxHistoryLength - 1),
        ];
        return newHistory;
      });
    }

    if (onNavigationChange) {
      onNavigationChange(path, params);
    }
  };

  // Enhanced player close with transition management
  const handlePlayerCloseWithTransition = async () => {
    try {
      setIsTransitioning(true);

      if (onTransitionStart) {
        onTransitionStart('close', currentScreen);
      }

      await handlePlayerClose();

      if (onTransitionEnd) {
        onTransitionEnd('close', currentScreen);
      }
    } catch (error) {
      console.error(
        'ScreenTransitionManager: Error in player close transition:',
        error
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  // Enhanced back navigation with transition management
  const handleBackNavigationWithTransition = async () => {
    try {
      setIsTransitioning(true);

      if (onTransitionStart) {
        onTransitionStart('back', currentScreen);
      }

      await handleBackNavigation();

      if (onTransitionEnd) {
        onTransitionEnd('back', currentScreen);
      }
    } catch (error) {
      console.error(
        'ScreenTransitionManager: Error in back navigation transition:',
        error
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  // Enhanced screen navigation with transition management
  const navigateToScreenWithTransition = async (screenPath, params = {}) => {
    try {
      setIsTransitioning(true);

      if (onTransitionStart) {
        onTransitionStart('navigate', { path: screenPath, params });
      }

      await navigateToScreen(screenPath, params);

      if (onTransitionEnd) {
        onTransitionEnd('navigate', { path: screenPath, params });
      }
    } catch (error) {
      console.error(
        'ScreenTransitionManager: Error in screen navigation transition:',
        error
      );
    } finally {
      setIsTransitioning(false);
    }
  };

  // Get navigation history
  const getNavigationHistory = () => {
    return navigationHistory;
  };

  // Get previous screen from history
  const getPreviousScreen = () => {
    return navigationHistory.length > 1 ? navigationHistory[1] : null;
  };

  // Clear navigation history
  const clearNavigationHistory = () => {
    setNavigationHistory([]);
  };

  // Get transition state
  const getTransitionState = () => ({
    isTransitioning,
    currentScreen,
    historyLength: navigationHistory.length,
    canGoBack: navigationHistory.length > 1,
  });

  // Initialize current screen
  useEffect(() => {
    const initializeCurrentScreen = () => {
      try {
        const path = getCurrentPath();
        setCurrentScreen({
          path,
          params: {},
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(
          'ScreenTransitionManager: Error initializing current screen:',
          error
        );
      }
    };

    initializeCurrentScreen();
  }, [getCurrentPath]);

  // Provide enhanced navigation functions to children
  const enhancedNavigationContext = {
    handlePlayerClose: handlePlayerCloseWithTransition,
    handleBackNavigation: handleBackNavigationWithTransition,
    navigateToScreen: navigateToScreenWithTransition,
    getNavigationHistory,
    getPreviousScreen,
    clearNavigationHistory,
    getTransitionState,
    isTransitioning,
    currentScreen,
    navigationHistory,
  };

  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            navigationContext: enhancedNavigationContext,
          });
        }
        return child;
      })}
    </>
  );
};
