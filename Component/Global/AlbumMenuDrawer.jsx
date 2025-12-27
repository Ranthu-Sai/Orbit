import Modal from "react-native-modal";
import { View, Pressable } from "react-native";
import { useTheme } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FastImage from "react-native-fast-image";
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
 * Album menu drawer - for remove from favorites operation
 * @param {boolean} visible - Whether drawer is visible
 * @param {function} onClose - Callback to close drawer
 * @param {object} album - Album data {id, name, image}
 * @param {function} onRemove - Callback when remove is pressed, receives album
 */
export const AlbumMenuDrawer = ({ visible, onClose, album, onRemove }) => {
    const { colors } = useTheme();

    if (!album) return null;

    // Handle remove - pass album data to callback
    const handleRemove = () => {
        const albumData = { ...album };
        onClose();
        if (onRemove) {
            setTimeout(() => onRemove(albumData), 200);
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

                {/* Album Info with Image */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 24,
                    paddingBottom: 10,
                    paddingTop: 5
                }}>
                    <FastImage
                        source={album.image ? { uri: album.image } : null}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                            marginRight: 12,
                            backgroundColor: '#333',
                        }}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                    <View style={{ flex: 1 }}>
                        <PlainText
                            text={album.name}
                            style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}
                            numberOfLines={1}
                        />
                        <PlainText
                            text="Album"
                            style={{ fontSize: 13, color: colors.textSecondary }}
                        />
                    </View>
                </View>

                {/* Remove Option */}
                <MenuButton
                    icon={<MaterialCommunityIcons name="heart-remove" size={24} color="#FF5252" />}
                    text="Remove from Favorites"
                    onPress={handleRemove}
                    textColor="#FF5252"
                    colors={colors}
                />
            </View>
        </Modal>
    );
};
