import React from 'react';
import { View, ScrollView, Text, ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { Heading } from '../Global/Heading';
import { Spacer } from '../Global/Spacer';

/**
 * PodcastHorizontalSlider - Horizontal scrolling section for podcasts/episodes
 * @param {string} title - Section heading
 * @param {Array} data - Items to display
 * @param {Function} renderItem - Function to render each item
 * @param {boolean} loading - Loading state
 * @param {string} emptyText - Text to show when no data
 * @param {Function} onSeeAll - Handler for "See All" button
 */
export const PodcastHorizontalSlider = ({
    title,
    data = [],
    renderItem,
    loading = false,
    emptyText = 'No items available',
    onSeeAll,
}) => {
    const theme = useTheme();
    const { dark } = theme;

    return (
        <View>
            {/* Header with title and optional See All */}
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 12,
                marginBottom: 8,
            }}>
                <Heading text={title} nospace={true} />

                {onSeeAll && data.length > 0 && (
                    <Pressable
                        onPress={onSeeAll}
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            opacity: pressed ? 0.6 : 1,
                            paddingVertical: 4,
                        })}
                    >
                        <Text style={{
                            fontSize: 13,
                            color: theme.colors.primary || '#1DB954',
                            fontWeight: '500',
                        }}>
                            See All
                        </Text>
                        <ChevronRight size={16} color={theme.colors.primary || '#1DB954'} />
                    </Pressable>
                )}
            </View>

            {/* Loading State */}
            {loading && (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
            )}

            {/* Empty State */}
            {!loading && data.length === 0 && (
                <Text style={{
                    color: dark ? '#888888' : '#999999',
                    fontSize: 13,
                    paddingVertical: 20,
                    paddingHorizontal: 12,
                    textAlign: 'center',
                }}>
                    {emptyText}
                </Text>
            )}

            {/* Content */}
            {!loading && data.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                    }}
                >
                    {data.map((item, index) => (
                        <React.Fragment key={item.id || index}>
                            {renderItem(item, index)}
                        </React.Fragment>
                    ))}
                </ScrollView>
            )}

            <Spacer />
        </View>
    );
};

export default PodcastHorizontalSlider;
