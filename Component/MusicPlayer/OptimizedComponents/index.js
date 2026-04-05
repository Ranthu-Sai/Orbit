/**
 * Optimized MusicPlayer Components
 *
 * These components are performance-optimized alternatives that:
 * - Use hooks at top level only (not per-item)
 * - Minimize re-renders through aggressive memoization
 * - Use native driver for animations
 * - Have proper debouncing for actions
 */

export { default as OptimizedPlaybackControls } from './OptimizedPlaybackControls';
export { default as OptimizedQueueItem } from './OptimizedQueueItem';
export { default as OptimizedQueueList } from './OptimizedQueueList';
