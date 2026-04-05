import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import React from 'react';
import { useTheme } from '@react-navigation/native';
import { IconButton } from 'react-native-paper';

export const GetLyricsButton = ({ onPress, color }) => {
  const theme = useTheme();
  const iconColor = color || theme.colors.text;
  return (
    <IconButton
      icon={() => <MaterialIcons name={'lyrics'} size={25} color={iconColor} />}
      size={32}
      onPress={onPress}
      style={{ margin: 0, padding: 0 }}
      rippleColor="rgba(255, 255, 255, 0.2)"
    />
  );
};
