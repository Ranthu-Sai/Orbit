/**
 * ============================================================================
 * COMPLETE YOUTUBE STREAMING SOLUTION FOR REACT NATIVE
 * ============================================================================
 * 
 * This file contains EVERYTHING needed to stream high-quality audio from YouTube Music
 * in a React Native application, bypassing age restrictions and region blocks.
 * 
 * ----------------------------------------------------------------------------
 * 1. THE PROBLEM
 * ----------------------------------------------------------------------------
 * YouTube URLs for music (especially regional content like Indian songs) are often
 * "protected" (indicated by `txp=5532534`). These URLs return `403 Forbidden`
 * if accessed directly by browsers, VLC, or standard fetch requests because they
 * require a specific User-Agent header to prove they are coming from a valid client.
 * 
 * ----------------------------------------------------------------------------
 * 2. THE SOLUTION
 * ----------------------------------------------------------------------------
 * We use the InnerTube API with the `ANDROID` client and specific authentication
 * cookies. This generates a direct streaming URL.
 * 
 * CRITICAL STEP: When playing this URL in `react-native-track-player`, you MUST
 * pass the `User-Agent` header. This makes the player look like the official
 * YouTube Android app, allowing the stream to play.
 * 
 * ----------------------------------------------------------------------------
 * 3. INTEGRATION GUIDE (Copy this into your React Native App)
 * ----------------------------------------------------------------------------
 * 
 * // A. Import this module
 * import { getStreamingUrl } from './CompleteYouTubeStreaming';
 * import TrackPlayer from 'react-native-track-player';
 * 
 * // B. Function to play a song
 * async function playYouTubeSong(videoId) {
 *   try {
 *     console.log(`Fetching stream for ${videoId}...`);
 *     
 *     // 1. Get the URL and headers from this module
 *     const { url, headers, details } = await getStreamingUrl(videoId);
 *     
 *     console.log('Got URL:', url);
 *     
 *     // 2. Add to TrackPlayer with the CRITICAL headers
 *     await TrackPlayer.add({
 *       id: videoId,
 *       url: url,
 *       title: details.title,
 *       artist: details.author,
 *       artwork: details.thumbnail,
 *       
 *       // --- THE MAGIC PART ---
 *       // You must pass the headers so the player sends them with the request
 *       headers: headers,
 *       // Some versions of TrackPlayer/ExoPlayer need this explicitly:
 *       userAgent: headers['User-Agent'],
 *       // ----------------------
 *     });
 * 
 *     await TrackPlayer.play();
 *     
 *   } catch (error) {
 *     console.error('Playback failed:', error);
 *   }
 * }
 * 
 * ============================================================================
 */

// --- MODULE IMPLEMENTATION STARTS HERE ---

// 1. AUTHENTICATION COOKIES (Extracted from your session)
// These cookies allow access to age-restricted and premium content
const YOUTUBE_COOKIES = {
    'HSID': 'Ap1UlvCvfAnoEAboO',
    'SSID': 'A2VcPyOVTetdNrInv',
    'APISID': 'Jp5LwMjjA0HXdkp4/ALCe-yQ67VvexT1Vh',
    'SAPISID': 'XA-7pYEkPZft1goV/AIg0GaItgLdBSbr7m',
    'SID': 'g.a0003QhBnuBeHjuM-MtLrMMgP2oJ1_uOi3hp6oJ30AFbBfME6_9A-OM_9Ali0M-RyiEHqQKtQQACgYKAcESARUSFQHGX2Mi9RctMVr52N3TjAB6421D0RoVAUF8yKpvDiYpKn3S5I4ngmVHoN1-0076',
    '__Secure-3PSID': 'g.a0003QhBnuBeHjuM-MtLrMMgP2oJ1_uOi3hp6oJ30AFbBfME6_9AFslfCs4OauMpOTqZT_armwACgYKAR8SARUSFQHGX2MizrDBYLrBDR_IvOM0-Ub7QxoVAUF8yKrY_Oi2ehHK0TrDgKbbDGcf0076',
    'LOGIN_INFO': 'AFmmF2swRAIgQBPF4ARFZOd39htEyo7Hcgm63EYkjcATSyul9e03LhkCIDW7MqL5FnlTYkKzl-zLC7whJZxRBxjjLKnedDGaOkuS:QUQ3MjNmd0JNRzA2RlZ6TW5aa3Vmem5EMy1CTUNtWkhHODQxNmhfdVBCV243YXdOc3ZId1huUER0cUc1V3E1T1h6V1NOM0FrNVpQbUhvejllazJlbDU2NkdNT0Fvb2VRQ0xnLU1UTUk5X00tUGQ1bFp2dFR4a2RCVEplX3VvOU1UaEd4ZVdqQ3p5MVhFeHBWZGk4R1kwUUdaQ1Z6YXV0SDJn',
    'SIDCC': 'AKEyXzV0d4EdZUpL3-bfOcGTepXjoPAllD8CnPh1Kh_yVZEfQWDcnaJU4zp8zBt8EbJa-iCOMB0',
};

