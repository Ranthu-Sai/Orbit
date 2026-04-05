import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PlainText } from '../Global/PlainText';
import { safeString } from '../../Utils/ArtistUtils';

/**
 * ArtistTabs component - displays tab navigation for Songs, Albums, and Bio
 * @param {object} props - Component props
 * @param {string} props.activeTab - Currently active tab
 * @param {function} props.onTabChange - Function to call when tab changes
 * @returns {JSX.Element} - ArtistTabs component
 */
const ArtistTabs = ({ activeTab, onTabChange }) => {
  const theme = useTheme();

  const tabs = [
    { key: 'songs', label: 'Songs', icon: 'musical-notes' },
    { key: 'albums', label: 'Albums', icon: 'albums' },
    { key: 'bio', label: 'Bio', icon: 'person' },
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 12,
        padding: 4,
      }}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor:
              activeTab === tab.key ? theme.colors.primary : 'transparent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={tab.icon}
            size={16}
            color={activeTab === tab.key ? 'white' : theme.colors.text}
            style={{ marginRight: 6 }}
          />
          <PlainText
            text={safeString(tab.label)}
            style={{
              color: activeTab === tab.key ? 'white' : theme.colors.text,
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              fontSize: 14,
            }}
          />
        </Pressable>
      ))}
    </View>
  );
};

export default ArtistTabs;
