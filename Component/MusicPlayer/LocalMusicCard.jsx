import React, { memo, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  findNodeHandle,
  UIManager,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import { useTheme } from '@react-navigation/native';
import { GlassBox } from '../Global/GlassBox';

const circleGradient = {
  x1: '0%', y1: '0%', x2: '100%', y2: '100%',
  stops: [
    { offset: '0%', opacity: 0.0 },
    { offset: '40%', opacity: 0.5 },
    { offset: '60%', opacity: 0.5 },
    { offset: '100%', opacity: 0.0 },
  ],
};

const MENU_SIZE = 42;
// Fixed size lets GlassBox skip its onLayout measure + second render per row
const MENU_FIXED_SIZE = { width: MENU_SIZE, height: MENU_SIZE };

// Default music image for local tracks
const DEFAULT_LOCAL_MUSIC_IMAGE = require('../../Images/Music.jpeg');
const PLAYING_IMAGE = require('../../Images/playing.gif');
const PAUSED_IMAGE = require('../../Images/songPaused.gif');

const AUDIO_EXT_REGEX = /\.(mp3|m4a|aac|wav|ogg|opus|flac)$/i;

const formatTitle = (title) =>
  title ? title.replace(AUDIO_EXT_REGEX, '') : 'Unknown Title';

const formatArtist = (artistName) =>
  artistName ? artistName.replace(AUDIO_EXT_REGEX, '') : 'Unknown Artist';

const getCoverSource = (song) => {
  if (song.cover && typeof song.cover === 'object' && song.cover.uri) {
    return song.cover;
  }
  if (song.artwork && typeof song.artwork === 'object' && song.artwork.uri) {
    return song.artwork;
  }
  return DEFAULT_LOCAL_MUSIC_IMAGE;
};

/**
 * One row of the local music list. Pure/presentational: playback and the
 * options menu are handled by the parent via onPlay / onOpenMenu so rows
 * don't subscribe to app-wide context and only re-render when their own
 * props change.
 *
 * @param {Object} props
 * @param {Object} props.song - Local track
 * @param {boolean} props.isActive - This row is the current track
 * @param {boolean} props.isPlaying - Current track is playing (only meaningful when active)
 * @param {(song: Object) => void} props.onPlay
 * @param {(song: Object, pageY: number) => void} props.onOpenMenu
 */
const LocalMusicCardComponent = ({
  song,
  isActive,
  isPlaying,
  onPlay,
  onOpenMenu,
}) => {
  const menuButtonRef = useRef(null);
  const theme = useTheme();
  const styles = useMemo(
    () => getThemedStyles(theme.colors),
    [theme.colors]
  );

  const handlePress = useCallback(() => {
    onPlay?.(song);
  }, [onPlay, song]);

  const handleMenuPress = useCallback(() => {
    if (!menuButtonRef.current || !onOpenMenu) {
      return;
    }
    const handle = findNodeHandle(menuButtonRef.current);
    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      onOpenMenu(song, pageY);
    });
  }, [onOpenMenu, song]);

  let imageSource;
  if (isActive) {
    imageSource = isPlaying ? PLAYING_IMAGE : PAUSED_IMAGE;
  } else {
    imageSource = getCoverSource(song);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && {
          backgroundColor: theme.dark
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.05)',
        },
      ]}
      android_ripple={{
        color: theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <View style={styles.songInfo}>
        <View style={styles.imageContainer}>
          <FastImage
            source={imageSource}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
          />
        </View>
        <View style={styles.textContainer}>
          <PlainText
            text={formatTitle(song.title)}
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
          <SmallText
            text={formatArtist(song.artist)}
            style={styles.artist}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
        </View>
      </View>
      <GlassBox
        id={`song-menu-${song.metaKey || song.id}`}
        gradientConfig={circleGradient}
        fixedSize={MENU_FIXED_SIZE}
        style={styles.menuGlass}
      >
        <Pressable
          ref={menuButtonRef}
          onPress={handleMenuPress}
          hitSlop={8}
          style={styles.menuButton}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </GlassBox>
    </Pressable>
  );
};

export const LocalMusicCard = memo(LocalMusicCardComponent);

const getThemedStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      justifyContent: 'space-between',
    },
    songInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      // Lets the text column shrink instead of overflowing into the menu
      minWidth: 0,
    },
    imageContainer: {
      width: 50,
      height: 50,
      borderRadius: 4,
      overflow: 'hidden',
      marginRight: 12,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    textContainer: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      marginRight: 8,
    },
    title: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
      paddingRight: 0,
    },
    artist: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    menuGlass: {
      width: MENU_SIZE,
      height: MENU_SIZE,
      borderRadius: MENU_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: MENU_SIZE,
      height: MENU_SIZE,
      borderRadius: MENU_SIZE / 2,
    },
  });
