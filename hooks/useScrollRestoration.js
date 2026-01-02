/**
 * useScrollRestoration Hook
 * 
 * Automatically saves and restores scroll position for screens.
 * Use with ScrollView or FlatList to preserve scroll position
 * on back navigation.
 * 
 * Usage:
 * const { scrollRef, handleScroll, scrollToSaved } = useScrollRestoration('PlaylistScreen_abc');
 * 
 * <ScrollView ref={scrollRef} onScroll={handleScroll} scrollEventThrottle={16}>
 *   ...
 * </ScrollView>
 */

import { useRef, useEffect, useCallback } from 'react';
import { CacheManager } from '../Utils/NavigationCacheManager';

/**
 * Custom hook for scroll position restoration
 * @param {string} screenKey - Unique identifier for the screen
 * @param {object} options - Additional options
 * @param {boolean} options.horizontal - Whether scroll is horizontal
 * @param {number} options.throttle - Throttle interval in ms (default: 100)
 * @returns {object} - { scrollRef, handleScroll, scrollToSaved, saveScrollPosition }
 */
export function useScrollRestoration(screenKey, options = {}) {
    const { horizontal = false, throttle = 100 } = options;

    const scrollRef = useRef(null);
    const scrollPosition = useRef(0);
    const lastSaveTime = useRef(0);
    const hasRestoredScroll = useRef(false);

    /**
     * Handle scroll event - save position with throttling
     */
    const handleScroll = useCallback((event) => {
        const now = Date.now();

        // Throttle saves to prevent excessive updates
        if (now - lastSaveTime.current < throttle) {
            return;
        }

        const position = horizontal
            ? event.nativeEvent.contentOffset.x
            : event.nativeEvent.contentOffset.y;

        scrollPosition.current = position;
        lastSaveTime.current = now;
    }, [horizontal, throttle]);

    /**
     * Save current scroll position to cache
     */
    const saveScrollPosition = useCallback(() => {
        if (screenKey && scrollPosition.current > 0) {
            CacheManager.setScrollPosition(screenKey, scrollPosition.current);
        }
    }, [screenKey]);

    /**
     * Scroll to saved position
     */
    const scrollToSaved = useCallback((animated = false) => {
        if (!scrollRef.current || hasRestoredScroll.current) {
            return;
        }

        const savedPosition = CacheManager.getScrollPosition(screenKey);

        if (savedPosition > 0) {
            // Small delay to ensure content is rendered
            setTimeout(() => {
                if (scrollRef.current) {
                    if (scrollRef.current.scrollTo) {
                        // ScrollView
                        scrollRef.current.scrollTo({
                            x: horizontal ? savedPosition : 0,
                            y: horizontal ? 0 : savedPosition,
                            animated,
                        });
                    } else if (scrollRef.current.scrollToOffset) {
                        // FlatList
                        scrollRef.current.scrollToOffset({
                            offset: savedPosition,
                            animated,
                        });
                    }
                    hasRestoredScroll.current = true;
                }
            }, 100);
        }
    }, [screenKey, horizontal]);

    /**
     * Reset scroll position tracking
     */
    const resetScroll = useCallback(() => {
        scrollPosition.current = 0;
        hasRestoredScroll.current = false;
        CacheManager.setScrollPosition(screenKey, 0);
    }, [screenKey]);

    // Restore scroll position on mount
    useEffect(() => {
        scrollToSaved(false);
    }, []);

    // Save scroll position on unmount
    useEffect(() => {
        return () => {
            saveScrollPosition();
        };
    }, [saveScrollPosition]);

    return {
        scrollRef,
        handleScroll,
        scrollToSaved,
        saveScrollPosition,
        resetScroll,
    };
}

export default useScrollRestoration;
