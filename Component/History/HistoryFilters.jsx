import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

export const HistoryFilters = ({ activeFilter, onFilterChange }) => {
  const { colors, dark } = useTheme();
  const styles = getThemedStyles(colors, dark);

  const filters = [
    { key: 'recent', label: 'Recent' },
    { key: 'mostPlayed', label: 'Most Played' },
    { key: 'mostTime', label: 'Most Time' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.activeFilterButton,
              {
                backgroundColor:
                  activeFilter === filter.key
                    ? colors.primary
                    : dark
                    ? colors.cardSurface
                    : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onFilterChange(filter.key)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.activeFilterText,
                {
                  color: activeFilter === filter.key ? '#FFFFFF' : colors.text,
                },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getThemedStyles = (colors, dark) =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
    },
    scrollContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      minWidth: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeFilterButton: {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
    },
    activeFilterText: {
      fontWeight: '600',
    },
  });