// 2. CLIENT CONFIGURATION
// We use the ANDROID client because it provides direct HTTP URLs (no complex signature deciphering needed)
const ANDROID_CLIENT = {
    context: {
        client: {
            clientName: 'ANDROID',
            clientVersion: '19.09.37',
            androidSdkVersion: 31,
            hl: 'en',
            gl: 'IN', // Region set to India for your content
        }
    },
    headers: {
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 12; en_IN)',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.09.37',
        // Inject cookies into the request
        'Cookie': Object.entries(YOUTUBE_COOKIES).map(([k, v]) => `${k}=${v}`).join('; ')
    }
};

/**
 * Fetches the streaming URL and metadata for a given YouTube Video ID.
 * 
 * @param {string} videoId - The YouTube Video ID (e.g., 'YmgHdpl4dBs')
 * @returns {Promise<{url: string, headers: object, details: object}>}
 */
async function getStreamingUrl(videoId) {
    const endpoint = 'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

    try {
        // Make the API request
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...ANDROID_CLIENT.headers
            },
            body: JSON.stringify({
                context: ANDROID_CLIENT.context,
                videoId: videoId,
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp: 19782 // Valid for ~2 days
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`YouTube API Error: ${response.status}`);
        }

        const data = await response.json();

        // Check if video is playable
        if (data.playabilityStatus?.status !== 'OK') {
            throw new Error(`Video not playable: ${data.playabilityStatus?.reason || 'Unknown reason'}`);
        }

        // Extract all available formats
        const formats = [
            ...(data.streamingData?.formats || []),
            ...(data.streamingData?.adaptiveFormats || [])
        ];

        // Filter for audio-only formats
        const audioFormats = formats.filter(f => f.mimeType && f.mimeType.includes('audio'));

        if (audioFormats.length === 0) {
            throw new Error('No audio formats found for this video');
        }

        // Sort by bitrate (highest quality first)
        audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        const bestFormat = audioFormats[0];

        if (!bestFormat.url) {
            throw new Error('Failed to extract direct URL (Ciphered signatures not supported in this simple version)');
        }

        // Return the result with the REQUIRED headers
        return {
            url: bestFormat.url,
            // These headers MUST be passed to the player
            headers: {
                'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
                'Range': 'bytes=0-'
            },
            details: {
                title: data.videoDetails?.title,
                author: data.videoDetails?.author,
                duration: data.videoDetails?.lengthSeconds,
                thumbnail: data.videoDetails?.thumbnail?.thumbnails?.pop()?.url
            }
        };

    } catch (error) {
        console.error('Error in getStreamingUrl:', error);
        throw error;
    }
}

// Export the function for use in other files
module.exports = { getStreamingUrl };

// --- SELF-TEST (Run 'node CompleteYouTubeStreaming.js' to verify) ---
if (require.main === module) {
    (async () => {
        const testId = process.argv[2] || 'YmgHdpl4dBs'; // Default to Indian song
        console.log(`\n🧪 Testing with video ID: ${testId}`);
        try {
            const result = await getStreamingUrl(testId);
            console.log('\n✅ SUCCESS!');
            console.log(`   Title: ${result.details.title}`);
            console.log(`   URL: ${result.url.substring(0, 50)}...`);
            console.log('\n📌 REQUIRED HEADERS (Pass these to TrackPlayer):');
            console.log(result.headers);
        } catch (e) {
            console.error('\n❌ FAILED:', e.message);
        }
    })();
}
