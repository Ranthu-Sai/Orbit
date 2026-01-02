import Context from "./Context";
import { useEffect, useState, useRef } from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { getRecommendedSongs } from "../Api/Recommended";
import { AddSongsToQueue } from "../MusicPlayerFunctions";
import FormatArtist from "../Utils/FormatArtists";

import { SetQueueSongs } from "../LocalStorage/storeQueue";
import { EachSongMenuModal } from "../Component/Global/EachSongMenuModal";
import { CacheManager as LegacyCacheManager } from "../Utils/CacheManager";
import { CacheManager } from "../Utils/NavigationCacheManager";
import historyManager from "../Utils/HistoryManager";

// Repeat constants
const Repeats = {
    NoRepeat: "repeat-off",
    RepeatAll: "repeat",
    RepeatOne: "repeat-once"
};

const events = [
    Event.PlaybackActiveTrackChanged,
    Event.PlaybackError,
    Event.PlaybackState,
];
const ContextState = (props) => {
    const [Index, setIndex] = useState(0);
    const [QueueIndex, setQueueIndex] = useState(0);
    const [currentPlaying, setCurrentPlaying] = useState({})
    const [Repeat, setRepeat] = useState(Repeats.NoRepeat);
    const [Visible, setVisible] = useState({
        visible: false,
    });
    const [previousScreen, setPreviousScreen] = useState(null);
    // Dedicated state for music player navigation - won't be affected by general navigation
    const [musicPreviousScreen, setMusicPreviousScreen] = useState("");

    // State for tracking player initialization to prevent race conditions
    const isPlayerReady = useRef(false);

    // Add state to track the current playlist information
    const [currentPlaylistData, setCurrentPlaylistData] = useState(null);

    // Add state to track liked playlists for UI updates
    const [likedPlaylists, setLikedPlaylists] = useState([]);

    // Track if current playback is from a playlist/album (blocks auto-recommendations)
    const [isPlaylistActive, setIsPlaylistActive] = useState(false);

    // Track navigation FROM FullScreenMusic to other screens (Artist/Album)
    // When set, back navigation should return to FullScreenMusic first
    const [fullScreenNavigationTarget, setFullScreenNavigationTarget] = useState(null);

    const [Queue, setQueue] = useState([]);
    const QueueRef = useRef([]); // Ref to access latest queue in callbacks without dependency issues
    QueueRef.current = Queue; // Keep ref updated

    async function updateTrack() {
        if (!isPlayerReady.current) return;

        // PERFORMANCE: Defer getQueue to next animation frame
        // This prevents blocking the progress slider during track change
        requestAnimationFrame(async () => {
            try {
                const tracks = await TrackPlayer.getQueue();
                // PERFORMANCE: Use O(1) comparison instead of O(n) JSON.stringify
                // Compare length and first/last IDs - if these match, queue is likely unchanged
                // FIX: Always update if new tracks were added (length increased)
                const hasChanged = tracks.length !== QueueRef.current.length ||
                    (tracks.length > 0 && QueueRef.current.length > 0 && (
                        tracks[0]?.id !== QueueRef.current[0]?.id ||
                        tracks[tracks.length - 1]?.id !== QueueRef.current[QueueRef.current.length - 1]?.id
                    ));

                if (hasChanged || tracks.length > QueueRef.current.length) {
                    setQueue(tracks);
                }
            } catch (error) {
            }
        });
    }

    // Function to update liked playlists state and trigger UI updates
    function updateLikedPlaylist() {
        // This is just to trigger rerenders when playlists are liked/unliked
        setLikedPlaylists(prev => [...prev]);
    }

    async function AddRecommendedSongs(index, id) {
        if (!isPlayerReady.current) return;

        // 🚫 SKIP RECOMMENDATIONS for Album/Playlist playback
        // Using dedicated isPlaylistActive flag instead of currentPlaylistData
        if (isPlaylistActive) {
            return;
        }

        // 🚫 SKIP for YouTube Music songs
        // YTMusic uses AutoRecommendations service (Utils/AutoRecommendations.js)
        // This function is ONLY for Saavn songs which use the old recommendation API
        const currentTrack = await TrackPlayer.getActiveTrack();
        if (currentTrack?.isYTMusic || currentTrack?.source === 'ytmusic' ||
            (currentTrack?.id && currentTrack.id.length === 11 && !currentTrack.isLocal)) {
            return;
        }

        // PERFORMANCE: Use QueueRef for length check to avoid O(N) bridge call
        // TrackPlayer.getQueue() deserializes 1000+ items - expensive!
        // Only fetch authoritative queue if we are actually near the end
        const currentQueueLength = QueueRef.current.length;
        if (currentQueueLength === 0) {
            // If local queue is empty, fallback to native fetch just in case
            const tracks = await TrackPlayer.getQueue();
            if (index < tracks.length - 2) return;
        } else {
            // Use cached length for O(1) check
            if (index < currentQueueLength - 2) {
                return;
            }
        }

        // Only if we passed the check, get full queue to proceed with logic
        const tracks = await TrackPlayer.getQueue();
        const totalTracks = tracks.length - 1
        if (index >= totalTracks - 2) {
            try {
                const songs = await getRecommendedSongs(id)
                if (songs?.data?.length !== 0) {
                    const ForMusicPlayer = songs.data.map((e) => {
                        return {
                            url: e.downloadUrl[3].url,
                            title: e.name.toString().replaceAll("&quot;", "\"").replaceAll("&amp;", "and").replaceAll("&#039;", "'").replaceAll("&trade;", "™"),
                            artist: FormatArtist(e?.artists?.primary).toString().replaceAll("&quot;", "\"").replaceAll("&amp;", "and").replaceAll("&#039;", "'").replaceAll("&trade;", "™"),
                            artwork: e.image[2].url,
                            duration: e.duration,
                            id: e.id,
                            language: e.language,
                        }
                    })
                    await AddSongsToQueue(ForMusicPlayer)
                }
            } catch (e) {
            } finally {
                await updateTrack()
            }
        }
    }

    useTrackPlayerEvents(events, async (event) => {
        // CRITICAL ROOT FIX: Prevent any handling before player is explicitly ready
        if (!isPlayerReady.current) {
            // Silently ignore events when player is not ready (prevents log spam)
            return;
        }

        try {
            if (event.type === Event.PlaybackError) {
                console.warn('An error occured while playing the current track.');

                // Log error details for debugging
                try {
                    const currentTrack = await TrackPlayer.getActiveTrack();
                    if (currentTrack) {
                        console.error(`❌ Playback error for: ${currentTrack.title}`);

                        // IMPROVED: Try on-demand fetch before skipping
                        // This recovers tracks that weren't prefetched in time
                        const smartPrefetchManager = require('../Utils/SmartPrefetchManager').default;

                        if (smartPrefetchManager.needsStream(currentTrack)) {
                            try {
                                const streamData = await smartPrefetchManager.fetchOnDemand(currentTrack.id);

                                if (streamData && streamData.url) {
                                    // Replace the track with the fetched URL and play
                                    const currentIndex = await TrackPlayer.getActiveTrackIndex();
                                    const updatedTrack = {
                                        ...currentTrack,
                                        url: streamData.url,
                                        headers: streamData.headers,
                                        _needsStream: false,
                                        _prefetched: true
                                    };

                                    await TrackPlayer.remove(currentIndex);
                                    await TrackPlayer.add(updatedTrack, currentIndex);
                                    await TrackPlayer.skip(currentIndex);
                                    await TrackPlayer.play();
                                    return; // Recovery successful, don't skip
                                }
                            } catch (recoveryError) {
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error getting track info during error:', error);
                }

                // FALLBACK: If on-demand fetch failed, skip to next track
                setTimeout(async () => {
                    try {
                        const state = await TrackPlayer.getPlaybackState();

                        // If still in error state, skip to next
                        if (state.state === 'error' || state.state === 'none') {
                            await TrackPlayer.skipToNext();
                            await TrackPlayer.play();
                        }
                    } catch (err) {
                        console.error('Error in fallback recovery:', err);
                    }
                }, 1000); // Reduced from 2000ms since we already tried on-demand fetch
            }

            if (event.type === Event.PlaybackActiveTrackChanged) {
                // PERFORMANCE: Use event.track.id directly instead of blocking historyManager.getCurrentTrackingInfo() call
                const newTrackId = event.track?.id;

                // ✅ DEFER UI UPDATE: Use setImmediate to prevent blocking during track transition
                setImmediate(() => {
                    setCurrentPlaying(event.track);
                });

                // Only process if it's actually a different track
                // Compare with last known track ID to avoid redundant operations
                const lastTrackId = historyManager.isCurrentlyTracking ? historyManager.currentTrack?.id : null;

                if (lastTrackId !== newTrackId) {
                    // ✅ TRULY NON-BLOCKING: Use setImmediate to defer file I/O
                    // This ensures history tracking runs AFTER the current JS call stack clears
                    // preventing any UI freeze when opening fullscreen player
                    setImmediate(() => {
                        const trackingPromises = [];
                        if (historyManager.isCurrentlyTracking) {
                            trackingPromises.push(historyManager.stopTracking());
                        }
                        if (event.track?.id) {
                            trackingPromises.push(historyManager.startTracking(event.track));
                        }

                        // SYNC QUEUE: Ensure Context.Queue is updated when track changes
                        // This fixes the empty queue UI issue in QueueBottomSheet
                        // It uses QueueRef optimization internally so it's efficient
                        trackingPromises.push(updateTrack());

                        Promise.all(trackingPromises).catch(err =>
                            console.error('Track change tracking error:', err)
                        );
                    });

                    // 🎵 CRITICAL FIX: Trigger prefetch from ContextState as backup
                    // SmartPrefetchManager's event listeners can be lost after Metro hot reload
                    // This ensures continuous prefetching works reliably for all sources
                    if (event.track?.id) {
                        const isStreamingSource =
                            event.track.source === 'ytmusic' ||
                            event.track.source === 'spotify' ||
                            event.track.source === 'dab' ||
                            event.track.isYTMusic === true ||
                            event.track.mappedFromSpotify === true ||
                            (event.track.id?.length === 11 && !event.track.isLocalMusic);

                        if (isStreamingSource) {
                            // Defer prefetch to avoid blocking UI
                            setImmediate(async () => {
                                try {
                                    const smartPrefetchManager = require('../Utils/SmartPrefetchManager').default;

                                    // Ensure manager is initialized (handles hot reload case)
                                    if (!smartPrefetchManager.isInitialized) {
                                        smartPrefetchManager.initialize();
                                    }

                                    // Trigger sequential prefetch: N+1 then N+2
                                    await smartPrefetchManager._prefetchNextFromCurrent();

                                    // N+2 after N+1 completes
                                    setImmediate(async () => {
                                        try {
                                            const TrackPlayer = require('react-native-track-player').default;
                                            const currentIdx = await TrackPlayer.getActiveTrackIndex();
                                            if (currentIdx !== null && currentIdx !== undefined) {
                                                await smartPrefetchManager._prefetchTrackAtIndex(currentIdx + 2);
                                            }
                                        } catch (e) {
                                            // Silence expected errors
                                            if (!e.message?.includes("doesn't exist")) {
                                            }
                                        }
                                    });
                                } catch (prefetchError) {
                                }
                            });
                        }
                    }

                    // ✅ Add recommendations async (non-blocking)
                    // Defer to next tick to keep UI responsive
                    if (Repeat === Repeats.NoRepeat && event.track?.id) {
                        setTimeout(() => {
                            AddRecommendedSongs(event.index, event.track.id)
                                .catch(err => console.error('Recommendations error:', err));
                        }, 100);
                    }
                }
            }

            if (event.type === Event.PlaybackState) {
                // Handle playback state changes for pause/resume tracking
                // NOTE: Removed console.log here as it fires frequently and adds overhead

                if (event.state === 'playing') {
                    if (historyManager.isCurrentlyTracking) {
                        // Resume tracking if already tracking but was paused
                        historyManager.resumeTracking();
                    }
                } else if (event.state === 'paused') {
                    // Pause tracking when music is paused
                    historyManager.pauseTracking();
                } else if (event.state === 'stopped') {
                    // Stop tracking completely when music is stopped
                    await historyManager.stopTracking();
                }
            }
        } catch (error) {
            console.error('Error in TrackPlayer event handler:', error);
        }
    });
    async function InitialSetup() {
        try {
            // Clear old cache entries to prevent storage full errors
            await LegacyCacheManager.clearOldCacheEntries();

            // Initialize history manager
            await historyManager.initialize();

            // Initialization check

            // Check if player is already initialized
            try {
                await TrackPlayer.getPlaybackState();
                isPlayerReady.current = true; // Mark ready immediately
            } catch (playerError) {
                // Player not initialized, set it up
                await TrackPlayer.setupPlayer({
                    android: {
                        appKilledPlaybackBehavior: 'ContinuePlayback',
                        alwaysPauseOnInterruption: false,
                    },
                    autoHandleInterruptions: true,
                    autoUpdateMetadata: true,
                });
                isPlayerReady.current = true; // Mark ready after setup

            }
        } catch (error) {
            console.error('Error in InitialSetup:', error);
            // Even if error, if we can correct it, we might set ready, but safer to leave false
        }


        // Add delay before accessing TrackPlayer to ensure it's ready
        // Only run if we marked it as ready
        if (isPlayerReady.current) {
            setTimeout(async () => {
                try {
                    await updateTrack();
                    await getCurrentSong();
                } catch (error) {
                    console.error('Error in delayed setup:', error);
                }
            }, 500);
        }
    }
    async function getCurrentSong() {
        if (!isPlayerReady.current) return;
        try {
            const song = await TrackPlayer.getActiveTrack();
            setCurrentPlaying(song);
        } catch (error) {
            setCurrentPlaying({});
        }
    }
    useEffect(() => {
        InitialSetup()

        // Listen for playback mode changes from MusicPlayerFunctions
        const playbackModeListener = DeviceEventEmitter.addListener(
            'playback-mode-changed',
            (event) => {
                setIsPlaylistActive(event.isPlaylist);
            }
        );

        // Handle app state changes for history tracking
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // App going to background, enable background mode and save progress
                historyManager.setBackgroundMode(true);
                historyManager.saveProgressBackground().catch(error => {
                    console.error('Error saving progress on background:', error);
                });
            } else if (nextAppState === 'active') {
                // App coming back to foreground, disable background mode
                historyManager.setBackgroundMode(false);

                // Check if we need to resume tracking
                const checkTracking = async () => {
                    try {
                        // Add delay to ensure TrackPlayer is ready
                        setTimeout(async () => {
                            try {
                                // Check if TrackPlayer is initialized before accessing it
                                const isInitialized = await TrackPlayer.getPlaybackState().catch(() => false);
                                if (!isInitialized) {
                                    return;
                                }

                                const currentTrack = await TrackPlayer.getActiveTrack();
                                const playerState = await TrackPlayer.getPlaybackState();

                                if (currentTrack && playerState.state === 'playing' && !historyManager.isCurrentlyTracking) {
                                    // Resume tracking if song is playing and we're not already tracking
                                    // Non-blocking: Don't await, let it run in background
                                    historyManager.startTracking(currentTrack).catch(err =>
                                        console.error('Error resuming tracking:', err)
                                    );
                                }
                            } catch (innerError) {
                                console.error('Error in delayed tracking check:', innerError);
                            }
                        }, 2000); // Increased delay to 2 seconds
                    } catch (error) {
                        console.error('Error checking tracking on foreground:', error);
                    }
                };
                checkTracking();
            }
        };

        // Listen for queue updates from MusicPlayerFunctions (e.g. AddSongsToQueue)
        // DEBOUNCED: Prevents rapid re-renders during progressive batch loading
        let queueUpdateTimeout = null;
        const queueUpdateListener = DeviceEventEmitter.addListener('queue-updated', async (event) => {
            // Clear any pending update
            if (queueUpdateTimeout) {
                clearTimeout(queueUpdateTimeout);
            }

            // For progressive batches, skip immediate sync - they just add songs at the end
            // The threshold-based loader adds small batches frequently
            if (event?.isProgressiveBatch) {
                // Debounce progressive batch updates by 500ms to reduce re-renders
                queueUpdateTimeout = setTimeout(async () => {
                    await updateTrack();
                }, 500);
            } else {
                // For non-progressive updates (e.g., play next, queue clear), sync immediately
                await updateTrack();
            }
        });

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            // Cleanup timeout for debounced queue updates
            if (queueUpdateTimeout) {
                clearTimeout(queueUpdateTimeout);
            }
            subscription?.remove();
            playbackModeListener?.remove();
            historyManager.cleanup();
            if (queueUpdateListener) queueUpdateListener.remove();
        };
    }, []);
    return <Context.Provider value={{
        currentPlaying,
        Repeat,
        setRepeat,
        updateTrack,
        Index,
        setIndex,
        QueueIndex,
        setQueueIndex,
        setVisible,
        Queue,
        previousScreen,
        setPreviousScreen,
        musicPreviousScreen,
        setMusicPreviousScreen,
        currentPlaylistData,
        setCurrentPlaylistData,
        updateLikedPlaylist,
        likedPlaylists,
        isPlaylistActive,
        setIsPlaylistActive,
        fullScreenNavigationTarget,
        setFullScreenNavigationTarget
    }}>
        {props.children}
        <EachSongMenuModal setVisible={setVisible} Visible={Visible} />
    </Context.Provider>
}

export default ContextState
