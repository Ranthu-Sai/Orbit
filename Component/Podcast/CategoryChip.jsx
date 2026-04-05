import React from 'react';
import { Pressable, Text, View, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';

/**
 * CategoryChip - Single category chip component
 */
export const CategoryChip = ({ category, selected, onPress }) => {
  const theme = useTheme();
  const { dark } = theme;

  return (
    <Pressable
      onPress={() => onPress && onPress(category)}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: selected
          ? theme.colors.primary || '#1DB954'
          : dark
          ? '#2E2E2E'
          : '#E8E8E8',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: selected ? '#FFFFFF' : dark ? '#FFFFFF' : '#333333',
        }}
      >
        {category.name}
      </Text>
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
