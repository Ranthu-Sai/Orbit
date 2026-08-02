import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { importSpotifyPlaylist } from '../../Utils/PlaylistImportLogic';
import { Heading } from '../Global/Heading';
import { SmallText } from '../Global/SmallText';
import { GlassBox } from '../Global/GlassBox';
import { BlurView } from '@react-native-community/blur';

/**
 * Reusable modal component for importing Spotify playlists
 * @param {boolean} visible - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onImport - **Deprecated** - Handling import internally now, but can be used for cleanup
 */
export const ImportPlaylistModal = ({
  visible,
  onClose,
  onImportSuccess,
  customImportHandler,
  title = 'Import Playlist',
  label = 'Paste a link from Spotify, YouTube, or YouTube Music',
}) => {
  const theme = useTheme();
  const [playlistLink, setPlaylistLink] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Progress State
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: '',
  }); // Updated initial state
  // Removed statusMessage state as it's now part of progress

  const handleImport = async () => {
    const trimmedLink = playlistLink.trim();
    if (!trimmedLink) {
      ToastAndroid.show('Please enter a playlist link', ToastAndroid.SHORT);
      return;
    }

    // Validation is now handled inside importSpotifyPlaylist (importFromLink)
    // We just check if it's not empty

    setIsImporting(true);
    setProgress({ current: 0, total: 0, message: 'Starting import...' });

    try {
      if (customImportHandler) {
        await customImportHandler(trimmedLink, (current, total, message) => {
          setProgress({ current, total, message });
        });
      } else {
        await importSpotifyPlaylist(trimmedLink, (current, total, message) => {
          setProgress({ current, total, message });
        });
      }

      if (onImportSuccess) {
        onImportSuccess();
      }
      const successMsg = customImportHandler
        ? 'Imported to Library successfully!'
        : 'Playlist imported successfully!';
      ToastAndroid.show(successMsg, ToastAndroid.SHORT);
      onClose();
    } catch (error) {
      console.error('Error importing playlist:', error);
      ToastAndroid.show(
        error.message || 'Failed to import playlist',
        ToastAndroid.LONG
      );
    } finally {
      setIsImporting(false);
      setProgress({ current: 0, total: 0, message: '' });
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      setPlaylistLink('');
      setProgress({ current: 0, total: 0, message: '' });
      onClose();
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={5}
          reducedTransparencyFallbackColor={theme.colors.backdrop || 'rgba(0,0,0,0.7)'}
        />
        <GlassBox
          id="import-playlist-modal"
          style={[styles.modalContent, { backgroundColor: 'transparent', borderWidth: 0 }]}
          gradientConfig={{
            x1: '0%', y1: '0%', x2: '100%', y2: '100%',
            stops: [
              { offset: '0%', opacity: 0.0 },
              { offset: '10%', opacity: 0.6 },
              { offset: '90%', opacity: 0.6 },
              { offset: '100%', opacity: 0.0 },
            ],
          }}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={theme.dark ? 'dark' : 'light'}
            blurAmount={15}
            reducedTransparencyFallbackColor={theme.colors.card}
          />
          <Heading text={title} />

          {!isImporting ? (
            <>
              <SmallText
                text={label}
                style={[
                  styles.modalLabel,
                  {
                    color: theme.colors.textSecondary || theme.colors.text,
                    opacity: 0.7,
                  },
                ]}
              />
              <TextInput
                placeholder="Paste link (Playlist, Album, Song)"
                placeholderTextColor={
                  theme.dark ? 'rgba(255,255,255,0.5)' : '#000000'
                }
                value={playlistLink}
                onChangeText={setPlaylistLink}
                style={[
                  styles.input,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.dark
                      ? theme.colors.input || '#333'
                      : '#F0F0F0',
                    borderColor: theme.colors.border || '#444',
                  },
                ]}
                autoFocus
                editable={!isImporting}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </>
          ) : (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.progressText, { color: theme.colors.text }]}>
                {progress.message}
              </Text>
              {progress.total > 0 && (
                <Text
                  style={[styles.countText, { color: theme.colors.primary }]}
                >
                  {progress.current} / {progress.total}
                </Text>
              )}
            </View>
          )}

          <View style={styles.modalButtonContainer}>
            <Pressable
              style={[
                styles.cancelButton,
                { backgroundColor: theme.colors.border || '#444' },
              ]}
              onPress={handleClose}
              disabled={isImporting}
            >
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.text }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.importButton,
                {
                  backgroundColor: isImporting
                    ? theme.colors.border || '#666'
                    : theme.colors.primary || '#1DB954',
                  opacity: isImporting ? 0.7 : 1,
                },
              ]}
              onPress={handleImport}
              disabled={isImporting}
            >
              <Text style={styles.importButtonText}>
                {isImporting ? 'Processing...' : 'Import'}
              </Text>
            </Pressable>
          </View>
        </GlassBox>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 24,
    elevation: 5,
  },
  modalLabel: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  importButton: {
    flex: 1,
    backgroundColor: '#1DB954',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#444',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  progressText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  countText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
