/**
 * SaavnHomeFeed.jsx
 * 
 * Home feed component for Saavn-only mode.
 * Shows only Saavn charts, playlists, albums without YTMusic sections.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { Heading } from "../Global/Heading";
import { HorizontalScrollSongs } from "../Global/HorizontalScrollSongs";
import { EachAlbumCard } from "../Global/EachAlbumCard";
import { EachPlaylistCard } from "../Global/EachPlaylistCard";
import { RenderTopCharts } from "./RenderTopCharts";
import { DisplayTopGenres } from "./DisplayTopGenres";
import { PaddingConatiner } from "../../Layout/PaddingConatiner";
import { getHomePageData } from "../../Api/HomePage";
import { GetLanguageValue } from "../../LocalStorage/Languages";
import { CacheManager } from "../../Utils/NavigationCacheManager";
import { CACHE_TTL, CACHE_KEYS, generateCacheKey } from "../../Utils/CacheConfig";
import { clearCache as clearApiCache, CACHE_GROUPS as API_CACHE_GROUPS } from "../../Api/CacheManager";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add a utility function to truncate text
const truncateText = (text, limit = 30) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit) + '...' : text;
};

// Helper function to shuffle array
const shuffleArray = (array) => {
    if (!array || !Array.isArray(array)) return [];
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Helper function to get image URL from different data structures
const getImageUrl = (imageData) => {
    if (!imageData) return null;

    if (Array.isArray(imageData)) {
        const bestImage = imageData.find(img => img.quality === "500x500") ||
            imageData[2] ||
            imageData[1] ||
            imageData[0];
        return bestImage?.link || bestImage?.url || null;
    }

    if (typeof imageData === 'string') {
        return imageData;
    }

    if (typeof imageData === 'object' && imageData.url) {
        return imageData.url;
    }

    return null;
};

export const SaavnHomeFeed = ({ refreshing, onRefreshComplete }) => {
    const [Data, setData] = useState({ data: { charts: [], playlists: [], trending: { albums: [] } } });
    const [chartIndices, setChartIndices] = useState([0, 1, 2, 3]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    // Get random chart indices
    const randomizeCharts = useCallback((charts) => {
        if (!charts || charts.length === 0) return;
        const indices = Array.from({ length: charts.length }, (_, i) => i);
        setChartIndices(shuffleArray(indices).slice(0, 4));
    }, []);

    async function fetchSaavnData(forceRefresh = false) {
        if (!isMounted.current) return;

        const cacheKey = generateCacheKey(CACHE_KEYS.HOME, 'saavn');

        try {
            if (!forceRefresh) {
                const ramData = CacheManager.get(cacheKey);
                if (ramData) {
                    console.log('[SaavnHomeFeed] RAM cache HIT');
                    setData(ramData);
                    setLoading(false);
                    return;
                }

                const diskData = await CacheManager.getAsync(cacheKey);
                if (diskData) {
                    console.log('[SaavnHomeFeed] Disk cache HIT');
                    setData(diskData);
                    setLoading(false);
                    return;
                }
            }

            console.log('[SaavnHomeFeed] Fetching from network...');
            const Languages = await GetLanguageValue();
            const data = await getHomePageData(Languages, forceRefresh);

            if (data && isMounted.current) {
                const fetchedData = JSON.parse(JSON.stringify(data));

                if (forceRefresh && fetchedData.data) {
                    if (fetchedData.data.playlists && fetchedData.data.playlists.length > 0) {
                        fetchedData.data.playlists = shuffleArray(fetchedData.data.playlists);
                    }
                    if (fetchedData.data.trending?.albums && fetchedData.data.trending.albums.length > 0) {
                        fetchedData.data.trending.albums = shuffleArray(fetchedData.data.trending.albums);
                    }
                }

                setData(fetchedData);
                randomizeCharts(fetchedData?.data?.charts);
                CacheManager.set(cacheKey, fetchedData, CACHE_TTL.HOME_DATA);
            }
        } catch (e) {
            console.log('[SaavnHomeFeed] Error:', e);
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }

    // Handle refresh from parent
    useEffect(() => {
        if (refreshing) {
            const doRefresh = async () => {
                CacheManager.invalidateByPrefix(CACHE_KEYS.HOME);
                await clearApiCache(API_CACHE_GROUPS.HOME);
                try {
                    const allKeys = await AsyncStorage.getAllKeys();
                    const saavnKeys = allKeys.filter(k =>
                        k.includes('home_') || k.includes('cache_home') || k.includes('api_cache_home')
                    );
                    if (saavnKeys.length > 0) {
                        await AsyncStorage.multiRemove(saavnKeys);
                    }
                } catch (e) { }
                await fetchSaavnData(true);
                if (onRefreshComplete) onRefreshComplete();
            };
            doRefresh();
        }
    }, [refreshing]);

    useEffect(() => {
        isMounted.current = true;
        fetchSaavnData(false);
        return () => { isMounted.current = false; };
    }, []);

    const playlists = useMemo(() => Data?.data?.playlists || [], [Data?.data?.playlists]);
    const albums = useMemo(() => Data?.data?.trending?.albums || [], [Data?.data?.trending?.albums]);

    const getChartId = (index) => {
        if (!Data?.data?.charts || !chartIndices || chartIndices.length <= index) {
            return null;
        }
        return Data?.data?.charts[chartIndices[index]]?.id;
    };

    if (loading) {
        return null; // Parent will show skeleton
    }

    return (
        <View>
            <DisplayTopGenres />
            <View style={{ paddingHorizontal: 13 }}>
                <HorizontalScrollSongs id={getChartId(0)} />
            </View>

            <View style={{ paddingHorizontal: 13 }}>
                <Heading text={"Recommended Playlists"} />
            </View>
            <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingLeft: 10,
                    paddingRight: 5,
                    gap: 2,
                }}
                data={playlists.slice(0, 20)}
                keyExtractor={(item, index) => `saavn-playlist-${item.id}-${index}`}
                renderItem={({ item, index }) => (
                    <EachPlaylistCard
                        name={truncateText(item.title || item.name, 30)}
                        follower={truncateText(item.subtitle || item.artists, 30)}
                        key={index}
                        image={getImageUrl(item.image)}
                        id={item.id}
                        source="Home"
                        MainContainerStyle={{
                            marginHorizontal: 4,
                        }}
                    />
                )}
            />

            <View style={{ paddingHorizontal: 13 }}>
                <Heading text={"Trending Albums"} />
            </View>
            <FlatList
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingLeft: 10,
                    paddingRight: 5,
                    gap: 2,
                }}
                data={albums.slice(0, 20)}
                keyExtractor={(item, index) => `saavn-album-${item.id}-${index}`}
                renderItem={({ item, index }) => (
                    <EachAlbumCard
                        image={getImageUrl(item.image)}
                        artists={truncateText(item.artists || item.artist, 30)}
                        key={index}
                        name={truncateText(item.name || item.title, 30)}
                        id={item.id}
                        source="Home"
                    />
                )}
            />

            <View style={{ paddingHorizontal: 13, marginTop: 8 }}>
                <HorizontalScrollSongs id={getChartId(1)} />
            </View>

            <PaddingConatiner>
                <Heading text={"Top Charts"} />
            </PaddingConatiner>
            <FlatList
                horizontal={true}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingLeft: 13,
                }}
                data={[1]}
                renderItem={() => <RenderTopCharts playlist={Data?.data?.charts || []} />}
                keyExtractor={() => 'top-charts'}
            />

            <PaddingConatiner>
                <HorizontalScrollSongs id={getChartId(2)} />
            </PaddingConatiner>
            <PaddingConatiner>
                <HorizontalScrollSongs id={getChartId(3)} />
            </PaddingConatiner>
        </View>
    );
};
