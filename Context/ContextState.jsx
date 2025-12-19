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
    async function updateTrack() {
        if (!isPlayerReady.current) return;
        try {
            const tracks = await TrackPlayer.getQueue();
            // await SetQueueSongs(tracks)
            const ids = tracks.map((e) => e.id)
            const queuesId = Queue.map((e) => e.id)
            if (JSON.stringify(ids) !== JSON.stringify(queuesId)) {
                setQueue(tracks)
            }
        } catch (error) {
            console.log('updateTrack: TrackPlayer not ready yet');
        }
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
            console.log('Skipping recommendations: Album/Playlist is active');
            return;
        }

        // 🚫 SKIP for YouTube Music songs
        // YTMusic uses AutoRecommendations service (Utils/AutoRecommendations.js)
        // This function is ONLY for Saavn songs which use the old recommendation API
        const currentTrack = await TrackPlayer.getActiveTrack();
        if (currentTrack?.isYTMusic || currentTrack?.source === 'ytmusic' ||
            (currentTrack?.id && currentTrack.id.length === 11 && !currentTrack.isLocal)) {
            console.log('Skipping Saavn recommendations for YouTube song:', id);
            return;
        }

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
                console.log(e);
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
                    }
                } catch (error) {
                    console.error('Error getting track info during error:', error);
                }

                // PRIMARY: SmartPrefetchManager handles auto-recovery
                // FALLBACK: If still in error after 2 seconds, manually recover
                setTimeout(async () => {
                    try {
                        const state = await TrackPlayer.getPlaybackState();

                        // If still in error state, SmartPrefetchManager didn't fix it
                        if (state.state === 'error' || state.state === 'none') {
                            console.log('🔄 ContextState: Fallback recovery - skipping to next track');
                            await TrackPlayer.skipToNext();
                            await TrackPlayer.play();
                        }
                    } catch (err) {
                        console.error('Error in fallback recovery:', err);
                    }
                }, 2000);
            }

            if (event.type === Event.PlaybackActiveTrackChanged) {
                const trackingInfo = historyManager.getCurrentTrackingInfo();
                const currentTrackId = trackingInfo?.currentTrack?.id;
                const newTrackId = event.track?.id;

                // ✅ UPDATE UI IMMEDIATELY (non-blocking)
                setCurrentPlaying(event.track);

                // Only process if it's actually a different track
                if (currentTrackId !== newTrackId) {
                    // ✅ SAVE PLAYER STATE (Persistence)
                    // Save async to avoid blocking UI
                    TrackPlayer.getQueue().then(queue => {
                        CacheManager.setPlayerState(queue, event.track, event.index);
                    }).catch(e => console.warn('Failed to save player state', e));

                    // ✅ Run history tracking in background (non-blocking)
                    // Don't await - let it run async to avoid UI freeze
                    Promise.all([
                        trackingInfo.isTracking ? historyManager.stopTracking() : Promise.resolve(),
                        event.track?.id ? historyManager.startTracking(event.track) : Promise.resolve()
                    ]).catch(err => console.error('History tracking error:', err));

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
                console.log('Context: Playback state changed', event.state);

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

            // 1. RESTORE SAVED PLAYER STATE (Instant UI)
            const savedState = await CacheManager.getPlayerStateAsync();
            if (savedState) {
                console.log('💾 Restoring saved player state...');
                setQueue(savedState.queue);
                setCurrentPlaying(savedState.activeTrack);
                // Clamp index to valid range (0-1) for BottomSheetMusic which has 2 snap points
                // This prevents crash when restoring old cached state with index 2
                // Always start with MiniPlayer (Index 0), regardless of which song was playing
                setIndex(0);
                // Note: We don't set isPlayerReady=true here because TrackPlayer native isn't ready.
                // But setting React state ensures MiniPlayer appears immediately.
            }

            // Check if player is already initialized
            try {
                await TrackPlayer.getPlaybackState();
                console.log('Player already initialized in Context');
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
                console.log('Player initialized successfully in Context');
                isPlayerReady.current = true; // Mark ready after setup

                // 2. RESTORE TRACKPLAYER BACKEND
                if (savedState && savedState.queue.length > 0) {
                    try {
                        console.log('🎵 Restoring queue to TrackPlayer...');

                        // Filter out DAB tracks - their stream URLs expire and cause playback errors
                        const restorableQueue = savedState.queue.filter(track => {
                            const isDabTrack = track.source === 'dab' || track.isDabTrack;
                            if (isDabTrack) {
                                console.log('⏭️ Skipping DAB track with expired URL:', track.title);
                            }
                            return !isDabTrack;
                        });

                        if (restorableQueue.length > 0) {
                            await TrackPlayer.add(restorableQueue);

                            // Find the correct index to skip to
                            // If the saved active track was a DAB track, start from beginning
                            const savedTrack = savedState.activeTrack;
                            const wasDabTrack = savedTrack?.source === 'dab' || savedTrack?.isDabTrack;

                            if (!wasDabTrack && savedState.activeIndex >= 0) {
                                // Find the new index after filtering
                                const newIndex = restorableQueue.findIndex(t => t.id === savedTrack?.id);
                                if (newIndex >= 0) {
                                    await TrackPlayer.skip(newIndex);
                                }
                            }
                            console.log(`✅ Restored ${restorableQueue.length} tracks (${savedState.queue.length - restorableQueue.length} DAB tracks skipped)`);
                        } else {
                            console.log('⏭️ No restorable tracks (all were DAB tracks with expired URLs)');
                        }
                        // Don't auto-play, let user click play
                    } catch (restoreError) {
                        console.warn('Failed to restore TrackPlayer queue', restoreError);
                    }
                }
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
            console.log('getCurrentSong: TrackPlayer not ready yet');
            setCurrentPlaying({});
        }
    }
    useEffect(() => {
        InitialSetup()

        // Listen for playback mode changes from MusicPlayerFunctions
        const playbackModeListener = DeviceEventEmitter.addListener(
            'playback-mode-changed',
            (event) => {
                console.log('🎵 Playback mode changed:', event.isPlaylist ? 'Playlist/Album' : 'Single Song');
                setIsPlaylistActive(event.isPlaylist);
            }
        );

        // Handle app state changes for history tracking
        const handleAppStateChange = (nextAppState) => {
            console.log('Context: App state changed to', nextAppState);

            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // App going to background, enable background mode and save progress
                console.log('Context: App going to background, enabling background tracking');
                historyManager.setBackgroundMode(true);
                historyManager.saveProgressBackground().catch(error => {
                    console.error('Error saving progress on background:', error);
                });
            } else if (nextAppState === 'active') {
                // App coming back to foreground, disable background mode
                console.log('Context: App coming to foreground, disabling background tracking');
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
                                    console.log('Context: TrackPlayer not initialized yet, skipping tracking check');
                                    return;
                                }

                                const currentTrack = await TrackPlayer.getActiveTrack();
                                const playerState = await TrackPlayer.getPlaybackState();

                                if (currentTrack && playerState.state === 'playing' && !historyManager.isCurrentlyTracking) {
                                    // Resume tracking if song is playing and we're not already tracking
                                    console.log('Context: Resuming tracking for', currentTrack.title);
                                    await historyManager.startTracking(currentTrack);
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

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
            playbackModeListener?.remove();
            historyManager.cleanup();
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
