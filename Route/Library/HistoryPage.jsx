import React, { useRef } from 'react';
import { MainWrapper } from '../../Layout/MainWrapper';
import { HistoryScreen } from '../../Component/History/HistoryScreen';

export const HistoryPage = () => {
  const historyScreenRef = useRef(null);

  // Removed BackHandler - let RootRoute handle navigation

  return (
    <MainWrapper>
      <HistoryScreen ref={historyScreenRef} />
    </MainWrapper>
  );
};
