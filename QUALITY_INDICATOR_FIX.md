# Quality Indicator Fix - URL-based DAB Detection

## Problem
DAB/Qobuz tracks have quality in their URL (`fmt=7` = FLAC 24-bit/96kHz) but the detection logic only checks `isDabTrack` flag which isn't set on these tracks.

## Solution
Add URL pattern check to detect DAB tracks.

## File to Edit
`z:\projects\Orbit\Component\MusicPlayer\FullScreenMusic.jsx`

## Change Required (Line ~285)

###Before:
```javascript
// Check for DAB - parse quality from URL fmt parameter
if (currentPlaying.isDabTrack || currentPlaying.source === 'dab') {
  source = 'dab';
```

### After:
```javascript
// Check for DAB - FIXED: Also check URL for qobuz pattern
if (currentPlaying.isDabTrack || 
    currentPlaying.source === 'dab' || 
    (currentPlaying.url && currentPlaying.url.includes('qobuz'))) {
  source = 'dab';
```

## That's it!
This single change will:
1. Detect DAB tracks by checking if URL contains 'qobuz'
2. Parse the `fmt` parameter from URL
3. Show proper quality like "Now Playing - FLAC 24-bit/96kHz"

## Example URL that will now be detected:
```
https://streaming-qobuz-std.akamaized.net/file?uid=...&fmt=7&...
                                              fmt=7 = FLAC 24-bit/96kHz
```
