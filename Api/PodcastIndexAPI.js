/**
 * PodcastIndexAPI.js - API service for PodcastIndex.org integration
 * 
 * Features:
 * - Trending podcasts
 * - Recent episodes
 * - Podcast search
 * - Podcast details
 * - Episode listing
 * - Categories
 */

import sha1 from 'js-sha1';
import axios from 'axios';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { PODCAST_INDEX_API_KEY, PODCAST_INDEX_API_SECRET } from '../Utils/secrets';

// API Configuration
const BASE_URL = 'https://api.podcastindex.org/api/1.0';
const API_KEY = PODCAST_INDEX_API_KEY || '';
const API_SECRET = PODCAST_INDEX_API_SECRET || '';
const USER_AGENT = 'Orbit/1.0';

// Add PODCASTS to cache groups (will use existing PLAYLISTS for now)
const PODCAST_CACHE_GROUP = 'podcasts';

/**
 * Generate authentication headers for PodcastIndex API
 * @returns {Object} Headers object with auth data
 */
const getAuthHeaders = () => {
    const apiHeaderTime = Math.floor(Date.now() / 1000);
    const hash = sha1(API_KEY + API_SECRET + apiHeaderTime);

    return {
        'User-Agent': USER_AGENT,
        'X-Auth-Key': API_KEY,
        'X-Auth-Date': apiHeaderTime.toString(),
        'Authorization': hash,
    };
};

/**
 * Make authenticated API request to PodcastIndex
 * @param {string} endpoint API endpoint
 * @param {Object} params Query parameters
 * @returns {Promise<Object>} API response
 */
const apiRequest = async (endpoint, params = {}) => {
    try {
        const url = `${BASE_URL}${endpoint}`;
        const headers = getAuthHeaders();

        const response = await axios.get(url, {
            headers,
            params: { ...params, pretty: true },
            timeout: 15000,
        });

        return response.data;
    } catch (error) {
        console.error(`PodcastIndex API Error [${endpoint}]:`, error.message);
        throw error;
    }
};

/**
 * Transform PodcastIndex podcast to app format
 * @param {Object} podcast Raw podcast data
 * @returns {Object} Transformed podcast
 */
const transformPodcast = (podcast) => {
    return {
        id: podcast.id || podcast.feedId,
        feedId: podcast.id || podcast.feedId,
        title: podcast.title || 'Unknown Podcast',
        name: podcast.title || 'Unknown Podcast',
        author: podcast.author || podcast.ownerName || 'Unknown Author',
        description: podcast.description || '',
        image: podcast.artwork || podcast.image || 'https://via.placeholder.com/300',
        artwork: podcast.artwork || podcast.image || 'https://via.placeholder.com/300',
        url: podcast.url || '',
        link: podcast.link || '',
        language: podcast.language || 'en',
        categories: podcast.categories || {},
        episodeCount: podcast.episodeCount || 0,
        newestItemPubdate: podcast.newestItemPubdate || 0,
        trendScore: podcast.trendScore || 0,
        type: 'podcast',
    };
};

/**
 * Transform PodcastIndex episode to app format
 * @param {Object} episode Raw episode data
 * @param {Object} podcast Optional podcast data for context
 * @returns {Object} Transformed episode
 */
const transformEpisode = (episode, podcast = null) => {
    return {
        id: episode.id || episode.guid,
        guid: episode.guid || episode.id,
        title: episode.title || 'Unknown Episode',
        name: episode.title || 'Unknown Episode',
        description: episode.description || '',
        datePublished: episode.datePublished || 0,
        datePublishedPretty: episode.datePublishedPretty || '',
        duration: episode.duration || 0,
        enclosureUrl: episode.enclosureUrl || '',
        enclosureType: episode.enclosureType || 'audio/mpeg',
        enclosureLength: episode.enclosureLength || 0,
        image: episode.image || episode.feedImage || podcast?.artwork || 'https://via.placeholder.com/300',
        feedId: episode.feedId || podcast?.feedId,
        feedTitle: episode.feedTitle || podcast?.title || 'Unknown Podcast',
        feedImage: episode.feedImage || podcast?.artwork || 'https://via.placeholder.com/300',
        explicit: episode.explicit || 0,
        episode: episode.episode || null,
        season: episode.season || null,
        type: 'episode',
    };
};

