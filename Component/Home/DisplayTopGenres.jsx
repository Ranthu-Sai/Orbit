import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Chip } from 'react-native-paper';

export const DisplayTopGenres = memo(() => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation();
  const genres = [
    'Romance',
    'Lofi',
    'Hip Hop',
    'Classical',
    'Jazz',
    'Party',
    'Retro',
    'Sad',
  ];

  const handleGenrePress = (genre) => {
    navigation.navigate('ShowPlaylistofType', {
      Searchtext: genre.toLowerCase(),
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {genres.map((genre, index) => (
          <Chip
            key={index}
            mode="flat"
            style={[
              styles.chip,
              {
                backgroundColor: dark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.04)',
              },
            ]}
            textStyle={[styles.chipText, { color: colors.text }]}
            onPress={() => handleGenrePress(genre)}
            rippleColor={
              dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'
            }
          >
            {genre}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 4,
  },
  chip: {
    height: 36,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 0,
    elevation: 0,
    marginHorizontal: 2,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 10,
    lineHeight: 16,
  },
});
