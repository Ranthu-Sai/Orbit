import React, { useState } from 'react';
import { View, Modal, TextInput, Pressable, Text, StyleSheet, ToastAndroid } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Heading } from '../Global/Heading';
import { SmallText } from '../Global/SmallText';

/**
 * Reusable modal component for importing Spotify playlists
 * @param {boolean} visible - Controls modal visibility
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onImport - Callback when import is submitted with playlist link
 */
export const ImportPlaylistModal = ({ visible, onClose, onImport }) => {
    const theme = useTheme();
    const [playlistLink, setPlaylistLink] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const handleImport = async () => {
        const trimmedLink = playlistLink.trim();

        if (!trimmedLink) {
            ToastAndroid.show('Please enter a playlist link', ToastAndroid.SHORT);
            return;
        }

        // Basic Spotify playlist URL validation
        const spotifyPlaylistRegex = /^https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/;

        if (!spotifyPlaylistRegex.test(trimmedLink)) {
            ToastAndroid.show('Please enter a valid Spotify playlist link', ToastAndroid.SHORT);
            return;
        }

        setIsImporting(true);

        try {
            await onImport(trimmedLink);
            setPlaylistLink(''); // Clear input on success
            onClose();
        } catch (error) {
            console.error('Error importing playlist:', error);
            ToastAndroid.show(error.message || 'Failed to import playlist', ToastAndroid.SHORT);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (!isImporting) {
            setPlaylistLink('');
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
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.backdrop || 'rgba(0,0,0,0.7)' }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                    <Heading text="Import Playlist" />
                    <SmallText
                        text="Paste a public Spotify playlist link"
                        style={[styles.modalLabel, { color: theme.colors.textSecondary || theme.colors.text }]}
                    />
                    <TextInput
                        placeholder="Paste public Spotify playlist link"
                        placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.5)' : '#000000'}
                        value={playlistLink}
                        onChangeText={setPlaylistLink}
                        style={[
                            styles.input,
                            {
                                color: theme.colors.text,
                                backgroundColor: theme.dark ? (theme.colors.input || theme.colors.border) : '#F0F0F0',
                                borderColor: theme.colors.border
                            }
                        ]}
                        autoFocus
                        editable={!isImporting}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                    />
                    <View style={styles.modalButtonContainer}>
                        <Pressable
                            style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
                            onPress={handleClose}
                            disabled={isImporting}
                        >
                            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.importButton,
                                {
                                    backgroundColor: isImporting
                                        ? theme.colors.border
                                        : (theme.colors.primary || '#1DB954')
                                }
                            ]}
                            onPress={handleImport}
                            disabled={isImporting}
                        >
                            <Text style={styles.importButtonText}>
                                {isImporting ? 'Importing...' : 'Import'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
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
        padding: 20,
        elevation: 5,
    },
    modalLabel: {
        marginTop: 20,
        marginBottom: 10,
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        paddingHorizontal: 12,
        color: 'white',
        backgroundColor: '#333',
        marginTop: 12,
        fontSize: 16,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    importButton: {
        flex: 1,
        backgroundColor: '#1DB954',
        padding: 15,
        alignItems: 'center',
        borderRadius: 12,
        marginLeft: 8,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#444',
        padding: 15,
        alignItems: 'center',
        borderRadius: 12,
        marginRight: 8,
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
});
