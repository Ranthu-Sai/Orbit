import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { MainWrapper } from '../../Layout/MainWrapper';
import { RouteHeading } from '../../Component/Home/RouteHeading';
import { HistoryScreen } from '../../Component/History/HistoryScreen';

export const HistoryPage = () => {
  const navigation = useNavigation();
  const historyScreenRef = useRef(null);

  // Removed BackHandler - let RootRoute handle navigation

  // Debug methods (remove in production)
  const handleClearHistory = () => {
    historyScreenRef.current?.clearHistory();
  };

  const handleResetPlayCounts = () => {
    historyScreenRef.current?.resetPlayCounts();
  };

  return (
    <MainWrapper>
      <HistoryScreen ref={historyScreenRef} />
    </MainWrapper>
  );
};
