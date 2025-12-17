import React from 'react';
import { Pressable, Text, View, Image, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

/**
 * PodcastCard - Square card component for displaying podcasts
 * @param {Object} podcast - Podcast data object
 * @param {number} width - Card width (default 140)
 * @param {Function} onPress - Optional custom press handler
 * @param {boolean} noMargin - Disable right margin (for grid layouts)
 */
export const PodcastCard = ({ podcast, width = 140, onPress, noMargin = false }) => {
    const navigation = useNavigation();
    const theme = useTheme();
    const { dark } = theme;

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            navigation.navigate('PodcastDetail', {
                feedId: podcast.feedId || podcast.id,
                podcast: podcast,
            });
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => ({
                width: width,
                marginRight: noMargin ? 0 : 12,
                opacity: pressed ? 0.7 : 1,
            })}
        >
            {/* Podcast Cover - Square */}
            <View
                style={{
                    width: width,
                    height: width,
                    borderRadius: 12,
                    overflow: 'hidden',
                    backgroundColor: dark ? '#2E2E2E' : '#E5E5E5',
                    elevation: 3,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                }}
            >
                <Image
                    source={{ uri: podcast.artwork || podcast.image }}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    resizeMode="cover"
                />
            </View>

            {/* Podcast Title */}
            <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{
                    marginTop: 8,
                    fontSize: 13,
                    fontWeight: '600',
                    color: dark ? '#FFFFFF' : '#000000',
                    lineHeight: 18,
                }}
            >
                {podcast.title || podcast.name}
            </Text>

            {/* Author */}
            <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: dark ? '#B3B3B3' : '#666666',
                }}
            >
                {podcast.author}
            </Text>
        </Pressable>
    );
};

export default PodcastCard;
