import React from "react";
import { View, Pressable } from "react-native";
import Modal from "react-native-modal";
import { useTheme } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { PlainText } from "../../Global/PlainText";

/**
 * FullScreenMusicMenuModal - Modal component for three-dot menu options
 * Displays menu options in a themed modal with proper positioning
 * 
 * @param {boolean} visible - Whether the modal is visible
 * @param {Function} onClose - Callback to close the modal
 * @param {Object} menuOptions - Array of menu option objects
 * @param {Object} position - Position object with top and right coordinates
 */
export const FullScreenMusicMenuModal = ({ 
  visible, 
  onClose, 
  menuOptions = [], 
  position = { top: 100, right: 16 } 
}) => {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <Modal 
      onBackButtonPress={onClose} 
      onBackdropPress={onClose} 
      isVisible={visible} 
      backdropOpacity={0.3}
      animationIn="fadeIn"
      animationOut="fadeOut"
      animationInTiming={150}
      animationOutTiming={150}
      useNativeDriver
      hideModalContentWhileAnimating
      style={{
        margin: 0,
        position: 'absolute',
        top: position.top,
        right: position.right,
        justifyContent: 'flex-start',
      }}
    >
      <View style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        width: 220,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        transform: [
          { translateY: -20 },
          { scale: visible ? 1 : 0.95 }
        ],
        opacity: visible ? 1 : 0,
      }}>
        {menuOptions.map((option, index) => (
          <MenuOption
            key={option.id || index}
            icon={option.icon}
            text={option.text}
            onPress={() => {
              onClose();
              option.onPress();
            }}
            colors={colors}
            isLast={index === menuOptions.length - 1}
          />
        ))}
      </View>
    </Modal>
  );
};

/**
 * MenuOption - Individual menu option component
 * Reusable component for each menu item with icon and text
 */
const MenuOption = ({ icon, text, onPress, colors, isLast }) => {
  const rippleColor = colors.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <Pressable 
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingHorizontal: 20,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.border || 'rgba(255,255,255,0.1)',
      }}
    >
      <View style={{ width: 24, alignItems: 'center' }}>
        {icon}
      </View>
      <PlainText 
        text={text} 
        style={{
          color: colors.text,
          marginLeft: 16,
          fontSize: 15,
          fontWeight: '500',
        }}
      />
    </Pressable>
  );
};
