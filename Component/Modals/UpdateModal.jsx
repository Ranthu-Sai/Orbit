/**
 * UpdateModal.jsx
 * A beautiful modal to show update availability using React Native Paper components
 */

import React from 'react';
import { View, StyleSheet, Linking, ScrollView } from 'react-native';
import {
    Portal,
    Modal,
    Surface,
    Text,
    Button,
    IconButton,
    useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const UpdateModal = ({
    visible,
    onDismiss,
    updateInfo,
    onUpdate,
}) => {
    const theme = useTheme();

    if (!updateInfo) return null;

    const {
        latestVersion,
        title,
        message,
        url,
        forceUpdate,
    } = updateInfo;

    const handleUpdate = async () => {
        if (onUpdate) {
            onUpdate();
        } else if (url) {
            try {
                await Linking.openURL(url);
            } catch (error) {
                console.error('Failed to open update URL:', error);
            }
        }
    };

    const handleDismiss = () => {
        if (!forceUpdate && onDismiss) {
            onDismiss();
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleDismiss}
                dismissable={!forceUpdate}
                contentContainerStyle={[
                    styles.modalContainer,
                    { backgroundColor: theme.colors.elevation.level3 }
                ]}
            >
                <Surface style={styles.surface} elevation={0}>
                    {/* Header with icon */}
                    <View style={styles.headerContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                            <MaterialCommunityIcons
                                name="arrow-up-circle"
                                size={40}
                                color={theme.colors.primary}
                            />
                        </View>

                        {!forceUpdate && (
                            <IconButton
                                icon="close"
                                size={24}
                                onPress={handleDismiss}
                                style={styles.closeButton}
                                iconColor={theme.colors.onSurfaceVariant}
                            />
                        )}
                    </View>

                    {/* Title */}
                    <Text
                        variant="headlineSmall"
                        style={[styles.title, { color: theme.colors.onSurface }]}
                    >
                        {title || 'Update Available'}
                    </Text>

                    {/* Version badge */}
                    <View style={[styles.versionBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Text
                            variant="labelMedium"
                            style={{ color: theme.colors.onSecondaryContainer }}
                        >
                            Version {latestVersion}
                        </Text>
                    </View>

                    {/* Message / Changelog */}
                    <ScrollView
                        style={styles.messageContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text
                            variant="bodyMedium"
                            style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
                        >
                            {message || 'A new version is available with bug fixes and improvements.'}
                        </Text>
                    </ScrollView>

                    {/* Force update warning */}
                    {forceUpdate && (
                        <View style={[styles.warningContainer, { backgroundColor: theme.colors.errorContainer }]}>
                            <MaterialCommunityIcons
                                name="alert-circle"
                                size={20}
                                color={theme.colors.onErrorContainer}
                            />
                            <Text
                                variant="bodySmall"
                                style={[styles.warningText, { color: theme.colors.onErrorContainer }]}
                            >
                                This update is required to continue using the app
                            </Text>
                        </View>
                    )}

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        {!forceUpdate && (
                            <Button
                                mode="outlined"
                                onPress={handleDismiss}
                                style={styles.laterButton}
                                labelStyle={styles.buttonLabel}
                            >
                                Later
                            </Button>
                        )}

                        <Button
                            mode="contained"
                            onPress={handleUpdate}
                            style={[styles.updateButton, forceUpdate && styles.fullWidthButton]}
                            labelStyle={styles.buttonLabel}
                            icon="download"
                        >
                            Update Now
                        </Button>
                    </View>
                </Surface>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        marginHorizontal: 24,
        borderRadius: 28,
        overflow: 'hidden',
    },
    surface: {
        padding: 24,
        borderRadius: 28,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: -12,
        top: -12,
    },
    title: {
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 12,
    },
    versionBadge: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 16,
    },
    messageContainer: {
        maxHeight: 150,
        marginBottom: 16,
    },
    message: {
        textAlign: 'center',
        lineHeight: 22,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    warningText: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    laterButton: {
        flex: 1,
    },
    updateButton: {
        flex: 1,
    },
    fullWidthButton: {
        flex: 1,
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default UpdateModal;
