/**
 * InnerTubeClient.js
 * 
 * Pure JavaScript implementation of YouTube Music InnerTube API.
 * Pure JavaScript implementation for YouTube Music InnerTube API.
 */

import { enhanceYTMusicArtwork } from '../Utils/ArtworkEnhancer';

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1';

// Client ID for WEB_REMIX (YouTube Music Web)
const WEB_REMIX_CLIENT_ID = '67';
const WEB_REMIX_CLIENT_VERSION = '1.20241127.01.00';
const WEB_REMIX_CLIENT_NAME = 'WEB_REMIX';

// Match OuterTune's headers exactly
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Origin': 'https://music.youtube.com',
    'Referer': 'https://music.youtube.com/',
    'X-Goog-Api-Format-Version': '1',
    'X-YouTube-Client-Name': WEB_REMIX_CLIENT_ID,
    'X-YouTube-Client-Version': WEB_REMIX_CLIENT_VERSION,
};

const WEB_REMIX_CONTEXT = {
    context: {
        client: {
            clientName: WEB_REMIX_CLIENT_NAME,
            clientVersion: WEB_REMIX_CLIENT_VERSION,
            originalUrl: 'https://music.youtube.com',
            hl: 'en',
            gl: 'IN',
            // visitorData will be added dynamically if available
        }
    }
};


class InnerTubeClient {

    /**
     * Helper to make API requests
     * @param {string} endpoint - API endpoint
     * @param {object} body - Request body
     * @param {string} gl - Country code
     * @param {string|null} authCookies - Optional auth cookies for personalized content
     * @param {string} hl - Host language (e.g., 'en', 'hi', 'en-IN')
     * @param {string|null} visitorData - Optional visitor data for personalization
     * @param {string|null} dataSyncId - Optional data sync ID for logged-in personalization
     */
    static async request(endpoint, body, gl = 'IN', authCookies = null, hl = 'en', visitorData = null, dataSyncId = null) {
        try {
            const url = `${INNERTUBE_API_URL}/${endpoint}?key=${INNERTUBE_API_KEY}`;

            // Get stored visitorData if not provided
            let effectiveVisitorData = visitorData;
            if (!effectiveVisitorData) {
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    effectiveVisitorData = await AsyncStorage.getItem('innertube_visitor_data');
                } catch (e) { }
            }

            console.log('🌐 InnerTube request:', {
                endpoint,
                gl,
                hl,
                authenticated: !!authCookies,
                hasVisitorData: !!effectiveVisitorData,
            });

            // Create context with dynamic GL, HL, and visitorData (like OuterTune)
            const client = {
                ...WEB_REMIX_CONTEXT.context.client,
                visitorData: effectiveVisitorData,
            };

            // Only add gl and hl if they are not SYSTEM_DEFAULT
            if (gl && gl !== 'SYSTEM_DEFAULT') client.gl = gl;
            if (hl && hl !== 'SYSTEM_DEFAULT') client.hl = hl;

            const requestContext = {
                context: {
                    client: client,
                    user: {
                        lockedSafetyMode: false,
                        // Add onBehalfOfUser for logged-in personalization (like OuterTune)
                        ...(dataSyncId && authCookies ? { onBehalfOfUser: dataSyncId } : {})
                    }
                }
            };

            // Build headers with optional auth cookies
            const requestHeaders = { ...HEADERS };
            if (authCookies) {
                requestHeaders['Cookie'] = authCookies;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify({
                    ...requestContext,
                    ...body
                }),
            });

            const data = await response.json();

