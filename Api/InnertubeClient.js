/**
 * InnerTubeClient.js
 * 
 * Pure JavaScript implementation of YouTube Music InnerTube API.
 * Pure JavaScript implementation for YouTube Music InnerTube API.
 */

import { enhanceYTMusicArtwork } from '../Utils/ArtworkEnhancer';

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
    'Content-Type': 'application/json',
    'Origin': 'https://music.youtube.com',
};

const WEB_REMIX_CONTEXT = {
    context: {
        client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20240422.01.00',
            originalUrl: 'https://music.youtube.com',
            hl: 'en',
            gl: 'IN'
        }
    }
};

class InnerTubeClient {

    /**
     * Helper to make API requests
     */
    static async request(endpoint, body) {
        try {
            const url = `${INNERTUBE_API_URL}/${endpoint}?key=${INNERTUBE_API_KEY}`;
            console.log('🌐 InnerTube request:', {
                endpoint,
                url,
                INNERTUBE_API_URL,
                INNERTUBE_API_KEY: INNERTUBE_API_KEY ? 'present' : 'missing'
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({
                    ...WEB_REMIX_CONTEXT,
                    ...body
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`InnerTube request failed for ${endpoint}:`, error);
            return null;
        }
    }

    /**
     * Parse time string (e.g., "3:45", "1:23:45") to seconds
     * Matches OuterTune's parseTime function
     */
    static parseTime(timeString) {
        if (!timeString) return null;

        const parts = timeString.split(':').map(p => parseInt(p, 10));
        if (parts.some(isNaN)) return null;

        if (parts.length === 2) {
            // MM:SS format
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            // HH:MM:SS format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        return null;
    }

    /**
     * Get Home Feed
     */
    static async getHome() {
        const data = await this.request('browse', { browseId: 'FEmusic_home' });
        return this.parseHome(data);
    }

    /**
     * Get Search Results
     */
    static async search(query, filter = null) {
        // OuterTune's exact filter params
        let params = null;
        if (filter === 'songs') params = 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D';
        if (filter === 'videos') params = 'EgWKAQIQAWoKEAkQChAFEAMQBA%3D%3D';
        if (filter === 'albums') params = 'EgWKAQIYAWoKEAkQChAFEAMQBA%3D%3D';
        if (filter === 'artists') params = 'EgWKAQIgAWoKEAkQChAFEAMQBA%3D%3D';
        if (filter === 'playlists') params = 'EgeKAQQoAEABagoQAxAEEAoQCRAF';

        const data = await this.request('search', { query, params });
        return this.parseSearch(data, filter);
    }

    static async getArtist(browseId) {
        const data = await this.request('browse', { browseId });
        return this.parseArtist(data);
    }

    static async getAlbum(browseId) {
        const data = await this.request('browse', { browseId });
        return this.parseAlbum(data);
    }

    static async getPlaylist(browseId) {
        const data = await this.request('browse', { browseId: browseId.startsWith('VL') ? browseId : `VL${browseId}` });
        return this.parsePlaylist(data);
    }

    static async getRelated(browseId) {
        const data = await this.request('next', { videoId: browseId });
        return this.parseRelated(data);
    }

    /**
     * Get Next/Recommendations for a video (YouTube Music Radio)
     * This is similar to OuterTune's YouTube.next() function
     */
    static async getNext(videoId, playlistId = null, continuation = null) {
        const body = {
            videoId,
            isAudioOnly: true
        };

        if (playlistId) {
            body.playlistId = playlistId;
        }

        if (continuation) {
            body.continuation = continuation;
        }

        const data = await this.request('next', body);
        const result = this.parseNext(data);

        // If we got an automix playlist endpoint, fetch the radio playlist
        if (result.automixPlaylistId) {
            console.log(`🎵 Following automix playlist: ${result.automixPlaylistId}`);
            const radioResult = await this.getNextWithPlaylist(videoId, result.automixPlaylistId);
            if (radioResult && radioResult.items && radioResult.items.length > 0) {
                // Combine current items with radio items
                return {
                    items: [...result.items, ...radioResult.items],
                    continuation: radioResult.continuation,
                    title: result.title || radioResult.title,
                    automixPlaylistId: null // Already processed
                };
            }
        }

        return result;
    }

    /**
     * Get Next with a specific playlist ID (for automix/radio)
     */
    static async getNextWithPlaylist(videoId, playlistId) {
        const body = {
            videoId,
            playlistId,
            isAudioOnly: true,
            enablePersistentPlaylistPanel: true,
            tunerSettingValue: 'AUTOMIX_SETTING_NORMAL'
        };

        const data = await this.request('next', body);
        return this.parseNext(data);
    }

    // --- Parsers ---

    static parseHome(data) {
        const sections = [];
        try {
            // Home Feed logic
            const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs;
            if (!tabs) return [];
            const content = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

            content?.forEach(section => {
                if (section.musicCarouselShelfRenderer) {
                    const shelf = section.musicCarouselShelfRenderer;
                    const items = shelf.contents?.map(item => this.parseItem(item)).filter(i => i) || [];
                    if (items.length > 0) {
                        sections.push({
                            title: shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || '',
                            contents: items // 'contents' matches YTMusic.js expectations
                        });
                    }
                }
            });
        } catch (e) { console.error('Parse Home Error', e); }
        return sections;
    }

    static parseSearch(data, filter) {
        const results = [];
        try {
            // Dump entire response for debugging
            console.log('=== FULL SEARCH RESPONSE ===');
            console.log(JSON.stringify(data, null, 2).substring(0, 5000)); // First 5000 chars
            console.log('=== END RESPONSE ===');

            const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
            if (!contents) {
                console.log('InnerTube Search: No contents found');
                return [];
            }

            console.log(`InnerTube Search: Found ${contents.length} sections`);

            // YouTube wraps results in itemSectionRenderer - need to look inside
            let musicShelfRenderer = null;

            for (const section of contents) {
                // Check for DIRECT musicShelfRenderer (when results exist)
                if (section.musicShelfRenderer) {
                    musicShelfRenderer = section.musicShelfRenderer;
                    console.log('  -> Found musicShelfRenderer directly!');
                    break;
                }

                // Check inside itemSectionRenderer wrapper (no results case)
                if (section.itemSectionRenderer?.contents) {
                    console.log('  -> itemSectionRenderer has', section.itemSectionRenderer.contents.length, 'items');
                    for (const item of section.itemSectionRenderer.contents) {
                        const keys = Object.keys(item);
                        console.log(`     Item keys: [${keys.join(', ')}]`);

                        // Check for messageRenderer (no results message)
                        if (item.messageRenderer) {
                            const message = item.messageRenderer.text?.runs?.[0]?.text;
                            console.log(`     -> messageRenderer: "${message}"`);
                        }

                        if (item.musicShelfRenderer) {
                            musicShelfRenderer = item.musicShelfRenderer;
                            console.log('  -> Found musicShelfRenderer!');
                            break;
                        }
                    }
                }
                if (musicShelfRenderer) break;
            }

            if (!musicShelfRenderer) {
                console.log('InnerTube Search: No musicShelfRenderer found');
                return [];
            }

            console.log(`InnerTube Search: Processing ${musicShelfRenderer.contents?.length || 0} items`);

            if (musicShelfRenderer?.contents) {
                musicShelfRenderer.contents.forEach((item, idx) => {
                    const parsed = this.parseItem(item);
                    if (parsed) {
                        console.log(`✓ ${parsed.title}`);
                        results.push(parsed);
                    }
                });
            }

            console.log(`InnerTube Search: Returning ${results.length} results`);
        } catch (e) { console.error('Parse Search Error', e); }
        return results;
    }

    static parseArtist(data) {
        try {
            const header = data?.header?.musicImmersiveHeaderRenderer;
            const name = header?.title?.runs?.[0]?.text;
            const sections = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

            const albums = [];
            const singles = [];
            const songs = [];

            sections?.forEach(sec => {
                if (sec.musicShelfRenderer) {
                    const title = sec.musicShelfRenderer.title?.runs?.[0]?.text;
                    if (title === 'Songs') {
                        sec.musicShelfRenderer.contents?.forEach(i => {
                            const p = this.parseItem(i);
                            if (p) songs.push(p);
                        });
                    }
                }
                if (sec.musicCarouselShelfRenderer) {
                    const title = sec.musicCarouselShelfRenderer.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text;
                    const items = sec.musicCarouselShelfRenderer.contents?.map(i => this.parseItem(i)).filter(i => i);

                    if (title === 'Albums') albums.push(...items);
                    if (title === 'Singles') singles.push(...items);
                }
            });

            return { name, songs, albums, singles };
        } catch (e) { return null; }
    }

    static parseAlbum(data) {
        try {
            // Try multiple possible structures for album header
            let header = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;

            // Alternative structure: some albums use musicDetailHeaderRenderer
            if (!header) {
                header = data?.header?.musicDetailHeaderRenderer;
            }

            // Another alternative: singleColumnBrowseResultsRenderer for some album types
            if (!header) {
                header = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;
            }

            // Try multiple possible structures for tracks
            let tracksContent = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents;

            // Alternative: musicShelfRenderer
            if (!tracksContent) {
                tracksContent = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents;
            }

            // Another alternative for single column layout
            if (!tracksContent) {
                const sectionContents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
                for (const section of (sectionContents || [])) {
                    if (section.musicShelfRenderer?.contents) {
                        tracksContent = section.musicShelfRenderer.contents;
                        break;
                    }
                    if (section.musicPlaylistShelfRenderer?.contents) {
                        tracksContent = section.musicPlaylistShelfRenderer.contents;
                        break;
                    }
                }
            }

            const title = header?.title?.runs?.[0]?.text || header?.title?.simpleText;

            // Artist can be in different places
            const artist = header?.straplineTextOne?.runs?.[0]?.text ||
                header?.subtitle?.runs?.[0]?.text ||
                header?.secondTitle?.runs?.[0]?.text;

            // Year extraction - try multiple positions
            let year = null;
            const subtitleRuns = header?.subtitle?.runs;
            if (subtitleRuns && Array.isArray(subtitleRuns)) {
                for (const run of subtitleRuns) {
                    if (run.text && /^\d{4}$/.test(run.text)) {
                        year = run.text;
                        break;
                    }
                }
            }

            // Get thumbnails array (not just single thumbnail)
            const thumbnailsData = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
                [];

            // Create thumbnails array in expected format
            const thumbnails = thumbnailsData.map(thumb => ({
                url: enhanceYTMusicArtwork(thumb.url, 'album-header'),
                link: enhanceYTMusicArtwork(thumb.url, 'album-header'),
                width: thumb.width,
                height: thumb.height
            }));

            // Parse tracks
            const tracks = tracksContent?.map(t => this.parseItem(t)).filter(i => i) || [];

            // Get browseId from the data if available
            const browseId = data?.responseContext?.serviceTrackingParams?.[0]?.params?.find(p => p.key === 'browse_id')?.value;

            console.log(`InnerTube parseAlbum: title="${title}", artist="${artist}", year="${year}", tracks=${tracks.length}, thumbnails=${thumbnails.length}`);

            // Return in format expected by getYTMusicAlbumData
            return {
                title,
                artist,
                artists: artist ? [{ name: artist, id: null }] : [],
                year,
                thumbnails,  // Array format expected by getYTMusicAlbumData
                thumbnail: thumbnails[thumbnails.length - 1]?.url,  // Also include single for backward compat
                tracks,      // 'tracks' expected by getYTMusicAlbumData
                songs: tracks,  // Also include 'songs' for backward compat
                browseId
            };
        } catch (e) {
            console.error('parseAlbum error:', e);
            return null;
        }
    }

    static parsePlaylist(data) {
        try {

            const header = data?.header?.musicDetailHeaderRenderer || data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;
            const tracks = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents;

            const title = header?.title?.runs?.[0]?.text;
            const songs = tracks?.map(t => this.parseItem(t)).filter(i => i) || [];

            // Extract additional metadata
            const thumbnails = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
            const description = header?.description?.runs?.[0]?.text || header?.description?.simpleText;

            // Author/Subtitle typically in subtitle runs
            // "Playlist • YouTube Music • 2023" or "Username • 50 songs"
            const subtitleRuns = header?.subtitle?.runs;
            const author = subtitleRuns?.find(r => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))?.text
                || subtitleRuns?.[0]?.text
                || "YouTube Music";
            const year = subtitleRuns?.find(r => r.text.match(/\d{4}/))?.text;

            // Extract playlist thumbnail (skip enhancement - already high quality)
            const playlistThumbnail = thumbnails?.[thumbnails.length - 1]?.url;

            return {
                id: data?.header?.musicDetailHeaderRenderer?.menu?.menuRenderer?.topLevelButtons?.[0]?.buttonRenderer?.navigationEndpoint?.watchEndpoint?.playlistId,
                title,
                songs,
                thumbnails,
                thumbnail: playlistThumbnail, // Add main thumbnail field
                description,
                author,
                year,
                count: songs.length
            };
        } catch (e) { console.error('Parse Playlist Error', e); return null; }
    }

    static parseRelated(data) {
        try {
            const panel = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
            const items = panel?.contents?.map(i => this.parseItem(i)).filter(i => i) || [];
            return items;
        } catch (e) { return null; }
    }

    /**
     * Parse Next/Recommendations response
     * Returns an object with items (songs), continuation token, and automix playlist ID
     */
    static parseNext(data) {
        try {
            const panel = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;

            if (!panel) {
                console.log('InnerTube parseNext: No panel found');
                return { items: [], continuation: null, automixPlaylistId: null };
            }

            // Parse all items (songs) - skip automix preview items for now
            const items = [];
            let automixPlaylistId = null;

            for (const item of (panel.contents || [])) {
                // Check for automix preview - extract the playlist endpoint
                if (item.automixPreviewVideoRenderer) {
                    const watchEndpoint = item.automixPreviewVideoRenderer?.content?.automixPlaylistVideoRenderer?.navigationEndpoint?.watchPlaylistEndpoint;
                    if (watchEndpoint?.playlistId) {
                        automixPlaylistId = watchEndpoint.playlistId;
                        console.log(`🎵 Found automix playlist ID: ${automixPlaylistId}`);
                    }
                    continue;
                }

                const parsed = this.parseItem(item);
                if (parsed) {
                    items.push(parsed);
                }
            }

            // Get continuation token for loading more recommendations
            const continuation = panel.continuations?.[0]?.nextContinuationData?.continuation || null;

            console.log(`InnerTube parseNext: Found ${items.length} recommendations, automix: ${automixPlaylistId ? 'yes' : 'no'}, continuation: ${continuation ? 'yes' : 'no'}`);

            return {
                items,
                continuation,
                automixPlaylistId,
                // Also return the title if available
                title: data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.header?.musicQueueHeaderRenderer?.subtitle?.runs?.[0]?.text || null
            };
        } catch (e) {
            console.error('Parse Next Error:', e);
            return { items: [], continuation: null, automixPlaylistId: null };
        }
    }

    // --- generic Item Parser ---
    static parseItem(itemWrapper) {
        try {
            const item = itemWrapper.musicResponsiveListItemRenderer || itemWrapper.musicTwoRowItemRenderer || itemWrapper.playlistPanelVideoRenderer;
            if (!item) {
                // Debug: log what keys are present in itemWrapper
                console.log('parseItem: No recognized renderer, keys:', Object.keys(itemWrapper || {}));
                return null;
            }

            // CRITICAL: Search results store videoId in playlistItemData.videoId (OuterTune's approach)
            // Also try overlay for album tracks which use a different structure
            const videoId = item.playlistItemData?.videoId ||
                item.videoId ||
                item.onTap?.watchEndpoint?.videoId ||
                item.navigationEndpoint?.watchEndpoint?.videoId ||
                item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
            let browseId = item.navigationEndpoint?.browseEndpoint?.browseId || item.onTap?.browseEndpoint?.browseId;

            // Try flexColumns first (used in search results), then fallback to direct title
            let title = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            if (!title) {
                title = item.title?.runs?.[0]?.text || item.title?.simpleText;
            }

            // Thumbnail - get highest quality available
            const thumbnails = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                item.thumbnails || [];

            // Sort thumbnails by width (descending) to get highest quality
            const sortedThumbnails = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
            let thumbnail = sortedThumbnails[0]?.url;

            // If we have a videoId, construct the highest quality YouTube thumbnail URL
            // YouTube provides these quality levels:
            // - maxresdefault.jpg (1280x720)
            // - sddefault.jpg (640x480)
            // - hqdefault.jpg (480x360)
            // - mqdefault.jpg (320x180)
            if (videoId && (!thumbnail || thumbnail.includes('60-') || thumbnail.includes('w60'))) {
                thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }

            // Also provide a high-res version for full player
            const highResThumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : thumbnail;

            // Type detection
            let type = 'song';
            let playlistId = null;

            if (browseId && (browseId.startsWith('MPRE') || browseId.startsWith('OLAK'))) type = 'album';
            if (browseId && browseId.startsWith('VL')) {
                type = 'playlist';
                playlistId = browseId;
            } else if (browseId && browseId.startsWith('PL')) {
                playlistId = `VL${browseId}`;
                type = 'playlist';
            }
            if (browseId && browseId.startsWith('UC')) type = 'artist';

            if (itemWrapper.musicTwoRowItemRenderer && !videoId && type === 'song') type = 'album/playlist';

            // Artist extraction - handle multiple structures:
            // 1. Search results: flexColumns[1].text.runs
            // 2. Recommendations (playlistPanelVideoRenderer): longBylineText.runs or shortBylineText.runs
            let artist = 'Unknown';
            let artistsList = [];

            // Try flexColumns first (search results)
            const flexColumn1 = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
            if (flexColumn1 && Array.isArray(flexColumn1) && flexColumn1.length > 0) {
                // Filter to get only even-indexed elements (skip " • " separators)
                const oddElements = flexColumn1.filter((_, index) => index % 2 === 0);
                artistsList = oddElements.map(run => ({
                    name: run.text,
                    id: run.navigationEndpoint?.browseEndpoint?.browseId
                }));
                artist = oddElements.map(run => run.text).join(', ') || 'Unknown';
            }
            // Try longBylineText (used in playlistPanelVideoRenderer for recommendations)
            else if (item.longBylineText?.runs && Array.isArray(item.longBylineText.runs)) {
                const runs = item.longBylineText.runs;
                // First run is usually the artist name
                artistsList = runs.filter((_, index) => index % 2 === 0).map(run => ({
                    name: run.text,
                    id: run.navigationEndpoint?.browseEndpoint?.browseId
                }));
                artist = runs.filter((_, index) => index % 2 === 0).map(run => run.text).join(', ') || 'Unknown';
            }
            // Try shortBylineText as fallback
            else if (item.shortBylineText?.runs && Array.isArray(item.shortBylineText.runs)) {
                const runs = item.shortBylineText.runs;
                artistsList = runs.filter((_, index) => index % 2 === 0).map(run => ({
                    name: run.text,
                    id: run.navigationEndpoint?.browseEndpoint?.browseId
                }));
                artist = runs.filter((_, index) => index % 2 === 0).map(run => run.text).join(', ') || 'Unknown';
            }
            // Try subtitle as last resort (used in some UI)
            else if (item.subtitle?.runs && Array.isArray(item.subtitle.runs)) {
                // Usually format: "Artist • Duration" or "Artist • Album • Year"
                const firstRun = item.subtitle.runs[0];
                if (firstRun?.text) {
                    artist = firstRun.text;
                    artistsList = [{ name: firstRun.text, id: firstRun.navigationEndpoint?.browseEndpoint?.browseId }];
                }
            }

            // Duration extraction - from fixedColumns[0] or lengthText (for playlistPanelVideoRenderer)
            let durationText = item.fixedColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            if (!durationText) {
                durationText = item.lengthText?.runs?.[0]?.text || item.lengthText?.simpleText;
            }
            const duration = durationText ? this.parseTime(durationText) : null;


            return {
                videoId,
                browseId,
                playlistId,
                title,
                artist,
                artists: artistsList,  // Array of artist objects
                duration,  // Duration in seconds
                thumbnail,
                highResThumbnail,  // High resolution for full-screen player
                thumbnails,
                type,
                // UI Compat
                id: videoId || browseId,
                name: title,
                subtitle: item.subtitle?.runs?.map(r => r.text).join('') || item.longBylineText?.runs?.map(r => r.text).join('') || item.shortBylineText?.runs?.map(r => r.text).join('') || '',
                image: videoId ? [
                    { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, quality: 'max' },
                    { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, quality: 'hq' },
                    { url: thumbnail, quality: 'default' }
                ] : thumbnails.map(t => ({ url: t.url, quality: 'hd' })),
                artwork: highResThumbnail || thumbnail,  // Use original quality for cards/lists (performance optimized)
                year: item.subtitle?.runs?.[item.subtitle.runs.length - 1]?.text || ''
            };
        } catch (e) { console.error(e); return null; }
    }
}

export default InnerTubeClient;
