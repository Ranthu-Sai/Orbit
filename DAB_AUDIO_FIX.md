# DAB Audio Format Issue - Fixed

## Problem
DAB music tracks were failing to play with "Unsupported audio format" errors. The tracks were being added to the queue with track IDs (like "162079183") in the `url` field instead of actual streaming URLs.

## Root Cause
When DAB tracks were added to the queue or playlist, they were not being processed to fetch the actual streaming URL from the DAB API. The `url` field contained either:
- Empty string `""` (from DabMusicService transform)
- Track ID as string `"162079183"` (from some other transform)

TrackPlayer cannot play these - it needs an actual HTTPS URL to the audio stream.

## Solution
Added DAB track detection and stream URL fetching to all functions that add tracks to the player:

### Files Modified

#### 1. `MusicPlayerFunctions.js`
- **AddPlaylist()** - Added DAB detection and stream URL fetching
- **AddSongsToQueue()** - Added DAB detection and stream URL fetching

Both functions now check for DAB tracks using:
```javascript
if (song.isDabTrack || song.source === 'dab' || (!isNaN(song.url) && String(song.url).length > 5))
```

When detected, they call:
```javascript
await dabMusicService.initialize();
const streamUrl = await dabMusicService.getStreamUrl(song.id);
```

#### 2. `Component/MusicPlayer/EachSongMenuButton.jsx`
- **addToQueue()** - Added DAB detection and stream URL fetching
- **playNext()** - Added DAB detection and stream URL fetching

Both functions now check for DAB tracks using:
```javascript
const isDabTrack = song.isDabTrack || song.source === 'dab';
```

## How It Works Now

1. When a DAB track is detected (by `isDabTrack`, `source === 'dab'`, or numeric URL)
2. Initialize the DAB Music Service
3. Fetch the actual streaming URL using `dabMusicService.getStreamUrl(trackId)`
4. Replace the track's `url` field with the actual streaming URL
5. Add the track to TrackPlayer with the valid streaming URL

## Detection Criteria

A track is identified as a DAB track if **ANY** of these conditions are true:
1. `song.isDabTrack === true` (set by DabMusicService._transformTrack)
2. `song.source === 'dab'` (set by DabMusicService._transformTrack)
3. `!isNaN(song.url) && String(song.url).length > 5` (numeric string longer than 5 chars - **FALLBACK**)

The third criterion is crucial because sometimes DAB tracks lose their `isDabTrack` or `source` markers when being passed between components, but the `url` field still contains the numeric track ID (e.g., `"80273263"`). This fallback ensures all DAB tracks are caught.

## Stream URL Format

DAB streaming URLs come from the API endpoint:
```
https://dabmusic.xyz/api/stream?trackId={id}&quality=27
```

The quality parameter determines audio quality:
- `5` - MP3 320kbps
- `6` - FLAC 16-bit/44.1kHz
- `7` - FLAC 24-bit/96kHz
- `27` - FLAC 24-bit/192kHz (default)

## Testing

To verify the fix:
1. Search for a DAB track (requires DAB login)
2. Try to play it directly - should work ✅
3. Add it to queue - should work ✅
4. Use "Play Next" - should work ✅
5. Add to playlist and play - should work ✅

All tracks should now properly fetch streaming URLs before being added to TrackPlayer.
