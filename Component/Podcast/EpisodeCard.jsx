import React from 'react';
import { Pressable, Text, View, Image, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Play, Clock } from 'lucide-react-native';

/**
 * EpisodeCard - Horizontal card component for displaying podcast episodes
 * @param {Object} episode - Episode data object
 * @param {Function} onPress - Optional custom press handler
 * @param {Function} onPlay - Play button handler
 */
export const EpisodeCard = ({ episode, onPress, onPlay }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { dark } = theme;

    // Format duration from seconds to mm:ss or hh:mm:ss
    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format date to readable format
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (onPlay) {
            onPlay(episode);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                padding: 12,
                marginBottom: 8,
                marginHorizontal: 12,
                borderRadius: 12,
                backgroundColor: dark ? '#1F1F1F' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
            })}
        >
            {/* Episode/Podcast Artwork */}
            <View
                style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: dark ? '#2E2E2E' : '#E5E5E5',
                }}
            >
                <Image
                    source={{ uri: episode.image || episode.feedImage }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    resizeMode="cover"
                />

                {/* Play overlay button */}
                <Pressable
                    onPress={() => onPlay && onPlay(episode)}
                    style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: theme.colors.primary || '#1DB954',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                </Pressable>
            </View>

            {/* Episode Details */}
            <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                {/* Episode Title */}
                <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: dark ? '#FFFFFF' : '#000000',
                        lineHeight: 20,
                    }}
                >
                    {episode.title || episode.name}
                </Text>

                {/* Podcast Name */}
                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: dark ? '#B3B3B3' : '#666666',
                    }}
                >
                    {episode.feedTitle}
                </Text>

                {/* Duration & Date Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    {episode.duration > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                            <Clock size={12} color={dark ? '#888888' : '#999999'} />
                            <Text style={{
                                marginLeft: 4,
                                fontSize: 11,
                                color: dark ? '#888888' : '#999999'
                            }}>
                                {formatDuration(episode.duration)}
                            </Text>
                        </View>
                    )}

                    <Text style={{
                        fontSize: 11,
                        color: dark ? '#888888' : '#999999'
                    }}>
                        {formatDate(episode.datePublished) || episode.datePublishedPretty}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
};

/**
 * EpisodeCardHorizontal - Compact horizontal card for sliders
 */
export const EpisodeCardHorizontal = ({ episode, width = 280, onPress, onPlay }) => {
    const theme = useTheme();
    const { dark } = theme;

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        return `${mins} min`;
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (onPlay) {
            onPlay(episode);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => ({
                width: width,
                flexDirection: 'row',
                padding: 10,
                marginRight: 12,
                borderRadius: 10,
                backgroundColor: dark ? '#1F1F1F' : '#F5F5F5',
                opacity: pressed ? 0.7 : 1,
            })}
        >
            {/* Episode Artwork */}
            <View
                style={{
                    width: 60,
                    height: 60,
                    borderRadius: 6,
                    overflow: 'hidden',
                    backgroundColor: dark ? '#2E2E2E' : '#E5E5E5',
                }}
            >
                <Image
                    source={{ uri: episode.image || episode.feedImage }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
            </View>

            {/* Details */}
            <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
                <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: dark ? '#FFFFFF' : '#000000',
                        lineHeight: 17,
                    }}
                >
                    {episode.title}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{
                        marginTop: 3,
                        fontSize: 11,
                        color: dark ? '#888888' : '#999999',
                    }}
                >
                    {episode.feedTitle} • {formatDuration(episode.duration)}
                </Text>
            </View>

            {/* Play Button */}
            <Pressable
                onPress={() => onPlay && onPlay(episode)}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.primary || '#1DB954',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'center',
                }}
            >
                <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
            </Pressable>
        </Pressable>
    );
};

export default EpisodeCard;
