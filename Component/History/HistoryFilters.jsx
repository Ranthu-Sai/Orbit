import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { GlassBox } from '../Global/GlassBox';

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
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          
          if (isActive) {
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  styles.activeFilterButton,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onFilterChange(filter.key)}
              >
                <Text style={[styles.filterText, styles.activeFilterText, { color: '#FFFFFF' }]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={filter.key}
              onPress={() => onFilterChange(filter.key)}
            >
              <GlassBox
                id={`filter-${filter.key}`}
                style={[styles.filterButton, { borderWidth: 0, backgroundColor: 'transparent' }]}
                gradientConfig={{
                  x1: '0%', y1: '0%', x2: '100%', y2: '100%',
                  stops: [
                    { offset: '0%', opacity: 0.0 },
                    { offset: '30%', opacity: 0.3 },
                    { offset: '70%', opacity: 0.3 },
                    { offset: '100%', opacity: 0.0 },
                  ],
                }}
              >
                <Text style={[styles.filterText, { color: colors.text }]}>
                  {filter.label}
                </Text>
              </GlassBox>
            </TouchableOpacity>
          );
        })}
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
