import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export const LanguageTag = ({ language, style }) => {
  const theme = useTheme();

  // Skip rendering if no language provided
  if (!language) {
    return null;
  }

  // Determine background color based on language
  const getBackgroundColor = (lang) => {
    const colors = {
      English: '#3498db', // Blue
      Hindi: '#e74c3c', // Red
      Telugu: '#f39c12', // Orange
      Tamil: '#9b59b6', // Purple
      Malayalam: '#2ecc71', // Green
      Punjabi: '#e67e22', // Dark Orange
      Marathi: '#1abc9c', // Turquoise
      Gujarati: '#d35400', // Pumpkin
      Bengali: '#c0392b', // Dark Red
      Kannada: '#16a085', // Green Sea
    };

    return colors[lang] || theme.colors.primary;
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(language) },
        style,
      ]}
    >
      <Text style={styles.text}>{language}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
    elevation: 5, // Add elevation for Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