/**
 * Get trending podcasts from PodcastIndex
 * @param {number} max Maximum results (default 20)
 * @param {string} lang Language filter (optional)
 * @param {string} cat Category filter (optional)
 * @returns {Promise<Object>} Trending podcasts
 */
export const getTrendingPodcasts = async (max = 20, lang = null, cat = null) => {
    const cacheKey = `podcast_trending_${max}_${lang || 'all'}_${cat || 'all'}`;

    const fetchFunction = async () => {
        try {
            console.log('🎙️ Fetching trending podcasts...');

            const params = { max };
            if (lang) params.lang = lang;
            if (cat) params.cat = cat;

            const response = await apiRequest('/podcasts/trending', params);

            if (response.status === 'true' && response.feeds) {
                const podcasts = response.feeds.map(transformPodcast);
                console.log(`✅ Found ${podcasts.length} trending podcasts`);

                return {
                    success: true,
                    data: podcasts,
                    count: response.count || podcasts.length,
                    description: response.description || 'Trending podcasts',
                };
            }

            return { success: false, data: [], error: 'No trending podcasts found' };
        } catch (error) {
            console.error('Error fetching trending podcasts:', error);
            return { success: false, data: [], error: error.message };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 60, PODCAST_CACHE_GROUP);
};

/**
 * Get recent episodes from PodcastIndex
 * @param {number} max Maximum results (default 20)
 * @param {string} lang Language filter (optional)
 * @param {string} cat Category filter (optional)
 * @returns {Promise<Object>} Recent episodes
 */
export const getRecentEpisodes = async (max = 20, lang = null, cat = null) => {
    const cacheKey = `podcast_recent_episodes_${max}_${lang || 'all'}_${cat || 'all'}`;

    const fetchFunction = async () => {
        try {
            console.log('🎙️ Fetching recent episodes...');

            const params = { max };
            if (lang) params.lang = lang;
            if (cat) params.cat = cat;

            const response = await apiRequest('/recent/episodes', params);

            if (response.status === 'true' && response.items) {
                const episodes = response.items.map(ep => transformEpisode(ep));
                console.log(`✅ Found ${episodes.length} recent episodes`);

                return {
                    success: true,
                    data: episodes,
                    count: response.count || episodes.length,
                };
            }

            return { success: false, data: [], error: 'No recent episodes found' };
        } catch (error) {
            console.error('Error fetching recent episodes:', error);
            return { success: false, data: [], error: error.message };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 30, PODCAST_CACHE_GROUP);
};

/**
 * Search podcasts by term
 * @param {string} query Search query
 * @param {number} max Maximum results (default 20)
 * @returns {Promise<Object>} Search results
 */
export const searchPodcasts = async (query, max = 20) => {
    const cacheKey = `podcast_search_${query}_${max}`;

    const fetchFunction = async () => {
        try {
            console.log(`🔍 Searching podcasts for: ${query}`);

            const response = await apiRequest('/search/byterm', { q: query, max });

            if (response.status === 'true' && response.feeds) {
                const podcasts = response.feeds.map(transformPodcast);
                console.log(`✅ Found ${podcasts.length} podcasts for: ${query}`);

                return {
                    success: true,
                    data: podcasts,
                    count: response.count || podcasts.length,
                };
            }

            return { success: false, data: [], error: 'No podcasts found' };
        } catch (error) {
            console.error('Error searching podcasts:', error);
            return { success: false, data: [], error: error.message };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 10, CACHE_GROUPS.SEARCH);
};

/**
 * Get podcast details by feed ID
 * @param {number|string} feedId Podcast feed ID
 * @returns {Promise<Object>} Podcast details
 */
export const getPodcastByFeedId = async (feedId) => {
    const cacheKey = `podcast_detail_${feedId}`;

    const fetchFunction = async () => {
        try {
            console.log(`🎙️ Fetching podcast details for: ${feedId}`);

            const response = await apiRequest('/podcasts/byfeedid', { id: feedId });

            if (response.status === 'true' && response.feed) {
                const podcast = transformPodcast(response.feed);
                console.log(`✅ Got podcast: ${podcast.title}`);

                return {
                    success: true,
                    data: podcast,
                };
            }

            return { success: false, data: null, error: 'Podcast not found' };
        } catch (error) {
            console.error('Error fetching podcast details:', error);
            return { success: false, data: null, error: error.message };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 60, PODCAST_CACHE_GROUP);
};

/**
 * Get episodes for a podcast by feed ID
 * @param {number|string} feedId Podcast feed ID
 * @param {number} max Maximum results (default 50)
 * @returns {Promise<Object>} Episodes list
 */
export const getEpisodesByFeedId = async (feedId, max = 50) => {
    const cacheKey = `podcast_episodes_${feedId}_${max}`;

    const fetchFunction = async () => {
        try {
            console.log(`🎙️ Fetching episodes for podcast: ${feedId}`);

            const response = await apiRequest('/episodes/byfeedid', { id: feedId, max });

            if (response.status === 'true' && response.items) {
                const episodes = response.items.map(ep => transformEpisode(ep));
                console.log(`✅ Found ${episodes.length} episodes`);

                return {
                    success: true,
                    data: episodes,
                    count: response.count || episodes.length,
                };
            }

            return { success: false, data: [], error: 'No episodes found' };
        } catch (error) {
            console.error('Error fetching episodes:', error);
            return { success: false, data: [], error: error.message };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 30, PODCAST_CACHE_GROUP);
};

/**
 * Get podcast categories
 * @returns {Promise<Object>} Categories list
 */
export const getCategories = async () => {
    const cacheKey = 'podcast_categories';

    const fetchFunction = async () => {
        try {
            console.log('🎙️ Fetching podcast categories...');

            const response = await apiRequest('/categories/list');

            if (response.status === 'true' && response.feeds) {
                const categories = response.feeds.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                }));
                console.log(`✅ Found ${categories.length} categories`);

                return {
                    success: true,
                    data: categories,
                };
            }

            // Fallback categories if API fails
            return {
                success: true,
                data: [
                    { id: 1, name: 'Technology' },
                    { id: 2, name: 'Comedy' },
                    { id: 3, name: 'News' },
                    { id: 4, name: 'True Crime' },
                    { id: 5, name: 'Business' },
                    { id: 6, name: 'Health' },
                    { id: 7, name: 'Education' },
                    { id: 8, name: 'Science' },
                    { id: 9, name: 'Sports' },
                    { id: 10, name: 'Music' },
                ],
            };
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Return fallback categories
            return {
                success: true,
                data: [
                    { id: 1, name: 'Technology' },
                    { id: 2, name: 'Comedy' },
                    { id: 3, name: 'News' },
                    { id: 4, name: 'True Crime' },
                    { id: 5, name: 'Business' },
                ],
            };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 1440, PODCAST_CACHE_GROUP); // Cache for 24 hours
};

/**
 * Get random episodes for discovery
 * @param {number} max Maximum results (default 10)
 * @param {string} cat Category filter (optional)
 * @returns {Promise<Object>} Random episodes
 */
export const getRandomEpisodes = async (max = 10, cat = null) => {
    const cacheKey = `podcast_random_${max}_${cat || 'all'}`;

    const fetchFunction = async () => {
        try {
            console.log('🎙️ Fetching random episodes...');

            const params = { max };
            if (cat) params.cat = cat;

            const response = await apiRequest('/episodes/random', params);

            if (response.status === 'true' && response.episodes) {
                const episodes = response.episodes.map(ep => transformEpisode(ep));
                console.log(`✅ Found ${episodes.length} random episodes`);

                return {
                    success: true,
                    data: episodes,
                    count: episodes.length,
                };
            }

            return { success: false, data: [], error: 'No episodes found' };
        } catch (error) {
            console.error('Error fetching random episodes:', error);
            return { success: false, data: [], error: error.message };
        }
    };

    return getCachedData(cacheKey, fetchFunction, 15, PODCAST_CACHE_GROUP);
};

export default {
    getTrendingPodcasts,
    getRecentEpisodes,
    searchPodcasts,
    getPodcastByFeedId,
    getEpisodesByFeedId,
    getCategories,
    getRandomEpisodes,
};
