/**
 * MoodChips.jsx
 *
 * Horizontal scrolling mood/category chips for YTMusic home feed.
 * Based on OuterTune's ChipsRow component.
 */

import React from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

const MoodChip = ({ label, isSelected, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? colors.primary : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: isSelected ? '#fff' : colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const MoodChips = ({ chips = [], selectedChip, onChipSelect }) => {
  const { colors } = useTheme();

  if (!chips || chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {chips.map((chip, index) => (
          <MoodChip
            key={`mood-chip-${chip.params || index}`}
            label={chip.title || chip.label || chip}
            isSelected={selectedChip === chip.params || selectedChip === chip}
            onPress={() => onChipSelect(chip)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MoodChips;
