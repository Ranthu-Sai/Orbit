/**
 * InnerTubeClient.js
 * 
 * Pure JavaScript implementation of YouTube Music InnerTube API.
 * Replaces the Python bridge for data fetching.
 */

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
            const response = await fetch(`${INNERTUBE_API_URL}/${endpoint}?key=${INNERTUBE_API_KEY}`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({
                    ...WEB_REMIX_CONTEXT,
                    ...body
                })
            });
            return await response.json();
        } catch (error) {
            console.error(`InnerTube request failed for ${endpoint}:`, error);
            return null;
        }
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
            const header = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;
            const tracks = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents;

            const title = header?.title?.runs?.[0]?.text;
            const artist = header?.straplineTextOne?.runs?.[0]?.text;
            const year = header?.subtitle?.runs?.[2]?.text;
            const thumbnail = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url;

            const songs = tracks?.map(t => this.parseItem(t)).filter(i => i) || [];
            return { title, artist, year, thumbnail, songs };
        } catch (e) { return null; }
    }

    static parsePlaylist(data) {
        try {
            console.log('=== YTMusic Playlist Raw Response ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('=== End Response ===');

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

            return {
                id: data?.header?.musicDetailHeaderRenderer?.menu?.menuRenderer?.topLevelButtons?.[0]?.buttonRenderer?.navigationEndpoint?.watchEndpoint?.playlistId,
                title,
                songs,
                thumbnails,
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

    // --- generic Item Parser ---
    static parseItem(itemWrapper) {
        try {
            const item = itemWrapper.musicResponsiveListItemRenderer || itemWrapper.musicTwoRowItemRenderer || itemWrapper.playlistPanelVideoRenderer;
            if (!item) return null;

            // CRITICAL: Search results store videoId in playlistItemData.videoId (OuterTune's approach)
            const videoId = item.playlistItemData?.videoId || item.videoId || item.onTap?.watchEndpoint?.videoId || item.navigationEndpoint?.watchEndpoint?.videoId;
            let browseId = item.navigationEndpoint?.browseEndpoint?.browseId || item.onTap?.browseEndpoint?.browseId;

            // Try flexColumns first (used in search results), then fallback to direct title
            let title = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            if (!title) {
                title = item.title?.runs?.[0]?.text || item.title?.simpleText;
            }

            // Thumbnail
            const thumbnails = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                item.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                item.thumbnails || [];
            const thumbnail = thumbnails?.[thumbnails.length - 1]?.url;

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

            // Subtitle / Artist
            const subtitleRuns = item.subtitle?.runs || item.longBylineText?.runs || item.shortBylineText?.runs;
            // Artist logic: Try to find run with navigationEndpoint to browse/artist or just take the first text
            const artistRun = subtitleRuns?.find(r => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC')) || subtitleRuns?.[0];
            const artist = artistRun?.text || 'Unknown';

            return {
                videoId,
                browseId,
                playlistId,
                title,
                artist,
                thumbnail,
                thumbnails,
                type,
                // UI Compat
                id: videoId || browseId,
                name: title,
                subtitle: subtitleRuns?.map(r => r.text).join('') || '',
                image: thumbnails.map(t => ({ url: t.url, quality: 'hd' })),
                year: subtitleRuns?.[2]?.text || ''
            };
        } catch (e) { console.error(e); return null; }
    }
}

export default InnerTubeClient;