            // Extract and store visitorData from response for future requests (like OuterTune)
            if (data?.responseContext?.visitorData && !effectiveVisitorData) {
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.setItem('innertube_visitor_data', data.responseContext.visitorData);
                    console.log('📍 Stored new visitorData for personalization');
                } catch (e) { }
            }

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
     * Reset visitor data to get fresh personalization
     * Call this when user wants to reset their YouTube Music recommendations
     */
    static async resetVisitorData() {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem('innertube_visitor_data');
            // Also clear the home feed cache
            await AsyncStorage.removeItem('ytmusic_home_feed_full_v6');
            console.log('🔄 Reset visitorData - recommendations will be refreshed');
            return true;
        } catch (e) {
            console.error('Failed to reset visitorData:', e);
            return false;
        }
    }

    /**
     * Get current visitor data (for debugging)
     */
    static async getVisitorData() {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            return await AsyncStorage.getItem('innertube_visitor_data');
        } catch (e) {
            return null;
        }
    }
    /**
     * Get Home Feed with continuation support
     * Fetches sections by following continuation tokens and chips (like OuterTune)
     * @param {number} sectionLimit - Maximum number of sections to fetch
     */
    static async getHome(sectionLimit = 20) {
        let authCookies = null;

        // Try to get auth cookies for personalized content
        try {
            const ytAuthService = require('../Utils/YouTubeAuthService').default;
            if (ytAuthService.isAuth()) {
                authCookies = await ytAuthService.getCookies();
                console.log('🔐 InnerTube getHome: Using authenticated request');
            }
        } catch (e) {
            console.log('InnerTube getHome: Proceeding without auth');
        }

        // Get user's language and country preference from settings
        // Note: Language affects UI text, songs are based on listening HISTORY (visitorData)
        // Use an account with listening history for personalized recommendations
        let userLanguage = 'SYSTEM_DEFAULT';
        let userCountry = 'SYSTEM_DEFAULT';
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const storedLang = await AsyncStorage.getItem('ytmusic_language');
            const storedCountry = await AsyncStorage.getItem('ytmusic_country');
            if (storedLang) userLanguage = storedLang;
            if (storedCountry) userCountry = storedCountry;
            console.log(`🌍 InnerTube getHome: Using locale ${userLanguage}/${userCountry}`);
        } catch (e) {
            console.log('InnerTube getHome: Using system default locale');
        }

        // Initial request with user's language preference
        const data = await this.request('browse', { browseId: 'FEmusic_home' }, userCountry, authCookies, userLanguage);

        // Parse initial sections, chips, and continuation token
        let { sections, chips, continuation } = this.parseHomeWithContinuation(data);
        console.log(`📊 InnerTube getHome: Initial sections: ${sections.length}, chips: ${chips?.length || 0}`);

        let allSections = [...sections];
        const seenTitles = new Set(sections.map(s => s.title));

        // 1. Follow continuations iteratively (Main Home Feed)
        let continuationCount = 0;
        const MAX_CONTINUATIONS = 5;

        while (continuation && allSections.length < sectionLimit && continuationCount < MAX_CONTINUATIONS) {
            console.log(`🔄 InnerTube getHome: Following continuation ${continuationCount + 1}...`);
            const contData = await this.request('browse', { continuation }, userCountry, authCookies, userLanguage);
            const contResult = this.parseHomeContinuation(contData);

            let addedInThisCont = 0;
            contResult.sections.forEach(section => {
                if (section.title && !seenTitles.has(section.title)) {
                    seenTitles.add(section.title);
                    allSections.push(section);
                    addedInThisCont++;
                }
            });

            console.log(`✅ Added ${addedInThisCont} sections from continuation ${continuationCount + 1}`);
            continuation = contResult.continuation;
            continuationCount++;

            if (addedInThisCont === 0) break; // Stop if no new sections found
        }

        // 2. Fetch from chips (additional variety like OuterTune)
        if (chips && chips.length > 0 && allSections.length < sectionLimit) {
            console.log(`🎨 InnerTube getHome: Found ${chips.length} chips, loading content from top chips...`);

            const chipsToFetch = [];

            // Prioritize the "Music" chip if found (contains personalized "Albums for you")
            const musicChip = chips.find(c => c.title.toLowerCase().includes('music'));
            if (musicChip) {
                chipsToFetch.push(musicChip);
                console.log('🎯 InnerTube getHome: Prioritizing "Music" chip for personalized content');
            }

            // Add other chips up to limit
            chips.forEach(c => {
                if (c !== musicChip && chipsToFetch.length < 8) {
                    chipsToFetch.push(c);
                }
            });

            const chipPromises = chipsToFetch.map(async (chip, idx) => {
                if (!chip.params) return [];

                try {
                    const chipData = await this.request('browse', {
                        browseId: 'FEmusic_home',
                        params: chip.params
                    }, userCountry, authCookies, userLanguage);

                    const chipResult = this.parseHomeWithContinuation(chipData);
                    return chipResult.sections;
                } catch (e) {
                    console.log(`❌ Failed to fetch chip "${chip.title}":`, e.message);
                    return [];
                }
            });

            const chipResultsArr = await Promise.all(chipPromises);

            chipResultsArr.forEach(chipSections => {
                chipSections.forEach(section => {
                    if (section.title && !seenTitles.has(section.title)) {
                        seenTitles.add(section.title);
                        allSections.push(section);
                        console.log(`✅ Added from chip: "${section.title}"`);
                    }
                });
            });
        }

        console.log(`🎉 InnerTube getHome: Total sections fetched: ${allSections.length}`);
        return allSections;
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

    /**
     * Get Search Suggestions
     * Uses music/get_search_suggestions endpoint
     */
    static async getSearchSuggestions(query) {
        try {
            const url = `${INNERTUBE_API_URL}/music/get_search_suggestions?key=${INNERTUBE_API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({
                    ...WEB_REMIX_CONTEXT,
                    input: query
                }),
            });

            const data = await response.json();

            // Parse suggestions from response
            const suggestions = [];
            const contents = data?.contents;

            if (contents && Array.isArray(contents)) {
                // First section typically contains text suggestions
                const suggestionsSection = contents[0]?.searchSuggestionsSectionRenderer?.contents;
                if (suggestionsSection) {
                    for (const item of suggestionsSection) {
                        if (item.searchSuggestionRenderer?.suggestion?.runs) {
                            const text = item.searchSuggestionRenderer.suggestion.runs
                                .map(run => run.text)
                                .join('');
                            if (text) {
                                suggestions.push(text);
                            }
                        }
                    }
                }
            }

            return {
                queries: suggestions,
                recommendedItems: [] // Can be parsed from second section if needed
            };
        } catch (error) {
            console.error('InnerTubeClient getSearchSuggestions error:', error);
            return { queries: [], recommendedItems: [] };
        }
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
     * Get Section Items (See All)
     * Supports lazy loading via continuation
     */
    static async getSection(browseId, params = null, continuation = null) {
        if (continuation) {
            const data = await this.request('browse', { continuation });
            return this.parseSection(data);
        }

        const data = await this.request('browse', { browseId, params });
        return this.parseSection(data);
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
                            contents: items
                        });
                    }
                }
            });
        } catch (e) { console.error('Parse Home Error', e); }
        return sections;
    }

    /**
     * Parse home response and extract continuation token and chips
     */
    static parseHomeWithContinuation(data) {
        const sections = [];
        let continuation = null;
        let chips = [];

        try {
            console.log('🔍 parseHomeWithContinuation: Analyzing response structure...');
            console.log('🔍 Response has contents:', !!data?.contents);
            console.log('🔍 Response has singleColumnBrowseResultsRenderer:', !!data?.contents?.singleColumnBrowseResultsRenderer);

            const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs;
            console.log('🔍 Tabs found:', tabs?.length || 0);

            if (!tabs) {
                console.log('❌ No tabs found in response');
                console.log('🔍 Response keys:', Object.keys(data || {}));
                return { sections: [], continuation: null, chips: [] };
            }

            const sectionListRenderer = tabs[0]?.tabRenderer?.content?.sectionListRenderer;
            const content = sectionListRenderer?.contents;

            console.log('🔍 SectionListRenderer contents count:', content?.length || 0);
            console.log('🔍 SectionListRenderer has continuations:', !!sectionListRenderer?.continuations);

            // Extract chips from header (used for loading more content)
            const chipCloud = sectionListRenderer?.header?.chipCloudRenderer?.chips;
            if (chipCloud && Array.isArray(chipCloud)) {
                chips = chipCloud.map(chip => {
                    const chipRenderer = chip.chipCloudChipRenderer;
                    if (!chipRenderer) return null;
                    return {
                        title: chipRenderer.text?.runs?.[0]?.text || '',
                        params: chipRenderer.navigationEndpoint?.browseEndpoint?.params || null,
                        isSelected: chipRenderer.isSelected || false
                    };
                }).filter(c => c && c.params && !c.isSelected);
                console.log('🎨 Found chips:', chips.map(c => c.title).join(', '));
            }

            // Get continuation token for more sections
            continuation = sectionListRenderer?.continuations?.[0]?.nextContinuationData?.continuation ||
                sectionListRenderer?.continuations?.[0]?.reloadContinuationData?.continuation;

            console.log('🔍 Continuation token found:', continuation ? 'YES' : 'NO');

            content?.forEach((section, idx) => {
                if (section.musicCarouselShelfRenderer) {
                    const shelf = section.musicCarouselShelfRenderer;
                    const headerRenderer = shelf.header?.musicCarouselShelfBasicHeaderRenderer;
                    const title = headerRenderer?.title?.runs?.[0]?.text || '';
                    const strapline = headerRenderer?.strapline?.runs?.[0]?.text;
                    const items = shelf.contents?.map(item => this.parseItem(item)).filter(i => i) || [];
                    console.log(`🎯 Section ${idx}: "${title}" (strapline: ${strapline}) - ${items.length} items`);
                    if (items.length > 0) {
                        sections.push({
                            title,
                            strapline,
                            contents: items
                        });
                    }
                } else if (section.musicImmersiveCarouselShelfRenderer) {
                    // Handle immersive carousel (sometimes used for featured content)
                    const shelf = section.musicImmersiveCarouselShelfRenderer;
                    const headerRenderer = shelf.header?.musicCarouselShelfBasicHeaderRenderer;
                    const title = headerRenderer?.title?.runs?.[0]?.text || 'Featured';
                    const strapline = headerRenderer?.strapline?.runs?.[0]?.text;
                    const items = shelf.contents?.map(item => this.parseItem(item)).filter(i => i) || [];
                    console.log(`🎯 Immersive Section ${idx}: "${title}" (strapline: ${strapline}) - ${items.length} items`);
                    if (items.length > 0) {
                        sections.push({
                            title,
                            strapline,
                            contents: items
                        });
                    }
                } else {
                    console.log(`⏭️ Section ${idx}: Skipped (not a carousel shelf). Keys:`, Object.keys(section));
                }
            });
        } catch (e) {
            console.error('Parse Home With Continuation Error', e);
        }

        console.log(`📊 parseHomeWithContinuation: Returning ${sections.length} sections, ${chips.length} chips`);
        return { sections, continuation, chips };
    }

    /**
     * Parse home continuation response
     * Handles both continuationContents (proper continuation) and contents (fallback)
     */
    static parseHomeContinuation(data) {
        const sections = [];
        let continuation = null;

        try {
            console.log('🔍 parseHomeContinuation: Analyzing response...');
            console.log('🔍 Has continuationContents:', !!data?.continuationContents);
            console.log('🔍 Has contents:', !!data?.contents);
            console.log('🔍 Response keys:', Object.keys(data || {}));

            const sectionListContinuation = data?.continuationContents?.sectionListContinuation;

            if (sectionListContinuation) {
                console.log('✅ Found sectionListContinuation with', sectionListContinuation.contents?.length || 0, 'sections');

                // Get next continuation token
                continuation = sectionListContinuation.continuations?.[0]?.nextContinuationData?.continuation ||
                    sectionListContinuation.continuations?.[0]?.reloadContinuationData?.continuation;

                // Parse sections
                sectionListContinuation.contents?.forEach((section, idx) => {
                    if (section.musicCarouselShelfRenderer) {
                        const shelf = section.musicCarouselShelfRenderer;
                        const headerRenderer = shelf.header?.musicCarouselShelfBasicHeaderRenderer;
                        const title = headerRenderer?.title?.runs?.[0]?.text || '';
                        const strapline = headerRenderer?.strapline?.runs?.[0]?.text;
                        const items = shelf.contents?.map(item => this.parseItem(item)).filter(i => i) || [];
                        console.log(`🎯 Continuation Section ${idx}: "${title}" (strapline: ${strapline}) - ${items.length} items`);
                        if (items.length > 0) {
                            sections.push({
                                title,
                                strapline,
                                contents: items
                            });
                        }
                    }
                });
            } else if (data?.contents?.singleColumnBrowseResultsRenderer) {
                // Fallback: API returned fresh content instead of continuation
                // Parse it as a fresh response but skip duplicates
                console.log('⚠️ No continuationContents, falling back to fresh response parsing');
                const result = this.parseHomeWithContinuation(data);
                sections.push(...result.sections);
                continuation = result.continuation;
            } else {
                console.log('❌ No valid response structure found');
            }
        } catch (e) {
            console.error('Parse Home Continuation Error', e);
        }

        console.log(`📊 parseHomeContinuation: Returning ${sections.length} sections, continuation: ${!!continuation}`);
        return { sections, continuation };
    }


    static parseSearch(data, filter) {
        const results = [];
        try {

            const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
            if (!contents) {
                console.log('InnerTube Search: No contents found');
                return [];
            }

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

            if (musicShelfRenderer?.contents) {
                musicShelfRenderer.contents.forEach((item, idx) => {
                    const parsed = this.parseItem(item);
                    if (parsed) {
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
            // Get artist header - try multiple possible renderers (OuterTune style)
            const immersiveHeader = data?.header?.musicImmersiveHeaderRenderer;
            const visualHeader = data?.header?.musicVisualHeaderRenderer;
            const detailHeader = data?.header?.musicDetailHeaderRenderer;
            const headerRenderer = data?.header?.musicHeaderRenderer;

            // Extract artist name from various header types
            const artistName = immersiveHeader?.title?.runs?.[0]?.text ||
                visualHeader?.title?.runs?.[0]?.text ||
                headerRenderer?.title?.runs?.[0]?.text ||
                detailHeader?.title?.runs?.[0]?.text;

            // Extract thumbnail - try all possible paths (OuterTune exact paths)
            const immersiveThumbs = immersiveHeader?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
            const visualThumbs = visualHeader?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
            const detailThumbs = detailHeader?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;

            // Get highest quality thumbnail
            const thumbnail = (immersiveThumbs?.length > 0 ? immersiveThumbs[immersiveThumbs.length - 1]?.url : null) ||
                (visualThumbs?.length > 0 ? visualThumbs[visualThumbs.length - 1]?.url : null) ||
                (detailThumbs?.length > 0 ? detailThumbs[detailThumbs.length - 1]?.url : null);

            // Extract channel ID for subscription
            const channelId = immersiveHeader?.subscriptionButton?.subscribeButtonRenderer?.channelId;

            // Extract play/shuffle/radio endpoints from header
            const playEndpoint = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
                ?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer
                ?.contents?.[0]?.musicResponsiveListItemRenderer?.overlay?.musicItemThumbnailOverlayRenderer
                ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;

            const shuffleEndpoint = immersiveHeader?.playButton?.buttonRenderer?.navigationEndpoint?.watchEndpoint ||
                data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer
                    ?.contents?.[0]?.musicShelfRenderer?.contents?.[0]?.musicResponsiveListItemRenderer?.navigationEndpoint?.watchPlaylistEndpoint;

            const radioEndpoint = immersiveHeader?.startRadioButton?.buttonRenderer?.navigationEndpoint?.watchEndpoint;

            // Extract share link
            const shareLink = `https://music.youtube.com/channel/${channelId || ''}`;

            // Extract description
            const description = immersiveHeader?.description?.runs?.[0]?.text;

            // Build artist object (matching OuterTune's ArtistItem structure)
            const artist = {
                id: channelId,
                title: artistName,
                thumbnail,
                channelId,
                playEndpoint,
                shuffleEndpoint,
                radioEndpoint,
                shareLink
            };

            // Parse all sections dynamically (matching OuterTune's approach)
            const sectionContents = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]
                ?.tabRenderer?.content?.sectionListRenderer?.contents || [];

            const sections = [];

            for (const section of sectionContents) {
                const parsedSection = this.parseArtistSection(section);
                if (parsedSection && parsedSection.items.length > 0) {
                    // Deduplicate items by id
                    const seenIds = new Set();
                    parsedSection.items = parsedSection.items.filter(item => {
                        const id = item.videoId || item.id || item.browseId;
                        if (!id || seenIds.has(id)) return false;
                        seenIds.add(id);
                        return true;
                    });
                    sections.push(parsedSection);
                }
            }

            // Legacy support: also return flat arrays for backward compatibility
            const songs = [];
            const albums = [];
            const singles = [];
            const videos = [];
            const playlists = [];
            const relatedArtists = [];
            const seenSongIds = new Set();

            for (const sec of sections) {
                const titleLower = sec.title.toLowerCase();
                if (titleLower === 'songs' || titleLower.includes('song')) {
                    // Deduplicate songs
                    for (const item of sec.items) {
                        const id = item.videoId || item.id;
                        if (id && !seenSongIds.has(id)) {
                            seenSongIds.add(id);
                            songs.push(item);
                        }
                    }
                } else if (titleLower === 'albums') {
                    albums.push(...sec.items);
                } else if (titleLower === 'singles' || titleLower.includes('single') || titleLower.includes('ep')) {
                    singles.push(...sec.items);
                } else if (titleLower === 'videos' || titleLower.includes('video')) {
                    videos.push(...sec.items);
                } else if (titleLower.includes('playlist')) {
                    playlists.push(...sec.items);
                } else if (titleLower.includes('fans might') || titleLower.includes('similar') || titleLower.includes('like')) {
                    relatedArtists.push(...sec.items);
                }
            }

            return {
                artist,
                sections,
                description,
                // Legacy flat arrays for backward compatibility
                name: artistName,
                songs,
                albums,
                singles,
                videos,
                playlists,
                relatedArtists,
                thumbnails: thumbnail ? [{ url: thumbnail }] : []
            };
        } catch (e) {
            console.error('parseArtist error:', e);
            return null;
        }
    }

    /**
     * Parse individual artist section (musicShelfRenderer or musicCarouselShelfRenderer)
     * Matching OuterTune's ArtistPage.fromSectionListRendererContent
     */
    static parseArtistSection(section) {
        try {
            // Handle musicShelfRenderer (songs displayed as list)
            if (section.musicShelfRenderer) {
                const renderer = section.musicShelfRenderer;
                const title = renderer.title?.runs?.[0]?.text || '';

                // OuterTune uses getItems() which handles continuationItemRenderer
                const rawContents = renderer.contents || [];

                const items = rawContents.map(i => this.parseArtistSongItem(i)).filter(i => i) || [];
                const moreEndpoint = renderer.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint;

                return {
                    title,
                    items,
                    moreEndpoint: moreEndpoint ? {
                        browseId: moreEndpoint.browseId,
                        params: moreEndpoint.params
                    } : null,
                    type: 'songs'
                };
            }

            // Handle musicCarouselShelfRenderer (albums, playlists, artists as horizontal scroll)
            if (section.musicCarouselShelfRenderer) {
                const renderer = section.musicCarouselShelfRenderer;
                const headerRenderer = renderer.header?.musicCarouselShelfBasicHeaderRenderer;
                const title = headerRenderer?.title?.runs?.[0]?.text || '';
                const moreEndpoint = headerRenderer?.moreContentButton?.buttonRenderer?.navigationEndpoint?.browseEndpoint;

                const rawContents = renderer.contents || [];

                const items = rawContents.map(i => {
                    if (i.musicTwoRowItemRenderer) {
                        return this.parseMusicTwoRowItem(i.musicTwoRowItemRenderer);
                    }
                    if (i.musicResponsiveListItemRenderer) {
                        return this.parseArtistSongItem(i);
                    }
                    return this.parseItem(i);
                }).filter(i => i) || [];

                // Determine section type based on first item's type OR title
                let type = 'carousel';
                const firstItem = items[0];
                if (firstItem?.type === 'artist') type = 'artists';
                else if (firstItem?.type === 'album') type = 'albums';
                else if (firstItem?.type === 'playlist') type = 'playlists';
                else if (firstItem?.type === 'song') type = 'songs';
                else {
                    // Fallback to title-based detection
                    const titleLower = title.toLowerCase();
                    if (titleLower.includes('album')) type = 'albums';
                    else if (titleLower.includes('single') || titleLower.includes('ep')) type = 'singles';
                    else if (titleLower.includes('video')) type = 'videos';
                    else if (titleLower.includes('playlist')) type = 'playlists';
                    else if (titleLower.includes('fan') || titleLower.includes('like') || titleLower.includes('similar')) type = 'artists';
                    else if (titleLower.includes('featured')) type = 'featured';
                    else if (titleLower.includes('live')) type = 'live';
                }

                return {
                    title,
                    items,
                    moreEndpoint: moreEndpoint ? {
                        browseId: moreEndpoint.browseId,
                        params: moreEndpoint.params
                    } : null,
                    type
                };
            }

            // Unknown section type
            return null;
        } catch (e) {
            console.error('parseArtistSection error:', e);
            return null;
        }
    }

    /**
     * Parse song item from artist's songs section (musicResponsiveListItemRenderer)
     * Matches OuterTune's fromMusicResponsiveListItemRenderer in ArtistPage.kt
     */
    static parseArtistSongItem(itemWrapper) {
        try {
            const renderer = itemWrapper.musicResponsiveListItemRenderer;
            if (!renderer) {
                return this.parseItem(itemWrapper);
            }

            // OuterTune: id = renderer.playlistItemData?.videoId ?: return null
            const videoId = renderer.playlistItemData?.videoId;
            if (!videoId) {
                return null;
            }

            // OuterTune: title = renderer.flexColumns.firstOrNull()?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.firstOrNull()?.text
            const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
            if (!title) {
                return null;
            }

            // OuterTune: artists = PageHelper.extractRuns(renderer.flexColumns, "MUSIC_PAGE_TYPE_ARTIST").oddElements()
            // Simplified: get artists from second column, odd indices are artist names
            const artistRuns = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const artists = artistRuns.filter((_, idx) => idx % 2 === 0).map(run => ({
                name: run.text,
                id: run.navigationEndpoint?.browseEndpoint?.browseId
            }));

            // OuterTune: album = from flexColumns using MUSIC_PAGE_TYPE_ALBUM
            const albumRuns = renderer.flexColumns?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ||
                renderer.flexColumns?.[3]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
            const album = albumRuns?.[0] ? {
                name: albumRuns[0].text,
                id: albumRuns[0].navigationEndpoint?.browseEndpoint?.browseId
            } : null;

            // OuterTune: thumbnail = renderer.thumbnail?.musicThumbnailRenderer?.getThumbnailUrl()
            const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
            const thumbnail = thumbnails?.length > 0 ? thumbnails[thumbnails.length - 1]?.url : null;

            const explicit = renderer.badges?.some(b => b.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE');
            const endpoint = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content
                ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;

            return {
                videoId,
                id: videoId,
                title,
                name: title,
                artists,
                artist: artists.map(a => a.name).join(', '),
                album,
                thumbnail,
                thumbnails: thumbnails || [],
                explicit,
                endpoint,
                type: 'song',
                image: [{ url: thumbnail, quality: 'hd' }],
                artwork: thumbnail
            };
        } catch (e) {
            console.error('parseArtistSongItem error:', e);
            return this.parseItem(itemWrapper);
        }
    }

    /**
     * Parse musicTwoRowItemRenderer (albums, playlists, artists in carousel)
     * Uses pageType from browseEndpointContextSupportedConfigs like OuterTune
     */
    static parseMusicTwoRowItem(renderer) {
        try {
            const title = renderer.title?.runs?.[0]?.text;
            const thumbnails = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails;
            const thumbnail = thumbnails?.length > 0 ? thumbnails[thumbnails.length - 1]?.url : null;
            const subtitle = renderer.subtitle?.runs?.map(r => r.text).join('') || '';

            const browseEndpoint = renderer.navigationEndpoint?.browseEndpoint;
            const watchEndpoint = renderer.navigationEndpoint?.watchEndpoint;
            const browseId = browseEndpoint?.browseId;

            // Get pageType from browseEndpointContextSupportedConfigs (OuterTune method)
            const pageType = browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;

            // Song (has watchEndpoint with videoId) - OuterTune: isSong = navigationEndpoint.endpoint is WatchEndpoint
            if (watchEndpoint?.videoId) {
                const artistRun = renderer.subtitle?.runs?.[0];
                return {
                    videoId: watchEndpoint.videoId,
                    id: watchEndpoint.videoId,
                    title,
                    name: title,
                    artists: artistRun ? [{ name: artistRun.text, id: artistRun.navigationEndpoint?.browseEndpoint?.browseId }] : [],
                    artist: artistRun?.text || 'Unknown',
                    thumbnail,
                    thumbnails: thumbnails || [],
                    explicit: renderer.subtitleBadges?.some(b => b.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'),
                    type: 'song',
                    image: [{ url: thumbnail }],
                    artwork: thumbnail
                };
            }

            // Album - OuterTune: isAlbum = pageType == MUSIC_PAGE_TYPE_ALBUM || MUSIC_PAGE_TYPE_AUDIOBOOK
            if (pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK' ||
                browseId?.startsWith('MPRE') || browseId?.startsWith('OLAK')) {
                const playlistId = renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content
                    ?.musicPlayButtonRenderer?.playNavigationEndpoint?.anyWatchEndpoint?.playlistId ||
                    renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content
                        ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId;

                const yearRun = renderer.subtitle?.runs?.slice(-1)[0];
                const year = yearRun?.text?.match(/^\d{4}$/) ? parseInt(yearRun.text) : null;

                return {
                    browseId,
                    id: browseId,
                    playlistId,
                    title,
                    name: title,
                    thumbnail,
                    thumbnails: thumbnails || [],
                    year,
                    subtitle,
                    explicit: renderer.subtitleBadges?.some(b => b.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'),
                    type: 'album',
                    image: [{ url: thumbnail }]
                };
            }

            // Playlist - OuterTune: isPlaylist = pageType == MUSIC_PAGE_TYPE_PLAYLIST
            if (pageType === 'MUSIC_PAGE_TYPE_PLAYLIST' ||
                browseId?.startsWith('VL') || browseId?.startsWith('PL') || browseId?.startsWith('RDCLAK')) {
                const playlistId = browseId?.startsWith('VL') ? browseId.substring(2) : browseId;
                const authorRun = renderer.subtitle?.runs?.slice(-1)[0];

                // Get play/shuffle/radio endpoints like OuterTune
                const playEndpoint = renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content
                    ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint;
                const menuItems = renderer.menu?.menuRenderer?.items || [];
                const shuffleEndpoint = menuItems.find(i => i.menuNavigationItemRenderer?.icon?.iconType === 'MUSIC_SHUFFLE')
                    ?.menuNavigationItemRenderer?.navigationEndpoint?.watchPlaylistEndpoint;
                const radioEndpoint = menuItems.find(i => i.menuNavigationItemRenderer?.icon?.iconType === 'MIX')
                    ?.menuNavigationItemRenderer?.navigationEndpoint?.watchPlaylistEndpoint;

                return {
                    id: playlistId,
                    browseId,
                    playlistId,
                    title,
                    name: title,
                    thumbnail,
                    thumbnails: thumbnails || [],
                    author: authorRun?.text,
                    subtitle,
                    type: 'playlist',
                    playEndpoint,
                    shuffleEndpoint,
                    radioEndpoint,
                    image: [{ url: thumbnail }]
                };
            }

            // Artist - OuterTune: isArtist = pageType == MUSIC_PAGE_TYPE_ARTIST
            if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || browseId?.startsWith('UC')) {
                const menuItems = renderer.menu?.menuRenderer?.items || [];
                const channelId = menuItems.find(i => i.toggleMenuServiceItemRenderer?.defaultIcon?.iconType === 'SUBSCRIBE')
                    ?.toggleMenuServiceItemRenderer?.defaultServiceEndpoint?.subscribeEndpoint?.channelIds?.[0];
                const shuffleEndpoint = menuItems.find(i => i.menuNavigationItemRenderer?.icon?.iconType === 'MUSIC_SHUFFLE')
                    ?.menuNavigationItemRenderer?.navigationEndpoint?.watchPlaylistEndpoint;
                const radioEndpoint = menuItems.find(i => i.menuNavigationItemRenderer?.icon?.iconType === 'MIX')
                    ?.menuNavigationItemRenderer?.navigationEndpoint?.watchPlaylistEndpoint;

                return {
                    id: browseId,
                    browseId,
                    channelId,
                    title,
                    name: title,
                    thumbnail,
                    thumbnails: thumbnails || [],
                    subtitle,
                    type: 'artist',
                    shuffleEndpoint,
                    radioEndpoint,
                    image: [{ url: thumbnail }]
                };
            }

            // Generic fallback
            return {
                id: browseId || watchEndpoint?.videoId,
                browseId,
                title,
                name: title,
                thumbnail,
                thumbnails: thumbnails || [],
                subtitle,
                type: 'unknown',
                image: [{ url: thumbnail }]
            };
        } catch (e) {
            console.error('parseMusicTwoRowItem error:', e);
            return null;
        }
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

    static parseSection(data) {
        try {
            // Check for various renderer types
            const tabContent = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content;
            const sectionList = tabContent?.sectionListRenderer?.contents;
            const secondaryContents = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents;

            // Grid Renderer
            const gridRenderer = sectionList?.[0]?.gridRenderer ||
                secondaryContents?.[0]?.gridRenderer ||
                tabContent?.gridRenderer || // Direct grid renderer
                data?.continuationContents?.gridContinuation;

            // Music Shelf Renderer (List of Songs)
            const musicShelfRenderer = sectionList?.[0]?.musicShelfRenderer ||
                secondaryContents?.[0]?.musicShelfRenderer ||
                tabContent?.musicShelfRenderer || // Direct shelf renderer
                data?.continuationContents?.musicShelfContinuation;

            // Playlist Shelf Renderer (Playlist content)
            const musicPlaylistShelfRenderer = sectionList?.[0]?.musicPlaylistShelfRenderer ||
                secondaryContents?.[0]?.musicPlaylistShelfRenderer ||
                tabContent?.musicPlaylistShelfRenderer || // Direct playlist shelf
                data?.continuationContents?.musicPlaylistShelfContinuation;

            const section = gridRenderer || musicShelfRenderer || musicPlaylistShelfRenderer;

            const header = data?.header?.musicHeaderRenderer;
            const title = header?.title?.runs?.[0]?.text || '';

            const rawItems = section?.items || section?.contents || [];
            const items = rawItems.map(i => {
                if (i.musicTwoRowItemRenderer) return this.parseMusicTwoRowItem(i.musicTwoRowItemRenderer);
                if (i.musicResponsiveListItemRenderer) return this.parseArtistSongItem(i);
                return this.parseItem(i);
            }).filter(i => i);

            // Get continuation token - check multiple locations
            const continuations = section?.continuations;
            const continuation = continuations?.[0]?.nextContinuationData?.continuation;

            console.log(`InnerTube parseSection: Found ${items.length} items, title="${title}"`);

            return {
                title,
                items,
                continuation
            };
        } catch (e) {
            console.error('parseSection error:', e);
            return { items: [], continuation: null };
        }
    }

    static parsePlaylist(data) {
        try {
            // Try multiple header locations
            let header = data?.header?.musicDetailHeaderRenderer;

            if (!header) {
                // Try finding responsive header in contents
                const sectionList = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
                header = sectionList?.[0]?.musicResponsiveHeaderRenderer;
            }

            // Try multiple tracks locations
            const tracks = data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents ||
                data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents;

            // Extract title
            const title = header?.title?.runs?.[0]?.text || header?.title?.simpleText;

            // Extract songs
            const songs = tracks?.map(t => this.parseItem(t)).filter(i => i) || [];

            // Extract additional metadata
            const thumbnails = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
                header?.thumbnail?.musicResponsiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;

            const description = header?.description?.runs?.[0]?.text || header?.description?.simpleText;

            // Author/Subtitle extraction
            let author = "YouTube Music";
            let year = null;

            // Subtitle runs logic depends on header type
            // musicDetailHeaderRenderer uses 'subtitle'
            // musicResponsiveHeaderRenderer uses 'straplineTextOne' or 'subtitle'
            const subtitleRuns = header?.subtitle?.runs || header?.straplineTextOne?.runs;

            if (subtitleRuns) {
                author = subtitleRuns?.find(r => r.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'))?.text
                    || subtitleRuns?.[0]?.text
                    || "YouTube Music";
                year = subtitleRuns?.find(r => r.text.match(/\d{4}/))?.text;
            }

            // Extract playlist thumbnail
            const playlistThumbnail = thumbnails?.[thumbnails.length - 1]?.url;

            // Extract ID safely safely
            const headerId = header?.menu?.menuRenderer?.topLevelButtons?.[0]?.buttonRenderer?.navigationEndpoint?.watchEndpoint?.playlistId;
            const dataBrowseId = data?.responseContext?.serviceTrackingParams?.[0]?.params?.find(p => p.key === 'browse_id')?.value;
            // Clean VL prefix if present in the data browseId
            const cleanBrowseId = dataBrowseId?.startsWith('VL') ? dataBrowseId.substring(2) : dataBrowseId;

            const id = headerId || cleanBrowseId;

            console.log(`InnerTube parsePlaylist: title="${title}", songs=${songs.length}, id=${id}`);

            return {
                id, // Use safe ID
                title,
                songs,
                thumbnails,
                thumbnail: playlistThumbnail,
                description,
                author,
                year,
                count: songs.length
            };
        } catch (e) {
            console.error('Parse Playlist Error', e);
            return null;
        }
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

            // Sort thumbnails by width (ascending) to match Saavn format (highest quality last)
            const sortedThumbnails = [...thumbnails].sort((a, b) => (a.width || 0) - (b.width || 0));
            let thumbnail = sortedThumbnails[sortedThumbnails.length - 1]?.url;

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
                    { url: thumbnail, quality: 'default' },
                    { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, quality: 'hq' },
                    { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, quality: 'max' }
                ] : sortedThumbnails.map(t => ({ url: t.url, quality: 'hd' })),
                artwork: highResThumbnail || thumbnail,  // Use original quality for cards/lists (performance optimized)
                year: item.subtitle?.runs?.[item.subtitle.runs.length - 1]?.text || ''
            };
        } catch (e) { console.error(e); return null; }
    }
}

export default InnerTubeClient;
