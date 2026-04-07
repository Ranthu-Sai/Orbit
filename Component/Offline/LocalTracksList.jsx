import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FullScreenLocalTrackItem from '../MusicPlayer/FullScreenLocalTrackItem';
import useOffline from '../../hooks/useOffline';

/**
 * LocalTracksList - Displays list of local/downloaded tracks
 * Shows available offline tracks with play functionality
 */
const LocalTracksList = ({
  localTracks = [],
  onTrackPress,
  onClose,
  visible = false,
  style,
  headerStyle,
  listStyle,
  emptyStateStyle,
  showHeader = true,
  headerText = 'Downloaded Songs',
  emptyText = 'No downloaded songs available',
  emptySubText = 'Download songs to listen offline',
  maxHeight = 400,
}) => {
  const { isOffline } = useOffline();
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  const handleTrackPress = (track) => {
    if (onTrackPress) {
      onTrackPress(track);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isOffline || !isVisible) {
    return null;
  }

  const renderTrackItem = ({ item }) => (
    <FullScreenLocalTrackItem song={item} onPress={handleTrackPress} />
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, emptyStateStyle]}>
      <Ionicons
        name="musical-notes-outline"
        size={50}
        color="rgba(255,255,255,0.5)"
      />
      <Text style={styles.emptyText}>{emptyText}</Text>
      <Text style={styles.emptySubText}>{emptySubText}</Text>
    </View>
  );

  const renderHeader = () => {
    if (!showHeader) {
      return null;
    }

    return (
      <View style={[styles.header, headerStyle]}>
        <Text style={styles.headerText}>{headerText}</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { maxHeight }, style]}>
      {renderHeader()}

      <FlatList
        data={localTracks}
        renderItem={renderTrackItem}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        style={[styles.list, listStyle]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          localTracks.length === 0 ? styles.emptyListContainer : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LocalTracksList;
