import React from 'react';
import { Pressable, Text, View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { GlassBox } from '../Global/GlassBox';
import { BlurView } from '@react-native-community/blur';

/**
 * CategoryChip - Single category chip component
 */
export const CategoryChip = ({ category, selected, onPress }) => {
  const theme = useTheme();
  const { dark } = theme;

  if (selected) {
    return (
      <Pressable
        onPress={() => onPress && onPress(category)}
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          marginRight: 8,
          backgroundColor: theme.colors.primary || '#1DB954',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: '#FFFFFF',
          }}
        >
          {category.name}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress && onPress(category)}
      style={({ pressed }) => ({
        marginRight: 8,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <GlassBox
        id={`podcast-category-${category.id || category.name || Math.random()}`}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: 'transparent',
          borderWidth: 0,
        }}
        gradientConfig={{
          x1: '0%', y1: '0%', x2: '100%', y2: '100%',
          stops: [
            { offset: '0%', opacity: 0.0 },
            { offset: '30%', opacity: 0.6 },
            { offset: '70%', opacity: 0.6 },
            { offset: '100%', opacity: 0.0 },
          ],
        }}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={dark ? 'dark' : 'light'}
          blurAmount={8}
          reducedTransparencyFallbackColor={dark ? '#2E2E2E' : '#E8E8E8'}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: dark ? '#FFFFFF' : '#333333',
          }}
        >
          {category.name}
        </Text>
      </GlassBox>
    </Pressable>
  );
};

/**
 * CategoryChipList - Horizontal scrolling list of category chips
 */
export const CategoryChipList = ({
  categories = [],
  selectedCategory,
  onSelectCategory,
  showAll = true,
}) => {
  const theme = useTheme();
  const { dark } = theme;

  // Add "All" option at the beginning
  const allCategories = showAll
    ? [{ id: null, name: 'All' }, ...categories]
    : categories;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}
    >
      {allCategories.map((category, index) => (
        <CategoryChip
          key={category.id || `cat-${index}`}
          category={category}
          selected={selectedCategory?.id === category.id}
          onPress={onSelectCategory}
        />
      ))}
    </ScrollView>
  );
};

export default CategoryChipList;
