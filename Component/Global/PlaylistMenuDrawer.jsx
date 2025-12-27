import Modal from "react-native-modal";
import { View, Pressable } from "react-native";
import { useTheme } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { PlainText } from "./PlainText";

/**
 * Simple menu button component
 */
const MenuButton = ({ icon, text, onPress, textColor, colors }) => (
    <Pressable
        onPress={onPress}
        android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 24,
        }}
    >
        {icon}
        <PlainText
            text={text}
            style={{
                color: textColor || colors.text,
                marginLeft: 20,
                fontSize: 16,
                fontWeight: '500',
            }}
        />
    </Pressable>
);

/**
 * Playlist menu drawer - for rename/delete operations only
 * @param {boolean} visible - Whether drawer is visible
 * @param {function} onClose - Callback to close drawer
 * @param {object} playlist - Playlist data {name, songs, type, id}
 * @param {function} onRename - Callback when rename is pressed, receives playlist
 * @param {function} onDelete - Callback when delete is pressed, receives playlist
 */
export const PlaylistMenuDrawer = ({ visible, onClose, playlist, onRename, onDelete }) => {
    const { colors } = useTheme();

    if (!playlist) return null;

    const isEditable = playlist.type !== 'liked';

    // Handle rename - pass playlist data to callback
    const handleRename = () => {
        const playlistData = { ...playlist };
        onClose();
        if (onRename) {
            setTimeout(() => onRename(playlistData), 200);
        }
    };

    // Handle delete - pass playlist data to callback
    const handleDelete = () => {
        const playlistData = { ...playlist };
        onClose();
        if (onDelete) {
            setTimeout(() => onDelete(playlistData), 200);
        }
    };

    return (
        <Modal
            isVisible={visible}
            onBackButtonPress={onClose}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            backdropOpacity={0.4}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            useNativeDriver
            hideModalContentWhileAnimating
            style={{ margin: 0, justifyContent: 'flex-end' }}
        >
            <View style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingBottom: 20,
            }}>
                {/* Drawer Handle */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                    <View style={{
                        width: 40,
                        height: 4,
                        backgroundColor: colors.text,
                        opacity: 0.2,
                        borderRadius: 2
                    }} />
                </View>

                {/* Playlist Info */}
                <View style={{ paddingHorizontal: 24, paddingBottom: 10, paddingTop: 5 }}>
                    <PlainText
                        text={playlist.name}
                        style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}
                        numberOfLines={1}
                    />
                    <PlainText
                        text={`${playlist.songs?.length || 0} songs`}
                        style={{ fontSize: 13, color: colors.textSecondary }}
                    />
                </View>

                {/* Rename Option - only for editable playlists */}
                {isEditable && (
                    <MenuButton
                        icon={<MaterialCommunityIcons name="pencil" size={24} color={colors.text} />}
                        text="Rename"
                        onPress={handleRename}
                        colors={colors}
                    />
                )}

                {/* Delete Option */}
                <MenuButton
                    icon={<MaterialCommunityIcons name="delete" size={24} color="#FF5252" />}
                    text="Delete Playlist"
                    onPress={handleDelete}
                    textColor="#FF5252"
                    colors={colors}
                />
            </View>
        </Modal>
    );
};
