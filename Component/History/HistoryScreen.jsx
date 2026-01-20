import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { HistoryCard } from './HistoryCard';
import { HistoryFilters } from './HistoryFilters';
import { useActiveTrack } from 'react-native-track-player';

import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import historyManager from '../../Utils/HistoryManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const HistoryScreen = forwardRef((props, ref) => {
  const { colors, dark } = useTheme();
  const styles = getThemedStyles(colors, dark);
  const activeTrack = useActiveTrack();

  const [historyData, setHistoryData] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clearHistory: async () => {
      await historyManager.clearHistory();
      loadHistoryData();
    },
    resetPlayCounts: async () => {
      await historyManager.resetPlayCounts();
      loadHistoryData();
    }
  }));

  // Load history data
  const loadHistoryData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load filtered history from in-memory cache (very fast)
      const history = await historyManager.getFilteredHistory(activeFilter, searchQuery);
      setHistoryData(history);
      setWeeklyStats(null); // Explicitly null since user wants charts removed

    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, searchQuery]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadHistoryData();
    setIsRefreshing(false);
  }, [loadHistoryData]);

  // Handle filter change
  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
  }, []);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // Refresh data on mount and filter changes
  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="history"
        size={64}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <PlainText
        text="No listening history yet"
        style={[styles.emptyTitle, { color: colors.text }]}
      />
      <SmallText
        text="Start playing some music to see your history here"
        style={[styles.emptySubtitle, { color: colors.textSecondary }]}
      />
    </View>
  );

  // Render search empty state
  const renderSearchEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons
        name="search-off"
        size={64}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <PlainText
        text="No results found"
        style={[styles.emptyTitle, { color: colors.text }]}
      />
      <SmallText
        text={`No songs match "${searchQuery}"`}
        style={[styles.emptySubtitle, { color: colors.textSecondary }]}
      />
    </View>
  );

  // Render history item
  const renderHistoryItem = ({ item, index }) => (
    <HistoryCard
      historyItem={item}
      onRefresh={handleRefresh}
    />
  );

  // Render header
  const renderHeader = () => (
    <View>
      {/* Search Bar Header */}
      <View style={styles.headerContainer}>
        <PlainText
          text="History"
          style={[styles.historyTitle, { color: colors.text }]}
        />

        {showSearch ? (
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your history..."
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCapitalize="none"
              selectionColor={colors.primary}
              autoFocus={true}
            />
            <TouchableOpacity onPress={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowSearch(true)} style={styles.searchIcon}>
            <MaterialIcons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* History filters and list header - Chart removed per user request */}

      {/* Filters */}
      {!searchQuery && (
        <HistoryFilters
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* History Count */}
      {filteredData.length > 0 && !searchQuery && (
        <View style={styles.historyHeader}>
          <SmallText
            text={`${filteredData.length} song${filteredData.length !== 1 ? 's' : ''}`}
            style={[styles.historyCount, { color: colors.textSecondary }]}
          />
        </View>
      )}
    </View>
  );

  // Filter and sort history data based on active filter and search
  const filteredData = useMemo(() => {
    let filtered = [...historyData];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item && item.id && (
          item.title?.toLowerCase().includes(query) ||
          item.artist?.toLowerCase().includes(query) ||
          item.album?.toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting based on active filter (only if not searching)
    if (!searchQuery.trim()) {
      switch (activeFilter) {
        case 'recent':
          return filtered.sort((a, b) => b.lastPlayed - a.lastPlayed);
        case 'mostPlayed':
          return filtered.sort((a, b) => b.playCount - a.playCount);
        case 'mostTime':
          return filtered.sort((a, b) => b.listenDuration - a.listenDuration);
        default:
          return filtered;
      }
    }

    return filtered;
  }, [historyData, activeFilter, searchQuery]);

  // Get key extractor
  const keyExtractor = (item, index) => `${item.id}-${index}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredData}
        renderItem={renderHistoryItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={searchQuery ? renderSearchEmptyState : renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressBackgroundColor={colors.card}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: activeTrack ? 180 : 100 },
          historyData.length === 0 && styles.emptyListContent
        ]}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        getItemLayout={(data, index) => ({
          length: 74, // Approximate height of HistoryCard
          offset: 74 * index,
          index,
        })}
      />
    </View>
  );
});

const getThemedStyles = (colors, dark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100, // Space for bottom tab bar
  },
  emptyListContent: {
    flexGrow: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  historyCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
    backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 4,
  },
  searchIcon: {
    padding: 4,
  },
});
